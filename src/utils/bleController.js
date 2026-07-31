// src/utils/bleController.js
// Manages Web Bluetooth Connections and fallback Simulation Feed (Decoupled from DB/Firebase)

import { AudioProcessor } from './audioProcessor.js';
import { TelemetryEngineInstance } from './mockData.js';

export class BLEController {
  constructor() {
    this.chestDevice = null;
    this.handDevice = null;
    this.chestServer = null;
    this.handServer = null;

    // Service & Characteristic references
    this.chestService = null;
    this.handService = null;

    // Connection states: 'disconnected', 'scanning', 'connecting', 'connected'
    this.chestState = 'disconnected';
    this.handState = 'disconnected';

    // Battery levels
    this.chestBattery = 100;
    this.handBattery = 100;

    // Listeners for incoming sensor data
    this.listeners = new Set();

    // Raw data buffers for graphing & processing
    this.data = {
      heartRate: 0,
      spo2: 0,
      breathingRate: 0,
      accel: { x: 0, y: 0, z: 0 },
      orientation: { roll: 0, pitch: 0 },
      piezo: 0,
      piezoPeak: false,
      ppgWave: [], // raw PPG wave samples for live graphing
      audioChunk: [], // raw audio samples
    };

    // Instantiate Audio Processor
    this.audioProcessor = new AudioProcessor();
    // 3-second audio buffer at 16000 Hz (48,000 samples)
    this.audioBufferSize = 48000;
    this.audioBuffer = new Float32Array(this.audioBufferSize);
    this.audioBufferWriteIdx = 0;
    this.isAudioBufferFilled = false;

    // Simulation parameters
    this.isSimulating = false;
    this.simInterval = null;
    this.simTime = 0;

    // Default configuration variables
    this.chestServiceUUID = "a4e00000-12fd-47be-8547-a7d2c42b9800";
    this.audioCharUUID = "a4e00001-12fd-47be-8547-a7d2c42b9800";
    this.motionCharUUID = "a4e00002-12fd-47be-8547-a7d2c42b9800";
    this.piezoCharUUID = "a4e00003-12fd-47be-8547-a7d2c42b9800";

    this.handServiceUUID = "b4e00000-12fd-47be-8547-a7d2c42b9800";
    this.vitalsCharUUID = "b4e00001-12fd-47be-8547-a7d2c42b9800";
  }

  // Subscribe components to telemetry updates
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(type) {
    this.listeners.forEach(cb => cb(this.data, type));
  }

