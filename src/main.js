// Main Entry File coordinating Single Page Router and Themes
import { LandingPage } from './components/LandingPage.js';
import { PatientDashboard } from './components/PatientDashboard.js';
import { DoctorDashboard } from './components/DoctorDashboard.js';
import { SpecialistPortal } from './components/SpecialistPortal.js';
import { AIAnalytics } from './components/AIAnalytics.js';
import { SecurityCompliance } from './components/SecurityCompliance.js';
import { OutpatientPortal } from './components/OutpatientPortal.js';
import { TelemetryEngineInstance } from './utils/mockData.js';
import { BLEControllerInstance } from './utils/bleController.js';

class SinglePageRouter {
  constructor() {
    this.currentView = null;
    this.viewContainerId = "app-view-container";
    this.currentRoute = null;
    this.history = [];
    
    this.routes = {
      "landing": LandingPage,
      "patient": PatientDashboard,
      "doctor": DoctorDashboard,
      "specialists": SpecialistPortal,
      "analytics": AIAnalytics,
      "security": SecurityCompliance,
      "op": OutpatientPortal
    };

    window.appRouter = this;
  }

  // Handle route switching and component cleanups
  navigate(route, activePatientId = null, isBack = false) {
    if (!this.routes[route]) return;

    // Maintain history stack for global back navigation
    const prevRoute = this.currentRoute;
    this.currentRoute = route;

    if (!isBack && prevRoute && prevRoute !== route) {
      this.history.push(prevRoute);
    }
    if (route === "landing") {
      this.history = [];
    }

    // Toggle visibility of global back button
    const backBtn = document.getElementById("global-back-btn");
    if (backBtn) {
      backBtn.style.display = route === "landing" ? "none" : "inline-flex";
    }

    // Clean up active loop subscriptions in previous views
    if (this.currentView && typeof this.currentView.destroy === "function") {
      try {
        this.currentView.destroy();
      } catch (err) {
        console.warn("View cleanup failed:", err);
      }
    }

    // Instantiates active component
    const ComponentClass = this.routes[route];
    this.currentView = new ComponentClass(this.viewContainerId);
    
    // Set active patient context if provided prior to rendering
    if (activePatientId) {
      const pat = TelemetryEngineInstance.patients.find(p => p.id === activePatientId);
      if (pat) {
        if (route === "patient") {
          this.currentView.activePatient = pat;
        } else if (route === "doctor") {
          this.currentView.selectedPatient = pat;
        }
      }
    }

    // Render and build UI
    this.currentView.render();

    // Update active nav selections in sidebar
    document.querySelectorAll(".nav-item").forEach(item => {
      item.classList.remove("active");
      if (item.getAttribute("data-route") === route) {
        item.classList.add("active");
      }
    });

    // Update breadcrumb navigation text
    const breadcrumbParent = document.getElementById("breadcrumb-parent");
    const breadcrumbCurrent = document.getElementById("breadcrumb-current");
    if (breadcrumbParent && breadcrumbCurrent) {
      switch (route) {
        case "landing":
          breadcrumbParent.textContent = "Ecosystem";
          breadcrumbCurrent.textContent = "Product Home";
          break;
        case "patient":
          breadcrumbParent.textContent = "Portal";
          breadcrumbCurrent.textContent = "Patient Dashboard";
          break;
        case "doctor":
          breadcrumbParent.textContent = "Clinical";
          breadcrumbCurrent.textContent = "Doctor Dashboard";
          break;
        case "specialists":
          breadcrumbParent.textContent = "Referral";
          breadcrumbCurrent.textContent = "Apollo Specialists";
          break;
        case "analytics":
          breadcrumbParent.textContent = "ML Engine";
          breadcrumbCurrent.textContent = "AI Analytics";
          break;
        case "security":
          breadcrumbParent.textContent = "Vault";
          breadcrumbCurrent.textContent = "Security & Compliance";
          break;
        case "op":
          breadcrumbParent.textContent = "Outpatient";
          breadcrumbCurrent.textContent = "Outpatient Portal";
          break;
      }
    }

    // Auto-scroll window to top
    window.scrollTo(0, 0);

    // Close sidebar drawer overlay if open
    const sidebar = document.getElementById("sidebar-panel");
    const overlay = document.getElementById("sidebar-overlay");
    if (sidebar) sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("active");
  }
}

