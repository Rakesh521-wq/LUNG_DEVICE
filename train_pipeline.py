# train_pipeline.py
# Complete Training Pipeline for Respiratory Sound Classification CNN

import os
import numpy as np
import librosa
import tensorflow as tf
from tensorflow.keras import layers, models
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt

# Suppress TensorFlow logging warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'

# Parameters
SR = 16000                # Target sample rate (16 kHz mono)
SEGMENT_DURATION = 3      # Segment duration in seconds
SAMPLES_PER_SEGMENT = SR * SEGMENT_DURATION  # 48,000 samples
N_MELS = 64               # Number of Mel bands
N_MFCC = 20               # Number of MFCC coefficients

# Dataset paths
DATASET_DIR = "structured_dataset"
CLASSES = ["Normal", "Asthma", "COPD", "Pneumonia", "Post_COVID"]

print("=====================================================================")
print("             STARTING RESPIRATORY AUDIO TRAINING PIPELINE            ")
print("=====================================================================")
print()

# 1. Load and Segment Dataset
X_mels = []
y = []
files_processed = 0
files_skipped = 0

print("Step 1/8: Scanning directories and preprocessing audio...")
for class_idx, class_name in enumerate(CLASSES):
    class_dir = os.path.join(DATASET_DIR, class_name)
    if not os.path.isdir(class_dir):
        print(f"Warning: Directory {class_dir} not found. Skipping.")
        continue
    
    files = [f for f in os.listdir(class_dir) if f.endswith('.wav')]
    print(f"  Class '{class_name}': Found {len(files)} files.")
    
    for f in files:
        file_path = os.path.join(class_dir, f)
        try:
            # Load audio using librosa (uses soundfile backend for WAV)
            audio, sr = librosa.load(file_path, sr=SR, mono=True)
            
            # Normalize audio signal
            max_val = np.max(np.abs(audio))
            if max_val > 0:
                audio = audio / max_val
            
            # Segment into 3-second segments
            length = len(audio)
            if length < SAMPLES_PER_SEGMENT:
                # Pad short file with zeros
                pad_width = SAMPLES_PER_SEGMENT - length
                padded_audio = np.pad(audio, (0, pad_width), 'constant')
                segments = [padded_audio]
            else:
                # Slice long file into non-overlapping segments
                segments = []
                for start in range(0, length - SAMPLES_PER_SEGMENT + 1, SAMPLES_PER_SEGMENT):
                    segments.append(audio[start:start + SAMPLES_PER_SEGMENT])
            
            # Extract Mel Spectrogram for each segment
            for seg in segments:
                # Generate Mel spectrogram
                mel_spec = librosa.feature.melspectrogram(
                    y=seg, sr=SR, n_mels=N_MELS, n_fft=1024, hop_length=512
                )
                # Convert to log-scale (dB)
                mel_spec_db = librosa.power_to_db(mel_spec, ref=np.max)
                
                X_mels.append(mel_spec_db)
                y.append(class_idx)
            
            files_processed += 1
        except Exception as e:
            print(f"  [ERROR] Skipping corrupted or unreadable file {f}: {e}")
            files_skipped += 1

X_mels = np.array(X_mels)
y = np.array(y)

print(f"Audio scan complete. Processed: {files_processed}, Skipped: {files_skipped}")
print(f"Total segments extracted: {len(X_mels)}")
print(f"Feature array shape: {X_mels.shape}")
print()

# 2. Split Dataset (80% Train, 10% Val, 10% Test)
print("Step 2/8: Splitting dataset into Train (80%), Val (10%), Test (10%)...")
y_onehot = tf.keras.utils.to_categorical(y, num_classes=5)

X_train, X_temp, y_train, y_temp = train_test_split(
    X_mels, y_onehot, test_size=0.2, random_state=42, stratify=y
)

X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.5, random_state=42, stratify=np.argmax(y_temp, axis=1)
)

# Reshape to (Samples, Height, Width, Channels) for 2D CNN input
X_train = X_train[..., np.newaxis]
X_val = X_val[..., np.newaxis]
X_test = X_test[..., np.newaxis]

print(f"  Training Set:   {X_train.shape}")
print(f"  Validation Set: {X_val.shape}")
print(f"  Testing Set:    {X_test.shape}")
print()

# 3. Handle Imbalance & Apply Augmentation
print("Step 3/8: Handling class weights for training segments...")
y_train_labels = np.argmax(y_train, axis=1)
from sklearn.utils.class_weight import compute_class_weight
class_weights = compute_class_weight('balanced', classes=np.unique(y_train_labels), y=y_train_labels)
class_weight_dict = dict(enumerate(class_weights))
print(f"  Calculated class weights to offset segment imbalance: {class_weight_dict}")