  // Toggle Simulation Mode
  startSimulation(type = "Normal") {
    if (this.simInterval) clearInterval(this.simInterval);
    this.isSimulating = true;
    this.chestState = 'connected';
    this.handState = 'connected';
    this.chestBattery = 92;
    this.handBattery = 88;
    this.simTime = 0;

    // Disconnect default database (Firebase) during simulation
    TelemetryEngineInstance.disconnectFirebase();

    // Establish biological target parameters based on the desired disease type
    let targetHR = 72;
    let targetSpO2 = 98;
    let targetBR = 14;
    let soundType = "normal";

    if (type === "Asthma") {
      targetHR = 94;
      targetSpO2 = 93;
      targetBR = 22;
      soundType = "wheeze";
    } else if (type === "COPD") {
      targetHR = 88;
      targetSpO2 = 87;
      targetBR = 24;
      soundType = "crackles_wheeze";
    } else if (type === "Pneumonia") {
      targetHR = 104;
      targetSpO2 = 89;
      targetBR = 28;
      soundType = "coarse_crackles";
    } else if (type === "Post-COVID") {
      targetHR = 82;
      targetSpO2 = 94;
      targetBR = 18;
      soundType = "fine_crackles";
    }

    this.data.heartRate = targetHR;
    this.data.spo2 = targetSpO2;
    this.data.breathingRate = targetBR;

    // Start 40Hz simulation updates
    this.simInterval = setInterval(() => {
      this.simTime += 0.025; // 25ms steps

      // Apply natural biological variations to HR/SpO2/BreathingRate
      if (Math.random() < 0.02) {
        this.data.heartRate = targetHR + Math.round((Math.random() - 0.5) * 4);
        this.data.spo2 = Math.min(100, targetSpO2 + Math.round((Math.random() - 0.5) * 1.5));
        this.data.breathingRate = targetBR + Math.round((Math.random() - 0.5) * 1.5);
      }

      // 1. Simulate PPG wave: dicrotic notch shape
      const ppgPeriod = 60 / this.data.heartRate; // seconds per beat
      const ppgPhase = (this.simTime % ppgPeriod) / ppgPeriod;
      let ppgVal = 0;
      if (ppgPhase < 0.3) {
        ppgVal = Math.sin((ppgPhase / 0.3) * Math.PI) * 100;
      } else if (ppgPhase < 0.5) {
        ppgVal = 20 + Math.sin(((ppgPhase - 0.3) / 0.2) * Math.PI) * 30;
      } else {
        ppgVal = Math.max(0, 20 * (1 - (ppgPhase - 0.5) / 0.5));
      }
      this.data.ppgWave.push(ppgVal + Math.random() * 2);
      if (this.data.ppgWave.length > 200) this.data.ppgWave.shift();

      // 2. Simulate Piezo breathing signal
      const brPeriod = 60 / this.data.breathingRate;
      const brPhase = (this.simTime % brPeriod) / brPeriod;
      const piezoVal = Math.sin(brPhase * 2 * Math.PI) * 1000 + 2048;
      this.data.piezo = piezoVal + Math.random() * 10;
      
      // Peak detection
      if (brPhase > 0.23 && brPhase < 0.28) {
        this.data.piezoPeak = true;
      } else {
        this.data.piezoPeak = false;
      }

      // 3. Simulate Accelerometer & Chest Motion
      const breathingAngle = Math.sin(brPhase * 2 * Math.PI) * 2.0;
      this.data.accel.x = (Math.random() - 0.5) * 0.1;
      this.data.accel.y = breathingAngle * 0.05 + (Math.random() - 0.5) * 0.1;
      this.data.accel.z = 9.8 + (Math.random() - 0.5) * 0.1;
      this.data.orientation.roll = (Math.random() - 0.5) * 1.0;
      this.data.orientation.pitch = breathingAngle + (Math.random() - 0.5) * 1.0;

      // 4. Simulate Audio Data
      const samplesCount = 100;
      const tempAudioChunk = new Int16Array(samplesCount);
      for (let i = 0; i < samplesCount; i++) {
        const t = this.simTime + i / 8000;
        let s = 0;
        
        const breathAmplitude = Math.max(0, Math.sin((t % brPeriod) / brPeriod * 2 * Math.PI));
        let breathNoise = (Math.random() - 0.5) * 500 * breathAmplitude;
        
        if (soundType === "wheeze" && breathAmplitude > 0.4) {
          breathNoise += Math.sin(2 * Math.PI * 650 * t) * 2500 * breathAmplitude;
          breathNoise += Math.sin(2 * Math.PI * 1300 * t) * 800 * breathAmplitude;
        } else if (soundType === "coarse_crackles" && breathAmplitude > 0.2) {
          if (Math.random() < 0.05) {
            breathNoise += (Math.random() - 0.5) * 12000 * Math.exp(-100 * (t % 0.02));
          }
        } else if (soundType === "fine_crackles" && breathAmplitude > 0.3) {
          if (Math.random() < 0.08) {
            breathNoise += (Math.random() - 0.5) * 8000 * Math.exp(-400 * (t % 0.005));
          }
        } else if (soundType === "crackles_wheeze") {
          if (breathAmplitude > 0.4) {
            breathNoise += Math.sin(2 * Math.PI * 350 * t) * 1500 * breathAmplitude;
          }
          if (Math.random() < 0.04 && breathAmplitude > 0.1) {
            breathNoise += (Math.random() - 0.5) * 9000 * Math.exp(-200 * (t % 0.015));
          }
        }

        tempAudioChunk[i] = Math.max(-32768, Math.min(32767, Math.round(breathNoise)));
      }

      this.processIncomingAudio(tempAudioChunk);
      this.notifyListeners('sensor');
    }, 25);
  }

  stopSimulation() {
    this.isSimulating = false;
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
    this.chestState = 'disconnected';
    this.handState = 'disconnected';
    this.notifyListeners('connection');

    // Reconnect default database (Firebase) when simulation ends
    TelemetryEngineInstance.connectFirebase();
  }

  // --- Web Bluetooth Connection API ---

  async connectChest() {
    if (this.isSimulating) this.stopSimulation();
    
    try {
      this.chestState = 'scanning';
      this.notifyListeners('connection');

      console.log("[BLE] Requesting Chest Unit...");
      this.chestDevice = await navigator.bluetooth.requestDevice({
        filters: [
          { name: "LungPatch-Chest" },
          { services: [this.chestServiceUUID] }
        ],
        optionalServices: [this.chestServiceUUID]
      });

      this.chestState = 'connecting';
      this.notifyListeners('connection');

      this.chestDevice.addEventListener('gattserverdisconnected', () => {
        this.chestState = 'disconnected';
        this.notifyListeners('connection');
        console.log("[BLE] Chest device disconnected.");
      });

      this.chestServer = await this.chestDevice.gatt.connect();
      this.chestService = await this.chestServer.getPrimaryService(this.chestServiceUUID);

      // Audio Characteristic Notify
      const audioChar = await this.chestService.getCharacteristic(this.audioCharUUID);
      await audioChar.startNotifications();
      audioChar.addEventListener('characteristicvaluechanged', (e) => {
        const val = e.target.value;
        const pcmData = new Int16Array(val.buffer);
        this.processIncomingAudio(pcmData);
      });

      // Motion Characteristic Notify
      const motionChar = await this.chestService.getCharacteristic(this.motionCharUUID);
      await motionChar.startNotifications();
      motionChar.addEventListener('characteristicvaluechanged', (e) => {
        const val = e.target.value;
        const floats = new Float32Array(val.buffer);
        if (floats.length >= 5) {
          this.data.accel.x = floats[0];
          this.data.accel.y = floats[1];
          this.data.accel.z = floats[2];
          this.data.orientation.roll = floats[3];
          this.data.orientation.pitch = floats[4];
          this.notifyListeners('sensor');
        }
      });

      // Piezo Characteristic Notify
      const piezoChar = await this.chestService.getCharacteristic(this.piezoCharUUID);
      await piezoChar.startNotifications();
      piezoChar.addEventListener('characteristicvaluechanged', (e) => {
        const val = e.target.value;
        const rawView = new DataView(val.buffer);
        if (rawView.byteLength >= 4) {
          this.data.piezo = rawView.getUint16(0, true);
          this.data.breathingRate = rawView.getUint8(2);
          this.data.piezoPeak = rawView.getUint8(3) === 1;
          this.notifyListeners('sensor');
        }
      });

      this.chestState = 'connected';
      this.chestBattery = 98;
      this.notifyListeners('connection');
      console.log("[BLE] Chest Unit connected!");

    } catch (err) {
      this.chestState = 'disconnected';
      this.notifyListeners('connection');
      console.error("[BLE] Connection failed:", err);
      throw err;
    }
  }

