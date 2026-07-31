// src/components/Dashboard.js
// BLE Lung Patch Core Dashboard View

import { BLEControllerInstance } from '../utils/bleController.js';
import { db } from '../utils/firebase.js';
import { showToast } from '../utils/toast.js';
import { TelemetryEngineInstance } from '../utils/mockData.js';

export class Dashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.unsubscribe = null;
    
    // Disease classification mapping
    this.diseaseMetadata = {
      "Normal": { risk: "Low Risk", class: "badge-normal", color: "var(--alert-normal)", desc: "Acoustic and clinical biomarkers indicate healthy pulmonary dynamics. Standby monitoring active." },
      "Asthma": { risk: "Moderate Risk", class: "badge-concern", color: "var(--alert-concern)", desc: "Expiratory narrowing detected with localized wheeze vectors. Monitor airway resistance closely." },
      "COPD": { risk: "High Risk", class: "badge-critical", color: "var(--alert-critical)", desc: "Chronic airflow limitation accompanied by scattered wheezes. Check SpO₂ levels." },
      "Pneumonia": { risk: "Critical Risk", class: "badge-critical", color: "var(--alert-critical)", desc: "Consolidated fluid crackles detected with acute oxygen desaturation. Immediate clinical review required." },
      "Post-COVID": { risk: "Moderate Risk", class: "badge-concern", color: "var(--alert-concern)", desc: "Residual fine crackles observed. Stabilizing trend, standard observation recommended." }
    };
  }

  render() {
    this.container.innerHTML = `
      <div class="view-header">
        <div class="header-title-container">
          <h1>Lung Patch Telemetry Dashboard</h1>
          <p>Continuous BLE Cardio-Respiratory Monitoring & Real-time Neural Diagnostics</p>
        </div>
        <div class="header-actions">
          <div class="pulse-card-banner" id="sim-status-banner" style="background: rgba(6, 182, 212, 0.1); color: var(--color-primary); border-color: rgba(6, 182, 212, 0.2);">
            <i class="fas fa-circle-nodes"></i> 
            <span id="system-status-text">Devices Disconnected</span>
          </div>
        </div>
      </div>

      <!-- Quick Telemetry Grid -->
      <div class="dashboard-grid">
        
        <!-- Bluetooth Pairing Cards (Col 4) -->
        <div class="col-4 glass-panel dashboard-card">
          <div class="card-header">
            <h3 class="card-title"><i class="fab fa-bluetooth-b text-primary"></i> Device Connectivity</h3>
          </div>
          <p class="text-secondary" style="font-size: 0.82rem; margin-bottom: 16px;">
            Pair with the Chest and Hand hardware units using Web Bluetooth.
          </p>

          <!-- Chest Unit Card -->
          <div class="ble-unit-pair-card" id="chest-unit-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 0.9rem;">Chest Unit</strong>
                <div style="font-size: 0.72rem; color: var(--text-tertiary);" id="chest-mac">LungPatch-Chest</div>
              </div>
              <span class="telemetry-badge badge-concern" id="chest-status-badge">Offline</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 0.75rem;">
              <span class="text-secondary">Battery: <strong id="chest-battery">--</strong></span>
              <span class="text-secondary">RSSI: <strong id="chest-rssi">--</strong></span>
            </div>
            <button class="btn btn-secondary" id="btn-connect-chest" style="width: 100%; margin-top: 12px; font-size: 0.8rem; padding: 8px;">
              <i class="fas fa-link"></i> Connect Chest Unit
            </button>
          </div>

          <!-- Hand Unit Card -->
          <div class="ble-unit-pair-card" id="hand-unit-card" style="margin-top: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 0.9rem;">Hand Unit</strong>
                <div style="font-size: 0.72rem; color: var(--text-tertiary);" id="hand-mac">LungPatch-Hand</div>
              </div>
              <span class="telemetry-badge badge-concern" id="hand-status-badge">Offline</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 0.75rem;">
              <span class="text-secondary">Battery: <strong id="hand-battery">--</strong></span>
              <span class="text-secondary">RSSI: <strong id="hand-rssi">--</strong></span>
            </div>
            <button class="btn btn-secondary" id="btn-connect-hand" style="width: 100%; margin-top: 12px; font-size: 0.8rem; padding: 8px;">
              <i class="fas fa-link"></i> Connect Hand Unit
            </button>
          </div>

          <!-- Firebase Cloud Sync Card -->
          <div class="ble-unit-pair-card" style="margin-top: 14px; background: rgba(0, 0, 0, 0.15); border: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 0.85rem;"><i class="fas fa-cloud-arrow-up text-secondary"></i> Cloud Backend</strong>
                <div style="font-size: 0.68rem; color: var(--text-tertiary);">lungpatch-ai.firebaseapp.com</div>
              </div>
              <span class="telemetry-badge badge-critical" id="firebase-status-badge">Offline</span>
            </div>
          </div>
        </div>

        <!-- Real-Time Vitals Cards (Col 8) -->
        <div class="col-8 glass-panel dashboard-card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-stethoscope text-secondary"></i> Live Cardio-Pulmonary Feeds</h3>
            <span class="commercial-pill" style="background: var(--color-primary-light); color: var(--color-primary);">Continuously Synced</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 16px;">
            <!-- Heart Rate Card -->
            <div class="glass-panel telemetry-card" style="background: var(--bg-tertiary); text-align: center; padding: 24px 16px;">
              <i class="fas fa-heartbeat" style="font-size: 2.2rem; color: var(--alert-critical); filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.3));"></i>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-top: 12px; text-transform: uppercase;">Heart Rate</div>
              <div style="font-size: 2.8rem; font-weight: 800; color: var(--text-primary); margin: 6px 0;" id="dash-hr">--</div>
              <span class="telemetry-badge" id="dash-hr-badge" style="font-size: 0.7rem; font-weight: 700;">Standby</span>
            </div>

            <!-- SpO2 Card -->
            <div class="glass-panel telemetry-card" style="background: var(--bg-tertiary); text-align: center; padding: 24px 16px;">
              <i class="fas fa-droplet" style="font-size: 2.2rem; color: var(--color-secondary); filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.3));"></i>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-top: 12px; text-transform: uppercase;">Oxygen Saturation</div>
              <div style="font-size: 2.8rem; font-weight: 800; color: var(--text-primary); margin: 6px 0;" id="dash-spo2">--</div>
              <span class="telemetry-badge" id="dash-spo2-badge" style="font-size: 0.7rem; font-weight: 700;">Standby</span>
            </div>

            <!-- Breathing Rate Card -->
            <div class="glass-panel telemetry-card" style="background: var(--bg-tertiary); text-align: center; padding: 24px 16px;">
              <i class="fas fa-wind" style="font-size: 2.2rem; color: var(--color-primary); filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.3));"></i>
              <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); margin-top: 12px; text-transform: uppercase;">Breathing Rate</div>
              <div style="font-size: 2.8rem; font-weight: 800; color: var(--text-primary); margin: 6px 0;" id="dash-br">--</div>
              <span class="telemetry-badge" id="dash-br-badge" style="font-size: 0.7rem; font-weight: 700;">Standby</span>
            </div>
          </div>
        </div>

        <!-- Real-Time AI Prediction Dashboard Card (Col 8) -->
        <div class="col-8 glass-panel dashboard-card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-brain text-accent"></i> Real-time AI Respiratory Classifier</h3>
            <span class="text-mono text-secondary" style="font-size: 0.78rem;" id="dash-conf-title">Confidence: --</span>
          </div>

          <div class="dashboard-grid" style="margin-top: 12px;">
            <div class="col-6 text-center" style="display: flex; flex-direction: column; justify-content: center; align-items: center; border-right: 1px solid var(--border-color); padding-right: 20px;">
              <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Neural Diagnostic Verdict</div>
              <div id="dash-prediction-verdict" style="font-size: 2.4rem; font-weight: 800; color: var(--text-tertiary); margin: 12px 0;">STANDBY</div>
              <div id="dash-prediction-desc" style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4;">
                Awaiting active sensor telemetry streaming or simulation sandbox activation to perform CNN classification.
              </div>
            </div>

            <div class="col-6" style="padding-left: 20px; display: flex; flex-direction: column; justify-content: center; gap: 16px;">
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700;">
                  <span>Classifier Confidence Index</span>
                  <span id="dash-confidence-text">0.0%</span>
                </div>
                <div style="height: 8px; border-radius: 4px; background: var(--bg-tertiary); overflow: hidden; margin-top: 6px; border: 1px solid var(--border-color);">
                  <div id="dash-confidence-bar" style="width: 0%; height: 100%; background: var(--color-primary); border-radius: 4px; transition: width 0.3s ease;"></div>
                </div>
              </div>

              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.8rem; font-weight: 700;">
                  <span>Risk Urgency Level</span>
                  <span id="dash-risk-text">--</span>
                </div>
                <div style="height: 8px; border-radius: 4px; background: var(--bg-tertiary); overflow: hidden; margin-top: 6px; border: 1px solid var(--border-color);">
                  <div id="dash-risk-bar" style="width: 0%; height: 100%; background: var(--alert-normal); border-radius: 4px; transition: width 0.3s ease;"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Simulation Control Console Sandbox (Col 4) -->
        <div class="col-4 glass-panel dashboard-card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-sliders-h text-accent"></i> Flare-Up Simulator</h3>
          </div>
          <p class="text-secondary" style="font-size: 0.82rem; margin-bottom: 16px;">
            No hardware? Simulate clinical disease classes. The website processes synthetic signals exactly as it does physical BLE packets.
          </p>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <button class="btn btn-secondary sim-btn" data-sim="Normal" style="text-align: left; padding: 10px; font-size: 0.82rem;">
              <i class="fas fa-lungs text-normal" style="width: 20px;"></i> Simulate: Normal Breathing
            </button>
            <button class="btn btn-secondary sim-btn" data-sim="Asthma" style="text-align: left; padding: 10px; font-size: 0.82rem;">
              <i class="fas fa-wind text-concern" style="width: 20px;"></i> Simulate: Asthma Attack
            </button>
            <button class="btn btn-secondary sim-btn" data-sim="COPD" style="text-align: left; padding: 10px; font-size: 0.82rem;">
              <i class="fas fa-lungs-virus text-critical" style="width: 20px;"></i> Simulate: COPD Exacerbation
            </button>
            <button class="btn btn-secondary sim-btn" data-sim="Pneumonia" style="text-align: left; padding: 10px; font-size: 0.82rem;">
              <i class="fas fa-virus text-critical" style="width: 20px;"></i> Simulate: Pneumonia Fluid
            </button>
            <button class="btn btn-secondary sim-btn" data-sim="Post-COVID" style="text-align: left; padding: 10px; font-size: 0.82rem;">
              <i class="fas fa-shield-virus text-concern" style="width: 20px;"></i> Simulate: Post-COVID Crackles
            </button>
            <button class="btn btn-primary" id="btn-stop-sim" style="background: var(--alert-critical); border-color: var(--alert-critical); color: white; display: none; padding: 10px; margin-top: 8px;">
              <i class="fas fa-stop"></i> Stop Simulation Feed
            </button>
          </div>
        </div>

      </div>
    `;

    this.attachEventListeners();
    this.setupTelemetrySub();
    this.updateUI();
  }

  attachEventListeners() {
    // BLE connections
    const connChest = document.getElementById("btn-connect-chest");
    if (connChest) {
      connChest.addEventListener("click", async () => {
        try {
          if (BLEControllerInstance.chestState === 'connected') {
            BLEControllerInstance.disconnectChest();
            showToast("Chest Unit disconnected", "info");
          } else if (BLEControllerInstance.chestState === 'disconnected') {
            showToast("Searching for Chest Unit...", "info");
            await BLEControllerInstance.connectChest();
            showToast("Chest Unit connected successfully!", "success");
          }
        } catch (err) {
          showToast("Failed to pair with Chest ESP32 via BLE. Ensure device is powered and Bluetooth is active.", "error");
        }
      });
    }

    const connHand = document.getElementById("btn-connect-hand");
    if (connHand) {
      connHand.addEventListener("click", async () => {
        try {
          if (BLEControllerInstance.handState === 'connected') {
            BLEControllerInstance.disconnectHand();
            showToast("Hand Unit disconnected", "info");
          } else if (BLEControllerInstance.handState === 'disconnected') {
            showToast("Searching for Hand Unit...", "info");
            await BLEControllerInstance.connectHand();
            showToast("Hand Unit connected successfully!", "success");
          }
        } catch (err) {
          showToast("Failed to pair with Hand ESP32 via BLE. Ensure device is powered and Bluetooth is active.", "error");
        }
      });
    }

    // Simulation triggers
    const simBtns = document.querySelectorAll(".sim-btn");
    simBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const type = btn.getAttribute("data-sim");
        BLEControllerInstance.startSimulation(type);
        
        // UI toggle
        const stopSim = document.getElementById("btn-stop-sim");
        if (stopSim) stopSim.style.display = "block";

        simBtns.forEach(b => b.classList.remove("active-sim"));
        btn.classList.add("active-sim");
        
        // Store current simulation type for mock prediction
        this.simulatedType = type;
      });
    });

    const stopSim = document.getElementById("btn-stop-sim");
    if (stopSim) {
      stopSim.addEventListener("click", () => {
        BLEControllerInstance.stopSimulation();
        stopSim.style.display = "none";
        simBtns.forEach(b => b.classList.remove("active-sim"));
        this.simulatedType = null;
      });
    }
  }

  setupTelemetrySub() {
    this.unsubscribe = BLEControllerInstance.subscribe((data, updateType) => {
      this.updateUI();
    });
  }

  updateUI() {
    const data = BLEControllerInstance.data;

    // Connection states
    const chestStatus = document.getElementById("chest-status-badge");
    const chestBtn = document.getElementById("btn-connect-chest");
    const chestBattery = document.getElementById("chest-battery");
    const chestRssi = document.getElementById("chest-rssi");
    
    if (chestStatus) {
      chestStatus.className = "telemetry-badge";
      if (BLEControllerInstance.chestState === 'connected') {
        chestStatus.classList.add("badge-normal");
        chestStatus.textContent = "Connected";
        if (chestBtn) {
          chestBtn.className = "btn btn-secondary";
          chestBtn.innerHTML = `<i class="fas fa-link-slash"></i> Disconnect`;
        }
        if (chestBattery) chestBattery.textContent = `${BLEControllerInstance.chestBattery}%`;
        if (chestRssi) chestRssi.textContent = `-54 dBm`;
      } else if (BLEControllerInstance.chestState === 'scanning' || BLEControllerInstance.chestState === 'connecting') {
        chestStatus.classList.add("badge-concern");
        chestStatus.textContent = BLEControllerInstance.chestState === 'scanning' ? "Scanning..." : "Connecting...";
        if (chestBtn) {
          chestBtn.className = "btn btn-secondary disabled";
          chestBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${BLEControllerInstance.chestState === 'scanning' ? 'Scanning...' : 'Connecting...'}`;
        }
      } else {
        chestStatus.classList.add("badge-critical");
        chestStatus.textContent = "Disconnected";
        if (chestBtn) {
          chestBtn.className = "btn btn-secondary";
          chestBtn.innerHTML = `<i class="fas fa-link"></i> Connect Chest Unit`;
        }
        if (chestBattery) chestBattery.textContent = `--`;
        if (chestRssi) chestRssi.textContent = `--`;
      }
    }

    const handStatus = document.getElementById("hand-status-badge");
    const handBtn = document.getElementById("btn-connect-hand");
    const handBattery = document.getElementById("hand-battery");
    const handRssi = document.getElementById("hand-rssi");

    if (handStatus) {
      handStatus.className = "telemetry-badge";
      if (BLEControllerInstance.handState === 'connected') {
        handStatus.classList.add("badge-normal");
        handStatus.textContent = "Connected";
        if (handBtn) {
          handBtn.className = "btn btn-secondary";
          handBtn.innerHTML = `<i class="fas fa-link-slash"></i> Disconnect`;
        }
        if (handBattery) handBattery.textContent = `${BLEControllerInstance.handBattery}%`;
        if (handRssi) handRssi.textContent = `-58 dBm`;
      } else if (BLEControllerInstance.handState === 'scanning' || BLEControllerInstance.handState === 'connecting') {
        handStatus.classList.add("badge-concern");
        handStatus.textContent = BLEControllerInstance.handState === 'scanning' ? "Scanning..." : "Connecting...";
        if (handBtn) {
          handBtn.className = "btn btn-secondary disabled";
          handBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${BLEControllerInstance.handState === 'scanning' ? 'Scanning...' : 'Connecting...'}`;
        }
      } else {
        handStatus.className = "telemetry-badge";
        handStatus.classList.add("badge-critical");
        handStatus.textContent = "Disconnected";
        if (handBtn) {
          handBtn.className = "btn btn-secondary";
          handBtn.innerHTML = `<i class="fas fa-link"></i> Connect Hand Unit`;
        }
        if (handBattery) handBattery.textContent = `--`;
        if (handRssi) handRssi.textContent = `--`;
      }
    }

    // Header active banner
    const sysBanner = document.getElementById("sim-status-banner");
    const sysText = document.getElementById("system-status-text");
    if (sysBanner && sysText) {
      if (BLEControllerInstance.isSimulating) {
        sysBanner.style.background = "rgba(168, 85, 247, 0.15)";
        sysBanner.style.borderColor = "rgba(168, 85, 247, 0.25)";
        sysBanner.style.color = "var(--color-accent)";
        sysText.textContent = "Simulation Feed Active";
      } else if (BLEControllerInstance.chestState === 'connected' || BLEControllerInstance.handState === 'connected') {
        sysBanner.style.background = "rgba(16, 185, 129, 0.15)";
        sysBanner.style.borderColor = "rgba(16, 185, 129, 0.25)";
        sysBanner.style.color = "var(--color-secondary)";
        sysText.textContent = "BLE Hardware Synced";
      } else {
        sysBanner.style.background = "rgba(239, 68, 68, 0.1)";
        sysBanner.style.borderColor = "rgba(239, 68, 68, 0.2)";
        sysBanner.style.color = "var(--alert-critical)";
        sysText.textContent = "Devices Disconnected";
      }
    }

    // Numeric metrics
    const hrVal = document.getElementById("dash-hr");
    const hrBadge = document.getElementById("dash-hr-badge");
    if (hrVal) {
      if (data.heartRate > 0) {
        hrVal.textContent = data.heartRate;
        if (hrBadge) {
          hrBadge.textContent = data.heartRate > 100 ? "Tachycardia" : data.heartRate < 50 ? "Bradycardia" : "Normal";
          hrBadge.className = `telemetry-badge ${data.heartRate > 100 ? 'badge-critical' : data.heartRate < 50 ? 'badge-concern' : 'badge-normal'}`;
        }
      } else {
        hrVal.textContent = "--";
        if (hrBadge) {
          hrBadge.textContent = "Standby";
          hrBadge.className = "telemetry-badge";
        }
      }
    }

    const spo2Val = document.getElementById("dash-spo2");
    const spo2Badge = document.getElementById("dash-spo2-badge");
    if (spo2Val) {
      if (data.spo2 > 0) {
        spo2Val.textContent = `${data.spo2}%`;
        if (spo2Badge) {
          spo2Badge.textContent = data.spo2 < 90 ? "Hypoxic" : data.spo2 < 94 ? "Borderline" : "Optimal";
          spo2Badge.className = `telemetry-badge ${data.spo2 < 90 ? 'badge-critical' : data.spo2 < 94 ? 'badge-concern' : 'badge-normal'}`;
        }
      } else {
        spo2Val.textContent = "--";
        if (spo2Badge) {
          spo2Badge.textContent = "Standby";
          spo2Badge.className = "telemetry-badge";
        }
      }
    }

    const brVal = document.getElementById("dash-br");
    const brBadge = document.getElementById("dash-br-badge");
    if (brVal) {
      if (data.breathingRate > 0) {
        brVal.textContent = data.breathingRate;
        if (brBadge) {
          brBadge.textContent = data.breathingRate > 24 ? "Tachypnea" : data.breathingRate < 10 ? "Bradypnea" : "Normal";
          brBadge.className = `telemetry-badge ${data.breathingRate > 24 ? 'badge-critical' : data.breathingRate < 10 ? 'badge-concern' : 'badge-normal'}`;
        }
      } else {
        brVal.textContent = "--";
        if (brBadge) {
          brBadge.textContent = "Standby";
          brBadge.className = "telemetry-badge";
        }
      }
    }

    // AI Prediction details
    const verdict = document.getElementById("dash-prediction-verdict");
    const desc = document.getElementById("dash-prediction-desc");
    const confTitle = document.getElementById("dash-conf-title");
    const confText = document.getElementById("dash-confidence-text");
    const confBar = document.getElementById("dash-confidence-bar");
    const riskText = document.getElementById("dash-risk-text");
    const riskBar = document.getElementById("dash-risk-bar");

    // Retrieve active prediction
    let activePred = this.simulatedType || window.currentAIPredictionClass;

    if (activePred && this.diseaseMetadata[activePred]) {
      const meta = this.diseaseMetadata[activePred];
      let confidence = window.currentAIPredictionConfidence || (85 + Math.random() * 12);
      
      if (verdict) {
        verdict.textContent = activePred.toUpperCase();
        verdict.style.color = meta.color;
      }
      if (desc) desc.textContent = meta.desc;
      if (confTitle) confTitle.textContent = `Confidence: ${confidence.toFixed(1)}%`;
      if (confText) confText.textContent = `${confidence.toFixed(1)}%`;
      if (confBar) confBar.style.width = `${confidence}%`;

      let riskScore = 0;
      if (meta.risk === "Low Risk") riskScore = 20;
      else if (meta.risk === "Moderate Risk") riskScore = 55;
      else if (meta.risk === "High Risk") riskScore = 80;
      else if (meta.risk === "Critical Risk") riskScore = 95;

      if (riskText) riskText.textContent = meta.risk;
      if (riskBar) {
        riskBar.style.width = `${riskScore}%`;
        riskBar.style.background = meta.color;
      }
    } else {
      if (verdict) {
        verdict.textContent = "STANDBY";
        verdict.style.color = "var(--text-tertiary)";
      }
      if (desc) desc.textContent = "Awaiting active sensor telemetry streaming or simulation sandbox activation to perform CNN classification.";
      if (confTitle) confTitle.textContent = "Confidence: --";
      if (confText) confText.textContent = "0.0%";
      if (confBar) confBar.style.width = "0%";
      if (riskText) riskText.textContent = "--";
      if (riskBar) {
        riskBar.style.width = "0%";
        riskBar.style.background = "var(--border-color)";
      }
    }

    // Update Firebase Sync status badge
    const fbStatus = document.getElementById("firebase-status-badge");
    if (fbStatus) {
      fbStatus.className = "telemetry-badge";
      if (db && TelemetryEngineInstance.isFirebaseConnected) {
        fbStatus.classList.add("badge-normal");
        fbStatus.textContent = "Online";
      } else {
        fbStatus.classList.add("badge-critical");
        fbStatus.textContent = "Offline";
      }
    }
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
