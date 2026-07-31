# convert_model.py
# Python script to convert lung_model.h5 to TensorFlow.js WebModel layers format.

import os

def check_and_convert():
    h5_path = 'lung_model.h5'
    output_dir = 'model'
    
    if not os.path.exists(h5_path):
        print(f"[ERROR] '{h5_path}' not found in the root directory.")
        print("Please verify that the training pipeline has run or that the file is present.")
        return
        
    print(f"[INFO] Found '{h5_path}'. Attempting to convert...")
    
    try:
        import tensorflow as tf
        model = tf.keras.models.load_model(h5_path)
        print("[INFO] Model loaded successfully.")
    except Exception as e:
        print(f"[ERROR] Failed to load the Keras model: {e}")
        return

    try:
        import tensorflowjs as tfjs
        print(f"[INFO] Converting Keras model to TensorFlow.js format inside '{output_dir}/'...")
        tfjs.converters.save_keras_model(model, output_dir)
        print("[SUCCESS] Model conversion complete! 'model/model.json' and binary weight files generated.")
        print("You can now load these files directly in the browser using: tf.loadLayersModel('model/model.json')")
    except ImportError:
        print("\n[WARNING] 'tensorflowjs' package is not installed.")
        print("To convert the model, please run the following commands in your python environment:")
        print("  pip install tensorflowjs")
        print("  python convert_model.py")
        print("\nWe have also configured the frontend to support direct TFLite model running or simulated inference in the meantime.")

if __name__ == '__main__':
    check_and_convert()
