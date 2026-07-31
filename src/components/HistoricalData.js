// src/components/HistoricalData.js
// Historical Logs Table, Diagnostic Report Generator & PDF Signer/Exporter

import { BLEControllerInstance } from '../utils/bleController.js';
import { dbStore } from '../utils/dbStore.js';

export class HistoricalData {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.selectedLog = null;
    
    // Canvas signature state
    this.sigCanvas = null;
    this.isDrawingSig = false;

    // Seed mock logs if local storage is completely empty
    this.seedMockLogs();
    
    // Fetch logs from Firestore asynchronously
    this.loadLogsFromFirebase();
  }

  async loadLogsFromFirebase() {
    try {
      const firestoreLogs = await dbStore.getPredictions();

      if (firestoreLogs.length > 0) {
        localStorage.setItem("lung_patch_logs", JSON.stringify(firestoreLogs));
        
        // Auto-select the newest Firestore log
        this.selectedLog = firestoreLogs[0];
        
        // Re-render UI with new database logs
        this.render();
      }
    } catch (err) {
      console.warn("[Firebase] Could not fetch logs, using local cache:", err);
    }
  }

  seedMockLogs() {
    try {
      const existing = localStorage.getItem("lung_patch_logs");
      if (!existing || JSON.parse(existing).length === 0) {
        const mockLogs = [
          {
            timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hrs ago
            classification: "Asthma",
            confidence: "91.4",
            heartRate: 88,
            spo2: 93,
            breathingRate: 20,
            riskLevel: "Moderate Risk"
          },
          {
            timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 24 hrs ago
            classification: "COPD",
            confidence: "88.2",
            heartRate: 86,
            spo2: 89,
            breathingRate: 22,
            riskLevel: "High Risk"
          },
          {
            timestamp: new Date(Date.now() - 3600000 * 72).toISOString(), // 3 days ago
            classification: "Normal",
            confidence: "95.6",
            heartRate: 70,
            spo2: 98,
            breathingRate: 13,
            riskLevel: "Low Risk"
          }
        ];
        localStorage.setItem("lung_patch_logs", JSON.stringify(mockLogs));
      }
    } catch (err) {
      console.warn("Seeding failed:", err);
    }
  }

  render() {
    const logs = this.getLogs();
    
    // Default to the newest log if none is selected
    if (!this.selectedLog && logs.length > 0) {
      this.selectedLog = logs[0];
    }

    this.container.innerHTML = `
      <div class="view-header">
        <div class="header-title-container">
          <h1>Historical Logs & Clinical Reports</h1>
          <p>Archived Diagnostic Data, Patient Session History & PDF Report Export Registry</p>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" id="btn-clear-logs" style="background: rgba(239, 68, 68, 0.1); color: var(--alert-critical); border-color: rgba(239, 68, 68, 0.2);">
            <i class="fas fa-trash-can"></i> Clear History
          </button>
        </div>
      </div>

      <div class="dashboard-grid">
        
        <!-- Logs Table Card (Col 6) -->
        <div class="col-6 glass-panel dashboard-card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-database text-primary"></i> Diagnostic Log Registry</h3>
            <span class="commercial-pill" style="background: var(--color-primary-light); color: var(--color-primary);">${logs.length} Records</span>
          </div>
          
          <div style="margin-top: 14px; overflow-x: auto;">
            <table class="clinical-logs-table" style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-color); text-align: left; color: var(--text-secondary);">
                  <th style="padding: 8px;">Date/Time</th>
                  <th style="padding: 8px;">Diagnosis</th>
                  <th style="padding: 8px; text-align: right;">Confidence</th>
                  <th style="padding: 8px; text-align: center;">SpO₂</th>
                  <th style="padding: 8px; text-align: center;">Risk</th>
                </tr>
              </thead>
              <tbody id="logs-table-body">
                ${logs.map((log, idx) => {
                  const dateStr = new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const isSelected = this.selectedLog && this.selectedLog.timestamp === log.timestamp;
                  
                  let badge = "badge-normal";
                  if (log.riskLevel === "Moderate Risk") badge = "badge-concern";
                  else if (log.riskLevel === "High Risk" || log.riskLevel === "Critical Risk") badge = "badge-critical";

                  return `
                    <tr class="log-row ${isSelected ? 'selected' : ''}" data-idx="${idx}" style="border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;">
                      <td style="padding: 10px 8px; font-weight: 500;">${dateStr}</td>
                      <td style="padding: 10px 8px;"><strong style="color: var(--color-primary);">${log.classification}</strong></td>
                      <td style="padding: 10px 8px; text-align: right;" class="text-mono">${log.confidence}%</td>
                      <td style="padding: 10px 8px; text-align: center;" class="text-mono">${log.heartRate} / ${log.spo2}%</td>
                      <td style="padding: 10px 8px; text-align: center;"><span class="telemetry-badge ${badge}" style="font-size: 0.65rem; margin: 0; padding: 2px 6px;">${log.riskLevel}</span></td>
                    </tr>
                  `;
                }).join('')}
                ${logs.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--text-tertiary);">
                      <i class="fas fa-box-open" style="font-size: 2.2rem; margin-bottom: 12px;"></i>
                      <div>No diagnostic logs saved. Connect a BLE feed or use the simulator.</div>
                    </td>
                  </tr>
                ` : ''}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Clinical Report Document Panel (Col 6) -->
        <div class="col-6 glass-panel dashboard-card">
          <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 12px; margin-bottom: 16px;">
            <h3 class="card-title"><i class="fas fa-file-invoice text-accent"></i> Diagnostic Report Generator</h3>
            <button class="btn btn-primary" id="btn-export-pdf-doc" style="font-size: 0.78rem; padding: 6px 12px;" ${!this.selectedLog ? 'disabled' : ''}>
              <i class="fas fa-file-pdf"></i> Export PDF Report
            </button>
          </div>

          ${this.selectedLog ? this.getReportTemplateHTML() : `
            <div style="text-align: center; color: var(--text-tertiary); padding: 60px 20px;">
              <i class="fas fa-file-lines" style="font-size: 3rem; margin-bottom: 16px;"></i>
              <h3>Select a record from the registry</h3>
              <p style="font-size: 0.85rem; max-width: 320px; margin: 8px auto 0 auto;">Select any telemetry log entry on the left to compile a PDF-compatible clinical diagnostic report.</p>
            </div>
          `}
        </div>

      </div>
    `;

    this.attachEventListeners();
    this.initSignaturePad();
  }

  getLogs() {
    try {
      const stored = localStorage.getItem("lung_patch_logs");
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.warn("History retrieval failed:", err);
      return [];
    }
  }

  getReportTemplateHTML() {
    const log = this.selectedLog;
    const dateStr = new Date(log.timestamp).toLocaleString();
    
    // Clinical descriptions mapping
    const findings = {
      "Normal": [
        "Acoustic lung sound spectrum falls within healthy parameters.",
        "No fluid consolidation crackles or high-pitched wheezing components detected.",
        "Stable chest expansion and inertial respiration index.",
        "Blood oxygen saturation levels remain optimal during session."
      ],
      "Asthma": [
        "Elevated breathing rate with high expiratory ratios.",
        "Whistling high-frequency wheeze observed between 400Hz and 800Hz in audio.",
        "Chest motion sensors indicate auxiliary muscle effort during breathing.",
        "SpO₂ oximeter readings indicate moderate respiratory strain."
      ],
      "COPD": [
        "Diminished vesicular breath sounds with low-frequency crackling.",
        "Airway narrowing indicated by prolonged expiratory components.",
        "Mild hypoxic oxygen levels observed during continuous monitoring.",
        "High piezo vibration values suggest structural airway resistance."
      ],
      "Pneumonia": [
        "Severe coarse fluid crackling (bubbling) observed in acoustic feed.",
        "Acute desaturation of SpO₂ below optimal safety thresholds.",
        "Highly tachypneic breathing pattern detected via MPU6050 and Piezo sensors.",
        "Extreme respiratory discomfort indicated. Suggest clinical auscultation."
      ],
      "Post-COVID": [
        "Inhalation crackles scattered in acoustic spectrogram.",
        "General respiration rate slightly elevated above standard baseline.",
        "Stable SpO₂ saturation during session intervals.",
        "Respiration indicators show fibrous recovery patterns. Advise chest gym exercises."
      ]
    };

    const recommendations = {
      "Normal": "Patient is clinically stable. Continue routine remote monitoring. Standard observation care.",
      "Asthma": "Prepare rescue inhaler (Albuterol) dosage. Monitor peak expiratory values. Restrict allergen exposures.",
      "COPD": "Maintain upright posture. Consider oxygen therapy titration if desaturation persists. Scheduled bronchodilators.",
      "Pneumonia": "CAUTION: Fluid accumulation crackles. Administer supplemental oxygen immediately. Contact pulmonology department.",
      "Post-COVID": "Perform respiratory rehab training (incentive spirometry). Periodic follow-up chest imaging recommended."
    };

    return `
      <!-- Printable A4 Workspace (Styled for PDF export) -->
      <div style="background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; overflow-y: auto; max-height: 480px;">
        <div id="pdf-printable-report" style="background: white; color: #1e293b; padding: 24px; font-family: 'Inter', sans-serif; border-radius: 4px; box-shadow: 0 0 10px rgba(0,0,0,0.1); width: 100%; box-sizing: border-box;">
          
          <!-- Report Header -->
          <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 18px;">
            <div>
              <div style="font-weight: 800; font-size: 1.1rem; color: #0284c7; display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-lungs"></i> Metro Pulmonary Center
              </div>
              <div style="font-size: 0.68rem; color: #64748b; margin-top: 4px;">Remote Wearable Telemetry Analytics Portal</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: 800; font-size: 0.9rem; text-transform: uppercase; color: #1e293b;">Diagnostic Report</div>
              <div style="font-size: 0.65rem; font-family: monospace; color: #64748b; margin-top: 4px;">REP-990-${Math.floor(Math.random() * 9000 + 1000)}</div>
            </div>
          </div>

          <!-- Metadata table -->
          <table style="width: 100%; border-collapse: collapse; font-size: 0.72rem; margin-bottom: 16px;">
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px; font-weight: 700; color: #475569; width: 25%;">Patient Context</td>
              <td style="padding: 6px; color: #0f172a; width: 25%;">Eleanor Vance (Mock)</td>
              <td style="padding: 6px; font-weight: 700; color: #475569; width: 25%;">Patient ID</td>
              <td style="padding: 6px; color: #0f172a; width: 25%; font-family: monospace;">PAT-88219-X</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px; font-weight: 700; color: #475569;">Diagnostic Date</td>
              <td style="padding: 6px; color: #0f172a;" colspan="3">${dateStr}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px; font-weight: 700; color: #475569;">Connection Feeds</td>
              <td style="padding: 6px; color: #0f172a;">BLE Dual-Ch Patch</td>
              <td style="padding: 6px; font-weight: 700; color: #475569;">Risk Verdict</td>
              <td style="padding: 6px; color: #dc2626; font-weight: 700;">${log.riskLevel}</td>
            </tr>
          </table>

          <!-- Vitals Summary Grid -->
          <div style="font-weight: 800; font-size: 0.78rem; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #0f172a; padding-bottom: 4px; margin-bottom: 10px;">
            1. Physiological Vitals Summary
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; text-align: center;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px;">
              <div style="font-size: 0.6rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Heart Rate</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${log.heartRate} BPM</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px;">
              <div style="font-size: 0.6rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Oxygen Saturation</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${log.spo2}% SpO₂</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 8px;">
              <div style="font-size: 0.6rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Breathing Rate</div>
              <div style="font-size: 1.1rem; font-weight: 800; color: #0f172a; margin-top: 2px;">${log.breathingRate} Br/Min</div>
            </div>
          </div>

          <!-- AI Findings -->
          <div style="font-weight: 800; font-size: 0.78rem; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #0f172a; padding-bottom: 4px; margin-bottom: 10px;">
            2. Neural Network Acoustic Analysis
          </div>
          <div style="font-size: 0.72rem; color: #334155; line-height: 1.45; margin-bottom: 16px;">
            Acoustic lung samples processed through the CNN classifier yielded a prediction of <strong>${log.classification}</strong> (Confidence: <strong>${log.confidence}%</strong>).
            <div style="margin-top: 6px; padding-left: 10px;">
              ${findings[log.classification].map(f => `<div style="margin-bottom: 4px;">&bull; ${f}</div>`).join('')}
            </div>
          </div>

          <!-- Recommendations -->
          <div style="font-weight: 800; font-size: 0.78rem; text-transform: uppercase; color: #0f172a; border-bottom: 1px solid #0f172a; padding-bottom: 4px; margin-bottom: 10px;">
            3. Attending Physician Recommendations
          </div>
          <div style="font-size: 0.72rem; color: #334155; line-height: 1.45; margin-bottom: 24px; padding: 8px; background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 2px;">
            ${recommendations[log.classification]}
          </div>

          <!-- Signatures Section -->
          <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 20px;">
            <div style="width: 45%;">
              <div style="font-size: 0.58rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Engine Certification</div>
              <div style="border-bottom: 1px solid #94a3b8; height: 35px; display: flex; align-items: center; color: #0284c7; font-weight: 700; font-size: 0.72rem;">
                <i class="fas fa-microchip" style="margin-right: 6px;"></i> Bio-Neural Engine Class-II
              </div>
              <div style="font-size: 0.6rem; color: #64748b; margin-top: 4px;">Automated FDA Device Matrix</div>
            </div>

            <div style="width: 45%; text-align: right;">
              <div style="font-size: 0.58rem; color: #64748b; font-weight: 700; text-transform: uppercase; text-align: left;">Clinician Signature</div>
              <div style="border: 1px dashed #cbd5e1; border-radius: 4px; overflow: hidden; height: 50px; background: #fafafa; position: relative;">
                <canvas id="canvas-report-sig" style="width: 100%; height: 100%; display: block; background: transparent; cursor: crosshair; touch-action: none;"></canvas>
                <div id="sig-placeholder" style="position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; color: #94a3b8; pointer-events: none;">Sign on line</div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                <button id="btn-clear-sig" style="border: none; background: transparent; font-size: 0.6rem; color: #dc2626; cursor: pointer; text-decoration: underline;">Clear Sign</button>
                <div style="font-size: 0.6rem; color: #64748b;">Attending Physician</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Selection of rows
    const rows = document.querySelectorAll(".log-row");
    rows.forEach(row => {
      row.addEventListener("click", () => {
        const idx = parseInt(row.getAttribute("data-idx"));
        const logs = this.getLogs();
        if (logs[idx]) {
          this.selectedLog = logs[idx];
          this.render();
        }
      });
    });

    // Clear logs
    const clearBtn = document.getElementById("btn-clear-logs");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to permanently clear all diagnostic telemetry history?")) {
          localStorage.setItem("lung_patch_logs", JSON.stringify([]));
          this.selectedLog = null;
          this.render();
        }
      });
    }

    // Export PDF Report
    const exportBtn = document.getElementById("btn-export-pdf-doc");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        const element = document.getElementById("pdf-printable-report");
        if (!element) return;

        // Custom config for html2pdf.js
        const opt = {
          margin:       0.4,
          filename:     `clinical_report_${this.selectedLog.classification}_${Date.now()}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Trigger loading spinner
        const oldHtml = exportBtn.innerHTML;
        exportBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Generating PDF...`;
        exportBtn.disabled = true;

        // Run exporter (already loaded via CDN in index.html)
        window.html2pdf().set(opt).from(element).save().then(() => {
          exportBtn.innerHTML = oldHtml;
          exportBtn.disabled = false;
        }).catch(err => {
          alert("Failed to export PDF: " + err);
          exportBtn.innerHTML = oldHtml;
          exportBtn.disabled = false;
        });
      });
    }
  }

  initSignaturePad() {
    this.sigCanvas = document.getElementById("canvas-report-sig");
    if (!this.sigCanvas) return;

    // Set resolution sizes
    this.sigCanvas.width = this.sigCanvas.clientWidth;
    this.sigCanvas.height = this.sigCanvas.clientHeight;

    const ctx = this.sigCanvas.getContext("2d");
    ctx.strokeStyle = "#0284c7"; // blue ink
    ctx.lineWidth = 2.0;
    ctx.lineCap = "round";

    const placeholder = document.getElementById("sig-placeholder");

    const getPos = (e) => {
      const rect = this.sigCanvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const startDraw = (e) => {
      e.preventDefault();
      this.isDrawingSig = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      if (placeholder) placeholder.style.display = "none";
    };

    const draw = (e) => {
      if (!this.isDrawingSig) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const stopDraw = () => {
      this.isDrawingSig = false;
    };

    // Mouse events
    this.sigCanvas.addEventListener("mousedown", startDraw);
    this.sigCanvas.addEventListener("mousemove", draw);
    this.sigCanvas.addEventListener("mouseup", stopDraw);
    this.sigCanvas.addEventListener("mouseleave", stopDraw);

    // Touch events
    this.sigCanvas.addEventListener("touchstart", startDraw);
    this.sigCanvas.addEventListener("touchmove", draw);
    this.sigCanvas.addEventListener("touchend", stopDraw);

    // Clear signature button
    const clearSigBtn = document.getElementById("btn-clear-sig");
    if (clearSigBtn) {
      clearSigBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.clearRect(0, 0, this.sigCanvas.width, this.sigCanvas.height);
        if (placeholder) placeholder.style.display = "flex";
      });
    }
  }

  destroy() {
    // Unsubscribe from events or clear intervals if any
  }
}
