// src/utils/audioProcessor.js
// Complete Audio DSP Feature Extractor in Javascript
// Replicates Librosa's melspectrogram and mfcc calculations

export class AudioProcessor {
  constructor(sampleRate = 16000, nFFT = 1024, hopLength = 512, nMels = 64, nMFCC = 20) {
    this.sampleRate = sampleRate;
    this.nFFT = nFFT;
    this.hopLength = hopLength;
    this.nMels = nMels;
    this.nMFCC = nMFCC;

    // Pre-calculate Hanning window
    this.hanningWindow = new Float32Array(this.nFFT);
    for (let i = 0; i < this.nFFT; i++) {
      this.hanningWindow[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (this.nFFT - 1)));
    }

    // Pre-calculate Mel Filterbank weights
    this.melFilterbank = this.createMelFilterbank();

    // Pre-calculate bit reversal table for FFT
    this.fftBitReverseTable = new Int32Array(this.nFFT);
    let limit = 1;
    let bit = this.nFFT >> 1;
    while (limit < this.nFFT) {
      for (let i = 0; i < limit; i++) {
        this.fftBitReverseTable[i + limit] = this.fftBitReverseTable[i] + bit;
      }
      limit <<= 1;
      bit >>= 1;
    }
  }

  // Convert Hz to Mel scale
  hzToMel(hz) {
    return 2595.0 * Math.log10(1.0 + hz / 700.0);
  }

  // Convert Mel scale to Hz
  melToHz(mel) {
    return 700.0 * (Math.pow(10.0, mel / 2595.0) - 1.0);
  }

  // Create Mel Filterbank
  createMelFilterbank() {
    const fMin = 100.0;
    const fMax = this.sampleRate / 2; // Nyquist limit (8000 Hz)
    
    const melMin = this.hzToMel(fMin);
    const melMax = this.hzToMel(fMax);

    // Create nMels + 2 points spaced linearly in Mel scale
    const melPoints = new Float32Array(this.nMels + 2);
    const melStep = (melMax - melMin) / (this.nMels + 1);
    for (let i = 0; i < this.nMels + 2; i++) {
      melPoints[i] = melMin + i * melStep;
    }

    // Convert back to Hz and find FFT bins
    const hzPoints = new Float32Array(this.nMels + 2);
    const binPoints = new Int32Array(this.nMels + 2);
    for (let i = 0; i < this.nMels + 2; i++) {
      hzPoints[i] = this.melToHz(melPoints[i]);
      binPoints[i] = Math.floor(((this.nFFT + 1) * hzPoints[i]) / this.sampleRate);
    }

    // Allocate triangular weights matrix [nMels][nFFT/2 + 1]
    const numBins = this.nFFT / 2 + 1;
    const weights = [];
    for (let m = 0; m < this.nMels; m++) {
      weights[m] = new Float32Array(numBins);
      const startBin = binPoints[m];
      const centerBin = binPoints[m + 1];
      const endBin = binPoints[m + 2];

      // Left slope
      for (let k = startBin; k < centerBin; k++) {
        if (k < numBins) {
          weights[m][k] = (k - startBin) / (centerBin - startBin);
        }
      }
      // Right slope
      for (let k = centerBin; k <= endBin; k++) {
        if (k < numBins) {
          weights[m][k] = (endBin - k) / (endBin - centerBin);
        }
      }
    }

    return weights;
  }

  // Pre-emphasis filter: y[n] = x[n] - 0.97 * x[n-1]
  applyPreEmphasis(samples) {
    const out = new Float32Array(samples.length);
    if (samples.length === 0) return out;
    out[0] = samples[0];
    for (let n = 1; n < samples.length; n++) {
      out[n] = samples[n] - 0.97 * samples[n - 1];
    }
    return out;
  }

  // Radix-2 Cooley-Tukey In-Place FFT for Real Inputs
  computeFFT(realInput) {
    const n = this.nFFT;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);

    // Bit reversal ordering
    for (let i = 0; i < n; i++) {
      real[this.fftBitReverseTable[i]] = realInput[i];
    }

    // FFT stages
    for (let size = 2; size <= n; size <<= 1) {
      const halfSize = size >> 1;
      const tabStep = n / size;

      // Trigonometric recurrence variables
      for (let i = 0; i < n; i += size) {
        for (let j = i, k = 0; j < i + halfSize; j++, k += tabStep) {
          const angle = (-2 * Math.PI * k) / n;
          const wr = Math.cos(angle);
          const wi = Math.sin(angle);

          const tr = real[j + halfSize] * wr - imag[j + halfSize] * wi;
          const ti = real[j + halfSize] * wi + imag[j + halfSize] * wr;

          real[j + halfSize] = real[j] - tr;
          imag[j + halfSize] = imag[j] - ti;
          real[j] += tr;
          imag[j] += ti;
        }
      }
    }

    // Compute Power Spectrum for positive frequencies: (Real^2 + Imag^2) / N
    const numBins = n / 2 + 1;
    const powerSpectrum = new Float32Array(numBins);
    for (let k = 0; k < numBins; k++) {
      powerSpectrum[k] = (real[k] * real[k] + imag[k] * imag[k]) / n;
    }

    return powerSpectrum;
  }

  // Extract Mel Spectrogram from an audio segment
  // Expected input: Float32Array of length 48,000 (3 seconds of 16 kHz audio)
  // Expected output: Array of Float32Array (size [64][94]) representing Mel Spectrogram in dB
  extractMelSpectrogram(rawSamples) {
    const preEmphasized = this.applyPreEmphasis(rawSamples);
    const signalLength = preEmphasized.length;

    // Apply padding matching librosa center alignment (pad signal by nFFT // 2 at both ends)
    const padSize = this.nFFT / 2;
    const padded = new Float32Array(signalLength + padSize * 2);
    // Reflect padding (simplified to symmetric padding for edge conditions)
    for (let i = 0; i < padSize; i++) {
      padded[i] = preEmphasized[padSize - i]; // pad left
      padded[padded.length - 1 - i] = preEmphasized[signalLength - 1 - padSize + i]; // pad right
    }
    padded.set(preEmphasized, padSize);

    // Compute STFT frames
    const numFrames = Math.floor((padded.length - this.nFFT) / this.hopLength) + 1; // 94 frames
    const melSpectrogram = [];
    for (let m = 0; m < this.nMels; m++) {
      melSpectrogram[m] = new Float32Array(numFrames);
    }

    const frameSignal = new Float32Array(this.nFFT);

    for (let f = 0; f < numFrames; f++) {
      const startIdx = f * this.hopLength;
      
      // Windowing
      for (let i = 0; i < this.nFFT; i++) {
        frameSignal[i] = padded[startIdx + i] * this.hanningWindow[i];
      }

      // Power spectrum
      const powerSpectrum = this.computeFFT(frameSignal);

      // Mel Filterbank application
      for (let m = 0; m < this.nMels; m++) {
        let melEnergy = 0;
        for (let k = 0; k < powerSpectrum.length; k++) {
          melEnergy += powerSpectrum[k] * this.melFilterbank[m][k];
        }
        melSpectrogram[m][f] = melEnergy;
      }
    }

    // Convert to Log dB: 10 * log10(val)
    // Replicate Librosa's power_to_db with ref=max_value
    let maxVal = 1e-10;
    for (let m = 0; m < this.nMels; m++) {
      for (let f = 0; f < numFrames; f++) {
        if (melSpectrogram[m][f] > maxVal) {
          maxVal = melSpectrogram[m][f];
        }
      }
    }

    const logMelDb = [];
    for (let m = 0; m < this.nMels; m++) {
      logMelDb[m] = new Float32Array(numFrames);
      for (let f = 0; f < numFrames; f++) {
        const val = melSpectrogram[m][f];
        // Convert to dB
        const db = 10.0 * Math.log10(Math.max(val, 1e-10));
        // Normalize relative to max (making max 0 dB)
        logMelDb[m][f] = db - 10.0 * Math.log10(maxVal);
      }
    }

    return logMelDb;
  }

  // Extract 20 MFCC features from Log Mel Spectrogram (using Discrete Cosine Transform Type-II)
  // Input: Mel Spectrogram [nMels][numFrames]
  // Output: MFCC Matrix [nMFCC][numFrames] (20 x 94)
  extractMFCC(melSpectrogramDb) {
    const numFrames = melSpectrogramDb[0].length;
    const mfccs = [];
    for (let i = 0; i < this.nMFCC; i++) {
      mfccs[i] = new Float32Array(numFrames);
    }

    // Compute DCT-II
    // C_i = sum_j (Mel_j * cos(pi * i * (2j + 1) / (2 * nMels)))
    const nMels = this.nMels;
    
    for (let f = 0; f < numFrames; f++) {
      for (let i = 0; i < this.nMFCC; i++) {
        let sum = 0;
        for (let j = 0; j < nMels; j++) {
          const val = melSpectrogramDb[j][f];
          const angle = (Math.PI * i * (2 * j + 1)) / (2 * nMels);
          sum += val * Math.cos(angle);
        }
        
        // Orthogonal normalization scaling
        const scale = i === 0 ? Math.sqrt(1.0 / nMels) : Math.sqrt(2.0 / nMels);
        mfccs[i][f] = sum * scale;
      }
    }

    return mfccs;
  }

  // Utility to interpolate 8 kHz audio data to 16 kHz
  // Input: Int16Array of samples captured at 8000 Hz
  // Output: Float32Array of samples scaled to 16000 Hz in range [-1.0, 1.0]
  upsampleTo16kHz(samples8k) {
    const outLength = samples8k.length * 2;
    const floatSamples = new Float32Array(outLength);

    for (let i = 0; i < samples8k.length; i++) {
      const current = samples8k[i] / 32768.0;
      const next = (i + 1 < samples8k.length) ? (samples8k[i + 1] / 32768.0) : current;

      floatSamples[i * 2] = current;
      floatSamples[i * 2 + 1] = (current + next) / 2.0; // Linear interpolation
    }

    return floatSamples;
  }
}
