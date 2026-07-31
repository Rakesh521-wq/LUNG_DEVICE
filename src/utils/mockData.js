// Centralized Medical Telemetry Simulation for 24x7 Lung Monitoring
import { db } from './firebase.js';
import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";

class RespiratoryTelemetryEngine {
  constructor() {
    this.subscribers = new Set();
    this.patients = [];
    
    // Centralized log registry for referral inquiries
    this.dispatchedEnquiries = [];

    // Roster of outpatients currently in (Outpatient In)
    this.outpatientsIn = [];

    // Roster of outpatients who have exited (Outpatient Exit)
    this.outpatientsExit = [];

    // Permanently active Firebase Firestore connection
    this.isFirebaseConnected = true;

    this.patientsUnsubscribe = null;
    this.referralsUnsubscribe = null;
    this.outpatientsInUnsubscribe = null;
    this.outpatientsExitUnsubscribe = null;

    this.connectFirebase();

    this.startSimulationTicks();
  }

  connectFirebase() {
    this.isFirebaseConnected = true;
    localStorage.setItem("firebase_connected", "true");

    this.disconnectFirebase();
    this.isFirebaseConnected = true;

    // Real-time snapshot listeners for Firestore synchronization
    this.patientsUnsubscribe = onSnapshot(collection(db, "patients"), (snapshot) => {
      const updatedPatients = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const id = docSnap.id;
        const existing = this.patients.find(p => p.id === id);
        if (existing) {
          updatedPatients.push({
            ...data,
            id: id,
            liveBpm: existing.liveBpm,
            liveSpo2: existing.liveSpo2,
            liveScore: existing.liveScore,
            battery: existing.battery,
            lastUpdate: existing.lastUpdate,
            baselineBpm: data.baselineBpm || existing.baselineBpm || data.liveBpm || 75,
            baselineSpo2: data.baselineSpo2 || existing.baselineSpo2 || data.liveSpo2 || 96,
            baselineScore: data.baselineScore || existing.baselineScore || data.liveScore || 96
          });
        } else {
          updatedPatients.push({
            ...data,
            id: id,
            baselineBpm: data.baselineBpm || data.liveBpm || 75,
            baselineSpo2: data.baselineSpo2 || data.liveSpo2 || 96,
            baselineScore: data.baselineScore || data.liveScore || 96
          });
        }
      });
      this.patients = updatedPatients;
      this.notify();
    }, (error) => {
      console.error("Firestore patients snapshot error:", error);
    });

    this.referralsUnsubscribe = onSnapshot(collection(db, "referrals"), (snapshot) => {
      const enquiries = [];
      snapshot.forEach(docSnap => {
        enquiries.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      this.dispatchedEnquiries = enquiries;
      this.notify();
    }, (error) => {
      console.error("Firestore referrals snapshot error:", error);
    });

    this.outpatientsInUnsubscribe = onSnapshot(collection(db, "outpatients_in"), (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      this.outpatientsIn = list;
      this.notify();
    }, (error) => {
      console.error("Firestore outpatients_in snapshot error:", error);
    });

    this.outpatientsExitUnsubscribe = onSnapshot(collection(db, "outpatients_exit"), (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      this.outpatientsExit = list;
      this.notify();
    }, (error) => {
      console.error("Firestore outpatients_exit snapshot error:", error);
    });
  }

  disconnectFirebase() {
    if (this.patientsUnsubscribe) {
      this.patientsUnsubscribe();
      this.patientsUnsubscribe = null;
    }
    if (this.referralsUnsubscribe) {
      this.referralsUnsubscribe();
      this.referralsUnsubscribe = null;
    }
    if (this.outpatientsInUnsubscribe) {
      this.outpatientsInUnsubscribe();
      this.outpatientsInUnsubscribe = null;
    }
    if (this.outpatientsExitUnsubscribe) {
      this.outpatientsExitUnsubscribe();
      this.outpatientsExitUnsubscribe = null;
    }
    this.isFirebaseConnected = false;
    localStorage.setItem("firebase_connected", "false");
    this.notify();
  }


  // Central log helper to add a referral enquiry
  addEnquiry(docName, patientName, category, schedule) {
    const refId = `REF-${Math.floor(1000 + Math.random() * 9000)}`;
    const newEnquiry = {
      id: refId,
      doctorName: docName,
      patientName: patientName,
      category: category,
      schedule: schedule,
      status: "Dispatched"
    };
    if (this.isFirebaseConnected) {
      setDoc(doc(db, "referrals", refId), newEnquiry)
        .catch(err => console.error("Error adding referral enquiry:", err));
    } else {
      this.dispatchedEnquiries.unshift(newEnquiry);
      this.notify();
    }
    return newEnquiry;
  }

  // Central log helper to remove a referral enquiry
  removeEnquiry(id) {
    if (this.isFirebaseConnected) {
      deleteDoc(doc(db, "referrals", id))
        .catch(err => console.error("Error removing referral enquiry:", err));
    } else {
      this.dispatchedEnquiries = this.dispatchedEnquiries.filter(e => e.id !== id);
      this.notify();
    }
    return true;
  }

  addOutpatientIn(name, age, gender, condition, docName, timings) {
    const opId = `OP-${Math.floor(4000 + Math.random() * 5000)}`;
    const newOp = {
      id: opId,
      name: name,
      age: parseInt(age) || 45,
      gender: gender,
      condition: condition,
      preferredDoctor: docName,
      timings: timings
    };
    if (this.isFirebaseConnected) {
      setDoc(doc(db, "outpatients_in", opId), newOp)
        .catch(err => console.error("Error adding outpatient check-in:", err));
    } else {
      this.outpatientsIn.push(newOp);
      this.notify();
    }
    return newOp;
  }

  removeOutpatientIn(id) {
    if (this.isFirebaseConnected) {
      deleteDoc(doc(db, "outpatients_in", id))
        .catch(err => console.error("Error removing outpatient check-in:", err));
    } else {
      this.outpatientsIn = this.outpatientsIn.filter(op => op.id !== id);
      this.notify();
    }
    return true;
  }

  consultAndExitOutpatient(id) {
    if (this.isFirebaseConnected) {
      const patient = this.outpatientsIn.find(op => op.id === id);
      if (patient) {
        const exitPatient = {
          ...patient,
          consultedDoctor: patient.preferredDoctor,
          exitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        setDoc(doc(db, "outpatients_exit", id), exitPatient)
          .then(() => {
            return deleteDoc(doc(db, "outpatients_in", id));
          })
          .catch(err => console.error("Error in consultAndExitOutpatient transaction:", err));
        
        return true;
      }
    } else {
      const patientIndex = this.outpatientsIn.findIndex(op => op.id === id);
      if (patientIndex !== -1) {
        const patient = this.outpatientsIn[patientIndex];
        this.outpatientsIn.splice(patientIndex, 1);
        
        const exitPatient = {
          ...patient,
          consultedDoctor: patient.preferredDoctor,
          exitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        this.outpatientsExit.push(exitPatient);
        this.notify();
        return true;
      }
    }
    return false;
  }

  removeOutpatientExit(id) {
    if (this.isFirebaseConnected) {
      deleteDoc(doc(db, "outpatients_exit", id))
        .catch(err => console.error("Error removing outpatient exit log:", err));
    } else {
      this.outpatientsExit = this.outpatientsExit.filter(op => op.id !== id);
      this.notify();
    }
    return true;
  }

  // Register patient entry details from patient portal
  registerPatient(name, age, gender, condition, initialBpm, initialSpo2) {
    const id = `PAT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newPatient = {
      id: id,
      name: name,
      age: parseInt(age) || 45,
      gender: gender,
      condition: condition,
      admissionDate: "",
      room: "",
      avatar: name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
      battery: 100,
      patchStatus: "Disconnected",
      syncStatus: "Sensor Sync Pending",
      lastUpdate: new Date().toISOString(),
      liveScore: "--",
      liveBpm: "--",
      liveSpo2: "--",
      baselineBpm: "--",
      baselineSpo2: "--",
      baselineScore: "--",
      soundAnalysis: "Sensor Feed Standby",
      riskLevel: "Standby",
      findings: [
        `Sensor Sync Pending`,
        `Initial SpO2 recorded at --%`,
        `Pulse telemetry monitored at -- BPM`
      ],
      recommendation: "Awaiting primary clinical physician evaluation recommendations.",
      doctorSignature: "",
      timeline: [
        { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), note: "Patient record created in registry" }
      ],
      history: {
        labels: ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
        bpm: [75, 77, 74, 75, 76, 75],
        spo2: [96, 95, 96, 97, 95, 96]
      },
      admissionStatus: "Registered"
    };

    if (this.isFirebaseConnected) {
      setDoc(doc(db, "patients", id), newPatient)
        .catch(err => console.error("Error registering patient:", err));
    } else {
      this.patients.push(newPatient);
      this.notify();
    }
    return newPatient;
  }

  // Admit a registered patient to the hospital ward
  admitPatient(id, room) {
    const patient = this.patients.find(p => p.id === id);
    if (patient) {
      const updatedTimeline = [
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          note: `Patient admitted to room ${room || "Ward-4A"}`
        },
        ...patient.timeline
      ];

      if (this.isFirebaseConnected) {
        updateDoc(doc(db, "patients", id), {
          admissionStatus: "Admitted",
          admissionDate: new Date().toISOString().split('T')[0],
          room: room || "Ward-4A",
          syncStatus: "Telemetry Session Active",
          timeline: updatedTimeline
        }).catch(err => console.error("Error admitting patient:", err));
      } else {
        patient.admissionStatus = "Admitted";
        patient.admissionDate = new Date().toISOString().split('T')[0];
        patient.room = room || "Ward-4A";
        patient.syncStatus = "Telemetry Session Active";
        patient.timeline = updatedTimeline;
        this.notify();
      }

      return true;
    }
    return false;
  }

  // Dispatch and discharge patient from hospital ward
  dispatchPatient(id) {
    const patient = this.patients.find(p => p.id === id);
    if (patient) {
      const updatedTimeline = [
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          note: "Patient signed off and Dispatched from ward."
        },
        ...patient.timeline
      ];

      if (this.isFirebaseConnected) {
        updateDoc(doc(db, "patients", id), {
          admissionStatus: "Dispatched",
          patchStatus: "Disconnected",
          syncStatus: "Telemetry Session Ended",
          timeline: updatedTimeline
        }).catch(err => console.error("Error dispatching patient:", err));
      } else {
        patient.admissionStatus = "Dispatched";
        patient.patchStatus = "Disconnected";
        patient.syncStatus = "Telemetry Session Ended";
        patient.timeline = updatedTimeline;
        this.notify();
      }

      return true;
    }
    return false;
  }



  // Subscribe a component callback to receive live telemetry updates
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    for (const cb of this.subscribers) {
      try {
        cb(this.patients);
      } catch (err) {
        console.error("Subscriber update failed", err);
      }
    }
  }

  // Simulation tick loop modifying standard values to feel alive and dynamic
  startSimulationTicks() {
    // Telemetry updates disabled to keep all indicators completely static at clean Rest Positions.
  }

  // Update a specific patient's clinical prescription or doctor notes
  updatePatientNotes(patientId, recommendation, doctorSig) {
    const patient = this.patients.find(p => p.id === patientId);
    if (patient) {
      const updatedTimeline = [
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          note: `Clinical recommendation updated by ${doctorSig}`
        },
        ...patient.timeline
      ];

      if (this.isFirebaseConnected) {
        updateDoc(doc(db, "patients", patientId), {
          recommendation: recommendation,
          doctorSignature: doctorSig,
          timeline: updatedTimeline
        }).catch(err => console.error("Error updating patient notes:", err));
      } else {
        patient.recommendation = recommendation;
        patient.doctorSignature = doctorSig;
        patient.timeline = updatedTimeline;
        this.notify();
      }

      return true;
    }
    return false;
  }

  // Add prescription timeline entry
  addPrescription(patientId, medicineName, dosage) {
    const patient = this.patients.find(p => p.id === patientId);
    if (patient) {
      const updatedTimeline = [
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          note: `Prescription added: ${medicineName} (${dosage})`
        },
        ...patient.timeline
      ];

      if (this.isFirebaseConnected) {
        updateDoc(doc(db, "patients", patientId), {
          timeline: updatedTimeline
        }).catch(err => console.error("Error adding patient prescription:", err));
      } else {
        patient.timeline = updatedTimeline;
        this.notify();
      }

      return true;
    }
    return false;
  }

  // Set an emergency alert
  triggerEmergency(patientId) {
    const patient = this.patients.find(p => p.id === patientId);
    if (patient) {
      const updatedTimeline = [
        {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          note: "EMERGENCY BUTTON DEPLOYED BY PATIENT / FAMILY DISPATCHED"
        },
        ...patient.timeline
      ];

      if (this.isFirebaseConnected) {
        updateDoc(doc(db, "patients", patientId), {
          riskLevel: "Critical",
          liveScore: Math.max(30, Math.min(48, patient.liveScore - 15)),
          timeline: updatedTimeline
        }).catch(err => console.error("Error triggering emergency:", err));
      } else {
        patient.riskLevel = "Critical";
        patient.liveScore = Math.max(30, Math.min(48, patient.liveScore - 15));
        patient.timeline = updatedTimeline;
        this.notify();
      }

      return true;
    }
    return false;
  }

  addAssessment(symptoms, riskProfile, scoreInfo) {
    const assessmentId = `ASM-${Math.floor(1000 + Math.random() * 9000)}`;
    const newAssessment = {
      id: assessmentId,
      symptoms: symptoms,
      riskProfile: riskProfile,
      scoreInfo: scoreInfo,
      timestamp: new Date().toISOString()
    };
    if (this.isFirebaseConnected) {
      setDoc(doc(db, "assessments", assessmentId), newAssessment)
        .catch(err => console.error("Error storing assessment:", err));
    }
  }


}

export const TelemetryEngineInstance = new RespiratoryTelemetryEngine();

// Pre-defined static mock historical report archives
export const ReportArchives = [];
