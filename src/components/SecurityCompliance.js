export class SecurityCompliance {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.logsInterval = null;
  }

  render() {
    this.container.innerHTML = `
      <div class="view-header">
        <div class="header-title-container">
          <h1>Security & Compliance Vault</h1>
          <p>Commercial Hospital-Grade Encryption Pipelines & HIPAA Data Protections</p>
        </div>
        <div class="header-actions">
          <div class="pulse-card-banner" style="background: var(--alert-normal-light); color: var(--alert-normal); border-color: rgba(16, 185, 129, 0.2);">
            <i class="fas fa-shield-alt"></i> 
            <span id="header-secure-status">EMR SECURE TUNNEL ONLINE</span>
          </div>
        </div>
      </div>

      <!-- Security Vault Main Grid -->
      <div class="dashboard-grid">
        
        <!-- Interactive Secure Pipeline Map -->
        <div class="col-8 glass-panel dashboard-card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-network-wired text-primary"></i> Encrypted Telemetry Pipeline Map</h3>
            <span class="text-mono text-secondary" style="font-size: 0.78rem;">Data Sync: AES-256 GCM</span>
          </div>
          <p class="text-secondary" style="font-size: 0.85rem; margin-bottom: 24px;">
            The physical AI Lung Patch uses a custom hardware secure enclave to encrypt physiological waveforms locally. Telemetry transits through hospital gates using end-to-end TLS tunnels.
          </p>

          <!-- Interactive Sync Map Nodes -->
          <div class="security-sync-map" style="margin-bottom: 24px;">
            <div class="sec-node">
              <div class="sec-icon-circle"><i class="fas fa-lungs"></i></div>
              <div class="sec-lbl">Wearable Patch</div>
              <div class="sec-sublbl">AES Enclave</div>
            </div>
            
            <div class="sec-line-arrow"></div>

            <div class="sec-node">
              <div class="sec-icon-circle"><i class="fas fa-mobile-alt"></i></div>
              <div class="sec-lbl">Local Hub/App</div>
              <div class="sec-sublbl">TLS 1.3 Relay</div>
            </div>

            <div class="sec-line-arrow"></div>

            <div class="sec-node" id="node-cloud" style="border-color: var(--border-color);">
              <div class="sec-icon-circle" style="background: rgba(255,255,255,0.05); color: var(--text-secondary);"><i class="fas fa-server"></i></div>
              <div class="sec-lbl" style="color: var(--text-primary);">Secure Local Server</div>
              <div class="sec-sublbl">Active Offline</div>
            </div>

            <div class="sec-line-arrow"></div>

            <div class="sec-node">
              <div class="sec-icon-circle"><i class="fas fa-hospital-user"></i></div>
              <div class="sec-lbl">Hospital EMR</div>
              <div class="sec-sublbl">Epic/Cerner API</div>
            </div>
          </div>

          <div style="font-size: 0.8rem; color: var(--text-secondary); background: var(--bg-tertiary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
            <i class="fas fa-shield-virus text-primary" style="margin-right: 8px;"></i>
            <strong>Zero-Knowledge Encryption Standard:</strong> Micro-acoustics are classified directly inside the local enclaves, preventing raw audio transmission and protecting doctor-patient voice privacy.
          </div>
        </div>

        <!-- Role-based Access & accreditations -->
        <div class="col-4 glass-panel dashboard-card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 16px;">
          <div>
            <div class="card-header" style="border-bottom: 1px solid var(--border-color); padding-bottom: 10px; margin-bottom: 16px;">
              <h3 class="card-title"><i class="fas fa-award text-accent"></i> HIPAA Certifications</h3>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 20px;">
              <div style="display: flex; gap: 12px; align-items: center;">
                <div style="width: 44px; height: 44px; border-radius: 6px; background: var(--bg-tertiary); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--color-primary); font-size: 0.9rem;">HIPAA</div>
                <div>
                  <strong style="font-size: 0.85rem; color: var(--text-primary);">Title II Security Protection</strong>
                  <p style="font-size: 0.72rem; color: var(--text-secondary); margin: 0; line-height: 1.3;">Meets all national standards for healthcare transaction security.</p>
                </div>
              </div>

              <div style="display: flex; gap: 12px; align-items: center;">
                <div style="width: 44px; height: 44px; border-radius: 6px; background: var(--bg-tertiary); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; font-weight: 800; color: var(--color-secondary); font-size: 0.9rem;">GDPR</div>
                <div>
                  <strong style="font-size: 0.85rem; color: var(--text-primary);">EU Data Residency Compliance</strong>
                  <p style="font-size: 0.72rem; color: var(--text-secondary); margin: 0; line-height: 1.3;">Patients maintain absolute control over biological metrics removal.</p>
                </div>
              </div>
            </div>
          </div>
          
          <div style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 0.78rem; color: var(--text-secondary);">
            <i class="fas fa-key text-accent" style="margin-right: 6px;"></i> System operates in a secure sandbox memory environment. No external connections are enabled.
          </div>
        </div>

        <!-- Role-based Access Logging Terminal -->
        <div class="col-12 glass-panel dashboard-card">
          <div class="card-header">
            <h3 class="card-title"><i class="fas fa-terminal text-mono text-primary"></i> Real-time Role-Based Audit Ledger (EHR Logs)</h3>
            <span class="text-mono text-secondary" style="font-size: 0.75rem;">Status: Auditing Active</span>
          </div>
          <p class="text-secondary" style="font-size: 0.85rem; margin-bottom: 12px;">
            Simulated live auditing ledger logging exact user logins, API fetches, and clinical modifications in accordance with HIPAA § 164.312 auditing mandates.
          </p>

          <div style="font-family: var(--font-mono); font-size: 0.78rem; background: #040810; color: #10b981; border: 1px solid var(--border-color); border-radius: 8px; padding: 16px; height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; box-shadow: inset 0 2px 8px rgba(0,0,0,0.8);" id="audit-log-terminal">
            <div>[07:30:12] AUDIT CORRIDOR: Initialized secure audit trace tunnel. System ready.</div>
            <div>[07:32:05] ACCESS GRANTED: Dr. Adrian Thorne authorized credentials via SAML 2.0.</div>
            <div>[07:35:48] DATA DECRYPTED: Patient record PAT-8092 accessed. Key: AES_GCM_SHA256.</div>
          </div>
        </div>

      </div>
    `;

    this.startAuditLogger();
  }

  // Starts simulated audit records scrolling down the console
  startAuditLogger() {
    const term = document.getElementById("audit-log-terminal");
    if (!term) return;

    const auditActions = [
      "ACCESS GRANTED: Attending Nurse Jenkins fetched daily diagnostics dashboard.",
      "ENCRYPTED PIPELINE: Sensor #8092 synced 1200 packets containing 60Hz waveforms.",
      "KEY ROTATION: Automated TLS certificates re-generated successfully by Let's Encrypt.",
      "DATA INTEGRATION: Dispatched HL7 message to Epic EMR systems for patient Vance.",
      "ROLE EXCEPTION: Access denied to Guest_Portal attempting query PAT-4112 data parameters.",
      "TELEHEALTH ACTIVE: Opened encrypted WebRTC media channel for session SEC_9281.",
      "HEALTH METRIC: AI Lung acoustics classifier updated weights locally (Local Enclave v2.4)."
    ];

    this.logsInterval = setInterval(() => {
      if (!term) return;

      const time = new Date().toLocaleTimeString();
      const randAct = auditActions[Math.floor(Math.random() * auditActions.length)];
      
      const newLog = document.createElement("div");
      newLog.textContent = `[${time}] ${randAct}`;
      
      // Color-coding denied access or failures
      if (randAct.includes("denied")) {
        newLog.style.color = "var(--alert-critical)";
      } else if (randAct.includes("KEY") || randAct.includes("ENCRYPTED")) {
        newLog.style.color = "var(--color-primary)";
      }
      
      term.appendChild(newLog);
      
      // Auto scroll terminal to the bottom
      term.scrollTop = term.scrollHeight;

      // Limit log list size in memory
      if (term.childNodes.length > 50) {
        term.removeChild(term.firstChild);
      }
    }, 2500);
  }

  destroy() {
    if (this.logsInterval) clearInterval(this.logsInterval);
  }
}
