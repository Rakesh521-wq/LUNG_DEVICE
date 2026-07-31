/*
 * AI Lung Patch - Chest Unit Firmware
 * Target Hardware: ESP32-S3 Mini
 * Sensors:
 *  - SPH0645 MEMS Microphone (I2S)
 *  - MPU6050 Accelerometer/Gyro (I2C)
 *  - Piezo Transducer (ADC Pin GPIO 4)
 * Communication: Bluetooth Low Energy (BLE) Only
 */

#include <Arduino.h>
#define ENABLE_PHYSICAL_HARDWARE 0  // Diagnostic: Set to 0 to disable Mic/I2C sensors and run pure BLE

#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"
#include <driver/i2s_std.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// --- Pin Definitions ---
#if defined(CONFIG_IDF_TARGET_ESP32S3)
  #define I2S_BCLK      1
  #define I2S_LRC       2
  #define I2S_DOUT      3
  #define PIEZO_PIN     4      // ADC1 Channel 3 (GPIO 4)
  #define I2C_SDA       8
  #define I2C_SCL       9
  #ifdef LED_BUILTIN
    #undef LED_BUILTIN
  #endif
  #define LED_BUILTIN   10     // ESP32-S3 status LED pin between 1 and 13
#else
  #define I2S_BCLK      14
  #define I2S_LRC       15
  #define I2S_DOUT      16
  #define PIEZO_PIN     4      // ADC1 Channel 3 (GPIO 4)
  #define I2C_SDA       21  // Standard ESP32 NodeMCU SDA
  #define I2C_SCL       22  // Standard ESP32 NodeMCU SCL
#endif

// --- DSP Parameters ---
#define SAMPLE_RATE      8000  // Stable sample rate for BLE audio transmission
#define AUDIO_BUF_SIZE   100   // Pack 100 samples (200 bytes) per BLE notification
#define MOVING_AVG_LEN   10    // MPU6050 smoothing window
#define PIEZO_AVG_LEN    50    // Piezo smoothing window

// --- BLE UUIDs ---
#define SERVICE_UUID           "a4e00000-12fd-47be-8547-a7d2c42b9800"
#define CHAR_AUDIO_UUID        "a4e00001-12fd-47be-8547-a7d2c42b9800"
#define CHAR_MOTION_UUID       "a4e00002-12fd-47be-8547-a7d2c42b9800"
#define CHAR_PIEZO_UUID        "a4e00003-12fd-47be-8547-a7d2c42b9800"

// --- Global Variables ---
Adafruit_MPU6050 mpu;
bool deviceConnected = false;
bool mpuAvailable = false;
bool i2sAvailable = false;
i2s_chan_handle_t rx_handle = nullptr;

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

// BLE Characteristics
BLECharacteristic *pAudioCharacteristic = nullptr;
BLECharacteristic *pMotionCharacteristic = nullptr;
BLECharacteristic *pPiezoCharacteristic = nullptr;

// Audio buffer
int16_t audioBuffer[AUDIO_BUF_SIZE];
int audioBufferIdx = 0;

// Filter states for SPH0645 (100Hz HPF, 2000Hz LPF)
float last_raw_audio = 0;
float last_hpf_audio = 0;
float last_lpf_audio = 0;
// DC blocker state
float dc_offset = 0;

// Moving average histories
float mpuHistoryX[MOVING_AVG_LEN] = {0};
float mpuHistoryY[MOVING_AVG_LEN] = {0};
float mpuHistoryZ[MOVING_AVG_LEN] = {0};
int mpuHistoryIdx = 0;

uint32_t piezoHistory[PIEZO_AVG_LEN] = {0};
uint32_t piezoSum = 0;
int piezoHistoryIdx = 0;

// Piezo Peak Detection for Respiratory Rate
uint32_t piezoAdaptiveThreshold = 2048; // mid range for 12-bit ADC
unsigned long lastPeakTime = 0;
uint8_t breathingRateBPM = 16;           // Initial default breathing rate
bool peakDetectedFlag = false;

// BLE Connection Callbacks
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("[BLE] Client connected to Chest Unit");
  }

  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("[BLE] Client disconnected from Chest Unit");
    // Restart advertising to allow reconnection
    BLEDevice::startAdvertising();
    Serial.println("[BLE] Advertising restarted");
  }
};

// --- Initialization Functions ---

