import { TelemetryEngineInstance } from '../utils/mockData.js';

export class DoctorDashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.patients = TelemetryEngineInstance.patients;
    
    // Find initial admitted patient focus
    const admitted = this.patients.filter(p => p.admissionStatus === "Admitted");
    this.selectedPatient = admitted.length > 0 ? admitted[0] : null;
    
    this.unsubscribe = null;
    this.miniAnimationIds = {};
    this.wavePhases = {};
    this.teleConsultTimer = null;
  }

  render() {
    const admitted = this.patients.filter(p => p.admissionStatus === "Admitted");
    if (!this.selectedPatient && admitted.length > 0) {
      this.selectedPatient = admitted[0];
    }

    const curName = this.selectedPatient ? this.selectedPatient.name : "Clinical Standby";
    const curAvatar = this.selectedPatient ? this.selectedPatient.avatar : "CS";
    const curCond = this.selectedPatient ? this.selectedPatient.condition : "No telemetry patients currently admitted to ward.";
    const isConsoleDisabled = !this.selectedPatient ? "disabled" : "";

    this.container.innerHTML = `
      <!-- Apollo Corporate Clinical Navbar -->
      <nav class="clinical-navbar">
        <div class="navbar-menu-group">
          <div class="navbar-item-container">
            <button class="navbar-item-btn" id="nav-btn-discover">
              Discover Apollo <i class="fas fa-chevron-down caret-icon"></i>
            </button>
            <div class="navbar-dropdown-list" id="dropdown-discover">
              <a href="https://www.apollohospitals.com/about-us/" target="_blank">About Apollo Group</a>
              <a href="https://www.apollohospitals.com/chennai/" target="_blank">Apollo Chennai Hospital</a>
              <a href="https://www.apollohospitals.com/book-doctor-appointment/pulmonologist/chennai" target="_blank">Chennai Pulmonology Desk</a>
            </div>
          </div>

          <div class="navbar-item-container">
            <button class="navbar-item-btn" id="nav-btn-find-hospital">
              Find Hospital <i class="fas fa-chevron-down caret-icon"></i>
            </button>
            <div class="navbar-dropdown-list" id="dropdown-find-hospital">
              <a href="https://www.apollohospitals.com/locations/chennai/" target="_blank">Apollo Greams Road, Chennai</a>
              <a href="https://www.apollohospitals.com/locations/omr-chennai/" target="_blank">Apollo OMR, Chennai</a>
              <a href="https://www.apollohospitals.com/locations/perungudi/" target="_blank">Apollo Speciality, Perungudi</a>
            </div>
          </div>
        </div>

        <a href="https://www.apollohospitals.com" target="_blank" class="navbar-logo-link" title="Apollo Hospitals Corporate Site">
          <svg class="apollo-nav-logo-svg" viewBox="0 0 200 50" width="150" height="40">
            <!-- Crest Shield Representation -->
            <path d="M15 10 L25 10 L20 2 Z" fill="#0284c7" />
            <path d="M10 14 L30 14 L25 36 L15 36 Z" fill="#0e7490" />
            <circle cx="20" cy="22" r="3" fill="#f59e0b" />
            <text x="42" y="24" font-family="system-ui, sans-serif" font-weight="800" font-size="15" fill="#0284c7" letter-spacing="0.5">Apollo</text>
            <text x="42" y="34" font-family="system-ui, sans-serif" font-weight="700" font-size="8" fill="#0e7490" letter-spacing="1">HOSPITALS</text>
          </svg>
        </a>

        <div class="navbar-menu-group">
          <div class="navbar-item-container">
            <button class="navbar-item-btn" id="nav-btn-services">
              Medical Services <i class="fas fa-chevron-down caret-icon"></i>
            </button>
            <div class="navbar-dropdown-list" id="dropdown-services">
              <a href="#triage-grid">Ward Active Telemetry</a>
              <a href="https://www.apollohospitals.com/departments/pulmonology/" target="_blank">Department of Pulmonology</a>
              <a href="https://www.apollopharmacy.in" target="_blank" rel="noopener noreferrer">Apollo Pharmacy Store</a>
            </div>
          </div>

          <div class="navbar-item-container">
            <button class="navbar-item-btn" id="nav-btn-library">
              Health Library <i class="fas fa-chevron-down caret-icon"></i>
            </button>
            <div class="navbar-dropdown-list" id="dropdown-library">
              <a href="https://www.apollohospitals.com/patient-care/health-library/copd/" target="_blank">COPD Patient Guides</a>
              <a href="https://www.apollohospitals.com/patient-care/health-library/asthma/" target="_blank">Severe Asthma Control</a>
              <a href="https://www.apollohospitals.com/patient-care/health-library/pneumonia/" target="_blank">Lobar Consolidation Info</a>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main Header -->
      <div class="view-header" style="margin-bottom: 20px;">
        <div class="header-title-container">
          <h1>Clinical Command Dashboard</h1>
          <p>Institutional Inpatient Telemetry, Ward Alert Priorities & Dynamic Dispatching</p>
        </div>
        <div class="header-actions">
          <div class="pulse-card-banner" style="background: var(--alert-critical-light); color: var(--alert-critical); border-color: rgba(239, 68, 68, 0.2);">
            <span class="pulse-badge critical"></span> 
            <span id="critical-alert-count">0 Patients Require Intervention</span>
          </div>
        </div>
      </div>

      <!-- Clinical Workspace Grid Layout -->
      <div class="dashboard-grid">
        
        <!-- Ward Active Telemetry (Live Grid) -->
        <div class="col-8 glass-panel dashboard-card">
          <div class="card-header">
            <h3 class="card-title" id="triage-grid"><i class="fas fa-network-wired text-primary"></i> Ward Active Telemetry (Admitted Grid)</h3>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="patient-search-input" placeholder="Search by ID or Patient Name..." 
                     style="padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.85rem; outline: none;">
            </div>
          </div>

          <div class="patient-list-grid" id="patients-grid-list">
            <!-- Dynamically populated roster list -->
          </div>
        </div>

        <!-- Clinical Alert Prioritization & ward tallies -->
        <div class="col-4 glass-panel dashboard-card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-bell-exclamation text-danger"></i> Clinical Alert Prioritization</h3>
          </div>
          <div class="doctor-alerts-container" id="alerts-desk">
            <!-- Live distress notifications -->
          </div>
          
          <div style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 16px; display: flex; flex-direction: column; gap: 12px;">
            <h4 style="font-size: 0.85rem; font-weight: 700;">Live Ward Diagnostics Tally</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; text-align: center;">
              <div style="background: var(--bg-tertiary); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
                <div style="font-size: 1.2rem; font-weight: 800; color: var(--alert-critical);" id="stat-count-critical">0</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 600;">Critical Risk</div>
              </div>
              <div style="background: var(--bg-tertiary); padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);">
                <div style="font-size: 1.2rem; font-weight: 800; color: var(--alert-normal);" id="stat-count-normal">0</div>
                <div style="font-size: 0.7rem; color: var(--text-secondary); font-weight: 600;">Stable Baseline</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Selected Patient Clinical Panel & Notes -->
        <div class="col-12 glass-panel dashboard-card" style="margin-top: 8px;">
          <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 24px;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div class="patient-avatar" style="width: 50px; height: 50px; font-size: 1.2rem; background: var(--color-primary-light); color: var(--color-primary);" id="cur-patient-avatar">${curAvatar}</div>
              <div>
                <h2 style="font-size: 1.3rem; font-weight: 800;" id="cur-patient-name">${curName}</h2>
                <p style="font-size: 0.85rem; color: var(--text-secondary);" id="cur-patient-condition">${curCond}</p>
              </div>
            </div>
            
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;" id="btn-teleconsult" ${isConsoleDisabled}>
                <i class="fas fa-video"></i> Teleconsultation
              </button>
              <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem; background: var(--color-secondary); border-color: var(--color-secondary);" id="btn-dispatch-patient" ${isConsoleDisabled}>
                <i class="fas fa-sign-out-alt"></i> Discharge & Dispatch
              </button>
            </div>
          </div>

          <div class="dashboard-grid">
            <!-- Telemedicine Simulator -->
            <div class="col-6" id="teleconsult-screen" style="display: none; background: #040810; border-radius: 12px; border: 1px solid var(--color-primary-glow); padding: 16px; flex-direction: column; gap: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--color-primary);">
                  <span class="pulse-badge active"></span> ENCRYPTED TELEHEALTH CONSULTATION ACTIVE
                </span>
                <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.7rem;" id="btn-end-consult">End Call</button>
              </div>
              <div style="height: 180px; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, #0b1f33 0%, #03080e 100%); border-radius: 8px; position: relative; overflow: hidden;">
                <div id="video-sim-overlay" style="text-align: center;">
                  <i class="fas fa-user-md" style="font-size: 3rem; color: var(--color-primary); margin-bottom: 8px;"></i>
                  <div style="color: white; font-weight: 600; font-size: 0.85rem;">Dr. Adrian Thorne <i class="fas fa-arrows-alt-h" style="margin: 0 8px;"></i> <span id="tele-patient-lbl">Patient</span></div>
                  <div style="color: var(--text-tertiary); font-size: 0.72rem; margin-top: 4px;" id="consult-timer">Connected • 00:00</div>
                </div>
              </div>
            </div>

            <!-- Notes & Clinical Diagnosis updates -->
            <div class="col-6">
              <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 12px;">Attending Physician Review & Diagnosis updates</h4>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <textarea id="doctor-recommendation-input" rows="4" ${isConsoleDisabled}
                          placeholder="Manually enter diagnosis progression, physical recovery markers, or oxygenation updates..."
                          style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); outline: none; font-size: 0.85rem; font-family: var(--font-main);"></textarea>
                <div style="display: flex; gap: 12px;">
                  <input type="text" id="doctor-sig-input" placeholder="Digital Signature (e.g. Dr. Adrian Thorne, FACP)" ${isConsoleDisabled}
                         style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-tertiary); color: var(--text-primary); font-size: 0.85rem; outline: none;">
                  <button class="btn btn-secondary" id="btn-save-notes" ${isConsoleDisabled}>Save Clinical Updates</button>
                </div>
              </div>
            </div>

            <!-- digital Prescription Uploader -->
            <div class="col-6">
              <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 12px;">Deploy Electronic Prescription</h4>
              <div class="glass-panel" style="padding: 16px; border-radius: 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 12px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <input type="text" id="presc-med" placeholder="Medication (e.g. Advair Diskus)" ${isConsoleDisabled}
                         style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem; outline: none;">
                  <input type="text" id="presc-dose" placeholder="Dosage (e.g. 250 mcg 2x daily)" ${isConsoleDisabled}
                         style="padding: 8px 12px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem; outline: none;">
                </div>
                <button class="btn btn-accent" id="btn-submit-prescription" ${isConsoleDisabled}>Deploy Prescription <i class="fas fa-file-prescription"></i></button>
              </div>
              
              <!-- Patient Clinical Log history list -->
              <div style="margin-top: 16px;">
                <h4 style="font-size: 0.85rem; font-weight: 700; margin-bottom: 8px;">Case History Timelines</h4>
                <div id="patient-timeline-console" style="max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px;">
                  <!-- Dynamically populated timeline logs -->
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupTelemetrySub();
    this.attachEventListeners();
    this.filterPatientGrid(""); // Initial population
  }

  // Set up live telemetry updating in list rows
  setupTelemetrySub() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.unsubscribe = TelemetryEngineInstance.subscribe((patients) => {
      this.patients = patients;
      this.updateTriageUI();
      
      const admitted = patients.filter(p => p.admissionStatus === "Admitted");
      
      // Update selected patient's active status dynamically
      if (this.selectedPatient) {
        const active = admitted.find(p => p.id === this.selectedPatient.id);
        if (active) {
          this.selectedPatient = active;
          this.updateClinicalConsole();
        } else {
          // Patient was discharged/dispatched
          this.selectedPatient = admitted.length > 0 ? admitted[0] : null;
          this.render();
        }
      } else if (admitted.length > 0) {
        this.selectedPatient = admitted[0];
        this.render();
      }
    });
  }

  // Dynamic clinical priority prioritization and sidebar counters
  updateTriageUI() {
    const admitted = this.patients.filter(p => p.admissionStatus === "Admitted");
    let critCount = 0;
    let normalCount = 0;
    
    admitted.forEach(p => {
      if (p.riskLevel === "Critical") critCount++;
      else normalCount++;
    });

    const valCrit = document.getElementById("stat-count-critical");
    if (valCrit) valCrit.textContent = critCount;

    const valNorm = document.getElementById("stat-count-normal");
    if (valNorm) valNorm.textContent = normalCount;

    const alertBanner = document.getElementById("critical-alert-count");
    if (alertBanner) {
      alertBanner.textContent = `${critCount} Patients Require Immediate Intervention`;
    }

    // Refresh Alert list desk
    const alertsDesk = document.getElementById("alerts-desk");
    if (alertsDesk) {
      const alertItems = [];
      admitted.forEach(p => {
        if (p.riskLevel === "Critical") {
          alertItems.push(`
            <div class="doctor-alert-item">
              <i class="fas fa-exclamation-circle"></i>
              <div>
                <strong>${p.name} (${p.id})</strong>: ${p.soundAnalysis || 'Biomarker alert triggered'}
              </div>
            </div>
          `);
        } else if (p.riskLevel === "Mild Concern") {
          alertItems.push(`
            <div class="doctor-alert-item concern">
              <i class="fas fa-info-circle"></i>
              <div>
                <strong>${p.name} (${p.id})</strong>: Expir wheeze monitored.
              </div>
            </div>
          `);
        }
      });
      alertsDesk.innerHTML = alertItems.length ? alertItems.join('') : '<div class="text-secondary" style="font-size: 0.85rem; text-align: center; padding: 20px;">No active distress alerts in this ward.</div>';
    }

    // Live update grid rows where values are displayed
    admitted.forEach(p => {
      const rowBpm = document.getElementById(`row-bpm-${p.id}`);
      if (rowBpm) rowBpm.textContent = `${p.liveBpm} BPM`;

      const rowSpo2 = document.getElementById(`row-spo2-${p.id}`);
      if (rowSpo2) {
        rowSpo2.textContent = `${p.liveSpo2}%`;
        rowSpo2.className = p.liveSpo2 < 90 ? "text-mono text-danger font-weight-bold" : "text-mono";
      }

      const rowScore = document.getElementById(`row-score-${p.id}`);
      if (rowScore) rowScore.textContent = p.liveScore;

      const rowRisk = document.getElementById(`row-risk-${p.id}`);
      if (rowRisk) {
        rowRisk.textContent = p.riskLevel;
        rowRisk.className = `telemetry-badge ${p.riskLevel === "Critical" ? "badge-critical" : p.riskLevel === "Mild Concern" ? "badge-concern" : "badge-normal"}`;
      }
    });
  }

  // Filter grid list on search query
  filterPatientGrid(query) {
    const listContainer = document.getElementById("patients-grid-list");
    if (!listContainer) return;

    // Clear previous canvases animations
    Object.keys(this.miniAnimationIds).forEach(id => {
      cancelAnimationFrame(this.miniAnimationIds[id]);
    });
    this.miniAnimationIds = {};

    const admitted = this.patients.filter(p => p.admissionStatus === "Admitted");
    const filtered = admitted.filter(p => 
      p.name.toLowerCase().includes(query.toLowerCase()) || 
      p.id.toLowerCase().includes(query.toLowerCase()) ||
      p.condition.toLowerCase().includes(query.toLowerCase())
    );

    if (filtered.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-tertiary); padding: 40px; border: 1px dashed var(--border-color); border-radius: 8px; width: 100%;">
          <i class="fas fa-bed-pulse" style="font-size: 2rem; margin-bottom: 12px; color: var(--text-tertiary);"></i>
          <p style="font-size: 0.88rem; margin: 0;">No active admitted patients in ward telemetry grid.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = filtered.map(p => {
      return `
        <div class="patient-row-card glass-panel ${this.selectedPatient && p.id === this.selectedPatient.id ? 'active-selection' : ''}" 
             id="patient-row-${p.id}" data-id="${p.id}">
          <div class="patient-meta">
            <div class="patient-avatar ${p.riskLevel === 'Critical' ? 'alert-border' : ''}">${p.avatar}</div>
            <div>
              <strong style="color: var(--text-primary); font-size: 0.95rem;">${p.name}</strong>
              <div style="font-size: 0.72rem; color: var(--text-secondary);">${p.id} • ${p.gender}, ${p.age} yrs • Room ${p.room}</div>
            </div>
          </div>
          <div class="text-mono" id="row-bpm-${p.id}">${p.liveBpm} BPM</div>
          <div class="text-mono" id="row-spo2-${p.id}">${p.liveSpo2}%</div>
          <div class="text-mono" style="font-weight: 700;" id="row-score-${p.id}">${p.liveScore}</div>
          
          <!-- Running mini waveform visualizer canvas -->
          <div style="height: 38px; background: #040810; border-radius: 4px; border: 1px solid var(--border-color); overflow: hidden; padding: 2px;">
            <canvas id="mini-wave-${p.id}" style="width: 100%; height: 100%;"></canvas>
          </div>
          
          <div class="telemetry-badge ${p.riskLevel === 'Critical' ? 'badge-critical' : p.riskLevel === 'Mild Concern' ? 'badge-concern' : 'badge-normal'}" 
               id="row-risk-${p.id}" style="text-align: center;">
            ${p.riskLevel}
          </div>
        </div>
      `;
    }).join('');

    // Attach click events to rows
    filtered.forEach(p => {
      const row = document.getElementById(`patient-row-${p.id}`);
      if (row) {
        row.addEventListener("click", () => {
          document.querySelectorAll(".patient-row-card").forEach(r => r.classList.remove("active-selection"));
          row.classList.add("active-selection");
          
          this.selectedPatient = p;
          this.updateClinicalConsole();
        });
      }

      this.setupMiniWaveform(p.id);
    });

    this.updateTriageUI();
    this.updateClinicalConsole();
  }

  // Draw miniature telemetry canvases
  setupMiniWaveform(patientId) {
    const canvas = document.getElementById(`mini-wave-${patientId}`);
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = canvas.clientWidth * window.devicePixelRatio;
    canvas.height = canvas.clientHeight * window.devicePixelRatio;

    this.wavePhases[patientId] = 0;

    const drawMini = () => {
      if (!canvas || !ctx) return;
      const w = canvas.width;
      const h = canvas.height;
      
      ctx.clearRect(0, 0, w, h);
      
      const patient = this.patients.find(p => p.id === patientId);
      if (!patient || patient.patchStatus === "Disconnected" || patient.liveBpm === 0) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(239, 68, 68, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        return;
      }

      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = patient.riskLevel === "Critical" ? "var(--alert-critical)" : patient.riskLevel === "Mild Concern" ? "var(--alert-concern)" : "var(--alert-normal)";
      
      const bpm = patient.liveBpm || 16;
      const frequencyScale = (bpm / 60) * 0.06;

      for (let i = 0; i < w; i++) {
        const sine = Math.sin(i * 0.03 + this.wavePhases[patientId]);
        const subSine = Math.sin(i * 0.09 + this.wavePhases[patientId] * 2.2) * 0.2;
        const y = h / 2 + (sine + subSine) * (h * 0.35);
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i, y);
      }
      ctx.stroke();

      this.wavePhases[patientId] -= frequencyScale;
      this.miniAnimationIds[patientId] = requestAnimationFrame(drawMini);
    };

    drawMini();
  }

  // Update clinical notes/recommendations
  updateClinicalConsole() {
    const p = this.selectedPatient;
    if (!p) {
      // Clear panel if standby
      const curAvatar = document.getElementById("cur-patient-avatar");
      if (curAvatar) curAvatar.textContent = "CS";
      const curName = document.getElementById("cur-patient-name");
      if (curName) curName.textContent = "Clinical Standby";
      const curCond = document.getElementById("cur-patient-condition");
      if (curCond) curCond.textContent = "No telemetry patients currently admitted to ward.";
      const recInput = document.getElementById("doctor-recommendation-input");
      if (recInput) recInput.value = "";
      const sigInput = document.getElementById("doctor-sig-input");
      if (sigInput) sigInput.value = "";
      const timeline = document.getElementById("patient-timeline-console");
      if (timeline) timeline.innerHTML = "";
      return;
    }
    
    const curAvatar = document.getElementById("cur-patient-avatar");
    if (curAvatar) curAvatar.textContent = p.avatar;
    
    const curName = document.getElementById("cur-patient-name");
    if (curName) curName.textContent = p.name;

    const curCond = document.getElementById("cur-patient-condition");
    if (curCond) curCond.textContent = `${p.condition} (Room ${p.room})`;

    const recInput = document.getElementById("doctor-recommendation-input");
    if (recInput) recInput.value = p.recommendation;

    const sigInput = document.getElementById("doctor-sig-input");
    if (sigInput) sigInput.value = p.doctorSignature || "";

    // timelines
    const timeline = document.getElementById("patient-timeline-console");
    if (timeline) {
      timeline.innerHTML = p.timeline.map(t => {
        return `
          <div style="font-size: 0.75rem; background: var(--bg-secondary); border-left: 3px solid var(--color-primary); padding: 4px 8px; border-radius: 0 4px 4px 0;">
            <span style="font-family: var(--font-mono); font-weight: 700; color: var(--color-primary);">${t.time}</span> • ${t.note}
          </div>
        `;
      }).join('');
    }
  }

  // Telehealth video call simulator
  launchTeleconsultation() {
    const screen = document.getElementById("teleconsult-screen");
    const timer = document.getElementById("consult-timer");
    const patLbl = document.getElementById("tele-patient-lbl");
    if (!screen || !this.selectedPatient) return;

    if (patLbl) patLbl.textContent = this.selectedPatient.name;

    screen.style.display = "flex";
    
    let seconds = 0;
    if (this.teleConsultTimer) clearInterval(this.teleConsultTimer);
    
    this.teleConsultTimer = setInterval(() => {
      seconds++;
      const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
      const secs = String(seconds % 60).padStart(2, '0');
      if (timer) timer.textContent = `Connected • ${mins}:${secs}`;
    }, 1000);
  }

  // Handle dropdown toggle events
  setupNavbarToggles() {
    const dropdownButtons = [
      { btnId: "nav-btn-discover", listId: "dropdown-discover" },
      { btnId: "nav-btn-find-hospital", listId: "dropdown-find-hospital" },
      { btnId: "nav-btn-services", listId: "dropdown-services" },
      { btnId: "nav-btn-library", listId: "dropdown-library" }
    ];

    dropdownButtons.forEach(opt => {
      const btn = document.getElementById(opt.btnId);
      const list = document.getElementById(opt.listId);
      if (btn && list) {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          
          // Collapse all others
          dropdownButtons.forEach(other => {
            if (other.btnId !== opt.btnId) {
              const otherBtn = document.getElementById(other.btnId);
              const otherList = document.getElementById(other.listId);
              if (otherBtn) otherBtn.classList.remove("active");
              if (otherList) otherList.classList.remove("active");
            }
          });

          // Toggle self
          btn.classList.toggle("active");
          list.classList.toggle("active");
        });
      }
    });

    // Collapse all if clicked outside
    document.addEventListener("click", () => {
      dropdownButtons.forEach(opt => {
        const btn = document.getElementById(opt.btnId);
        const list = document.getElementById(opt.listId);
        if (btn) btn.classList.remove("active");
        if (list) list.classList.remove("active");
      });
    });
  }

  attachEventListeners() {
    // Search box
    const search = document.getElementById("patient-search-input");
    if (search) {
      search.addEventListener("input", (e) => {
        this.filterPatientGrid(e.target.value);
      });
    }

    // clinical recommendation notes save
    const saveBtn = document.getElementById("btn-save-notes");
    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        if (!this.selectedPatient) return;
        const rec = document.getElementById("doctor-recommendation-input").value;
        const sig = document.getElementById("doctor-sig-input").value;
        if (!sig) {
          alert("Attending physician signature is required to authorize diagnostic updates.");
          return;
        }

        TelemetryEngineInstance.updatePatientNotes(this.selectedPatient.id, rec, sig);
        alert(`Diagnosis Process updated successfully for ${this.selectedPatient.name}!`);
      });
    }

    // Deploy Electronic Prescription
    const submitPresc = document.getElementById("btn-submit-prescription");
    if (submitPresc) {
      submitPresc.addEventListener("click", () => {
        if (!this.selectedPatient) return;
        const med = document.getElementById("presc-med");
        const dose = document.getElementById("presc-dose");
        
        if (!med.value || !dose.value) {
          alert("Medication name and clinical dosing instructions are mandatory.");
          return;
        }

        TelemetryEngineInstance.addPrescription(this.selectedPatient.id, med.value, dose.value);
        alert(`Prescription deployed! Telemetry arrays will monitor drug reaction.`);
        med.value = "";
        dose.value = "";
      });
    }

    // Teleconsult triggers
    const teleBtn = document.getElementById("btn-teleconsult");
    if (teleBtn) {
      teleBtn.addEventListener("click", () => {
        this.launchTeleconsultation();
      });
    }

    const endConsult = document.getElementById("btn-end-consult");
    if (endConsult) {
      endConsult.addEventListener("click", () => {
        const screen = document.getElementById("teleconsult-screen");
        if (screen) screen.style.display = "none";
        if (this.teleConsultTimer) clearInterval(this.teleConsultTimer);
        alert("Consultation call ended.");
      });
    }

    // Dispatch patient: automatically removes patient from list
    const dispatchBtn = document.getElementById("btn-dispatch-patient");
    if (dispatchBtn) {
      dispatchBtn.addEventListener("click", () => {
        if (!this.selectedPatient) return;
        
        const confirmDispatch = confirm(`Are you sure you want to discharge and dispatch patient ${this.selectedPatient.name} (${this.selectedPatient.id}) from active telemetry? This will automatically remove them from the clinic command grid.`);
        
        if (confirmDispatch) {
          const dispatchedId = this.selectedPatient.id;
          const name = this.selectedPatient.name;
          
          TelemetryEngineInstance.dispatchPatient(dispatchedId);
          alert(`Patient ${name} has been successfully dispatched from ward. Telemetry connections closed.`);
        }
      });
    }

    this.setupNavbarToggles();
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
    Object.keys(this.miniAnimationIds).forEach(id => {
      cancelAnimationFrame(this.miniAnimationIds[id]);
    });
    if (this.teleConsultTimer) clearInterval(this.teleConsultTimer);
  }
}
