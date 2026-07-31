import { TelemetryEngineInstance } from '../utils/mockData.js';

export class LandingPage {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render() {
    this.container.innerHTML = `
      <div class="landing-hero-container">
        <!-- Main Hero Section -->
        <section class="hero-grid">
          <div class="hero-text-side">
            <div class="commercial-pill">Hospital-Grade Telemetry v2.4</div>
            <h1 class="hero-headline">24×7 AI-Powered <br><span class="text-gradient glow-text">Respiratory Health</span> Monitoring</h1>
            <p class="hero-subtext">
              The AI Lung Patch is a flexible, skin-conformable wireless wearable. It captures real-time lung acoustics, blood oxygen saturation (SpO₂), and dynamic airway resistance, transmitting clinical telemetry directly to healthcare providers.
            </p>
            <div class="hero-cta-group">
              <button class="btn btn-primary" id="btn-hero-patient">
                <i class="fas fa-user-injured"></i> Patient Portal
              </button>
              <button class="btn btn-accent" id="btn-hero-doctor">
                <i class="fas fa-user-md"></i> Doctor Dashboard
              </button>
              <button class="btn btn-secondary" id="btn-hero-demo">Book Virtual Demo</button>
            </div>
            <div class="hero-trust-row">
              <div class="trust-item"><i class="fas fa-shield-alt text-primary"></i> HIPAA Compliant</div>
              <div class="trust-item"><i class="fas fa-check-circle text-secondary"></i> FDA Clearance Pending</div>
              <div class="trust-item"><i class="fas fa-lock text-accent"></i> AES-256 Encrypted</div>
            </div>
          </div>
          
          <div class="hero-visual-side">
            <style>
              .hero-visual-side {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 24px;
              }
              .vitals-age-badge-hero {
                position: relative;
                width: 100%;
                max-width: 420px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                align-items: stretch;
                padding: 16px;
                border: 1px solid var(--border-color-glow);
                text-align: left;
                background: var(--bg-card);
                z-index: 10;
              }
            </style>
            <div class="futuristic-image-frame" style="margin: 0;">
              <div class="ambient-glow"></div>
              <img src="/assets/lung-patch.png" alt="AI Lung Patch Wearable" class="hero-patch-img">
            </div>

            <!-- Required Vitals by Age Guide Box (Placed below the white box/image!) -->
            <div class="glass-panel vitals-age-badge-hero">
              <div style="display: flex; align-items: center; gap: 8px;">
                <i class="fas fa-circle-info text-primary" style="font-size: 1rem;"></i>
                <span style="font-size: 0.76rem; font-weight: 800; color: var(--text-primary);">Required Vitals by Age</span>
              </div>
              
              <div class="form-group-custom" style="margin: 0; display: flex; flex-direction: column; gap: 4px;">
                <label style="font-size: 0.65rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Select Age Category</label>
                <select id="vitals-age-select" class="form-input-custom" style="padding: 6px 10px; font-size: 0.75rem; border-radius: 6px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); cursor: pointer; outline: none; transition: border-color 0.2s ease;">
                  <option value="adult">Adult (18-60 Yrs)</option>
                  <option value="infant">Infant (0-1 Yr)</option>
                  <option value="child">Child (2-10 Yrs)</option>
                  <option value="senior">Senior (60+ Yrs)</option>
                </select>
              </div>

              <div style="display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 4px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; align-items: center;">
                  <span style="color: var(--text-secondary); font-weight: 500;">Req. SpO₂ Level:</span>
                  <strong style="color: var(--color-secondary); background: var(--color-secondary-light); padding: 2px 6px; border-radius: 4px; font-weight: 700;" id="vitals-req-spo2">95% - 100%</strong>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; align-items: center;">
                  <span style="color: var(--text-secondary); font-weight: 500;">Normal BPM Range:</span>
                  <strong style="color: var(--color-primary); background: var(--color-primary-light); padding: 2px 6px; border-radius: 4px; font-weight: 700;" id="vitals-req-bpm">60 - 100 BPM</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Product Features Overview -->
        <section class="landing-features">
          <h2 class="section-title text-center">Engineered for Clinical Precision</h2>
          <p class="section-subtitle text-center">Advanced sensor technology combined with custom neural acoustic modeling.</p>
          
          <div class="features-grid">
            <div class="feature-card glass-panel">
              <div class="feature-icon"><i class="fas fa-wave-square"></i></div>
              <h3>Continuous Telemetry</h3>
              <p>24x7 continuous waveforms logging breath rate, amplitude, and patterns to detect sudden bronchospasms or apnea.</p>
            </div>
            
            <div class="feature-card glass-panel">
              <div class="feature-icon"><i class="fas fa-stethoscope"></i></div>
              <h3>Acoustic AI Classifier</h3>
              <p>State-of-the-art neural engine classifying wheezing, rhonchi, crackles, and cough markers on standard audio spectral density maps.</p>
            </div>
            
            <div class="feature-card glass-panel">
              <div class="feature-icon"><i class="fas fa-chart-line"></i></div>
              <h3>Biomarker Forecasting</h3>
              <p>Proactively forecasts potential asthma triggers or chronic COPD exacerbations hours before symptom onset.</p>
            </div>
          </div>
        </section>

        <!-- Hospital Integration Carousel / Logos -->
        <section class="hospital-integration">
          <h2 class="section-title text-center">Trusted in Medical Networks</h2>
          <div class="partner-logos">
            <div class="partner-card"><i class="fas fa-hospital-alt"></i> Mayo Clinic Affiliate</div>
            <div class="partner-card"><i class="fas fa-university"></i> Stanford Medicine Labs</div>
            <div class="partner-card"><i class="fas fa-clinic-medical"></i> Johns Hopkins Network</div>
            <div class="partner-card"><i class="fas fa-heartbeat"></i> NHS Regional Trust</div>
          </div>
        </section>

        <!-- Diagnostic & Case Research Gallery Section -->
        <section class="landing-gallery" style="margin-top: 16px;">
          <h2 class="section-title text-center">Diagnostic & Case Research Gallery</h2>
          <p class="section-subtitle text-center" style="max-width: 700px; margin-bottom: 32px;">
            Real-world medical case visuals, Attending clinical examinations, and diagnostic imagery mapping chronic respiratory conditions.
          </p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 24px;">
            
            <!-- Card 1: OIP.webp -->
            <div class="glass-panel" style="padding: 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 12px; background: var(--bg-tertiary); overflow: hidden;">
              <div style="width: 100%; height: 160px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background: #000;">
                <img src="/assets/OIP.webp" style="width: 100%; height: 100%; object-fit: cover; transition: transform var(--transition-fast);" class="gallery-image" alt="Clinical Stethoscopic Examination">
              </div>
              <div>
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Attending Consultation</h4>
                <p style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">Attending physician performing check-up consultations to verify breathing volume and rates.</p>
              </div>
            </div>

            <!-- Card 2: download.webp -->
            <div class="glass-panel" style="padding: 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 12px; background: var(--bg-tertiary); overflow: hidden;">
              <div style="width: 100%; height: 160px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background: #000;">
                <img src="/assets/download.webp" style="width: 100%; height: 100%; object-fit: cover; transition: transform var(--transition-fast);" class="gallery-image" alt="Micro-Acoustic Analysis">
              </div>
              <div>
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Acoustic Enclave Tracking</h4>
                <p style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">Wearable local sensors recording chest sounds directly through physical contact enclaves.</p>
              </div>
            </div>

            <!-- Card 3: lung-disease-doctor-showing-chest-600nw-2492000741.webp -->
            <div class="glass-panel" style="padding: 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 12px; background: var(--bg-tertiary); overflow: hidden;">
              <div style="width: 100%; height: 160px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background: #000;">
                <img src="/assets/lung-disease-doctor-showing-chest-600nw-2492000741.webp" style="width: 100%; height: 100%; object-fit: cover; transition: transform var(--transition-fast);" class="gallery-image" alt="Pulmonary Pathological Anatomy">
              </div>
              <div>
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Pathological Evaluation</h4>
                <p style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">Clinical doctor mapping chronic respiratory conditions and airway blockages for diagnostic review.</p>
              </div>
            </div>

            <!-- Card 4: OIP (1).webp -->
            <div class="glass-panel" style="padding: 16px; border-radius: 12px; display: flex; flex-direction: column; gap: 12px; background: var(--bg-tertiary); overflow: hidden;">
              <div style="width: 100%; height: 160px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background: #000;">
                <img src="/assets/OIP (1).webp" style="width: 100%; height: 100%; object-fit: cover; transition: transform var(--transition-fast);" class="gallery-image" alt="Pediatric Telehealth Roster">
              </div>
              <div>
                <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Pediatric Screening</h4>
                <p style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 4px; line-height: 1.4;">Telehealth continuous monitoring and sound tracking designed specifically for child checkups.</p>
              </div>
            </div>

          </div>
        </section>

        <!-- Global Lung Disease Awareness Campaign -->
        <section class="landing-awareness">
          <div class="awareness-grid">
            
            <!-- Awareness Visual Banner Side -->
            <div class="awareness-visual-side">
              <div class="futuristic-image-frame">
                <div class="ambient-glow" style="background: radial-gradient(circle, var(--color-accent-light) 0%, transparent 70%);"></div>
                <img src="/assets/awareness.png" alt="Respiratory Disease Awareness Campaign" class="hero-patch-img" style="border-radius: 16px; border: 1px solid var(--border-color);">
                <div class="floating-telemetry-badge glass-panel" style="bottom: 12px; left: -10px; right: auto;">
                  <i class="fas fa-ribbon text-accent" style="font-size: 1.2rem;"></i>
                  <div>
                    <div class="badge-lbl">Breathe Free Campaign</div>
                    <div class="badge-val">COPD & Asthma Screening</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Awareness Assessment and Info Side -->
            <div class="awareness-info-side">
              <span class="commercial-pill" style="background: var(--color-accent-light); color: var(--color-accent); border-color: rgba(168, 85, 247, 0.2);">Global Health Initiative</span>
              <h2 class="section-title" style="margin-top: 12px; font-size: 2rem;">Breathe Free: Pulmonary Awareness Campaign</h2>
              <p class="hero-subtext" style="font-size: 0.95rem; line-height: 1.6; margin-bottom: 20px;">
                Chronic respiratory diseases affect over 600 million people worldwide. Early clinical diagnosis of asthma, bronchitis, and COPD (Chronic Obstructive Pulmonary Disease) via acoustic AI telemetric monitoring can reduce ER admissions by over 45%. Take charge of your pulmonary safety.
              </p>

              <!-- Interactive Diagnostic Symptom Checker Widget -->
              <div class="glass-panel" style="padding: 20px; border-radius: 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color);">
                <h4 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 12px;"><i class="fas fa-heartbeat text-accent"></i> Interactive Pulmonary Risk Screener</h4>
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 16px;">Select all respiratory symptoms you are currently experiencing:</p>
                
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;">
                  <label class="medication-item" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; border-radius: 6px;">
                    <input type="checkbox" class="symptom-chk" value="cough" style="width: 16px; height: 16px; cursor: pointer;">
                    <span style="font-size: 0.85rem; font-weight: 600;">Chronic dry or wet coughing</span>
                  </label>
                  <label class="medication-item" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; border-radius: 6px;">
                    <input type="checkbox" class="symptom-chk" value="breath" style="width: 16px; height: 16px; cursor: pointer;">
                    <span style="font-size: 0.85rem; font-weight: 600;">Shortness of breath (Dyspnea) during light work</span>
                  </label>
                  <label class="medication-item" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; border-radius: 6px;">
                    <input type="checkbox" class="symptom-chk" value="tightness" style="width: 16px; height: 16px; cursor: pointer;">
                    <span style="font-size: 0.85rem; font-weight: 600;">Airway heavy feelings or chest tightness</span>
                  </label>
                  <label class="medication-item" style="padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 10px; border-radius: 6px;">
                    <input type="checkbox" class="symptom-chk" value="wheeze" style="width: 16px; height: 16px; cursor: pointer;">
                    <span style="font-size: 0.85rem; font-weight: 600;">High-pitched whistling or wheezing sound when breathing</span>
                  </label>
                </div>

                <button class="btn btn-accent" id="btn-run-assessment" style="width: 100%; padding: 10px; font-size: 0.85rem;">
                  Assess Pulmonary Risk Profile <i class="fas fa-stethoscope"></i>
                </button>

                <!-- assessment dynamic result slot -->
                <div id="assessment-result-box" style="margin-top: 16px; padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); display: none; font-size: 0.82rem; line-height: 1.5; text-align: center;">
                </div>
              </div>

            </div>
          </div>
        </section>

        <!-- Testimonial Section -->
        <section class="landing-testimonials">
          <h2 class="section-title text-center">What Leading Clinicians Say</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 32px; max-width: 1200px; margin: 0 auto; width: 100%;">
            
            <!-- Doctor 1: Dr. Adrian Thorne -->
            <div class="testimonial-card glass-panel" style="margin: 0; padding: 32px; display: flex; flex-direction: column; justify-content: space-between; gap: 20px;">
              <p class="testimonial-quote" style="font-size: 1.05rem; line-height: 1.6; margin: 0;">
                "The AI Lung Patch has revolutionized how we monitor high-risk COPD and pulmonary recovery patients post-discharge. Being able to stream high-fidelity acoustic lung sounds continuously allows us to adjust bronchodilator doses and prevent emergency ICU readmissions."
              </p>
              <div class="testimonial-author" style="margin-top: auto;">
                <img src="/assets/doc-adrian.png" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-primary);" alt="Dr. Adrian Thorne">
                <div>
                  <div class="author-name" style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Dr. Adrian Thorne, FACP</div>
                  <div class="author-title" style="font-size: 0.78rem; color: var(--text-secondary);">Chief of Pulmonology, Metro Health</div>
                </div>
              </div>
            </div>

            <!-- Doctor 2: Dr. Sarah Jenkins -->
            <div class="testimonial-card glass-panel" style="margin: 0; padding: 32px; display: flex; flex-direction: column; justify-content: space-between; gap: 20px;">
              <p class="testimonial-quote" style="font-size: 1.05rem; line-height: 1.6; margin: 0;">
                "Monitoring pediatric patients with severe asthma has always been a major challenge. The micro-acoustic tracking on this wearable allows us to catch inspiratory crackles and wheezing patterns early, providing timely therapeutic adjustments before acute attacks occur."
              </p>
              <div class="testimonial-author" style="margin-top: auto;">
                <img src="/assets/doc-sarah.png" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid var(--color-secondary);" alt="Dr. Sarah Jenkins">
                <div>
                  <div class="author-name" style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary);">Dr. Sarah Jenkins, MD</div>
                  <div class="author-title" style="font-size: 0.78rem; color: var(--text-secondary);">Pediatric Pulmonology Specialist</div>
                </div>
              </div>
            </div>
            
          </div>
        </section>

        <!-- Clinical Lung Disease Resources Section -->
        <section class="landing-contact">
          <div class="contact-card glass-panel" style="background: linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%) !important;">
            <div class="contact-text">
              <span class="commercial-pill" style="background: var(--color-primary-light); color: var(--color-primary); border-color: rgba(6, 182, 212, 0.2); margin-bottom: 12px; display: inline-block;">Clinical Knowledge Bank</span>
              <h2>Detailed Lung Disease & Health Information</h2>
              <p style="margin-top: 4px; font-size: 0.95rem;">Access extensive medical details on chronic respiratory disorders, treatment parameters, and care guidelines provided by the Lung Association.</p>
            </div>
            <div class="contact-cta">
              <button class="btn btn-accent animate-btn" id="btn-disease-details" style="padding: 14px 28px; font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 10px;">
                View Disease Details <i class="fas fa-arrow-up-right-from-square"></i>
              </button>
            </div>
          </div>
        </section>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Portals routing triggers
    document.getElementById("btn-hero-patient").addEventListener("click", () => {
      window.appRouter.navigate("patient");
    });

    document.getElementById("btn-hero-doctor").addEventListener("click", () => {
      window.appRouter.navigate("doctor");
    });

    document.getElementById("btn-hero-demo").addEventListener("click", () => {
      alert("A representative will contact you to schedule a live telemetry demonstration.");
    });

    const diseaseBtn = document.getElementById("btn-disease-details");
    if (diseaseBtn) {
      diseaseBtn.addEventListener("click", () => {
        window.open("https://www.lung.ca/lung-health/lung-diseases", "_blank");
      });
    }

    // Required Vitals by Age calculator selector
    const ageSelect = document.getElementById("vitals-age-select");
    const reqBpm = document.getElementById("vitals-req-bpm");
    const reqSpo2 = document.getElementById("vitals-req-spo2");

    if (ageSelect && reqBpm && reqSpo2) {
      ageSelect.addEventListener("change", (e) => {
        const ageGroup = e.target.value;
        if (ageGroup === "infant") {
          reqBpm.textContent = "100 - 160 BPM";
          reqSpo2.textContent = "95% - 100%";
        } else if (ageGroup === "child") {
          reqBpm.textContent = "70 - 120 BPM";
          reqSpo2.textContent = "95% - 100%";
        } else if (ageGroup === "adult") {
          reqBpm.textContent = "60 - 100 BPM";
          reqSpo2.textContent = "95% - 100%";
        } else if (ageGroup === "senior") {
          reqBpm.textContent = "60 - 90 BPM";
          reqSpo2.textContent = "95% - 100%";
        }
      });
    }

    // Lung Health Self-Assessment Click Handler
    const runBtn = document.getElementById("btn-run-assessment");
    const resultBox = document.getElementById("assessment-result-box");

    if (runBtn && resultBox) {
      runBtn.addEventListener("click", () => {
        const checkedBoxes = document.querySelectorAll(".symptom-chk:checked");
        const count = checkedBoxes.length;

        resultBox.style.display = "block";

        let riskProfile = "Normal";
        let scoreInfo = "Optimal Respiratory Health (Normal Baseline)";

        if (count === 0) {
          resultBox.style.backgroundColor = "var(--alert-normal-light)";
          resultBox.style.borderColor = "var(--alert-normal)";
          resultBox.style.color = "var(--text-primary)";
          resultBox.innerHTML = `
            <strong style="color: var(--alert-normal);"><i class="fas fa-check-circle"></i> Optimal Respiratory Health (Normal Baseline)</strong><br>
            No active warning indicators detected. Keep up standard physical activity and clean airway breathing!
          `;
        } else if (count <= 2) {
          riskProfile = "Mild Concern";
          scoreInfo = "Moderate Respiratory Warning (Borderline Risk)";
          resultBox.style.backgroundColor = "var(--alert-concern-light)";
          resultBox.style.borderColor = "var(--alert-concern)";
          resultBox.style.color = "var(--text-primary)";
          resultBox.innerHTML = `
            <strong style="color: var(--alert-concern);"><i class="fas fa-exclamation-triangle"></i> Moderate Respiratory Warning (Borderline Risk)</strong><br>
            Acoustic metrics suggest mild bronchial restrictions. We highly recommend scheduling a standard spirometry review or continuous screening.
          `;
        } else {
          riskProfile = "Critical";
          scoreInfo = "Urgent Pulmonary Evaluation Advised (High Risk Profile)";
          resultBox.style.backgroundColor = "var(--alert-critical-light)";
          resultBox.style.borderColor = "var(--alert-critical)";
          resultBox.style.color = "var(--text-primary)";
          resultBox.innerHTML = `
            <strong style="color: var(--alert-critical);"><i class="fas fa-exclamation-circle"></i> Urgent Pulmonary Evaluation Advised (High Risk Profile)</strong><br>
            Persistent restricted airway biomarkers mapped. We strongly advise booking an OPD booking or clinical pulmonology consultation immediately.
          `;
        }

        const symptoms = Array.from(checkedBoxes).map(cb => cb.value);
        TelemetryEngineInstance.addAssessment(symptoms, riskProfile, scoreInfo);
      });
    }

  }
}
