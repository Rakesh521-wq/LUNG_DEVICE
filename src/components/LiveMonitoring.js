// src/components/LiveMonitoring.js
// Real-Time Sensor Oscilloscopes & Running Spectrogram Waterfall

import { BLEControllerInstance } from '../utils/bleController.js';

export class LiveMonitoring {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.unsubscribe = null;
    this.animationId = null;

    // Canvas references
    this.audioCanvas = null;
    this.spectrogramCanvas = null;
    this.motionCanvas = null;
    this.piezoCanvas = null;
    this.ppgCanvas = null;

    // Buffer arrays for visualization
    this.audioWaveData = new Float32Array(500); // rolling display buffer
    this.piezoWaveData = [];
    this.ppgWaveData = [];
    this.motionWaveData = { x: [], y: [], z: [] };

    // Canvas size tracking
    this.dpr = window.devicePixelRatio || 1;
  }

  render() {
    this.container.innerHTML = `
      <div class="view-header">
        <div class="header-title-container">
          <h1>Live Sensor Telemetry</h1>
          <p>Real-Time Physiological Oscilloscopes & Micro-Acoustic Spectrum Analyzers</p>
        </div>
        <div class="header-actions">
          <div class="live-telemetry-badge-mini">
            <span class="pulse-badge active" id="live-monitoring-indicator"></span> 
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--color-secondary);" id="live-feed-text">Telemetry In Standby</span>
          </div>
        </div>
      </div>

      <div class="dashboard-grid">
        
        <!-- Lung Sound Waveform (Col 8) -->
        <div class="col-8 glass-panel dashboard-card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-wave-square text-primary"></i> Filtered Lung Audio Waveform</h3>
            <span class="text-mono text-secondary" style="font-size: 0.75rem;">16 kHz mono (interpolated)</span>
          </div>
          <div class="waveform-container" style="height: 160px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--border-color); overflow: hidden; position: relative;">
            <canvas id="live-audio-waveform" style="width: 100%; height: 100%; display: block;"></canvas>
          </div>
        </div>

        <!-- Heart Rate PPG Pulse Waveform (Col 4) -->
        <div class="col-4 glass-panel dashboard-card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-heart-pulse text-critical"></i> Photoplethysmogram (PPG) Wave</h3>
            <span class="text-mono text-secondary" style="font-size: 0.75rem;">MAX30102 IR LED</span>
          </div>
          <div class="waveform-container" style="height: 160px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--border-color); overflow: hidden; position: relative;">
            <canvas id="live-ppg-waveform" style="width: 100%; height: 100%; display: block;"></canvas>
          </div>
        </div>

        <!-- Real-Time Lung Audio Spectrogram Waterfall (Col 8) -->
        <div class="col-8 glass-panel dashboard-card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-volume-up text-accent"></i> Real-time Acoustic Spectrogram Waterfall</h3>
            <span class="text-mono text-secondary" style="font-size: 0.75rem;">FFT Resolution: 1024 bins</span>
          </div>
          <div class="waveform-container" style="height: 220px; background: rgba(0,0,0,0.4); border-radius: 8px; border: 1px solid var(--border-color); overflow: hidden; position: relative;">
            <canvas id="live-audio-spectrogram" style="width: 100%; height: 100%; display: block;"></canvas>
            
            <!-- Frequency Labels overlay -->
            <div style="position: absolute; left: 8px; top: 8px; display: flex; flex-direction: column; gap: 4px; font-size: 0.65rem; font-family: monospace; color: rgba(255,255,255,0.5); pointer-events: none; height: calc(100% - 16px); justify-content: space-between;">
              <span>4000 Hz</span>
              <span>2000 Hz</span>
              <span>1000 Hz</span>
              <span>100 Hz</span>
            </div>
          </div>
        </div>

        <!-- Chest Motion & Piezo Sensors (Col 4) -->
        <div class="col-4 glass-panel dashboard-card" style="display: flex; flex-direction: column; gap: 14px;">
          <!-- Piezo Section -->
          <div style="flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <h4 style="margin: 0; font-size: 0.85rem; font-weight: 700; color: var(--text-primary);"><i class="fas fa-wind text-primary"></i> Piezo Vibration Wave</h4>
              <span class="telemetry-badge badge-normal" id="piezo-peak-badge" style="font-size: 0.65rem; padding: 2px 6px; display: none;">Inhalation Peak</span>
            </div>
            <div style="height: 90px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--border-color); overflow: hidden;">
              <canvas id="live-piezo-waveform" style="width: 100%; height: 100%; display: block;"></canvas>
            </div>
          </div>

          <!-- Chest Motion Section -->
          <div style="flex: 1;">
            <h4 style="margin: 0 0 6px 0; font-size: 0.85rem; font-weight: 700; color: var(--text-primary);"><i class="fas fa-arrows-up-down-left-right text-secondary"></i> Chest Acceleration (MPU6050)</h4>
            <div style="height: 90px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--border-color); overflow: hidden;">
              <canvas id="live-motion-waveform" style="width: 100%; height: 100%; display: block;"></canvas>
            </div>
          </div>
        </div>

      </div>
    `;

    this.initCanvases();
    this.setupTelemetrySub();
    this.startAnimationLoop();
  }

  initCanvases() {
    this.audioCanvas = document.getElementById("live-audio-waveform");
    this.spectrogramCanvas = document.getElementById("live-audio-spectrogram");
    this.motionCanvas = document.getElementById("live-motion-waveform");
    this.piezoCanvas = document.getElementById("live-piezo-waveform");
    this.ppgCanvas = document.getElementById("live-ppg-waveform");

    const canvases = [this.audioCanvas, this.spectrogramCanvas, this.motionCanvas, this.piezoCanvas, this.ppgCanvas];
    
    canvases.forEach(canvas => {
      if (canvas) {
        canvas.width = canvas.clientWidth * this.dpr;
        canvas.height = canvas.clientHeight * this.dpr;
      }
    });

    // Clear spectrogram canvas to black initially
    if (this.spectrogramCanvas) {
      const ctx = this.spectrogramCanvas.getContext("2d");
      ctx.fillStyle = "#0a0a0f";
      ctx.fillRect(0, 0, this.spectrogramCanvas.width, this.spectrogramCanvas.height);
    }
  }

  setupTelemetrySub() {
    // Modify live indicator badge when active
    const indicator = document.getElementById("live-monitoring-indicator");
    const feedText = document.getElementById("live-feed-text");

    const updateStatus = () => {
      if (indicator && feedText) {
        if (BLEControllerInstance.isSimulating) {
          indicator.className = "pulse-badge active";
          indicator.style.backgroundColor = "var(--color-accent)";
          feedText.textContent = "Simulation Feed Active";
          feedText.style.color = "var(--color-accent)";
        } else if (BLEControllerInstance.chestState === 'connected' || BLEControllerInstance.handState === 'connected') {
          indicator.className = "pulse-badge active";
          indicator.style.backgroundColor = "var(--color-secondary)";
          feedText.textContent = "BLE Hardware Synced";
          feedText.style.color = "var(--color-secondary)";
        } else {
          indicator.className = "pulse-badge";
          indicator.style.backgroundColor = "var(--text-tertiary)";
          feedText.textContent = "Telemetry In Standby";
          feedText.style.color = "var(--text-secondary)";
        }
      }
    };

    updateStatus();

    this.unsubscribe = BLEControllerInstance.subscribe((data, type) => {
      if (type === 'connection') {
        updateStatus();
      }

      // 1. Gather live audio samples as they arrive
      if (data.audioChunk && data.audioChunk.length > 0) {
        // Shift audio wave data
        const len = data.audioChunk.length;
        const temp = new Float32Array(this.audioWaveData.length);
        temp.set(this.audioWaveData.subarray(len));
        temp.set(data.audioChunk, this.audioWaveData.length - len);
        this.audioWaveData = temp;

        // Draw one column onto the Spectrogram
        this.addSpectrogramColumn(data.audioChunk);
      }

      // 2. Gather piezo peaks
      const peakBadge = document.getElementById("piezo-peak-badge");
      if (peakBadge) {
        peakBadge.style.display = data.piezoPeak ? "inline-block" : "none";
      }
    });
  }

  // Draw a single frequency slice onto the running spectrogram canvas
  addSpectrogramColumn(audioChunk8k) {
    if (!this.spectrogramCanvas) return;

    const ctx = this.spectrogramCanvas.getContext("2d");
    const w = this.spectrogramCanvas.width;
    const h = this.spectrogramCanvas.height;

    // Shift the spectrogram display 2 pixels to the left
    const shiftPixels = 2 * this.dpr;
    ctx.drawImage(this.spectrogramCanvas, -shiftPixels, 0);

    // Compute FFT on the latest chunk
    // We can reuse the AudioProcessor in the controller to compute the spectrum of this slice.
    // Audio chunks represent ~100 samples at 8kHz (which is 12.5ms). We run a 1024-bin FFT on the last buffered samples.
    const audioProc = BLEControllerInstance.audioProcessor;
    const rawBuffer = BLEControllerInstance.getContiguousAudioBuffer();
    
    // Take the last 1024 samples from the contiguous buffer
    const lastWindow = rawBuffer.subarray(rawBuffer.length - 1024);
    
    // Apply Hanning Window & compute Power Spectrum
    const windowed = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      windowed[i] = lastWindow[i] * audioProc.hanningWindow[i];
    }
    const powerSpectrum = audioProc.computeFFT(windowed); // length 513

    // Create colors for this column
    // The canvas vertical axis is frequency (bottom = low frequency, top = high frequency)
    // We draw a vertical line of width shiftPixels on the right edge of the canvas.
    const x = w - shiftPixels;
    const numBins = powerSpectrum.length;

    // Linear scale values to dB
    let maxVal = 1e-10;
    for (let i = 0; i < numBins; i++) {
      if (powerSpectrum[i] > maxVal) maxVal = powerSpectrum[i];
    }

    const colWidth = shiftPixels;
    const binHeight = h / numBins;

    for (let i = 0; i < numBins; i++) {
      const val = powerSpectrum[i];
      // Compute relative dB (0dB is maximum, silence is -70dB)
      const db = 10.0 * Math.log10(Math.max(val, 1e-10)) - 10.0 * Math.log10(maxVal);
      
      // Map dB range [-70, 0] to brightness range [0, 255]
      const brightness = Math.min(255, Math.max(0, Math.round(((db + 70) / 70) * 255)));

      // Plasma Palette mapping:
      // Dark -> Blue -> Purple -> Magenta -> Orange -> Yellow -> White
      let r = 0, g = 0, b = 0;
      if (brightness < 64) {
        // Black to dark blue
        b = brightness * 3;
      } else if (brightness < 128) {
        // Blue to Purple/Magenta
        r = (brightness - 64) * 3;
        b = 192 + (brightness - 64);
      } else if (brightness < 192) {
        // Magenta to Orange
        r = 192 + (brightness - 128);
        g = (brightness - 128) * 2.5;
        b = 255 - (brightness - 128) * 3;
      } else {
        // Orange to Yellow/White
        r = 255;
        g = 160 + (brightness - 192) * 1.4;
        b = (brightness - 192) * 4;
      }

      ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
      
      // Vertical axis is flipped (frequency increases upwards)
      const y = h - (i * binHeight) - binHeight;
      ctx.fillRect(x, y, colWidth, binHeight + 0.5);
    }
  }

  startAnimationLoop() {
    const drawLoop = () => {
      this.drawOscilloscopes();
      this.animationId = requestAnimationFrame(drawLoop);
    };
    this.animationId = requestAnimationFrame(drawLoop);
  }

  // Draw continuous waves at 60 Hz frame rate
  drawOscilloscopes() {
    const data = BLEControllerInstance.data;

    // 1. Draw Audio Waveform (Oscilloscope)
    if (this.audioCanvas) {
      const ctx = this.audioCanvas.getContext("2d");
      const w = this.audioCanvas.width;
      const h = this.audioCanvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)"; // primary glow blue
      ctx.lineWidth = 2.0 * this.dpr;
      ctx.beginPath();
      const step = w / this.audioWaveData.length;
      for (let i = 0; i < this.audioWaveData.length; i++) {
        const x = i * step;
        // Amplify wave for display
        const y = h / 2 + this.audioWaveData[i] * (h / 2) * 12.0;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Draw horizontal baseline
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1 * this.dpr;
      ctx.beginPath();
      ctx.moveTo(0, h/2);
      ctx.lineTo(w, h/2);
      ctx.stroke();
    }

    // 2. Draw PPG Oximeter Wave
    if (this.ppgCanvas) {
      const ctx = this.ppgCanvas.getContext("2d");
      const w = this.ppgCanvas.width;
      const h = this.ppgCanvas.height;
      ctx.clearRect(0, 0, w, h);

      const wave = data.ppgWave;
      if (wave.length > 1) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.9)"; // critical red
        ctx.lineWidth = 2.5 * this.dpr;
        ctx.beginPath();

        // Autoscale max/min of wave
        let min = 999999, max = -999999;
        for (let i = 0; i < wave.length; i++) {
          if (wave[i] < min) min = wave[i];
          if (wave[i] > max) max = wave[i];
        }
        const diff = (max - min) || 1;

        const step = w / 200; // fit 200 samples
        const offset = 200 - wave.length;

        for (let i = 0; i < wave.length; i++) {
          const x = (i + offset) * step;
          // Scale into canvas heights (leave 10% margins)
          const y = h - 15 * this.dpr - ((wave[i] - min) / diff) * (h - 30 * this.dpr);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // 3. Draw Piezo Vibration Wave
    if (this.piezoCanvas) {
      const ctx = this.piezoCanvas.getContext("2d");
      const w = this.piezoCanvas.width;
      const h = this.piezoCanvas.height;
      ctx.clearRect(0, 0, w, h);

      // Add to local visualizer queue
      this.piezoWaveData.push(data.piezo);
      if (this.piezoWaveData.length > 150) this.piezoWaveData.shift();

      if (this.piezoWaveData.length > 1) {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.9)"; // secondary cyan
        ctx.lineWidth = 2.0 * this.dpr;
        ctx.beginPath();

        let min = 999999, max = -999999;
        for (let i = 0; i < this.piezoWaveData.length; i++) {
          if (this.piezoWaveData[i] < min) min = this.piezoWaveData[i];
          if (this.piezoWaveData[i] > max) max = this.piezoWaveData[i];
        }
        const diff = (max - min) || 1;
        const step = w / 150;
        const offset = 150 - this.piezoWaveData.length;

        for (let i = 0; i < this.piezoWaveData.length; i++) {
          const x = (i + offset) * step;
          const y = h - 10 * this.dpr - ((this.piezoWaveData[i] - min) / diff) * (h - 20 * this.dpr);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // 4. Draw MPU6050 Acceleration Waves
    if (this.motionCanvas) {
      const ctx = this.motionCanvas.getContext("2d");
      const w = this.motionCanvas.width;
      const h = this.motionCanvas.height;
      ctx.clearRect(0, 0, w, h);

      this.motionWaveData.x.push(data.accel.x);
      this.motionWaveData.y.push(data.accel.y);
      this.motionWaveData.z.push(data.accel.z);

      if (this.motionWaveData.x.length > 120) {
        this.motionWaveData.x.shift();
        this.motionWaveData.y.shift();
        this.motionWaveData.z.shift();
      }

      const drawAxis = (array, color) => {
        if (array.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8 * this.dpr;
        ctx.beginPath();
        const step = w / 120;
        const offset = 120 - array.length;
        
        // Scale gravity acceleration (from -15 to +15 m/s2)
        const scaleRange = 30.0;
        for (let i = 0; i < array.length; i++) {
          const x = (i + offset) * step;
          const valNormalized = (array[i] + 15.0) / scaleRange; // 0 to 1
          const y = h - valNormalized * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawAxis(this.motionWaveData.x, "#ef4444"); // Red: Accel X
      drawAxis(this.motionWaveData.y, "#10b981"); // Green: Accel Y
      drawAxis(this.motionWaveData.z, "#a855f7"); // Purple: Accel Z
    }
  }

  destroy() {
    // Unsubscribe from BLE
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    // Cancel animation loop
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