void initI2S() {
  i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);
  
  esp_err_t err = i2s_new_channel(&chan_cfg, NULL, &rx_handle);
  if (err != ESP_OK) {
    Serial.printf("[ERROR] Failed to create I2S channel: %d. Running in mic simulation mode.\n", err);
    i2sAvailable = false;
    return;
  }

  i2s_std_config_t std_cfg = {
    .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(SAMPLE_RATE),
    .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_32BIT, I2S_SLOT_MODE_MONO),
    .gpio_cfg = {
      .mclk = I2S_GPIO_UNUSED,
      .bclk = (gpio_num_t)I2S_BCLK,
      .ws = (gpio_num_t)I2S_LRC,
      .dout = I2S_GPIO_UNUSED,
      .din = (gpio_num_t)I2S_DOUT,
      .invert_flags = {
        .mclk_inv = false,
        .bclk_inv = false,
        .ws_inv = false,
      },
    },
  };

  err = i2s_channel_init_std_mode(rx_handle, &std_cfg);
  if (err != ESP_OK) {
    Serial.printf("[ERROR] Failed to init I2S std mode: %d. Running in mic simulation mode.\n", err);
    i2sAvailable = false;
    return;
  }

  err = i2s_channel_enable(rx_handle);
  if (err != ESP_OK) {
    Serial.printf("[ERROR] Failed to enable I2S channel: %d. Running in mic simulation mode.\n", err);
    i2sAvailable = false;
    return;
  }

  Serial.println("[I2S] MEMS Microphone configured at 8 kHz (Next-Gen driver)");
  i2sAvailable = true;
}

void initSensors() {
  // Init I2C
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setTimeOut(100); // Prevent hanging if lines are floating

  // Check if MPU6050 is present at address 0x68
  Wire.beginTransmission(0x68);
  if (Wire.endTransmission() == 0) {
    Serial.println("[I2C] MPU6050 detected at 0x68. Initializing...");
    if (mpu.begin(0x68, &Wire)) {
      Serial.println("[MPU6050] Connected successfully");
      mpu.setAccelerometerRange(MPU6050_RANGE_2_G);
      mpu.setGyroRange(MPU6050_RANGE_250_DEG);
      mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);
      mpuAvailable = true;
    } else {
      Serial.println("[ERROR] MPU6050 begin failed! Running in motion simulation fallback mode.");
      mpuAvailable = false;
    }
  } else {
    Serial.println("[I2C] MPU6050 not found at 0x68! Running in motion simulation fallback mode.");
    mpuAvailable = false;
  }

  // Init Piezo ADC Pin
  pinMode(PIEZO_PIN, INPUT);
  analogReadResolution(12); // 12-bit ADC (0 - 4095)
}

