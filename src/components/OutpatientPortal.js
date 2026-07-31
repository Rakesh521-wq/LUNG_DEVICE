import { TelemetryEngineInstance } from '../utils/mockData.js';

export class OutpatientPortal {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.unsubscribe = null;
    this.activeTab = "in"; // "in" (Outpatient In) or "exit" (Outpatient Exit)

    // Doctors available for Outpatient consultation with timings
    this.opDoctors = [
      { id: "DOC-CH-1", name: "Dr. Prasanna Kumar Thomas", specialty: "Interventional Pulmonology", timing: "10:00 AM - 01:00 PM" },
      { id: "DOC-CH-2", name: "Dr. R. Narasimhan", specialty: "Severe Asthma & COPD Specialist", timing: "02:00 PM - 05:00 PM" },
      { id: "DOC-CH-3", name: "Dr. Madhusudan J", specialty: "Sleep Apnea & Critical Care", timing: "09:00 AM - 11:30 AM" },
      { id: "DOC-CH-4", name: "Dr. Ramakrishnan AR", specialty: "Interstitial Lung Disease", timing: "04:00 PM - 06:30 PM" }
    ];
  }

  render() {
    this.container.innerHTML = `
      <!-- Outpatient Sub-Header with Stats & Tab Navigation -->
      <div class="view-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div class="header-title-container">
          <h1 style="display: flex; align-items: center; gap: 12px; margin: 0;">
            <i class="fas fa-hospital-user text-primary" style="font-size: 2rem;"></i> Outpatient Portal (OP)
          </h1>
          <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--text-secondary);">
            Check-in clinic consult patients, manage attending specialist timings, and track diagnostic checkout records.
          </p>
        </div>
        
        <!-- OP Sub-tab controls -->
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn ${this.activeTab === 'in' ? 'btn-primary' : 'btn-secondary'} op-tab-btn" data-tab="in" style="font-size: 0.8rem; padding: 8px 14px;">
            <i class="fas fa-sign-in-alt"></i> Outpatient In 
            <span class="badge" id="op-in-counter" style="margin-left: 6px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">0</span>
          </button>
          <button class="btn ${this.activeTab === 'exit' ? 'btn-primary' : 'btn-secondary'} op-tab-btn" data-tab="exit" style="font-size: 0.8rem; padding: 8px 14px;">
            <i class="fas fa-sign-out-alt"></i> Outpatient Exit
            <span class="badge" id="op-exit-counter" style="margin-left: 6px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">0</span>
          </button>
        </div>
      </div>

      <!-- Quick Metrics Ribbon -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="glass-panel" style="padding: 16px 20px; display: flex; align-items: center; gap: 16px; background: rgba(2, 132, 199, 0.03);">
          <div style="width: 44px; height: 44px; border-radius: 10px; background: var(--color-primary-light); display: flex; align-items: center; justify-content: center; color: var(--color-primary); font-size: 1.25rem;">
            <i class="fas fa-users-viewfinder"></i>
          </div>
          <div>
            <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); font-weight: 700;">Attending Patients</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);" id="metric-waiting-count">0</div>
          </div>
        </div>

        <div class="glass-panel" style="padding: 16px 20px; display: flex; align-items: center; gap: 16px; background: rgba(16, 185, 129, 0.03);">
          <div style="width: 44px; height: 44px; border-radius: 10px; background: var(--color-secondary-light); display: flex; align-items: center; justify-content: center; color: var(--color-secondary); font-size: 1.25rem;">
            <i class="fas fa-clipboard-user"></i>
          </div>
          <div>
            <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); font-weight: 700;">Completed Consults</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);" id="metric-completed-count">0</div>
          </div>
        </div>

        <div class="glass-panel" style="padding: 16px 20px; display: flex; align-items: center; gap: 16px; background: rgba(168, 85, 247, 0.03);">
          <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(168, 85, 247, 0.15); display: flex; align-items: center; justify-content: center; color: var(--color-accent); font-size: 1.25rem;">
            <i class="fas fa-clock"></i>
          </div>
          <div>
            <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); font-weight: 700;">Active Roster Timing</div>
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">09:00 AM - 06:30 PM</div>
          </div>
        </div>
      </div>

      <!-- Main workspace tabs -->
      <div id="op-workspace-panel">
        <!-- Dynamically rendered active tab panel -->
      </div>
    `;

    this.setupStateSync();
    this.renderActivePanel();
    this.attachHeaderListeners();
  }

  // Active sub-tab workspace rendering
  renderActivePanel() {
    const workspace = document.getElementById("op-workspace-panel");
    if (!workspace) return;

    if (this.activeTab === "in") {
      workspace.innerHTML = `
        <div class="dashboard-grid">
          <!-- Check-in New Outpatient Form -->
          <div class="col-4 glass-panel dashboard-card" style="height: fit-content;">
            <h3 style="font-size: 1.15rem; font-weight: 800; margin-bottom: 6px; color: var(--color-primary); display: flex; align-items: center; gap: 10px;">
              <i class="fas fa-user-plus"></i> OP Registration Desk
            </h3>
            <p style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 20px;">
              Enter outpatient demographic profiles and select preferred pulmonologists to allocate timing slots.
            </p>
            
            <div style="display: flex; flex-direction: column; gap: 16px;" id="op-checkin-form">
              <div class="form-group-custom">
                <label>Patient Full Name</label>
                <input type="text" id="op-reg-name" class="form-input-custom" placeholder="e.g. Ramesh Krishnan" autocomplete="off">
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <div class="form-group-custom">
                  <label>Age (Years)</label>
                  <input type="number" id="op-reg-age" class="form-input-custom" placeholder="e.g. 54">
                </div>
                <div class="form-group-custom">
                  <label>Gender</label>
                  <select id="op-reg-gender" class="form-input-custom">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div class="form-group-custom">
                <label>Primary Diagnosis / Complaints</label>
                <input type="text" id="op-reg-condition" class="form-input-custom" placeholder="e.g. Cough with wheezing, chronic asthma" autocomplete="off">
              </div>

              <div class="form-group-custom">
                <label>Preferred Apollo Pulmonologist</label>
                <select id="op-reg-doctor" class="form-input-custom">
                  ${this.opDoctors.map(doc => `<option value="${doc.id}">${doc.name} (${doc.specialty})</option>`).join('')}
                </select>
              </div>

              <!-- 2 Timing Slots Feature with auto system time selection -->
              <div class="form-group-custom">
                <label style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                  <span>Timing Slot Allocation</span>
                  <span style="font-size: 0.65rem; color: var(--color-primary); font-weight: 700; background: var(--color-primary-light); padding: 2px 6px; border-radius: 4px;" id="slot-auto-badge">
                    Auto-selected by System Time
                  </span>
                </label>
                <select id="op-reg-slot" class="form-input-custom">
                  <option value="10:00 AM - 01:00 PM">Morning Slot (10:00 AM - 01:00 PM)</option>
                  <option value="01:00 PM - 06:30 PM">Afternoon/Evening Slot (01:00 PM - 06:30 PM)</option>
                </select>
              </div>

              <button class="btn btn-primary animate-btn" id="btn-submit-op-in" style="padding: 12px; font-weight: 700; margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                Check-in Patient <i class="fas fa-sign-in-alt"></i>
              </button>
            </div>
          </div>

          <!-- Checked-in Roster List -->
          <div class="col-8 glass-panel dashboard-card">
            <div class="card-header" style="padding-bottom: 12px; margin-bottom: 20px; border-bottom: 1px solid var(--border-color);">
              <h3 class="card-title">
                <i class="fas fa-list-check text-secondary"></i> Active Check-in Queue (Outpatient In)
              </h3>
              <span class="commercial-pill" style="background: var(--color-primary-light); color: var(--color-primary);">Roster Status: Checked In</span>
            </div>

            <div id="op-queue-container" style="display: flex; flex-direction: column; gap: 14px;">
              <!-- Dynamically populated Outpatient In cards -->
            </div>
          </div>
        </div>
      `;

      this.autoSelectSlotBasedOnTime();
      this.renderOpQueue();
      this.attachOpInListeners();
    } else if (this.activeTab === "exit") {
      workspace.innerHTML = `
        <div class="glass-panel dashboard-card" style="padding: 24px; min-height: 400px;">
          <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; flex-wrap: wrap; gap: 16px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <i class="fas fa-circle-check text-secondary" style="font-size: 1.4rem;"></i>
                <div>
                  <h3 class="card-title" style="font-size: 1.15rem;">Completed Outpatient Ledger (Outpatient Exit)</h3>
                  <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 2px 0 0 0;">
                    Registry logs of outpatients who successfully concluded consultation, cleared check-out checkpoints, and exited OP desk.
                  </p>
                </div>
              </div>
              <span class="commercial-pill" style="background: var(--color-secondary-light); color: var(--color-secondary);" id="exit-records-pill">0 Records</span>
            </div>
          </div>

          <div id="op-exit-container" style="display: flex; flex-direction: column; gap: 14px;">
            <!-- Dynamically populated Outpatient Exit cards -->
          </div>
        </div>
      `;

      this.renderOpExit();
    }
  }

  // Smart auto-select timing slot based on system local time
  autoSelectSlotBasedOnTime() {
    const slotSelect = document.getElementById("op-reg-slot");
    const autoBadge = document.getElementById("slot-auto-badge");
    if (!slotSelect) return;

    const currentHour = new Date().getHours();
    // 10.0 to 1.00 is Morning slot (hour < 13), 1.00pm to 6.30 is Afternoon/Evening slot (hour >= 13)
    if (currentHour < 13) {
      slotSelect.value = "10:00 AM - 01:00 PM";
      if (autoBadge) {
        autoBadge.textContent = "Morning Auto-Selected";
        autoBadge.style.background = "var(--color-primary-light)";
        autoBadge.style.color = "var(--color-primary)";
      }
    } else {
      slotSelect.value = "01:00 PM - 06:30 PM";
      if (autoBadge) {
        autoBadge.textContent = "Afternoon Auto-Selected";
        autoBadge.style.background = "var(--color-primary-light)";
        autoBadge.style.color = "var(--color-primary)";
      }
    }
  }

  // Render Checked-in roster list cards
  renderOpQueue() {
    const queueContainer = document.getElementById("op-queue-container");
    if (!queueContainer) return;

    const list = TelemetryEngineInstance.outpatientsIn;

    if (list.length === 0) {
      queueContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-tertiary); padding: 48px 20px; border: 1px dashed var(--border-color); border-radius: 12px;">
          <i class="fas fa-users-slash" style="font-size: 2.2rem; margin-bottom: 12px; color: var(--text-tertiary);"></i>
          <p style="font-size: 0.88rem; margin: 0; font-weight: 500;">No outpatients currently checked in.</p>
          <p style="font-size: 0.78rem; color: var(--text-tertiary); margin: 6px 0 0 0;">Use the OP Registration Desk form on the left to check-in patients.</p>
        </div>
      `;
      return;
    }

    queueContainer.innerHTML = list.map(pat => {
      const initials = pat.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      return `
        <div class="glass-panel" style="padding: 16px 20px; border-radius: 12px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; background: var(--bg-tertiary); transition: all 0.2s ease-in-out;">
          <div style="display: flex; align-items: center; gap: 16px; min-width: 250px;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: var(--color-primary-light); color: var(--color-primary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem; border: 2px solid var(--color-primary);">
              ${initials}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <h4 style="font-size: 0.98rem; font-weight: 700; color: var(--text-primary); margin: 0;">${pat.name}</h4>
                <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; color: var(--color-primary); background: var(--color-primary-light); padding: 2px 8px; border-radius: 4px;">
                  ${pat.id}
                </span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
                ${pat.gender}, ${pat.age} Yrs • <span style="font-style: italic;">${pat.condition}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 32px; align-items: center; flex-wrap: wrap;">
            <!-- Preferred doctor and timings -->
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <div style="font-size: 0.68rem; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase;">Attending Clinician</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-user-md text-primary"></i> ${pat.preferredDoctor}
              </div>
              <div style="font-size: 0.75rem; color: var(--color-primary); font-weight: 600; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                <i class="fas fa-clock"></i> Slots: ${pat.timings}
              </div>
            </div>

            <!-- Roster Actions -->
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-secondary btn-remove-op-in" data-id="${pat.id}" style="padding: 8px 12px; font-size: 0.78rem; border-radius: 8px;" title="Cancel Check-in">
                <i class="fas fa-trash-alt text-danger"></i> Remove
              </button>
              <button class="btn btn-primary btn-exit-op-in" data-id="${pat.id}" style="padding: 8px 14px; font-size: 0.78rem; font-weight: 700; border-radius: 8px; box-shadow: none;" title="Conclude Consult & Exit">
                Consult Completed <i class="fas fa-chevron-right" style="margin-left: 4px;"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Bind OP In Action Listeners
    queueContainer.querySelectorAll(".btn-remove-op-in").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (confirm(`Are you sure you want to cancel the check-in and remove outpatient ${id}?`)) {
          TelemetryEngineInstance.removeOutpatientIn(id);
        }
      });
    });

    queueContainer.querySelectorAll(".btn-exit-op-in").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        TelemetryEngineInstance.consultAndExitOutpatient(id);
      });
    });
  }

  // Render Completed outpatient logs
  renderOpExit() {
    const exitContainer = document.getElementById("op-exit-container");
    const exitPill = document.getElementById("exit-records-pill");
    if (!exitContainer) return;

    const list = TelemetryEngineInstance.outpatientsExit;
    if (exitPill) {
      exitPill.textContent = `${list.length} Record${list.length !== 1 ? 's' : ''}`;
    }

    if (list.length === 0) {
      exitContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-tertiary); padding: 48px 20px; border: 1px dashed var(--border-color); border-radius: 12px;">
          <i class="fas fa-clipboard-question" style="font-size: 2.2rem; margin-bottom: 12px; color: var(--text-tertiary);"></i>
          <p style="font-size: 0.88rem; margin: 0; font-weight: 500;">No consult exit logs recorded today.</p>
          <p style="font-size: 0.78rem; color: var(--text-tertiary); margin: 6px 0 0 0;">Once an checked-in patient completes their consultation, click "Consult Completed" to record an exit log.</p>
        </div>
      `;
      return;
    }

    exitContainer.innerHTML = list.map(pat => {
      const initials = pat.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      return `
        <div class="glass-panel" style="padding: 16px 20px; border-radius: 12px; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; background: var(--bg-tertiary);">
          <div style="display: flex; align-items: center; gap: 16px; min-width: 250px;">
            <div style="width: 42px; height: 42px; border-radius: 50%; background: var(--color-secondary-light); color: var(--color-secondary); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.95rem; border: 2px solid var(--color-secondary);">
              ${initials}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <h4 style="font-size: 0.98rem; font-weight: 700; color: var(--text-primary); margin: 0;">${pat.name}</h4>
                <span style="font-family: var(--font-mono); font-size: 0.72rem; font-weight: 700; color: var(--color-secondary); background: var(--color-secondary-light); padding: 2px 8px; border-radius: 4px;">
                  ${pat.id}
                </span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">
                ${pat.gender}, ${pat.age} Yrs • Completed evaluation for: <span style="font-style: italic;">${pat.condition}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 32px; align-items: center; flex-wrap: wrap;">
            <!-- Consultation details and exit time -->
            <div style="display: flex; flex-direction: column; gap: 2px;">
              <div style="font-size: 0.68rem; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase;">Attending Specialist</div>
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-stethoscope text-secondary"></i> ${pat.consultedDoctor}
              </div>
              <div style="font-size: 0.75rem; color: var(--color-secondary); font-weight: 600; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                <i class="fas fa-door-open"></i> Checked Out: <span class="badge" style="background: var(--color-secondary-light); color: var(--color-secondary); padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-family: var(--font-mono);">${pat.exitTime}</span>
              </div>
            </div>

            <!-- Clear Action -->
            <button class="btn btn-danger btn-remove-op-exit" data-id="${pat.id}" style="padding: 8px 12px; font-size: 0.78rem; border-radius: 8px;" title="Purge Record">
              <i class="fas fa-trash-can"></i> Remove
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Bind OP Exit Action Listeners
    exitContainer.querySelectorAll(".btn-remove-op-exit").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        if (confirm(`Are you sure you want to permanently delete exit log ${id}?`)) {
          TelemetryEngineInstance.removeOutpatientExit(id);
        }
      });
    });
  }

  // Update counters and header statistics in real-time
  updateCountersAndStats() {
    const countIn = TelemetryEngineInstance.outpatientsIn.length;
    const countExit = TelemetryEngineInstance.outpatientsExit.length;

    // Sub-tab counter tags
    const badgeIn = document.getElementById("op-in-counter");
    if (badgeIn) badgeIn.textContent = countIn;
    const badgeExit = document.getElementById("op-exit-counter");
    if (badgeExit) badgeExit.textContent = countExit;

    // Metric cards values
    const waitingMetric = document.getElementById("metric-waiting-count");
    if (waitingMetric) waitingMetric.textContent = countIn;
    const completedMetric = document.getElementById("metric-completed-count");
    if (completedMetric) completedMetric.textContent = countExit;
  }

  // Handle updates from Central Telemetry State
  setupStateSync() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.unsubscribe = TelemetryEngineInstance.subscribe(() => {
      this.updateCountersAndStats();
      if (this.activeTab === "in") {
        this.renderOpQueue();
      } else if (this.activeTab === "exit") {
        this.renderOpExit();
      }
    });
  }

  // Event listners for parent view elements
  attachHeaderListeners() {
    // 1. Sub-tab buttons
    document.querySelectorAll(".op-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        if (tab && tab !== this.activeTab) {
          this.activeTab = tab;
          
          // Toggle styling on sub-tab navigation
          document.querySelectorAll(".op-tab-btn").forEach(b => {
            b.classList.remove("btn-primary");
            b.classList.add("btn-secondary");
          });
          btn.classList.remove("btn-secondary");
          btn.classList.add("btn-primary");

          this.renderActivePanel();
          this.updateCountersAndStats();
        }
      });
    });

    this.updateCountersAndStats();
  }

  // Event listners for OP In elements
  attachOpInListeners() {
    // Timing slot manual changes clear the auto-select badge status for better feedback
    const slotSelect = document.getElementById("op-reg-slot");
    if (slotSelect) {
      slotSelect.addEventListener("change", () => {
        const autoBadge = document.getElementById("slot-auto-badge");
        if (autoBadge) {
          autoBadge.textContent = "Manually Overridden";
          autoBadge.style.background = "var(--alert-concern-light)";
          autoBadge.style.color = "var(--alert-concern)";
        }
      });
    }

    // 2. Submit form check-in listener
    const submitBtn = document.getElementById("btn-submit-op-in");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => {
        const nameInput = document.getElementById("op-reg-name");
        const ageInput = document.getElementById("op-reg-age");
        const genderSelect = document.getElementById("op-reg-gender");
        const condInput = document.getElementById("op-reg-condition");
        const docSelectEl = document.getElementById("op-reg-doctor");
        const slotSelectEl = document.getElementById("op-reg-slot");

        if (!nameInput || !ageInput || !condInput || !docSelectEl || !slotSelectEl) return;

        const name = nameInput.value.trim();
        const age = ageInput.value.trim();
        const gender = genderSelect.value;
        const condition = condInput.value.trim();
        const docId = docSelectEl.value;
        const timings = slotSelectEl.value;

        if (!name || !age || !condition) {
          alert("All fields are mandatory. Please enter complete outpatient demographics.");
          return;
        }

        const matchedDoc = this.opDoctors.find(d => d.id === docId);
        const docName = matchedDoc ? matchedDoc.name : "Dr. Adrian Thorne";

        // Dispatch check-in to Central Engine State
        const checkinPat = TelemetryEngineInstance.addOutpatientIn(name, age, gender, condition, docName, timings);

        alert(`Check-in Successful!\n\nPatient Name: ${checkinPat.name}\nAllocated OP ID: ${checkinPat.id}\nAttending Pulmonologist: ${docName}\nTiming Block: ${timings}`);

        // Clear forms
        nameInput.value = "";
        ageInput.value = "";
        condInput.value = "";
        docSelectEl.selectedIndex = 0;
        this.autoSelectSlotBasedOnTime();
      });
    }
  }

  // Cleanup subscribers
  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