# Apply Data Augmentation on Training Set: Add minor random noise
print("  Applying random noise data augmentation to training samples...")
noise_factor = 0.005
X_train_augmented = X_train + np.random.randn(*X_train.shape) * noise_factor
# Combine original and augmented to double training size
X_train_final = np.concatenate((X_train, X_train_augmented), axis=0)
y_train_final = np.concatenate((y_train, y_train), axis=0)
print(f"  Augmented training set shape: {X_train_final.shape}")
print()

# 4. Build CNN Model
print("Step 4/8: Building 2D CNN architecture for medical audio...")
def build_cnn_model(input_shape):
    model = models.Sequential([
        # Block 1
        layers.Conv2D(32, (3, 3), padding='same', input_shape=input_shape),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        # Block 2
        layers.Conv2D(64, (3, 3), padding='same'),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.25),
        
        # Block 3
        layers.Conv2D(128, (3, 3), padding='same'),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.MaxPooling2D((2, 2)),
        layers.Dropout(0.3),
        
        # Output Dense Block
        layers.Flatten(),
        layers.Dense(128),
        layers.BatchNormalization(),
        layers.ReLU(),
        layers.Dropout(0.5),
        layers.Dense(5, activation='softmax')
    ])
    return model

input_shape = (X_train_final.shape[1], X_train_final.shape[2], 1)
model = build_cnn_model(input_shape)
model.compile(
    optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
    loss='categorical_crossentropy',
    metrics=['accuracy']
)
model.summary()
print()

# 5. Train Model
print("Step 5/8: Training CNN model on Mel Spectrogram features...")
early_stopping = tf.keras.callbacks.EarlyStopping(
    monitor='val_loss', patience=7, restore_best_weights=True
)

history = model.fit(
    X_train_final, y_train_final,
    validation_data=(X_val, y_val),
    epochs=30,
    batch_size=32,
    class_weight=class_weight_dict,
    callbacks=[early_stopping],
    verbose=1
)
print("  Model training completed successfully.")
print()

# 6. Evaluate Model
print("Step 6/8: Evaluating model performance on test set...")
test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
print(f"  Test Loss: {test_loss:.4f}")
print(f"  Test Accuracy: {test_acc:.4f}")

y_pred = model.predict(X_test, verbose=0)
y_pred_classes = np.argmax(y_pred, axis=1)
y_true_classes = np.argmax(y_test, axis=1)

# Print and save classification report
report = classification_report(y_true_classes, y_pred_classes, target_names=CLASSES)
print("\nClassification Report:")
print(report)
with open('classification_report.txt', 'w') as f:
    f.write(report)
print("  Classification report saved to classification_report.txt")
print()

# 7. Generate and Save Performance Graphs
print("Step 7/8: Generating accuracy/loss curves and confusion matrix...")
# Accuracy and Loss curves
plt.figure(figsize=(12, 4))
plt.subplot(1, 2, 1)
plt.plot(history.history['accuracy'], label='Train Accuracy')
plt.plot(history.history['val_accuracy'], label='Val Accuracy')
plt.title('Accuracy Curves')
plt.xlabel('Epoch')
plt.ylabel('Accuracy')
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(history.history['loss'], label='Train Loss')
plt.plot(history.history['val_loss'], label='Val Loss')
plt.title('Loss Curves')
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.legend()

plt.tight_layout()
plt.savefig('training_history.png')
plt.close()
print("  Training curves saved to training_history.png")

# Confusion Matrix (Standard Matplotlib implementation to avoid dependency issues)
cm = confusion_matrix(y_true_classes, y_pred_classes)
plt.figure(figsize=(8, 6))
plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
plt.title('Confusion Matrix')
plt.colorbar()
tick_marks = np.arange(len(CLASSES))
plt.xticks(tick_marks, CLASSES, rotation=45)
plt.yticks(tick_marks, CLASSES)

# Add annotations to cells
thresh = cm.max() / 2.
for i in range(cm.shape[0]):
    for j in range(cm.shape[1]):
        plt.text(j, i, format(cm[i, j], 'd'),
                 horizontalalignment="center",
                 color="white" if cm[i, j] > thresh else "black")

plt.ylabel('True Class')
plt.xlabel('Predicted Class')
plt.tight_layout()
plt.savefig('confusion_matrix.png')
plt.close()
print("  Confusion matrix saved to confusion_matrix.png")
print()

# 8. Export Trained Models
print("Step 8/8: Exporting models to .h5 and .tflite formats...")
# Save Keras .h5 model
model.save('lung_model.h5')
print("  Saved Keras model to lung_model.h5")

# Save TF Lite model for edge deployment
try:
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()
    with open('lung_model.tflite', 'wb') as f:
        f.write(tflite_model)
    print("  Saved TFLite model to lung_model.tflite")
except Exception as e:
    print(f"  [ERROR] Failed to export TFLite model: {e}")

print()
print("=====================================================================")
print("                   TRAINING PIPELINE COMPLETE!                       ")
print("=====================================================================")