void initBLE() {
  BLEDevice::init("LungPatch-Chest");
  delay(200); // Give native radio stack a moment to settle
  
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create primary service with 30 handles to fit multiple characteristics/descriptors safely
  BLEService *pService = pServer->createService(BLEUUID(String(SERVICE_UUID)), 30);

  // Audio Characteristic
  pAudioCharacteristic = pService->createCharacteristic(
    BLEUUID(String(CHAR_AUDIO_UUID)),
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pAudioCharacteristic->addDescriptor(new BLE2902());

  // Motion Characteristic
  pMotionCharacteristic = pService->createCharacteristic(
    BLEUUID(String(CHAR_MOTION_UUID)),
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pMotionCharacteristic->addDescriptor(new BLE2902());

  // Piezo Characteristic
  pPiezoCharacteristic = pService->createCharacteristic(
    BLEUUID(String(CHAR_PIEZO_UUID)),
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pPiezoCharacteristic->addDescriptor(new BLE2902());

  pService->start();
  
  // Start advertising using highly compatible library defaults (registers name and UUID automatically)
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);  // Help with connection parameters
  pAdvertising->setMaxPreferred(0x12);
  
  BLEDevice::startAdvertising();
  Serial.println("[BLE] Chest Unit BLE Advertising Started...");
}

// --- Processing & DSP Filtering ---

// Lightweight DSP Filter: DC Offset removal, 100Hz HPF, 2000Hz LPF
int16_t processAudioSample(int32_t rawSample) {
  // SPH0645 outputs 18-bit data in a 32-bit word. Shift right to align.
  float x = (float)(rawSample >> 14);

  // 1. DC Offset Removal (DC Blocker)
  dc_offset = 0.995 * dc_offset + 0.005 * x;
  float x_no_dc = x - dc_offset;

  // 2. High-pass Filter at 100 Hz (fs=8000Hz, fc=100Hz)
  // Alpha = RC / (RC + dt)
  // fc = 1 / (2 * pi * RC) -> RC = 1 / (2 * pi * 100) = 0.00159
  // dt = 1 / 8000 = 0.000125
  // Alpha_HPF = 0.00159 / (0.00159 + 0.000125) = 0.927
  float alpha_hpf = 0.927f;
  float y_hpf = alpha_hpf * (last_hpf_audio + x_no_dc - last_raw_audio);
  last_raw_audio = x_no_dc;
  last_hpf_audio = y_hpf;

  // 3. Low-pass Filter at 2000 Hz (fs=8000Hz, fc=2000Hz)
  // dt = 0.000125
  // RC = 1 / (2 * pi * 2000) = 0.0000795
  // Alpha_LPF = dt / (RC + dt) = 0.000125 / (0.0000795 + 0.000125) = 0.611
  float alpha_lpf = 0.611f;
  float y_lpf = last_lpf_audio + alpha_lpf * (y_hpf - last_lpf_audio);
  last_lpf_audio = y_lpf;

  // Clip and return as signed 16-bit integer
  if (y_lpf > 32767.0f) return 32767;
  if (y_lpf < -32768.0f) return -32768;
  return (int16_t)y_lpf;
}

// Moving average for motion sensors (reducing muscle and motion noise)
void processMotion(float &ax, float &ay, float &az) {
  mpuHistoryX[mpuHistoryIdx] = ax;
  mpuHistoryY[mpuHistoryIdx] = ay;
  mpuHistoryZ[mpuHistoryIdx] = az;
  mpuHistoryIdx = (mpuHistoryIdx + 1) % MOVING_AVG_LEN;

  float sumX = 0, sumY = 0, sumZ = 0;
  for (int i = 0; i < MOVING_AVG_LEN; i++) {
    sumX += mpuHistoryX[i];
    sumY += mpuHistoryY[i];
    sumZ += mpuHistoryZ[i];
  }
  ax = sumX / MOVING_AVG_LEN;
  ay = sumY / MOVING_AVG_LEN;
  az = sumZ / MOVING_AVG_LEN;
}

// Moving average & Adaptive Peak Detection for Respiratory Rate
void processPiezo() {
  uint32_t val = 2048;
#if ENABLE_PHYSICAL_HARDWARE
  val = analogRead(PIEZO_PIN);
#else
  // Generate simulated breath signal peak variation
  static float angle = 0;
  angle += 0.05f;
  val = 2048 + (uint32_t)(500 * sin(angle));
#endif

  // Moving Average Filter
  piezoSum -= piezoHistory[piezoHistoryIdx];
  piezoHistory[piezoHistoryIdx] = val;
  piezoSum += val;
  piezoHistoryIdx = (piezoHistoryIdx + 1) % PIEZO_AVG_LEN;
  uint32_t smoothedVal = piezoSum / PIEZO_AVG_LEN;

  // Adaptive Threshold (slow follower of amplitude)
  piezoAdaptiveThreshold = (uint32_t)(0.999f * piezoAdaptiveThreshold + 0.001f * smoothedVal);

  // Peak detection (detect chest expansion vibration peaks)
  unsigned long now = millis();
  peakDetectedFlag = false;
  
  // If smoothed signal is significantly above threshold and refractory period (1.5s) has passed
  if (smoothedVal > (piezoAdaptiveThreshold + 150) && (now - lastPeakTime > 1500)) {
    peakDetectedFlag = true;
    unsigned long breathInterval = now - lastPeakTime;
    lastPeakTime = now;

    // Convert interval (ms) to Breaths Per Minute (BPM)
    if (breathInterval > 0) {
      float instantBPM = 60000.0f / breathInterval;
      // Limit to medical ranges (8 to 40 breaths/minute)
      if (instantBPM >= 8.0f && instantBPM <= 40.0f) {
        // Exponential smoothing on Breathing Rate
        breathingRateBPM = (uint8_t)(0.7f * breathingRateBPM + 0.3f * instantBPM);
      }
    }
  }

  // Send Piezo telemetry over BLE at regular intervals (approx 20 Hz)
  static unsigned long lastPiezoSend = 0;
  if (deviceConnected && (now - lastPiezoSend > 50)) {
    lastPiezoSend = now;
    uint8_t piezoPayload[4];
    // raw value (16-bit)
    piezoPayload[0] = (uint8_t)(smoothedVal & 0xFF);
    piezoPayload[1] = (uint8_t)((smoothedVal >> 8) & 0xFF);
    // breathing rate (8-bit)
    piezoPayload[2] = breathingRateBPM;
    // peak detected flag (8-bit)
    piezoPayload[3] = peakDetectedFlag ? 1 : 0;

    pPiezoCharacteristic->setValue(piezoPayload, 4);
    pPiezoCharacteristic->notify();
  }
}

// --- Main Program ---

void setup() {
  Serial.begin(115200);
  
  // Wait up to 2.5 seconds for native USB serial monitor to connect
  unsigned long startSerial = millis();
  while (!Serial && (millis() - startSerial < 2500)) {
    delay(10);
  }
  
  Serial.println("=========================================");
  Serial.println("  AI Lung Patch Chest ESP32 Initializing");
  Serial.println("=========================================");

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);

  // Initialize BLE first to ensure the device is visible immediately
  initBLE();

#if ENABLE_PHYSICAL_HARDWARE
  // Initialize Microphone (non-blocking I2S)
  initI2S();

  // Safe initialize I2C and sensors
  initSensors();
#else
  Serial.println("[DIAGNOSTIC] Physical hardware disabled for BLE test. Running in simulation mode.");
  i2sAvailable = false;
  mpuAvailable = false;
#endif
  
  Serial.println("[SYSTEM] Chest Unit setup complete.");
}

void loop() {
  // 1. Read SPH0645 Audio over I2S
  int32_t rawAudioSample = 0;
  size_t bytesRead = 0;
  
  if (i2sAvailable) {
    // Non-blocking read of 1 sample (4 bytes) using Next-Gen channel read
    esp_err_t err = i2s_channel_read(rx_handle, &rawAudioSample, sizeof(rawAudioSample), &bytesRead, 0);
    
    if (err == ESP_OK && bytesRead > 0) {
      int16_t filteredSample = processAudioSample(rawAudioSample);
      
      // Store in buffer
      audioBuffer[audioBufferIdx++] = filteredSample;

      // When buffer is full, transmit via BLE
      if (audioBufferIdx >= AUDIO_BUF_SIZE) {
        if (deviceConnected) {
          pAudioCharacteristic->setValue((uint8_t*)audioBuffer, AUDIO_BUF_SIZE * sizeof(int16_t));
          pAudioCharacteristic->notify();
        }
        audioBufferIdx = 0;
      }
    }
  } else {
    // Generate simulated breathing audio if mic is absent
    static unsigned long lastAudioSend = 0;
    unsigned long nowAudio = millis();
    if (deviceConnected && (nowAudio - lastAudioSend > 100)) {
      lastAudioSend = nowAudio;
      // Generate simulated breath sound (noise modulated by a slow breathing envelope)
      static float envelopeTime = 0;
      envelopeTime += 0.05f;
      float envelope = sin(envelopeTime);
      if (envelope < 0) envelope = 0;
      
      for (int i = 0; i < AUDIO_BUF_SIZE; i++) {
        audioBuffer[i] = (int16_t)(random(-2000, 2000) * envelope);
      }
      pAudioCharacteristic->setValue((uint8_t*)audioBuffer, AUDIO_BUF_SIZE * sizeof(int16_t));
      pAudioCharacteristic->notify();
    }
  }

  // 2. Read MPU6050 Motion Data (approx 20 Hz throttle)
  static unsigned long lastMotionRead = 0;
  unsigned long now = millis();
  if (now - lastMotionRead > 50) {
    lastMotionRead = now;
    
    float ax = 0, ay = 0, az = 0;
    float roll = 0, pitch = 0;
    bool hasData = false;

    if (mpuAvailable) {
      sensors_event_t a, g, temp;
      if (mpu.getEvent(&a, &g, &temp)) {
        ax = a.acceleration.x;
        ay = a.acceleration.y;
        az = a.acceleration.z;
        hasData = true;
      }
    } else {
      // Simulate slight idle noise so interface gets updates
      static float timeAngle = 0;
      timeAngle += 0.05f;
      ax = 0.1f * sin(timeAngle);
      ay = 0.1f * cos(timeAngle);
      az = 9.8f + 0.1f * sin(timeAngle * 1.5f);
      hasData = true;
    }

    if (hasData) {
      // Filter out high-frequency movement noise
      processMotion(ax, ay, az);

      // Estimate simple orientation angles (Roll and Pitch)
      roll = atan2(ay, az) * 180.0f / PI;
      pitch = atan2(-ax, sqrt(ay * ay + az * az)) * 180.0f / PI;

      if (deviceConnected) {
        // Send as float array payload (5 values = 20 bytes)
        float motionPayload[5] = { ax, ay, az, roll, pitch };
        pMotionCharacteristic->setValue((uint8_t*)motionPayload, sizeof(motionPayload));
        pMotionCharacteristic->notify();
      }
    }
  }

  // 3. Read and process Piezo analog data
  processPiezo();

  // Blink / status LED logic
  static unsigned long lastLEDBlink = 0;
  static bool ledState = false;
  if (deviceConnected) {
    digitalWrite(LED_BUILTIN, HIGH);
  } else {
    if (now - lastLEDBlink > 250) {
      lastLEDBlink = now;
      ledState = !ledState;
      digitalWrite(LED_BUILTIN, ledState ? HIGH : LOW);
    }
  }
  
  // Tiny delay to prevent CPU saturation while maintaining audio sampling
  delayMicroseconds(10);
}