  disconnectChest() {
    console.log("[BLE] Disconnecting Chest Unit...");
    if (this.chestDevice && this.chestDevice.gatt.connected) {
      this.chestDevice.gatt.disconnect();
    }
    this.chestState = 'disconnected';
    this.notifyListeners('connection');
  }

  async connectHand() {
    if (this.isSimulating) this.stopSimulation();

    try {
      this.handState = 'scanning';
      this.notifyListeners('connection');

      console.log("[BLE] Requesting Hand Unit...");
      this.handDevice = await navigator.bluetooth.requestDevice({
        filters: [
          { name: "LungPatch-Hand" },
          { services: [this.handServiceUUID] }
        ],
        optionalServices: [this.handServiceUUID]
      });

      this.handState = 'connecting';
      this.notifyListeners('connection');

      this.handDevice.addEventListener('gattserverdisconnected', () => {
        this.handState = 'disconnected';
        this.notifyListeners('connection');
        console.log("[BLE] Hand device disconnected.");
      });

      this.handServer = await this.handDevice.gatt.connect();
      this.handService = await this.handServer.getPrimaryService(this.handServiceUUID);

      const vitalsChar = await this.handService.getCharacteristic(this.vitalsCharUUID);
      await vitalsChar.startNotifications();
      vitalsChar.addEventListener('characteristicvaluechanged', (e) => {
        const val = e.target.value;
        const view = new DataView(val.buffer);
        if (view.byteLength >= 6) {
          this.data.heartRate = view.getUint8(0);
          this.data.spo2 = view.getUint8(1);
          const rawPPG = view.getUint32(2, true);
          
          this.data.ppgWave.push(rawPPG);
          if (this.data.ppgWave.length > 200) this.data.ppgWave.shift();
          this.notifyListeners('sensor');
        }
      });

      this.handState = 'connected';
      this.handBattery = 95;
      this.notifyListeners('connection');
      console.log("[BLE] Hand Unit connected!");

    } catch (err) {
      this.handState = 'disconnected';
      this.notifyListeners('connection');
      console.error("[BLE] Connection failed:", err);
      throw err;
    }
  }

  disconnectHand() {
    console.log("[BLE] Disconnecting Hand Unit...");
    if (this.handDevice && this.handDevice.gatt.connected) {
      this.handDevice.gatt.disconnect();
    }
    this.handState = 'disconnected';
    this.notifyListeners('connection');
  }

  processIncomingAudio(pcmDataInt16) {
    const upsampled = this.audioProcessor.upsampleTo16kHz(pcmDataInt16);
    this.data.audioChunk = Array.from(upsampled);

    for (let i = 0; i < upsampled.length; i++) {
      this.audioBuffer[this.audioBufferWriteIdx] = upsampled[i];
      this.audioBufferWriteIdx++;

      if (this.audioBufferWriteIdx >= this.audioBufferSize) {
        this.audioBufferWriteIdx = 0;
        this.isAudioBufferFilled = true;
      }
    }
  }

  getContiguousAudioBuffer() {
    if (!this.isAudioBufferFilled) {
      const out = new Float32Array(this.audioBufferSize);
      out.set(this.audioBuffer.subarray(0, this.audioBufferWriteIdx));
      return out;
    }

    const out = new Float32Array(this.audioBufferSize);
    const part2 = this.audioBuffer.subarray(this.audioBufferWriteIdx);
    out.set(part2, 0);
    const part1 = this.audioBuffer.subarray(0, this.audioBufferWriteIdx);
    out.set(part1, part2.length);

    return out;
  }
}

export const BLEControllerInstance = new BLEController();
window.bleController = BLEControllerInstance;
