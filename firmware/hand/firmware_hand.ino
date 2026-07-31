/*
 * AI Lung Patch - Hand Unit Firmware
 * Target Hardware: ESP32-S3 Mini
 * Sensors:
 *  - MAX30102 Pulse Oximeter & Heart Rate (I2C)
 * Communication: Bluetooth Low Energy (BLE) Only
 */

#include <Arduino.h>
#define ENABLE_PHYSICAL_HARDWARE 0  // Diagnostic: Set to 0 to disable physical sensor and run pure BLE simulation
#include <Wire.h>
#include "MAX30105.h" // SparkFun MAX3010x library (works perfectly with MAX30102)
#include "heartRate.h"
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// --- Pin Definitions ---
#define I2C_SDA       8
#define I2C_SCL       9

// --- BLE UUIDs ---
#define SERVICE_UUID           "b4e00000-12fd-47be-8547-a7d2c42b9800"
#define CHAR_VITALS_UUID       "b4e00001-12fd-47be-8547-a7d2c42b9800"

// --- Global Variables ---
MAX30105 particleSensor;
bool deviceConnected = false;
bool sensorAvailable = false;

#ifndef LED_BUILTIN
#define LED_BUILTIN 2
#endif

// BLE Characteristics
BLECharacteristic *pVitalsCharacteristic = nullptr;

// DSP / Smoothing buffers
#define FILTER_SIZE 8
uint32_t irBuffer[100]; // raw IR data
uint32_t redBuffer[100]; // raw Red data

// Moving averages for display
uint8_t smoothHeartRate = 72;
uint8_t smoothSpO2 = 98;
uint32_t lastPPGValue = 0;

// Algorithm parameters
long lastBeatTime = 0;
float beatsPerMinute = 75;
int beatCount = 0;

// BLE Connection Callbacks
class MyServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("[BLE] Client connected to Hand Unit");
  }

  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("[BLE] Client disconnected from Hand Unit");
    pServer->startAdvertising();
    Serial.println("[BLE] Advertising restarted");
  }
};

void initSensors() {
  Wire.begin(I2C_SDA, I2C_SCL);
  Wire.setTimeOut(100); // Prevent hanging if I2C is floating

  // Scan address 0x57 to verify sensor presence safely
  Wire.beginTransmission(0x57);
  if (Wire.endTransmission() == 0) {
    Serial.println("[I2C] MAX30102 detected at 0x57. Initializing...");
    if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
      Serial.println("[MAX30102] Connected successfully.");
      
      // Configure sensor with standard settings
      byte ledBrightness = 60; 
      byte sampleAverage = 4;   
      byte ledMode = 2;        
      byte sampleRate = 100;   
      int pulseWidth = 411;    
      int adcRange = 4096;     

      particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
      sensorAvailable = true;
    } else {
      Serial.println("[ERROR] MAX30102 begin failed! Running in simulation fallback mode.");
      sensorAvailable = false;
    }
  } else {
    Serial.println("[I2C] MAX30102 not found at 0x57! Running in simulation fallback mode.");
    sensorAvailable = false;
  }
}