// Global UI coordinators
document.addEventListener("DOMContentLoaded", () => {
  const router = new SinglePageRouter();
  
  // Navigate to landing initially
  router.navigate("landing");

  // Wire up the global top-bar Back button
  const backBtn = document.getElementById("global-back-btn");
  if (backBtn) {
    backBtn.addEventListener("click", () => {
      const prev = router.history.pop();
      router.navigate(prev || "landing", null, true);
    });
  }

  // Navigation Links click events
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const target = item.getAttribute("data-route");
      if (target) {
        router.navigate(target);
      }
    });
  });

  // Amazon Pharmacy external link handler
  const pharmacyBtn = document.getElementById("nav-pharmacy");
  if (pharmacyBtn) {
    pharmacyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const link = document.createElement("a");
      link.href = "https://www.amazon.in/l/92379764031/ref=PHARMASEM?tag=googmantxtmob10-21&ascsubtag=_k_Cj0KCQjw0JnRBhDJARIsALobnXYBFfCTs0u65itUyOnpRZ4e1OBtJF7RLFIR7kbyHK9ehq653ieGW2QaAi0LEALw_wcB_k_&gad_source=1&gad_campaignid=20925967339&gbraid=0AAAAAotYHgRFK-wxeV051r9w8xchjH0_e&gclid=Cj0KCQjw0JnRBhDJARIsALobnXYBFfCTs0u65itUyOnpRZ4e1OBtJF7RLFIR7kbyHK9ehq653ieGW2QaAi0LEALw_wcB";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.click();
      
      const sidebar = document.getElementById("sidebar-panel");
      const overlay = document.getElementById("sidebar-overlay");
      if (sidebar) sidebar.classList.remove("open");
      if (overlay) overlay.classList.remove("active");
    });
  }

  // Collapsible Sidebar Overlay Drawer Controls
  const sidebarCollapseToggle = document.getElementById("sidebar-collapse-toggle");
  const sidebar = document.getElementById("sidebar-panel");
  const overlay = document.getElementById("sidebar-overlay");

  if (sidebarCollapseToggle && sidebar && overlay) {
    sidebarCollapseToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("open");
      overlay.classList.toggle("active");
    });

    overlay.addEventListener("click", () => {
      sidebar.classList.remove("open");
      overlay.classList.remove("active");
    });
  }

  // Global Light/Dark Theme Switcher
  const themeToggle = document.getElementById("theme-mode-toggle");
  const htmlRoot = document.documentElement;

  if (themeToggle) {
    themeToggle.addEventListener("change", (e) => {
      const modeText = document.querySelector(".theme-label");
      if (e.target.checked) {
        htmlRoot.setAttribute("data-theme", "dark");
        if (modeText) modeText.innerHTML = '<i class="fas fa-moon text-primary"></i> Dark Mode';
      } else {
        htmlRoot.setAttribute("data-theme", "light");
        if (modeText) modeText.innerHTML = '<i class="fas fa-sun text-secondary"></i> Light Mode';
      }
    });
  }

  // Subscribe Top Menu Bar elements to BLE Controller for real-time telemetry streaming
  BLEControllerInstance.subscribe((data, type) => {
    const ble = BLEControllerInstance.data;
    const topBarTelem = document.getElementById("top-bar-telemetry");
    if (topBarTelem) {
      if (BLEControllerInstance.handState === 'connected' || BLEControllerInstance.isSimulating) {
        topBarTelem.textContent = `${ble.heartRate} BPM | ${ble.spo2}% SpO₂`;
      } else {
        const activePat = TelemetryEngineInstance.patients.find(p => p.admissionStatus === "Admitted" && p.patchStatus === "Connected");
        if (activePat) {
          topBarTelem.textContent = `${activePat.liveBpm} BPM | ${activePat.liveSpo2}% SpO₂`;
        } else {
          topBarTelem.textContent = "Roster Standby";
        }
      }
    }
  });

  // Subscribe Top Menu Bar elements to Telemetry Engine for real-time synch
  TelemetryEngineInstance.subscribe((patients) => {
    // Update top bar Firebase connection status indicator
    const fbBtn = document.getElementById("firebase-conn-btn");
    const fbDot = document.getElementById("firebase-conn-dot");
    const fbText = document.getElementById("firebase-conn-text");
    if (fbBtn && fbDot && fbText) {
      if (TelemetryEngineInstance.isFirebaseConnected) {
        fbBtn.style.background = "rgba(16, 185, 129, 0.15)";
        fbBtn.style.borderColor = "rgba(16, 185, 129, 0.3)";
        fbBtn.style.color = "var(--color-secondary)";
        fbDot.style.backgroundColor = "var(--color-secondary)";
        fbDot.style.boxShadow = "0 0 8px var(--color-secondary-glow)";
        fbText.textContent = "Firebase Connected";
      } else {
        fbBtn.style.background = "rgba(239, 68, 68, 0.1)";
        fbBtn.style.borderColor = "rgba(239, 68, 68, 0.2)";
        fbBtn.style.color = "var(--alert-critical)";
        fbDot.style.backgroundColor = "var(--alert-critical)";
        fbDot.style.boxShadow = "0 0 8px var(--alert-critical-glow)";
        fbText.textContent = "Offline Active";
      }
    }

    // Override top-bar display if real BLE oximeter is streaming
    const ble = BLEControllerInstance.data;
    const topBarTelem = document.getElementById("top-bar-telemetry");
    if (topBarTelem) {
      if (BLEControllerInstance.handState === 'connected' || BLEControllerInstance.isSimulating) {
        topBarTelem.textContent = `${ble.heartRate} BPM | ${ble.spo2}% SpO₂`;
        return;
      }
      
      const activePat = patients.find(p => p.admissionStatus === "Admitted" && p.patchStatus === "Connected");
      if (activePat) {
        topBarTelem.textContent = `${activePat.liveBpm} BPM | ${activePat.liveSpo2}% SpO₂`;
      } else {
        topBarTelem.textContent = "Roster Standby";
      }
    }

    // Count clinical alerts
    let alertCount = 0;
    patients.forEach(p => {
      if (p.admissionStatus === "Admitted" && (p.riskLevel === "Critical" || p.riskLevel === "Mild Concern")) {
        alertCount++;
      }
    });
    const headerAlertCount = document.getElementById("header-alert-count");
    if (headerAlertCount) {
      headerAlertCount.textContent = alertCount;
      headerAlertCount.style.display = alertCount > 0 ? "flex" : "none";
    }
  });

  // Global Search Box Functionality
  const searchInput = document.getElementById("global-search-input");
  const searchResults = document.getElementById("global-search-results");

  const appRoutesList = [
    { name: "Product Home", route: "landing", icon: "fas fa-hospital" },
    { name: "Patient Portal", route: "patient", icon: "fas fa-user-injured" },
    { name: "Doctor Portal", route: "doctor", icon: "fas fa-user-md" },
    { name: "Apollo Specialists", route: "specialists", icon: "fas fa-hospital-user" },
    { name: "AI Analytics", route: "analytics", icon: "fas fa-chart-line" },
    { name: "Security Vault", route: "security", icon: "fas fa-shield-halved" },
    { name: "Outpatient Portal", route: "op", icon: "fas fa-hospital-user" }
  ];

  if (searchInput && searchResults) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (!query) {
        searchResults.classList.remove("active");
        searchResults.innerHTML = "";
        return;
      }

      const matchingPatients = TelemetryEngineInstance.patients.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        p.condition.toLowerCase().includes(query)
      );

      const matchingRoutes = appRoutesList.filter(r => 
        r.name.toLowerCase().includes(query)
      );

      const clinicalGuides = [
        { name: "Asthma (Severe & Pediatric)", category: "Clinical Guide", condition: "asthma", info: "Airway inflammation with whistling wheeze.", link: "https://www.lung.ca/lung-health/lung-diseases/asthma" },
        { name: "COPD (Emphysema & Bronchitis)", category: "Clinical Guide", condition: "copd", info: "Progressive airflow obstruction and chronic cough.", link: "https://www.lung.ca/lung-health/lung-diseases/copd" },
        { name: "Chronic Bronchitis", category: "Clinical Guide", condition: "bronchitis", info: "Inflamed bronchial lining, mucus hypersecretion.", link: "https://www.lung.ca/lung-health/lung-diseases/bronchitis" },
        { name: "Pneumonia & Fluid Consolidation", category: "Clinical Guide", condition: "pneumonia", info: "Alveolar sac infection and fluid buildup.", link: "https://www.lung.ca/lung-health/lung-diseases/pneumonia" }
      ];

      const matchingGuides = clinicalGuides.filter(g => 
        g.name.toLowerCase().includes(query) ||
        g.condition.toLowerCase().includes(query) ||
        g.info.toLowerCase().includes(query)
      );

      let resultsHtml = "";

      if (matchingPatients.length > 0) {
        resultsHtml += `<div style="font-size: 0.7rem; font-weight: 700; color: var(--text-tertiary); padding: 6px 12px; border-bottom: 1px solid var(--border-color); text-transform: uppercase; letter-spacing: 0.05em;">Ward Patients</div>`;
        matchingPatients.forEach(p => {
          const badgeClass = p.riskLevel === "Critical" ? "badge-critical" : p.riskLevel === "Mild Concern" ? "badge-concern" : "badge-normal";
          const avatarBorderClass = p.riskLevel === "Critical" ? "alert-border" : p.riskLevel === "Mild Concern" ? "concern-border" : "";
          resultsHtml += `
            <div class="search-result-item" data-action="patient" data-id="${p.id}">
              <div class="result-meta">
                <div class="result-avatar ${avatarBorderClass}">${p.avatar}</div>
                <div class="result-name-group">
                  <span class="result-name">${p.name}</span>
                  <span class="result-sub">${p.id} • ${p.condition}</span>
                </div>
              </div>
              <div class="result-right">
                <span class="result-type-badge ${badgeClass}">${p.riskLevel}</span>
              </div>
            </div>
          `;
        });
      }

      if (matchingGuides.length > 0) {
        resultsHtml += `<div style="font-size: 0.7rem; font-weight: 700; color: var(--text-tertiary); padding: 10px 12px 6px 12px; border-bottom: 1px solid var(--border-color); text-transform: uppercase; letter-spacing: 0.05em;">Clinical Info & Disease Guides</div>`;
        matchingGuides.forEach(g => {
          resultsHtml += `
            <div class="search-result-item" data-action="guide" data-link="${g.link}">
              <div class="result-meta">
                <div class="result-avatar" style="background: var(--color-secondary-light); border-color: var(--color-secondary);"><i class="fas fa-book-medical" style="color: var(--color-secondary); font-size: 0.8rem;"></i></div>
                <div class="result-name-group">
                  <span class="result-name">${g.name}</span>
                  <span class="result-sub">${g.info}</span>
                </div>
              </div>
              <div class="result-right">
                <span class="result-type-badge" style="background: var(--color-secondary-light); color: var(--color-secondary); border-color: rgba(16, 185, 129, 0.2); font-weight: 700;">Guide <i class="fas fa-external-link-alt" style="font-size: 0.6rem; margin-left: 2px;"></i></span>
              </div>
            </div>
          `;
        });
      }

      if (matchingRoutes.length > 0) {
        resultsHtml += `<div style="font-size: 0.7rem; font-weight: 700; color: var(--text-tertiary); padding: 10px 12px 6px 12px; border-bottom: 1px solid var(--border-color); text-transform: uppercase; letter-spacing: 0.05em;">Portal Navigation</div>`;
        matchingRoutes.forEach(r => {
          resultsHtml += `
            <div class="search-result-item" data-action="route" data-route="${r.route}">
              <div class="result-meta">
                <div class="result-avatar"><i class="${r.icon}" style="color: var(--color-primary);"></i></div>
                <div class="result-name-group">
                  <span class="result-name">${r.name}</span>
                  <span class="result-sub">Navigate to application section</span>
                </div>
              </div>
              <div class="result-right">
                <span class="result-type-badge badge-page">Ecosystem</span>
              </div>
            </div>
          `;
        });
      }

      if (matchingPatients.length === 0 && matchingRoutes.length === 0 && matchingGuides.length === 0) {
        resultsHtml = `<div class="search-no-results">No clinical records, sections, or guides found for "${e.target.value}"</div>`;
      }

      searchResults.innerHTML = resultsHtml;
      searchResults.classList.add("active");

      document.querySelectorAll(".search-result-item").forEach(item => {
        item.addEventListener("click", () => {
          const action = item.getAttribute("data-action");
          if (action === "route") {
            router.navigate(item.getAttribute("data-route"));
          } else if (action === "patient") {
            router.navigate("doctor", item.getAttribute("data-id"));
          } else if (action === "guide") {
            window.open(item.getAttribute("data-link"), "_blank");
          }
          searchInput.value = "";
          searchResults.classList.remove("active");
        });
      });
    });

    document.addEventListener("click", (e) => {
      const searchWrapper = document.querySelector(".top-menu-search");
      if (searchWrapper && !searchWrapper.contains(e.target)) {
        searchResults.classList.remove("active");
      }
    });
  }

  // Global Firebase Connection Toggle Button
  const fbBtn = document.getElementById("firebase-conn-btn");
  const fbDot = document.getElementById("firebase-conn-dot");
  const fbText = document.getElementById("firebase-conn-text");

  if (fbBtn && fbDot && fbText) {
    const updateFbBtnUI = () => {
      fbBtn.style.background = "rgba(16, 185, 129, 0.15)";
      fbBtn.style.borderColor = "rgba(16, 185, 129, 0.3)";
      fbBtn.style.color = "var(--color-secondary)";
      fbDot.style.backgroundColor = "var(--color-secondary)";
      fbDot.style.boxShadow = "0 0 8px var(--color-secondary-glow)";
      fbText.textContent = "Firebase Connected";
    };
    updateFbBtnUI();
  }
});
