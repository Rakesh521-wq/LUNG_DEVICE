import { TelemetryEngineInstance } from '../utils/mockData.js';

export class SpecialistPortal {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.patients = TelemetryEngineInstance.patients;
    this.unsubscribe = null;

    // Roster of available Apollo Pulmonologists in Chennai
    this.specialists = [
      {
        id: "DOC-CH-1",
        name: "Dr. Prasanna Kumar Thomas",
        specialty: "Interventional Pulmonology",
        avatar: "PT",
        days: "Mon, Wed, Fri",
        dates: "May 25, 27, 29",
        timing: "10:00 AM - 01:00 PM",
        accent: false
      },
      {
        id: "DOC-CH-2",
        name: "Dr. R. Narasimhan",
        specialty: "Severe Asthma & COPD Specialist",
        avatar: "RN",
        days: "Tue, Thu, Sat",
        dates: "May 26, 28, 30",
        timing: "02:00 PM - 05:00 PM",
        accent: true
      },
      {
        id: "DOC-CH-3",
        name: "Dr. Madhusudan J",
        specialty: "Sleep Apnea & Critical Care",
        avatar: "MJ",
        days: "Mon, Thu",
        dates: "May 25, 28",
        timing: "09:00 AM - 11:30 AM",
        accent: false
      },
      {
        id: "DOC-CH-4",
        name: "Dr. Ramakrishnan AR",
        specialty: "Interstitial Lung Disease",
        avatar: "RR",
        days: "Wed, Sat",
        dates: "May 27, 30",
        timing: "04:00 PM - 06:30 PM",
        accent: true
      }
    ];
  }

  render() {
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

      <!-- Specialists Directory Header -->
      <div class="view-header" style="margin-bottom: 20px;">
        <div class="header-title-container">
          <h1>Apollo Pulmonologists Directory</h1>
          <p>Roster of available medical specialists, referral consult channels, and offline booking desks</p>
        </div>
      </div>

      <!-- Apollo Pulmonology Booking & Referral Desk -->
      <div class="glass-panel dashboard-card apollo-referral-desk" style="margin-top: 8px;">
        <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 16px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; flex-wrap: wrap; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <i class="fas fa-user-md text-primary" style="font-size: 1.5rem;"></i>
              <div>
                <h3 class="card-title" style="font-size: 1.2rem;">Apollo Chennai Pulmonology Specialists Hub</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 2px 0 0 0;">
                  Check roster timings of Chennai Apollo specialists, schedule face-to-face appointments, and dispatch clinical enquiries.
                </p>
              </div>
            </div>
            <a href="https://www.apollohospitals.com/book-doctor-appointment/pulmonologist/chennai" 
               target="_blank" 
               class="btn btn-primary" 
               style="font-size: 0.8rem; display: flex; align-items: center; gap: 8px; text-decoration: none; padding: 8px 16px;">
              Apollo Chennai Portal <i class="fas fa-external-link-alt"></i>
            </a>
          </div>
        </div>

        <!-- Pulmonologists List -->
        <div class="specialist-grid" id="apollo-specialists-list">
          <!-- Dynamically populated cards -->
        </div>

        <!-- Enquiry Logs Section -->
        <div class="enquiry-log-desk">
          <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
            <i class="fas fa-clipboard-list text-primary"></i> Sent Referrals & Enquiry History Logs
          </h4>
          <div class="enquiry-log-table-container">
            <table class="enquiry-log-table">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Specialist Doctor</th>
                  <th>Patient referred</th>
                  <th>Inquiry Category</th>
                  <th>Preferred Schedule</th>
                  <th>Clinical status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody id="enquiry-logs-body">
                <!-- Dynamically populated rows -->
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Interactive Enquiry Modal -->
      <div class="modal-backdrop" id="enquiry-modal-backdrop">
        <div class="modal-content-glass">
          <div class="modal-header-glowing">
            <h3><i class="fas fa-paper-plane text-primary"></i> Dispatch Referral Enquiry</h3>
            <button class="btn-close-modal" id="btn-close-enquiry" title="Cancel">&times;</button>
          </div>
          <div class="modal-body-pad">
            <div style="font-size: 0.8rem; color: var(--text-secondary); background: var(--bg-secondary); padding: 10px 14px; border-radius: 8px; border-left: 3px solid var(--color-primary); margin-bottom: 8px;">
              Direct referral enquiry will be dispatched to the specialist's medical office at Apollo Chennai.
            </div>

            <!-- Target Doctor (Pre-filled, disabled) -->
            <div class="form-group-custom">
              <label>Apollo Specialist Doctor</label>
              <input type="text" id="enquiry-doctor-name" class="form-input-custom" readonly style="background: rgba(255,255,255,0.04); font-weight: 700;">
            </div>

            <!-- Select Patient Context -->
            <div class="form-group-custom">
              <label>Referred Ward Patient</label>
              <select id="enquiry-patient-select" class="form-input-custom">
                <!-- Dynamically populated patient options -->
              </select>
            </div>

            <div class="form-row-two">
              <!-- Select Category -->
              <div class="form-group-custom">
                <label>Enquiry category</label>
                <select id="enquiry-category" class="form-input-custom">
                  <option value="Offline Referral">Offline Referral Booking</option>
                  <option value="Second Opinion">Clinical Second Opinion</option>
                  <option value="Teleconsultation">Referral Teleconsultation</option>
                  <option value="Diagnostic Review">Diagnostic Waveform Review</option>
                </select>
              </div>

              <!-- Time schedule -->
              <div class="form-group-custom">
                <label>Preferred Date</label>
                <input type="date" id="enquiry-preferred-date" class="form-input-custom">
              </div>
            </div>

            <!-- Enquiry details message -->
            <div class="form-group-custom">
              <label>Case Notes & Clinical Inquiry Reason</label>
              <textarea id="enquiry-message" class="form-input-custom" rows="3" placeholder="Provide clinical context, SpO2/BPM telemetry findings, or specific medical queries..."></textarea>
            </div>
          </div>
          <div class="modal-footer-glow">
            <button class="btn btn-secondary" id="btn-cancel-enquiry" style="padding: 8px 16px; font-size: 0.85rem;">Cancel</button>
            <button class="btn btn-primary" id="btn-submit-enquiry" style="padding: 8px 16px; font-size: 0.85rem; display: flex; align-items: center; gap: 8px;">
              Dispatch referral <i class="fas fa-share-from-square"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    this.setupTelemetrySub();
    this.renderSpecialists();
    this.renderEnquiryLogs();
    this.attachEventListeners();
  }

  setupTelemetrySub() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.unsubscribe = TelemetryEngineInstance.subscribe((patients) => {
      this.patients = patients;
      this.renderEnquiryLogs();
    });
  }

  // Render Pulmonologists cards
  renderSpecialists() {
    const listContainer = document.getElementById("apollo-specialists-list");
    if (!listContainer) return;

    listContainer.innerHTML = this.specialists.map(doc => {
      const cardClass = doc.accent ? "specialist-card accent-card" : "specialist-card";
      return `
        <div class="${cardClass}">
          <div>
            <div class="specialist-header">
              <div class="specialist-avatar">${doc.avatar}</div>
              <div class="specialist-info">
                <h4>${doc.name}</h4>
                <span class="specialist-sub">${doc.specialty}</span>
              </div>
            </div>
            
            <div class="specialist-schedule">
              <div class="schedule-title">Roster schedule</div>
              <div class="schedule-row">
                <i class="fas fa-calendar-day"></i>
                <span>Days: <strong>${doc.days}</strong></span>
              </div>
              <div class="schedule-row">
                <i class="fas fa-calendar-alt"></i>
                <span>Dates: <span class="badge">${doc.dates}</span></span>
              </div>
              <div class="schedule-row">
                <i class="fas fa-clock"></i>
                <span>Timing: <span class="badge" style="color: var(--color-primary);">${doc.timing}</span></span>
              </div>
            </div>
          </div>

          <div class="specialist-actions">
            <a href="https://www.apollohospitals.com/book-doctor-appointment/pulmonologist/chennai" 
               target="_blank" 
               class="btn-book-link" 
               title="Book Official Appointment via Apollo Portal">
               Book Appointment <i class="fas fa-external-link-alt" style="font-size: 0.7rem; margin-left: 2px;"></i>
            </a>
            <button class="btn-enquire animate-btn" data-doc-id="${doc.id}">
               Enquire
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to Enquire buttons
    listContainer.querySelectorAll(".btn-enquire").forEach(btn => {
      btn.addEventListener("click", () => {
        const docId = btn.getAttribute("data-doc-id");
        this.openEnquiryModal(docId);
      });
    });
  }

  // Render Sent enquiries referrals logs (including Remove button)
  renderEnquiryLogs() {
    const logsBody = document.getElementById("enquiry-logs-body");
    if (!logsBody) return;

    const enquiries = TelemetryEngineInstance.dispatchedEnquiries;

    if (enquiries.length === 0) {
      logsBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--text-tertiary); padding: 20px;">
            No referral enquiries dispatched yet.
          </td>
        </tr>
      `;
      return;
    }

    logsBody.innerHTML = enquiries.map(item => {
      return `
        <tr>
          <td style="font-family: var(--font-mono); font-weight: 700; color: var(--color-primary);">${item.id}</td>
          <td style="font-weight: 600;">${item.doctorName}</td>
          <td>${item.patientName}</td>
          <td><span style="font-size: 0.75rem; color: var(--text-secondary);">${item.category}</span></td>
          <td style="font-family: var(--font-mono); font-size: 0.78rem;">${item.schedule}</td>
          <td><span class="badge-enquiry dispatched"><i class="fas fa-circle-check"></i> ${item.status}</span></td>
          <td>
            <button class="btn btn-danger btn-remove-log animate-btn" data-id="${item.id}">
              <i class="fas fa-trash-alt"></i> Remove
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach click listener to Remove buttons
    logsBody.querySelectorAll(".btn-remove-log").forEach(btn => {
      btn.addEventListener("click", () => {
        const refId = btn.getAttribute("data-id");
        const confirmRemove = confirm(`Are you sure you want to remove referral log ${refId} from the history?`);
        if (confirmRemove) {
          TelemetryEngineInstance.removeEnquiry(refId);
          alert(`Referral history log ${refId} successfully removed!`);
        }
      });
    });
  }

  // Open the Enquiry Modal pop-up form
  openEnquiryModal(docId) {
    const doc = this.specialists.find(d => d.id === docId);
    if (!doc) return;

    const modal = document.getElementById("enquiry-modal-backdrop");
    const docNameInput = document.getElementById("enquiry-doctor-name");
    const patientSelect = document.getElementById("enquiry-patient-select");
    const dateInput = document.getElementById("enquiry-preferred-date");
    const msgTextarea = document.getElementById("enquiry-message");

    if (!modal || !docNameInput || !patientSelect) return;

    // Prefill Doctor Name
    docNameInput.value = doc.name;

    // Prefill Patient selection options
    const activePatients = this.patients.filter(p => p.admissionStatus === "Admitted" || p.admissionStatus === "Registered");

    if (activePatients.length === 0) {
      patientSelect.innerHTML = `<option value="">No Registered/Admitted Patients</option>`;
    } else {
      patientSelect.innerHTML = activePatients.map(p => {
        return `<option value="${p.id}">${p.name} (${p.id} • ${p.condition})</option>`;
      }).join('');
    }

    // Default dates
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateInput) {
      dateInput.value = todayStr;
      dateInput.min = todayStr;
    }
    
    if (msgTextarea) {
      const selectedPat = activePatients[0];
      if (selectedPat) {
        msgTextarea.value = `Referral request for patient presenting with: ${selectedPat.condition}. Baseline saturation: ${selectedPat.liveSpo2}% SpO2. Pulse rate: ${selectedPat.liveBpm} BPM. Requesting specialist evaluation at Apollo Chennai pulmonology clinic.`;
      } else {
        msgTextarea.value = `Referral request for outpatient clinical second opinion. Requesting specialist evaluation at Apollo Chennai pulmonology clinic.`;
      }
    }

    // Show modal
    modal.style.display = "flex";
    setTimeout(() => {
      modal.classList.add("active");
    }, 10);
  }

  // Close the Enquiry Modal pop-up form
  closeEnquiryModal() {
    const modal = document.getElementById("enquiry-modal-backdrop");
    if (!modal) return;

    modal.classList.remove("active");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }

  // Submit and Dispatch the Enquiry Form
  submitEnquiry() {
    const docName = document.getElementById("enquiry-doctor-name").value;
    const patientSelect = document.getElementById("enquiry-patient-select");
    const patId = patientSelect.value;
    if (!patId) {
      alert("Please register a patient in the Patient Portal first before dispatching an inquiry.");
      return;
    }

    const pat = this.patients.find(p => p.id === patId);
    const patName = pat ? pat.name : "Unknown Patient";
    const category = document.getElementById("enquiry-category").value;
    const dateVal = document.getElementById("enquiry-preferred-date").value;
    const message = document.getElementById("enquiry-message").value;

    if (!message.trim()) {
      alert("Please provide the case notes and reason for enquiry.");
      return;
    }

    const formattedDate = dateVal ? new Date(dateVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : "May 25, 2026";
    const doc = this.specialists.find(d => d.name === docName);
    const timeSlot = doc ? doc.timing.split(' - ')[0] : "10:00 AM";

    const schedule = `${formattedDate} | ${timeSlot}`;

    // Add to central telemetry log registry
    const newEnquiry = TelemetryEngineInstance.addEnquiry(docName, patName, category, schedule);

    // Add to patient timeline
    if (pat) {
      pat.timeline.unshift({
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        note: `Referral Enquiry ${newEnquiry.id} dispatched to ${docName} (${category})`
      });
      TelemetryEngineInstance.notify();
    }

    this.closeEnquiryModal();
    alert(`Enquiry ${newEnquiry.id} successfully dispatched!\n\nSpecialist: ${docName}\nReferred Patient: ${patName}\nPreferred Slot: ${schedule}\n\nA coordinator from Apollo Chennai Pulmonology office will contact the patient shortly.`);
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
          
          dropdownButtons.forEach(other => {
            if (other.btnId !== opt.btnId) {
              const otherBtn = document.getElementById(other.btnId);
              const otherList = document.getElementById(other.listId);
              if (otherBtn) otherBtn.classList.remove("active");
              if (otherList) otherList.classList.remove("active");
            }
          });

          btn.classList.toggle("active");
          list.classList.toggle("active");
        });
      }
    });

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
    const closeBtn = document.getElementById("btn-close-enquiry");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => this.closeEnquiryModal());
    }

    const cancelBtn = document.getElementById("btn-cancel-enquiry");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => this.closeEnquiryModal());
    }

    const submitBtn = document.getElementById("btn-submit-enquiry");
    if (submitBtn) {
      submitBtn.addEventListener("click", () => this.submitEnquiry());
    }

    const modalBackdrop = document.getElementById("enquiry-modal-backdrop");
    if (modalBackdrop) {
      modalBackdrop.addEventListener("click", (e) => {
        if (e.target === modalBackdrop) {
          this.closeEnquiryModal();
        }
      });
    }

    this.setupNavbarToggles();
  }

  destroy() {
    if (this.unsubscribe) this.unsubscribe();
  }
}