void initBLE() {
  BLEDevice::init("LungPatch-Hand");
  delay(200); // Settle time
  
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create primary service
  BLEService *pService = pServer->createService(BLEUUID(String(SERVICE_UUID)));

  // Vitals Characteristic
  pVitalsCharacteristic = pService->createCharacteristic(
    BLEUUID(String(CHAR_VITALS_UUID)),
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pVitalsCharacteristic->addDescriptor(new BLE2902());

  pService->start();
  
  // Start advertising using highly compatible library defaults (registers name and UUID automatically)
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMaxPreferred(0x12);
  
  BLEDevice::startAdvertising();
  Serial.println("[BLE] Hand Unit BLE Advertising Started...");
}

// Simple SpO2 and Heart Rate DSP
void runOximeterAlgorithm() {
  if (!sensorAvailable) {
    // Simulate oximeter data if sensor is physically absent
    static unsigned long lastUpdate = 0;
    unsigned long now = millis();
    if (now - lastUpdate > 1000) {
      lastUpdate = now;
      smoothHeartRate = 72 + random(-2, 3);
      smoothSpO2 = 98 + random(-1, 2);
      if (smoothSpO2 > 100) smoothSpO2 = 100;
    }
    static float angle = 0;
    angle += 0.2f;
    lastPPGValue = (uint32_t)(50000 + 10000 * sin(angle));
    return;
  }
  long irValue = particleSensor.getIR();
  long redValue = particleSensor.getRed();

  // If no finger is detected
  if (irValue < 50000) {
    smoothHeartRate = 0;
    smoothSpO2 = 0;
    lastPPGValue = 0;
    return;
  }

  // 1. Smooth the PPG Signal (Low Pass Moving Average)
  static long irHistory[FILTER_SIZE] = {0};
  static long redHistory[FILTER_SIZE] = {0};
  static int historyIdx = 0;

  irHistory[historyIdx] = irValue;
  redHistory[historyIdx] = redValue;
  historyIdx = (historyIdx + 1) % FILTER_SIZE;

  long avgIR = 0;
  long avgRed = 0;
  for(int i = 0; i < FILTER_SIZE; i++) {
    avgIR += irHistory[i];
    avgRed += redHistory[i];
  }
  avgIR /= FILTER_SIZE;
  avgRed /= FILTER_SIZE;

  // We expose the raw smoothed IR value for drawing the PPG pulse wave in the browser
  lastPPGValue = (uint32_t)avgIR;

  // 2. Heart Rate Beat Detection
  if (checkForBeat(avgIR) == true) {
    long delta = millis() - lastBeatTime;
    lastBeatTime = millis();

    beatsPerMinute = 60000.0 / delta;

    if (beatsPerMinute > 40.0 && beatsPerMinute < 180.0) {
      // Exponential moving average for heart rate smoothing
      smoothHeartRate = (uint8_t)(0.8f * smoothHeartRate + 0.2f * beatsPerMinute);
      beatCount++;
    }
  }

  // 3. SpO2 Calculation based on AC/DC components (Ratio of Ratios)
  // We compute the min/max values over a sliding window of beats to estimate AC & DC
  static long irMax = 0, irMin = 999999;
  static long redMax = 0, redMin = 999999;
  static int sampleCount = 0;

  sampleCount++;
  if (avgIR > irMax) irMax = avgIR;
  if (avgIR < irMin) irMin = avgIR;
  if (avgRed > redMax) redMax = avgRed;
  if (avgRed < redMin) redMin = avgRed;

  // Reset search window every 100 samples (approx 4 seconds at 25 Hz processing)
  if (sampleCount >= 100) {
    long acRed = redMax - redMin;
    long dcRed = redMin;
    long acIR = irMax - irMin;
    long dcIR = irMin;

    if (dcRed > 0 && dcIR > 0 && acIR > 0) {
      float r = ((float)acRed / dcRed) / ((float)acIR / dcIR);
      // Calibrated formula for MAX30102: SpO2 = 110 - 25 * R
      float spo2Val = 110.0f - 25.0f * r;
      
      if (spo2Val > 100.0f) spo2Val = 100.0f;
      if (spo2Val < 70.0f) spo2Val = 70.0f;

      // Filter SpO2 response
      if (smoothSpO2 == 0) {
        smoothSpO2 = (uint8_t)spo2Val;
      } else {
        smoothSpO2 = (uint8_t)(0.9f * smoothSpO2 + 0.1f * spo2Val);
      }
    }

    // Reset window min/max bounds
    irMax = 0; irMin = 999999;
    redMax = 0; redMin = 999999;
    sampleCount = 0;
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("=========================================");
  Serial.println("  AI Lung Patch Hand ESP32 Initializing");
  Serial.println("=========================================");

  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, LOW);
  
  // Initialize BLE first to ensure the device is visible immediately
  initBLE();
  
#if ENABLE_PHYSICAL_HARDWARE
  // Initialize physical sensors (could block or fail if not connected)
  initSensors();
#else
  Serial.println("[DIAGNOSTIC] Physical hardware disabled for BLE test. Running in simulation mode.");
  sensorAvailable = false;
#endif

  Serial.println("[SYSTEM] Hand Unit setup complete.");
}

void loop() {
  // Read and process oximeter metrics
  runOximeterAlgorithm();

  // Send Vitals packet over BLE at 25 Hz
  static unsigned long lastBLESend = 0;
  unsigned long now = millis();
  if (now - lastBLESend > 40) {
    lastBLESend = now;

    if (deviceConnected) {
      // Vitals Characteristic payload:
      // [HeartRate (1 byte), SpO2 (1 byte), RawPPG (4 bytes)] -> Total 6 bytes
      uint8_t vitalsPayload[6];
      vitalsPayload[0] = smoothHeartRate;
      vitalsPayload[1] = smoothSpO2;
      vitalsPayload[2] = (uint8_t)(lastPPGValue & 0xFF);
      vitalsPayload[3] = (uint8_t)((lastPPGValue >> 8) & 0xFF);
      vitalsPayload[4] = (uint8_t)((lastPPGValue >> 16) & 0xFF);
      vitalsPayload[5] = (uint8_t)((lastPPGValue >> 24) & 0xFF);

      pVitalsCharacteristic->setValue(vitalsPayload, 6);
      pVitalsCharacteristic->notify();
    }
  }

  // Status LED blinking/solid logic
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

  // Brief delay to allow background BLE routines to execute smoothly
  delay(1);
}
