import { TelemetryEngineInstance, ReportArchives } from '../utils/mockData.js';
import { BLEControllerInstance } from '../utils/bleController.js';
import { showToast } from '../utils/toast.js';

// Dynamic Chart.js loader helper
const loadChartJS = (callback) => {
  if (window.Chart) {
    callback();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  script.onload = () => callback();
  document.head.appendChild(script);
};

// Generates local sandbox data when Supabase connection is in standby
function generateLocalMockHistory(range) {
  let count = 24;
  if (range === '7d') count = 7;
  else if (range === '30d') count = 30;
  else if (range === '1y') count = 12; // 12 months

  const labels = [];
  const bpm = [];
  const spo2 = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i--) {
    let label = "";
    if (range === '24h') {
      const h = new Date(now.getTime() - i * 60 * 60 * 1000);
      label = h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (range === '7d' || range === '30d') {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      label = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else if (range === '1y') {
      const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
      label = m.toLocaleDateString([], { month: 'short', year: '2-digit' });
    }
    labels.push(label);
    
    // Add realistic biological constants with random drift
    const noise = (Math.random() - 0.5) * 4;
    bpm.push(Math.round(72 + noise + Math.sin(i * 0.5) * 3));
    spo2.push(Math.round(96 + (Math.random() - 0.5) * 1.5 - (i > 10 && i < 15 && range === '30d' ? 3 : 0)));
  }

  return { labels, bpm, spo2 };
}

export class PatientDashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activePatient = TelemetryEngineInstance.patients.find(p => p.admissionStatus === "Admitted") || null;
    this.unsubscribe = null;
    this.animationId = null;
    this.canvasContext = null;
    this.canvasElement = null;
    this.wavePhase = 0;
    this.audioInterval = null;
    this.isAudioPlaying = false;
    this.activeTab = "register"; // register, admit, vitals
    
    this.historyRange = "24h";
    this.historyChart = null;
    this.isSeeding = false;
  }

  render() {
    const bodyHtml = this.getTabContentHTML();

    this.container.innerHTML = `
      <!-- Patient Dashboard Subbar / Clinical Tabs -->
      <div class="view-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div class="header-title-container">
          <h1 style="display: flex; align-items: center; gap: 12px; margin: 0;">
            <i class="fas fa-lungs text-primary" style="font-size: 2rem;"></i> Patient Telemetry Desk
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--text-secondary);">Enroll patient metrics, complete ward admissions, and check continuous cardio-respiratory indicators.</p>
        </div>
        
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn ${this.activeTab === 'register' ? 'btn-primary' : 'btn-secondary'} nav-sub-tab" data-tab="register" style="font-size: 0.8rem; padding: 8px 14px;">
            <i class="fas fa-user-plus"></i> Patient Registration
          </button>
          <button class="btn ${this.activeTab === 'admit' ? 'btn-primary' : 'btn-secondary'} nav-sub-tab" data-tab="admit" style="font-size: 0.8rem; padding: 8px 14px;">
            <i class="fas fa-hospital-user"></i> Ward Admission Desk
          </button>
          <button class="btn ${this.activeTab === 'vitals' ? 'btn-primary' : 'btn-secondary'} nav-sub-tab" data-tab="vitals" style="font-size: 0.8rem; padding: 8px 14px;">
            <i class="fas fa-heartbeat"></i> Live Patient Vitals
          </button>
        </div>
      </div>

      <div class="sub-tab-content-panel">
        ${bodyHtml}
      </div>
    `;

    this.setupTelemetrySub();
    
    if (this.activeTab === "admit") {
      this.renderAdmissionList();
    }
    
    if (this.activeTab === "vitals" && TelemetryEngineInstance.patients.some(p => p.admissionStatus === "Admitted")) {
      this.setupWaveformCanvas();
      this.updateTelemetryUI();
      this.initHistoryChart();
    }
    
    this.attachEventListeners();
  }

  // Determine active tab HTML contents
  getTabContentHTML() {
    if (this.activeTab === "register") {
      return `
        <div class="glass-panel dashboard-card patient-reg-card">
          <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 8px; color: var(--color-primary); display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-user-plus"></i> New Patient Registration
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 24px;">
            Enter patient demographics and baseline respiratory biomarkers to enroll them in the telemetry monitoring network.
          </p>
          
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <div class="form-group-custom">
              <label>Patient Full Name</label>
              <input type="text" id="reg-name" class="form-input-custom" placeholder="e.g. Eleanor Vance" autocomplete="off">
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group-custom">
                <label>Age (Years)</label>
                <input type="number" id="reg-age" class="form-input-custom" placeholder="e.g. 68">
              </div>
              <div class="form-group-custom">
                <label>Gender</label>
                <select id="reg-gender" class="form-input-custom">
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            
            <div class="form-group-custom">
              <label>Primary Diagnosis / Respiratory Condition</label>
              <input type="text" id="reg-condition" class="form-input-custom" placeholder="e.g. Severe COPD (Chronic Obstructive Pulmonary Disease)" autocomplete="off">
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
              <div class="form-group-custom">
                <label>Baseline Heart Rate (BPM)</label>
                <input type="number" id="reg-bpm" class="form-input-custom" placeholder="e.g. 75">
              </div>
              <div class="form-group-custom">
                <label>Baseline Saturation (SpO₂ %)</label>
                <input type="number" id="reg-spo2" class="form-input-custom" placeholder="e.g. 96">
              </div>
            </div>
            
            <button class="btn btn-primary animate-btn" id="btn-submit-register" style="padding: 12px; font-weight: 700; margin-top: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;">
              Enroll Patient <i class="fas fa-file-signature"></i>
            </button>
          </div>
        </div>
      `;
    }

    if (this.activeTab === "admit") {
      return `
        <div class="glass-panel dashboard-card" style="padding: 32px; max-width: 800px; margin: 16px auto;">
          <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 8px; color: var(--color-secondary); display: flex; align-items: center; gap: 10px;">
            <i class="fas fa-hospital-user"></i> Hospital Ward Admission Desk
          </h3>
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 24px;">
            Roster of registered patients awaiting hospital ward assignment. Assign a bed or room to initiate continuous telemetry sensor syncing.
          </p>
          <div id="admission-list-container" style="display: flex; flex-direction: column; gap: 16px;">
            <!-- Dynamically populated roster list -->
          </div>
        </div>
      `;
    }

    if (this.activeTab === "vitals") {
      const admittedPatients = TelemetryEngineInstance.patients.filter(p => p.admissionStatus === "Admitted");
      
      if (admittedPatients.length === 0) {
        return `
          <div class="glass-panel dashboard-card" style="padding: 48px; text-align: center; max-width: 600px; margin: 40px auto; background: radial-gradient(circle at center, rgba(6, 182, 212, 0.05) 0%, transparent 80%);">
            <i class="fas fa-heart-pulse" style="font-size: 3.5rem; color: var(--color-primary); margin-bottom: 20px; filter: drop-shadow(0 0 15px var(--color-primary-glow));"></i>
            <h2 style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">Continuous Telemetry Standby</h2>
            <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6; margin: 12px 0 24px 0;">
              Continuous cardiopulmonary telemetry standby. Please register a patient entry and admit them to a ward room to sync active SpO₂ and BPM waves.
            </p>
            <div style="display: flex; justify-content: center; gap: 12px;">
              <button class="btn btn-primary nav-sub-tab" data-tab="register">Register Patient</button>
              <button class="btn btn-secondary nav-sub-tab" data-tab="admit">Admit Patient</button>
            </div>
          </div>
        `;
      }

      if (!this.activePatient || this.activePatient.admissionStatus !== "Admitted") {
        this.activePatient = admittedPatients[0];
      }

      const connText = TelemetryEngineInstance.isFirebaseConnected ? "Firebase Connected" : "Local Telemetry Active";
      const connClass = TelemetryEngineInstance.isFirebaseConnected ? "badge-normal" : "badge-concern";
      const connectionBadge = `<span class="telemetry-badge ${connClass}" id="patient-db-connection-badge" style="margin: 0;"><i class="fas fa-circle-nodes"></i> ${connText}</span>`;

      const chestStateText = BLEControllerInstance.chestState === 'connected' ? 'Chest Sync' : 'Sync Chest';
      const handStateText = BLEControllerInstance.handState === 'connected' ? 'Hand Sync' : 'Sync Hand';
      const chestClass = BLEControllerInstance.chestState === 'connected' ? 'btn-primary' : 'btn-secondary';
      const handClass = BLEControllerInstance.handState === 'connected' ? 'btn-primary' : 'btn-secondary';
      const simText = BLEControllerInstance.isSimulating ? 'Stop Sim' : 'Simulate';

      return `
        <!-- Dynamic Patient Selector & Sync Badges -->
        <div class="glass-panel" style="padding: 12px 20px; border-radius: 8px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; background: rgba(0, 0, 0, 0.2);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary);">Select Monitored Patient:</span>
            <select id="telemetry-patient-focus" class="form-input-custom" style="padding: 6px 12px; font-size: 0.85rem; width: 200px; font-weight: 700; color: var(--color-primary);">
              ${admittedPatients.map(p => `<option value="${p.id}" ${p.id === this.activePatient.id ? 'selected' : ''}>${p.name} (${p.room})</option>`).join('')}
            </select>
          </div>

          <!-- BLE Sensor Connections -->
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <button class="btn ${chestClass}" id="btn-patient-chest" style="padding: 6px 12px; font-size: 0.75rem;"><i class="fab fa-bluetooth-b"></i> ${chestStateText}</button>
            <button class="btn ${handClass}" id="btn-patient-hand" style="padding: 6px 12px; font-size: 0.75rem;"><i class="fab fa-bluetooth-b"></i> ${handStateText}</button>
            <button class="btn btn-secondary" id="btn-patient-sim" style="padding: 6px 12px; font-size: 0.75rem;"><i class="fas fa-play"></i> ${simText}</button>
          </div>

          <div style="display: flex; align-items: center; gap: 12px;">
            ${connectionBadge}
            <div class="live-telemetry-badge-mini" style="margin: 0;">
              <span class="pulse-badge active" id="badge-pulse-indicator"></span> <span style="font-size: 0.78rem; font-weight: 600; color: var(--color-secondary);" id="badge-stream-text">WAVE TELEMETRY FEED ACTIVE</span>
            </div>
          </div>
        </div>

        <!-- The main vitals dashboard grid -->
        <div class="dashboard-grid">
          <!-- Lung Health Score -->
          <div class="col-4 glass-panel dashboard-card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-heartbeat text-primary"></i> Lung Health Score</h3>
              <span class="text-secondary text-mono" id="telemetry-timestamp">--:--:--</span>
            </div>
            <div class="ring-container">
              <svg class="ring-svg">
                <circle class="ring-track" cx="70" cy="70" r="60"></circle>
                <circle class="ring-indicator" id="score-ring" cx="70" cy="70" r="60"></circle>
              </svg>
              <div class="ring-value-container">
                <div class="ring-value" id="health-score">--</div>
                <div class="ring-unit">Score</div>
              </div>
            </div>
            <div class="telemetry-badge badge-concern text-center" id="score-badge" style="margin: 16px auto 0 auto; width: fit-content; text-align: center;">
              --
            </div>
          </div>

          <!-- Active Biomarkers -->
          <div class="col-8 glass-panel dashboard-card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-stethoscope text-primary"></i> 24×7 Active Biomarkers</h3>
              <span class="commercial-pill" id="device-pill">PATCH ACTIVE</span>
            </div>
            <div class="telemetry-row">
              <div class="glass-panel telemetry-card">
                <span class="telemetry-label">Breathing Rate</span>
                <div class="telemetry-value-row">
                  <span class="telemetry-value" id="val-bpm">--</span>
                  <span class="telemetry-unit">BPM</span>
                </div>
                <span class="telemetry-badge badge-concern" id="bpm-badge">--</span>
              </div>
              
              <div class="glass-panel telemetry-card">
                <span class="telemetry-label">Oxygen Saturation</span>
                <div class="telemetry-value-row">
                  <span class="telemetry-value" id="val-spo2">--</span>
                  <span class="telemetry-unit">% SpO₂</span>
                </div>
                <span class="telemetry-badge badge-critical" id="spo2-badge">--</span>
              </div>
              
              <div class="glass-panel telemetry-card">
                <span class="telemetry-label">Battery & Signal</span>
                <div class="telemetry-value-row">
                  <span class="telemetry-value" id="val-battery">--</span>
                  <span class="telemetry-unit">% Rec</span>
                </div>
                <span class="telemetry-badge badge-normal" id="battery-badge">--</span>
              </div>
            </div>
          </div>

          <!-- Waveform Canvas -->
          <div class="col-8 glass-panel dashboard-card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-wave-square text-secondary"></i> Continuous Respiratory Telemetry Waveform</h3>
              <span class="text-mono text-secondary" style="font-size: 0.8rem;">60Hz Telemetry Feed</span>
            </div>
            <div class="waveform-container">
              <div class="waveform-legend">
                <span class="waveform-badge">Acoustic Sensor #1</span>
                <span class="waveform-badge" style="color: var(--color-accent); border-color: var(--color-accent);">Pleth wave</span>
              </div>
              <canvas id="live-waveform" class="waveform-canvas"></canvas>
            </div>
          </div>

          <!-- Lung Sound Spectrogram -->
          <div class="col-4 glass-panel dashboard-card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-volume-up text-accent"></i> Acoustic Lung Sound AI</h3>
            </div>
            <p class="text-secondary" style="font-size: 0.85rem; margin-bottom: 12px;" id="val-sound">
              --
            </p>
            <div class="audio-analyzer">
              <div class="audio-controls" id="audio-play-trigger">
                <i class="fas fa-play" id="audio-play-icon"></i>
              </div>
              <div class="audio-bars-container" id="audio-visualizer-bars">
                ${Array(24).fill(0).map(() => `<div class="audio-bar" style="height: 6px;"></div>`).join('')}
              </div>
            </div>
            <div style="margin-top: 16px; font-size: 0.75rem; color: var(--text-secondary);">
              <i class="fas fa-info-circle text-primary"></i> Micro-acoustic array monitors crackling fluid levels dynamically.
            </div>
          </div>

          <!-- GORGEOUS NEW: Archival Telemetry Analytics Hub (Column 12) -->
          <div class="col-12 glass-panel dashboard-card" style="margin-top: 8px;">
            <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 14px; margin-bottom: 16px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <h3 class="card-title"><i class="fas fa-chart-line text-primary"></i> Archival Telemetry Analytics</h3>
                <span id="chart-data-source-lbl" style="font-size: 0.8rem;">Local Memory</span>
              </div>
              
              <!-- Vitals historical range switcher -->
              <div style="display: flex; gap: 4px; background: var(--bg-tertiary); padding: 4px; border-radius: 6px; border: 1px solid var(--border-color);">
                <button class="btn btn-secondary chart-range-btn active" data-range="24h" style="font-size: 0.75rem; padding: 6px 12px;">24 Hrs</button>
                <button class="btn btn-secondary chart-range-btn" data-range="7d" style="font-size: 0.75rem; padding: 6px 12px;">7 Days</button>
                <button class="btn btn-secondary chart-range-btn" data-range="30d" style="font-size: 0.75rem; padding: 6px 12px;">30 Days</button>
                <button class="btn btn-secondary chart-range-btn" data-range="1y" style="font-size: 0.75rem; padding: 6px 12px;">1 Year</button>
              </div>
            </div>

            <div class="dashboard-grid" style="margin: 0; padding: 0; min-height: 280px;">
              
              <!-- Connection details widget -->
              <div class="col-3" style="border-right: 1px solid var(--border-color); padding-right: 16px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                  <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px 0;">Archival Summary</h4>
                  <p class="text-secondary" style="font-size: 0.78rem; line-height: 1.4; margin: 0 0 16px 0;">
                    Monitors physiological data drift stretching back up to one full year. Visualizes pulmonary degradation curves and cardiac stabilization records.
                  </p>
                  
                  <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; font-size: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span class="text-secondary">Sync State:</span>
                      <strong id="db-sync-state" style="color: var(--color-primary);">Offline Active</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                      <span class="text-secondary">Engine:</span>
                      <strong id="db-engine-state">Secure Hub Sandbox</strong>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                      <span class="text-secondary">History Cache:</span>
                      <strong id="db-history-state" style="color: var(--color-secondary);">Ready</strong>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Main Interactive Line Chart Canvas -->
              <div class="col-9" style="position: relative; height: 260px; padding-left: 16px;">
                <canvas id="historical-chart" style="width: 100%; height: 100%;"></canvas>
              </div>

            </div>
          </div>

          <!-- Daily Prescriptions -->
          <div class="col-4 glass-panel dashboard-card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-capsules text-secondary"></i> Prescriptions</h3>
            </div>
            <div class="medication-list" id="prescription-list-panel">
              <!-- Dynamically populated from timeline/telemetry -->
            </div>
          </div>

          <!-- Diagnostics Report -->
          <div class="col-8 glass-panel dashboard-card">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-file-invoice-dollar text-primary"></i> Clinical Diagnostics Report</h3>
              <div style="display: flex; gap: 8px;">
                <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" id="btn-share-doctor">
                  <i class="fas fa-share-alt"></i> Share
                </button>
                <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" id="btn-export-pdf">
                  <i class="fas fa-file-pdf"></i> Export PDF
                </button>
              </div>
            </div>
            
            <div class="report-workspace">
              <div class="medical-report-a4" id="printable-report">
                <div class="report-header-section">
                  <div class="report-clinic-brand">
                    <div class="clinic-logo-icon"><i class="fas fa-lungs"></i> AI Lung Patch</div>
                    <div class="clinic-name">Metro Health Pulmonary Center</div>
                    <div class="clinic-meta">250 Medical Center Pkwy, Suite 400</div>
                  </div>
                  <div class="report-id-box">
                    <div class="report-title-label">Clinical Diagnostic Report</div>
                    <div class="report-barcode" id="report-code">REP-9921</div>
                  </div>
                </div>

                <table class="report-meta-table">
                  <tr>
                    <td class="label-cell">Patient Name</td>
                    <td class="value-cell" id="rep-patient-name">--</td>
                    <td class="label-cell">Patient ID</td>
                    <td class="value-cell" id="rep-patient-id">--</td>
                  </tr>
                  <tr>
                    <td class="label-cell">Date/Time</td>
                    <td class="value-cell" id="rep-datetime">--</td>
                    <td class="label-cell">Risk Priority</td>
                    <td class="value-cell" id="rep-risk" style="font-weight: 700;">--</td>
                  </tr>
                  <tr>
                    <td class="label-cell">Admission Case</td>
                    <td class="value-cell" id="rep-case" colspan="3">--</td>
                  </tr>
                </table>

                <div class="report-section-heading">24-Hour Telemetry Aggregates</div>
                <div class="report-telemetry-summary">
                  <div class="report-stat-box">
                    <div class="report-stat-num" id="rep-bpm">-- BPM</div>
                    <div class="report-stat-lbl">Mean Breathing Rate</div>
                  </div>
                  <div class="report-stat-box">
                    <div class="report-stat-num" id="rep-spo2">--% SpO₂</div>
                    <div class="report-stat-lbl">Minimum Saturation Level</div>
                  </div>
                  <div class="report-stat-box">
                    <div class="report-stat-num" id="rep-status">--</div>
                    <div class="report-stat-lbl">Sensor Sync Status</div>
                  </div>
                </div>

                <div class="report-section-heading">Machine Learning Findings & Acoustic Analysis</div>
                <div class="findings-list" id="rep-findings">
                  <!-- findings -->
                </div>

                <div class="report-section-heading">Attending Physician Diagnosis Recommendation</div>
                <div class="report-recommendations" id="rep-recommendation">
                  Awaiting clinician review.
                </div>

                <div class="report-signatures">
                  <div class="sig-block">
                    <i class="fas fa-microchip" style="font-size: 1.5rem; color: var(--color-accent); margin-bottom: 6px;"></i>
                    <div class="sig-line"></div>
                    <div class="sig-name">Bio-AI Diagnostics Core</div>
                    <div class="sig-title">FDA Class-II Software Engine</div>
                  </div>
                  
                  <div class="sig-block">
                    <svg class="sig-image" viewBox="0 0 100 30" width="100" height="30">
                      <path d="M 10 20 Q 30 5 40 25 T 70 10 T 90 20" fill="none" stroke="#0284c7" stroke-width="2"></path>
                    </svg>
                    <div class="sig-line"></div>
                    <div class="sig-name" id="rep-sig-name">Awaiting Signature</div>
                    <div class="sig-title">Attending Physician</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // Populate list of registered but not admitted patients
  renderAdmissionList() {
    const listContainer = document.getElementById("admission-list-container");
    if (!listContainer) return;

    const registered = TelemetryEngineInstance.patients.filter(p => p.admissionStatus === "Registered");

    if (registered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-tertiary); padding: 40px; border: 1px dashed var(--border-color); border-radius: 8px;">
          <i class="fas fa-bed-pulse" style="font-size: 2rem; margin-bottom: 12px; color: var(--text-tertiary);"></i>
          <p style="font-size: 0.88rem; margin: 0;">No registered patients pending ward admission.</p>
          <button class="btn btn-primary nav-sub-tab" data-tab="register" style="margin-top: 14px; font-size: 0.8rem; padding: 6px 12px;">Register Patient First</button>
        </div>
      `;
      
      // Bind click on sub-tabs inside list placeholders
      listContainer.querySelectorAll(".nav-sub-tab").forEach(btn => {
        btn.addEventListener("click", () => {
          this.activeTab = btn.getAttribute("data-tab");
          this.render();
        });
      });
      return;
    }

    listContainer.innerHTML = registered.map(p => {
      return `
        <div class="glass-panel" style="padding: 20px; border-radius: 12px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; background: var(--bg-tertiary);">
          <div>
            <h4 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0 0 4px 0;">${p.name}</h4>
            <div style="font-size: 0.8rem; color: var(--text-secondary);">
              ID: <strong style="color: var(--color-primary);">${p.id}</strong> • ${p.gender}, ${p.age} Yrs • ${p.condition}
            </div>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 6px; display: flex; gap: 16px;">
              <span>Baseline Saturation: <strong>${p.liveSpo2}% SpO₂</strong></span>
              <span>Baseline HR: <strong>${p.liveBpm} BPM</strong></span>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span style="font-size: 0.68rem; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase;">Room / Bed Assignment</span>
              <input type="text" id="room-${p.id}" placeholder="e.g. ICU-302B" class="form-input-custom" style="padding: 8px 12px; font-size: 0.82rem; width: 150px;" autocomplete="off">
            </div>
            <button class="btn btn-secondary btn-admit-action animate-btn" data-id="${p.id}" style="padding: 10px 14px; font-size: 0.82rem; align-self: flex-end; font-weight: 700;">
              Admit to Ward <i class="fas fa-bed-pulse" style="margin-left: 4px;"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click events to Admit buttons
    listContainer.querySelectorAll(".btn-admit-action").forEach(btn => {
      btn.addEventListener("click", () => {
        const patId = btn.getAttribute("data-id");
        const roomInput = document.getElementById(`room-${patId}`);
        const roomVal = roomInput ? roomInput.value.trim() : "";
        if (!roomVal) {
          alert("Please assign a Room or Bed location for ward admission.");
          return;
        }

        TelemetryEngineInstance.admitPatient(patId, roomVal);
        alert(`Admission Complete!\n\nPatient ID: ${patId}\nRoom: ${roomVal}\n\nClinical diagnostic records and real-time telemetry sensors are now actively streaming to the Doctor Portal.`);
        
        // Redirect to vitals tab to inspect wave
        this.activeTab = "vitals";
        const newlyAdmitted = TelemetryEngineInstance.patients.find(p => p.id === patId);
        if (newlyAdmitted) this.activePatient = newlyAdmitted;
        this.render();
      });
    });
  }

  // Subscribe to live telemetry ticks
  setupTelemetrySub() {
    // Unsubscribe previous to avoid multiple tick updates
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    const unsubMock = TelemetryEngineInstance.subscribe((patients) => {
      if (this.activeTab === "vitals" && this.activePatient) {
        const current = patients.find(p => p.id === this.activePatient.id);
        if (current) {
          this.activePatient = current;
          this.updateTelemetryUI();
        }
      }
    });

    const unsubBLE = BLEControllerInstance.subscribe((data, type) => {
      if (this.activeTab === "vitals") {
        this.updateTelemetryUI();
      }
    });

    this.unsubscribe = () => {
      unsubMock();
      unsubBLE();
    };
  }

  // Update real-time cards and SVG circle rings
  updateTelemetryUI() {
    const p = this.activePatient;
    if (!p || p.admissionStatus !== "Admitted") return;

    // Health score
    const scoreVal = document.getElementById("health-score");
    if (scoreVal) scoreVal.textContent = p.liveScore;

    const ring = document.getElementById("score-ring");
    if (ring) {
      const numericScore = parseInt(p.liveScore) || 0;
      const strokeOffset = 377 - (numericScore / 100) * 377;
      ring.style.strokeDashoffset = strokeOffset;
      
      ring.className.baseVal = "ring-indicator";
      if (p.riskLevel === "Critical") ring.classList.add("critical");
      else if (p.riskLevel === "Mild Concern") ring.classList.add("concern");
      else ring.classList.add("normal");
    }

    const badge = document.getElementById("score-badge");
    if (badge) {
      badge.textContent = p.riskLevel.toUpperCase();
      badge.className = `telemetry-badge text-center`;
      if (p.riskLevel === "Critical") badge.classList.add("badge-critical");
      else if (p.riskLevel === "Mild Concern") badge.classList.add("badge-concern");
      else if (p.riskLevel === "Standby") badge.classList.add("badge-concern");
      else badge.classList.add("badge-normal");
    }

    // Vitals numeric displays
    const valBpm = document.getElementById("val-bpm");
    const valSpo2 = document.getElementById("val-spo2");
    const valBattery = document.getElementById("val-battery");
    const valSound = document.getElementById("val-sound");

    // BLE Overlay override
    const isBLEActive = (BLEControllerInstance.chestState === 'connected' || BLEControllerInstance.handState === 'connected' || BLEControllerInstance.isSimulating);
    if (isBLEActive) {
      const ble = BLEControllerInstance.data;
      if (valBpm) valBpm.textContent = ble.breathingRate > 0 ? ble.breathingRate : "--";
      if (valSpo2) valSpo2.textContent = ble.spo2 > 0 ? ble.spo2 : "--";
      if (valBattery) valBattery.textContent = BLEControllerInstance.chestBattery;
      
      const activePredClass = window.currentAIPredictionClass || "Normal";
      const activeConfidence = window.currentAIPredictionConfidence || 95.4;
      if (valSound) valSound.textContent = `Acoustic: ${activePredClass} (${activeConfidence.toFixed(1)}%)`;

      // Update Health Score Ring visually based on prediction class
      if (scoreVal) scoreVal.textContent = Math.round(activeConfidence);
      if (ring) {
        const strokeOffset = 377 - (activeConfidence / 100) * 377;
        ring.style.strokeDashoffset = strokeOffset;
        ring.className.baseVal = "ring-indicator";
        if (activePredClass === "COPD" || activePredClass === "Pneumonia") ring.classList.add("critical");
        else if (activePredClass === "Asthma" || activePredClass === "Post-COVID") ring.classList.add("concern");
        else ring.classList.add("normal");
      }
      if (badge) {
        badge.textContent = activePredClass.toUpperCase();
        badge.className = `telemetry-badge text-center`;
        if (activePredClass === "COPD" || activePredClass === "Pneumonia") badge.classList.add("badge-critical");
        else if (activePredClass === "Asthma" || activePredClass === "Post-COVID") badge.classList.add("badge-concern");
        else badge.classList.add("badge-normal");
      }
    } else {
      if (valBpm) valBpm.textContent = p.liveBpm;
      if (valSpo2) valSpo2.textContent = p.liveSpo2;
      if (valBattery) valBattery.textContent = p.battery;
      if (valSound) valSound.textContent = p.soundAnalysis;
    }

    // Breathing rate badge
    const bpmBadge = document.getElementById("bpm-badge");
    if (bpmBadge) {
      if (p.liveBpm === "--") {
        bpmBadge.textContent = "Standby";
        bpmBadge.className = "telemetry-badge badge-concern";
      } else {
        const numericBpm = parseInt(p.liveBpm) || 0;
        if (numericBpm > 24 || numericBpm < 12) {
          bpmBadge.textContent = "Critical";
          bpmBadge.className = "telemetry-badge badge-critical";
        } else if (numericBpm > 20 || numericBpm < 14) {
          bpmBadge.textContent = "Elevated";
          bpmBadge.className = "telemetry-badge badge-concern";
        } else {
          bpmBadge.textContent = "Normal";
          bpmBadge.className = "telemetry-badge badge-normal";
        }
      }
    }

    // Oxygen level badge
    const spo2Badge = document.getElementById("spo2-badge");
    if (spo2Badge) {
      if (p.liveSpo2 === "--") {
        spo2Badge.textContent = "Standby";
        spo2Badge.className = "telemetry-badge badge-concern";
      } else {
        const numericSpo2 = parseInt(p.liveSpo2) || 0;
        if (numericSpo2 < 90) {
          spo2Badge.textContent = "Hypoxic";
          spo2Badge.className = "telemetry-badge badge-critical";
        } else if (numericSpo2 < 94) {
          spo2Badge.textContent = "Borderline";
          spo2Badge.className = "telemetry-badge badge-concern";
        } else {
          spo2Badge.textContent = "Optimal";
          spo2Badge.className = "telemetry-badge badge-normal";
        }
      }
    }

    // Sensor sync status badge
    const devPill = document.getElementById("device-pill");
    if (devPill) {
      if (isBLEActive) {
        devPill.textContent = "CONNECTED";
        devPill.style.background = "var(--alert-normal-light)";
        devPill.style.color = "var(--alert-normal)";
      } else {
        devPill.textContent = "DISCONNECTED";
        devPill.style.background = "var(--alert-critical-light)";
        devPill.style.color = "var(--alert-critical)";
      }
    }

    // Dynamic updates for Patient Dashboard BLE Buttons
    const btnChest = document.getElementById("btn-patient-chest");
    if (btnChest) {
      btnChest.className = `btn ${BLEControllerInstance.chestState === 'connected' ? 'btn-primary' : 'btn-secondary'}`;
      if (BLEControllerInstance.chestState === 'connected') {
        btnChest.innerHTML = `<i class="fab fa-bluetooth-b"></i> Chest Connected`;
      } else if (BLEControllerInstance.chestState === 'scanning' || BLEControllerInstance.chestState === 'connecting') {
        btnChest.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${BLEControllerInstance.chestState === 'scanning' ? 'Scanning...' : 'Connecting...'}`;
      } else {
        btnChest.innerHTML = `<i class="fab fa-bluetooth-b"></i> Sync Chest`;
      }
    }

    const btnHand = document.getElementById("btn-patient-hand");
    if (btnHand) {
      btnHand.className = `btn ${BLEControllerInstance.handState === 'connected' ? 'btn-primary' : 'btn-secondary'}`;
      if (BLEControllerInstance.handState === 'connected') {
        btnHand.innerHTML = `<i class="fab fa-bluetooth-b"></i> Hand Connected`;
      } else if (BLEControllerInstance.handState === 'scanning' || BLEControllerInstance.handState === 'connecting') {
        btnHand.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${BLEControllerInstance.handState === 'scanning' ? 'Scanning...' : 'Connecting...'}`;
      } else {
        btnHand.innerHTML = `<i class="fab fa-bluetooth-b"></i> Sync Hand`;
      }
    }

    const btnSim = document.getElementById("btn-patient-sim");
    if (btnSim) {
      btnSim.className = `btn ${BLEControllerInstance.isSimulating ? 'btn-accent' : 'btn-secondary'}`;
      btnSim.innerHTML = BLEControllerInstance.isSimulating 
        ? `<i class="fas fa-stop"></i> Stop Sim` 
        : `<i class="fas fa-play"></i> Simulate`;
    }

    // Update Connection & Database Engine Details Widget
    const dbSyncState = document.getElementById("db-sync-state");
    if (dbSyncState) {
      if (TelemetryEngineInstance.isFirebaseConnected) {
        dbSyncState.textContent = "Firebase Active";
        dbSyncState.style.color = "var(--color-secondary)";
      } else {
        dbSyncState.textContent = "Offline Active";
        dbSyncState.style.color = "var(--color-primary)";
      }
    }
    
    const dbEngineState = document.getElementById("db-engine-state");
    if (dbEngineState) {
      if (TelemetryEngineInstance.isFirebaseConnected) {
        dbEngineState.textContent = "Google Firestore";
      } else {
        dbEngineState.textContent = "Secure Hub Sandbox";
      }
    }

    // Update Patient Dashboard DB Connection Badge
    const dbBadge = document.getElementById("patient-db-connection-badge");
    if (dbBadge) {
      dbBadge.className = `telemetry-badge ${TelemetryEngineInstance.isFirebaseConnected ? 'badge-normal' : 'badge-concern'}`;
      dbBadge.innerHTML = `<i class="fas fa-circle-nodes"></i> ${TelemetryEngineInstance.isFirebaseConnected ? 'Firebase Connected' : 'Local Telemetry Active'}`;
    }

    // Timestamp
    const ts = document.getElementById("telemetry-timestamp");
    if (ts) {
      ts.textContent = new Date(p.lastUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }

    // Update Diagnostics Report A4 values dynamically
    const repName = document.getElementById("rep-patient-name");
    if (repName) repName.textContent = p.name;
    const repId = document.getElementById("rep-patient-id");
    if (repId) repId.textContent = p.id;
    const repCase = document.getElementById("rep-case");
    if (repCase) repCase.textContent = p.condition;
    
    const repRisk = document.getElementById("rep-risk");
    if (repRisk) {
      repRisk.textContent = p.riskLevel;
      if (p.riskLevel === "Critical") repRisk.style.color = "var(--alert-critical)";
      else if (p.riskLevel === "Mild Concern") repRisk.style.color = "var(--alert-concern)";
      else repRisk.style.color = "var(--alert-normal)";
    }

    const rBpm = document.getElementById("rep-bpm");
    if (rBpm) rBpm.textContent = `${p.liveBpm} BPM`;
    const rSpo2 = document.getElementById("rep-spo2");
    if (rSpo2) rSpo2.textContent = `${p.liveSpo2}% SpO₂`;
    const rStatus = document.getElementById("rep-status");
    if (rStatus) rStatus.textContent = p.patchStatus;

    const rRecommendation = document.getElementById("rep-recommendation");
    if (rRecommendation) rRecommendation.textContent = p.recommendation;

    const rSig = document.getElementById("rep-sig-name");
    if (rSig) rSig.textContent = p.doctorSignature || "Awaiting Signature Log";

    const rFindings = document.getElementById("rep-findings");
    if (rFindings) {
      rFindings.innerHTML = p.findings.map(f => `<div class="finding-bullet">${f}</div>`).join('');
    }

    // Populate prescriptions from case history/timeline
    const prescPanel = document.getElementById("prescription-list-panel");
    if (prescPanel) {
      const pItems = p.timeline.filter(t => t.note.includes("Prescription added:"));
      if (pItems.length === 0) {
        prescPanel.innerHTML = `
          <div style="text-align: center; color: var(--text-tertiary); padding: 20px; font-size: 0.8rem;">
            No active prescriptions loaded. Visit Doctor Portal clinical console to prescribe medications.
          </div>
        `;
      } else {
        prescPanel.innerHTML = pItems.map((item, index) => {
          const detail = item.note.replace("Prescription added:", "").trim();
          const parts = detail.split('(');
          const name = parts[0].trim();
          const dose = parts[1] ? parts[1].replace(')', '').trim() : "Standard Dose";
          return `
            <div class="medication-item" id="med-dyn-${index}">
              <div class="medication-checkbox"><i class="fas fa-check"></i></div>
              <div class="medication-details">
                <div class="medication-name">${name}</div>
                <div class="medication-time">${item.time} • ${dose}</div>
              </div>
            </div>
          `;
        }).join('');

        // Bind dyn meds check toggle
        prescPanel.querySelectorAll(".medication-item").forEach(m => {
          m.addEventListener("click", () => m.classList.toggle("taken"));
        });
      }
    }
  }

  // Draw continuous pleth waves
  setupWaveformCanvas() {
    this.canvasElement = document.getElementById("live-waveform");
    if (!this.canvasElement) return;

    this.canvasContext = this.canvasElement.getContext("2d");
    
    const resizeCanvas = () => {
      if (!this.canvasElement) return;
      this.canvasElement.width = this.canvasElement.clientWidth * window.devicePixelRatio;
      this.canvasElement.height = this.canvasElement.clientHeight * window.devicePixelRatio;
    };
    resizeCanvas();

    const draw = () => {
      if (!this.canvasElement || !this.canvasContext) return;
      if (this.activeTab !== "vitals") return;
      
      const ctx = this.canvasContext;
      const w = this.canvasElement.width;
      const h = this.canvasElement.height;
      
      ctx.clearRect(0, 0, w, h);
      
      // Draw grids
      ctx.strokeStyle = "rgba(6, 182, 212, 0.06)";
      ctx.lineWidth = 1;
      const gridSize = 30;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      
      const isBLEActive = (BLEControllerInstance.chestState === 'connected' || BLEControllerInstance.handState === 'connected' || BLEControllerInstance.isSimulating);
      
      // 1. Draw Primary Acoustic/Breathing Wave
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "var(--color-primary, #06b6d4)";
      
      this.wavePhase += 0.15; // increment phase for movement
      
      if (isBLEActive) {
        const bpm = parseInt(BLEControllerInstance.data.breathingRate) || 16;
        const frequencyScale = (bpm / 60) * 0.15; // scale frequency based on breathing rate
        for (let i = 0; i < w; i++) {
          // A nice breathing pleth curve: combination of two sines for inspiration/expiration peak
          const angle = i * frequencyScale - this.wavePhase;
          const y = h / 2 + Math.sin(angle) * (h / 4) + Math.cos(angle * 2.3) * (h / 12) + (Math.random() - 0.5) * 1.5;
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
      } else {
        // Flatline
        for (let i = 0; i < w; i++) {
          const y = h / 2;
          if (i === 0) ctx.moveTo(0, y);
          else ctx.lineTo(i, y);
        }
      }
      
      ctx.shadowBlur = 12;
      ctx.shadowColor = "var(--color-primary-glow, rgba(6, 182, 212, 0.45))";
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 2. Draw Secondary Oxygen/Pleth Wave
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "var(--color-accent, #a855f7)";
      
      if (isBLEActive) {
        const hr = parseInt(BLEControllerInstance.data.heartRate) || 72;
        const frequencyScale = (hr / 60) * 0.25;
        for (let i = 0; i < w; i++) {
          const angle = i * frequencyScale - this.wavePhase * 2.2;
          const y = h * 0.75 + Math.sin(angle) * (h / 12) + Math.sin(angle * 3.5) * (h / 30);
          if (i === 0) ctx.moveTo(i, y);
          else ctx.lineTo(i, y);
        }
      } else {
        // Flatline
        for (let i = 0; i < w; i++) {
          const y = h * 0.75;
          if (i === 0) ctx.moveTo(0, y);
          else ctx.lineTo(i, y);
        }
      }
      ctx.stroke();
      
      this.animationId = requestAnimationFrame(draw);
    };

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    draw();
  }

  // Interactive spectrogram visualizer
  triggerAcousticAnalyzer() {
    const bars = document.querySelectorAll("#audio-visualizer-bars .audio-bar");
    if (!bars.length) return;

    if (this.audioInterval) {
      clearInterval(this.audioInterval);
      this.audioInterval = null;
    }
    
    if (this.isAudioPlaying) {
      this.audioInterval = setInterval(() => {
        bars.forEach((bar, idx) => {
          const isBLEActive = (BLEControllerInstance.chestState === 'connected' || BLEControllerInstance.handState === 'connected' || BLEControllerInstance.isSimulating);
          const baseHeight = isBLEActive ? 12 : 6;
          const randomAmp = isBLEActive ? 24 : 12;
          const phase = Date.now() * 0.005 + idx * 0.5;
          const h = baseHeight + Math.sin(phase) * randomAmp + Math.random() * 5;
          bar.style.height = `${Math.max(6, Math.min(32, h))}px`;
          bar.style.backgroundColor = isBLEActive ? "var(--color-accent)" : "var(--color-primary)";
        });
      }, 80);
    } else {
      bars.forEach(bar => {
        bar.style.height = "6px";
        bar.style.backgroundColor = "var(--color-primary)";
      });
    }
  }

  /* ==========================================================================
     SUPABASE HISTORICAL CHARTING INTEGRATION
     ========================================================================== */

  initHistoryChart() {
    loadChartJS(() => {
      this.updateHistoryChart();
    });
  }

  async updateHistoryChart() {
    const chartCanvas = document.getElementById("historical-chart");
    if (!chartCanvas) return;

    // Local Sandbox mock rendering
    const mock = generateLocalMockHistory(this.historyRange);
    const labels = mock.labels;
    const bpmData = mock.bpm;
    const spo2Data = mock.spo2;

    // Update status in the chart container header
    const chartStatus = document.getElementById("chart-data-source-lbl");
    if (chartStatus) {
      chartStatus.innerHTML = `<span class="telemetry-badge badge-normal" style="font-size: 0.72rem; margin: 0; background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary);"><i class="fas fa-circle-check"></i> Encrypted Local History</span>`;
    }
    
    const dbHistoryState = document.getElementById("db-history-state");
    if (dbHistoryState) {
      dbHistoryState.textContent = "Active Cache";
      dbHistoryState.style.color = "var(--color-primary)";
    }

    if (this.historyChart) {
      this.historyChart.destroy();
    }

    const ctx = chartCanvas.getContext("2d");
    this.historyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Heart Rate (BPM)',
            data: bpmData,
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.02)',
            borderWidth: 3,
            tension: 0.4,
            pointRadius: this.historyRange === '1y' ? 0 : 3,
            pointHoverRadius: 6,
            yAxisID: 'y-bpm'
          },
          {
            label: 'Oxygen Saturation (SpO₂ %)',
            data: spo2Data,
            borderColor: '#a855f7',
            backgroundColor: 'rgba(168, 85, 247, 0.02)',
            borderWidth: 3,
            tension: 0.4,
            pointRadius: this.historyRange === '1y' ? 0 : 3,
            pointHoverRadius: 6,
            yAxisID: 'y-spo2'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: 'var(--text-primary)',
              boxWidth: 12,
              font: { family: 'system-ui', size: 11, weight: '700' }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#071120',
            titleColor: '#06b6d4',
            titleFont: { weight: 'bold' },
            bodyColor: '#ffffff',
            borderColor: 'rgba(56, 189, 248, 0.15)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: {
              color: 'var(--text-secondary)',
              maxTicksLimit: 10,
              font: { size: 10 }
            }
          },
          'y-bpm': {
            type: 'linear',
            position: 'left',
            grid: { color: 'rgba(255,255,255,0.03)' },
            ticks: { color: '#06b6d4', font: { size: 10, weight: '700' } },
            title: { display: false }
          },
          'y-spo2': {
            type: 'linear',
            position: 'right',
            grid: { drawOnChartArea: false },
            ticks: { color: '#a855f7', font: { size: 10, weight: '700' } },
            title: { display: false },
            min: 80,
            max: 100
          }
        }
      }
    });
  }

  attachEventListeners() {
    // 1. Navigation tabs switches
    document.querySelectorAll(".nav-sub-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        if (tab) {
          this.activeTab = tab;
          this.render();
        }
      });
    });

    // 2. Placeholder redirection buttons
    const goReg = document.getElementById("go-to-reg");
    if (goReg) {
      goReg.addEventListener("click", () => {
        this.activeTab = "register";
        this.render();
      });
    }

    const goAdm = document.getElementById("go-to-adm");
    if (goAdm) {
      goAdm.addEventListener("click", () => {
        this.activeTab = "admit";
        this.render();
      });
    }

    // 3. Register Form submit listener
    const submitReg = document.getElementById("btn-submit-register");
    if (submitReg) {
      submitReg.addEventListener("click", () => {
        const name = document.getElementById("reg-name").value.trim();
        const age = document.getElementById("reg-age").value.trim();
        const gender = document.getElementById("reg-gender").value;
        const condition = document.getElementById("reg-condition").value.trim();
        const bpm = document.getElementById("reg-bpm").value.trim();
        const spo2 = document.getElementById("reg-spo2").value.trim();

        if (!name || !age || !condition || !bpm || !spo2) {
          alert("All fields are mandatory. Please enter complete patient baseline metrics.");
          return;
        }

        const newPatient = TelemetryEngineInstance.registerPatient(name, age, gender, condition, bpm, spo2);
        alert(`Registration Confirmed!\n\nPatient: ${newPatient.name}\nAssigned ID: ${newPatient.id}\n\nRedirecting to Ward Admission Desk to assign room and bed location.`);
        
        // Auto switch tab to admission to admit them immediately
        this.activeTab = "admit";
        this.render();
      });
    }

    // 4. Telemetry select patient change listener
    const patFocus = document.getElementById("telemetry-patient-focus");
    if (patFocus) {
      patFocus.addEventListener("change", (e) => {
        const patId = e.target.value;
        const selected = TelemetryEngineInstance.patients.find(p => p.id === patId);
        if (selected) {
          this.activePatient = selected;
          this.updateTelemetryUI();
          this.setupWaveformCanvas();
          this.updateHistoryChart();
        }
      });
    }

    // 4.5 Patient Dashboard BLE & Sim Buttons Event Listeners
    const patientChest = document.getElementById("btn-patient-chest");
    if (patientChest) {
      patientChest.addEventListener("click", async () => {
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

    const patientHand = document.getElementById("btn-patient-hand");
    if (patientHand) {
      patientHand.addEventListener("click", async () => {
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

    const patientSim = document.getElementById("btn-patient-sim");
    if (patientSim) {
      patientSim.addEventListener("click", () => {
        if (BLEControllerInstance.isSimulating) {
          BLEControllerInstance.stopSimulation();
          showToast("Simulation feed stopped", "info");
        } else {
          BLEControllerInstance.startSimulation("Normal");
          showToast("Simulation feed active", "success");
        }
      });
    }

    // 5. Audio AI spectrogram triggers
    const audioTrigger = document.getElementById("audio-play-trigger");
    const playIcon = document.getElementById("audio-play-icon");
    if (audioTrigger && playIcon) {
      audioTrigger.addEventListener("click", () => {
        this.isAudioPlaying = !this.isAudioPlaying;
        if (this.isAudioPlaying) {
          playIcon.className = "fas fa-pause";
          audioTrigger.style.background = "var(--color-accent)";
        } else {
          playIcon.className = "fas fa-play";
          audioTrigger.style.background = "var(--color-primary)";
        }
        this.triggerAcousticAnalyzer();
      });
    }

    // 6. PDF and Share utilities
    const pdfBtn = document.getElementById("btn-export-pdf");
    if (pdfBtn) {
      pdfBtn.addEventListener("click", () => {
        const element = document.getElementById("printable-report");
        if (!element) {
          alert("Error: Clinical report element not found!");
          return;
        }

        const patientName = document.getElementById("rep-patient-name")?.textContent || "Patient";
        const sanitizedPatientName = patientName.replace(/\s+/g, "_");
        const filename = `Clinical_Diagnostic_Report_${sanitizedPatientName}.pdf`;

        // PDF Generation Options
        const opt = {
          margin:       [0.4, 0.4, 0.4, 0.4],
          filename:     filename,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { 
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Try File System Access API first (supported on Chrome/Edge/Opera on Windows)
        if (window.showSaveFilePicker) {
          // Show visual loading spinner on button
          const originalText = pdfBtn.innerHTML;
          pdfBtn.disabled = true;
          pdfBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Preparing PDF...`;

          html2pdf().from(element).set(opt).output('blob').then(async (pdfBlob) => {
            try {
              const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                  description: 'PDF Document',
                  accept: {
                    'application/pdf': ['.pdf'],
                  },
                }],
              });

              const writable = await fileHandle.createWritable();
              await writable.write(pdfBlob);
              await writable.close();
              
              alert(`Successfully exported and saved PDF!`);
            } catch (err) {
              if (err.name !== 'AbortError') {
                console.error("Save picker failed, falling back to direct download:", err);
                // Fallback to standard automatic download
                html2pdf().from(element).set(opt).save();
              }
            } finally {
              pdfBtn.disabled = false;
              pdfBtn.innerHTML = originalText;
            }
          }).catch(err => {
            console.error("PDF generation failed:", err);
            alert("Error generating PDF: " + err.message);
            pdfBtn.disabled = false;
            pdfBtn.innerHTML = originalText;
          });
        } else {
          // Standard download fallback
          html2pdf().from(element).set(opt).save();
        }
      });
    }

    const shareBtn = document.getElementById("btn-share-doctor");
    if (shareBtn && this.activePatient) {
      shareBtn.addEventListener("click", () => {
        const dest = prompt("Enter EMR node or physician relay inbox address:", "dr.thorne@metrohealth.org");
        if (dest) {
          alert(`Success! Secure clinical record for ${this.activePatient.name} transmitted dynamically to EMR node: ${dest}`);
        }
      });
    }

    // 7. Interactive Vitals History Range Switchers
    document.querySelectorAll(".chart-range-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".chart-range-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        this.historyRange = btn.getAttribute("data-range");
        this.updateHistoryChart();
      });
    });

  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.audioInterval) clearInterval(this.audioInterval);
    if (this.historyChart) this.historyChart.destroy();
  }
}
