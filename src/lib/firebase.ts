/**
 * @license
 * Firebase & Firestore Services with Offline Support for Mali Digital License App
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  disableNetwork,
  enableNetwork,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DriverLicense, Violation, OfflineActivityLog } from '../types';
import { SEED_LICENSES } from '../data/seedData';
import { generateQRPayload } from './crypto';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const LICENSES_COLLECTION = 'licenses';
const VIOLATIONS_COLLECTION = 'violations';
const INSPECTION_LOGS_COLLECTION = 'inspection_logs';
const SETTINGS_COLLECTION = 'settings';

// Offline LocalStorage Keys
const LOCAL_STORAGE_LICENSES_KEY = 'dntt_mali_licenses_cache';
const LOCAL_STORAGE_MY_LICENSE_KEY = 'dntt_mali_active_license_id';
const LOCAL_STORAGE_VIOLATIONS_KEY = 'dntt_mali_offline_violations';
const LOCAL_STORAGE_ACTIVITY_LOGS_KEY = 'dntt_mali_offline_activity_logs';
const LOCAL_STORAGE_QUOTA_EXCEEDED_KEY = 'dntt_mali_firestore_quota_exceeded';

let isQuotaExceededFlag = (function () {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(LOCAL_STORAGE_QUOTA_EXCEEDED_KEY) === 'true') {
      return true;
    }
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(LOCAL_STORAGE_QUOTA_EXCEEDED_KEY) === 'true') {
      return true;
    }
  } catch (e) {
    // Ignore storage access errors
  }
  return false;
})();

// If already exceeded from previous run, immediately disable network to prevent error spam & backoff loops
if (isQuotaExceededFlag) {
  try {
    disableNetwork(db).catch(() => {});
  } catch (e) {
    // Ignore initial disable errors
  }
}

const quotaListeners: Array<(exceeded: boolean) => void> = [];

export function isFirestoreQuotaExceeded(): boolean {
  return isQuotaExceededFlag;
}

export function setFirestoreQuotaExceeded(exceeded: boolean): void {
  isQuotaExceededFlag = exceeded;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_QUOTA_EXCEEDED_KEY, exceeded ? 'true' : 'false');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(LOCAL_STORAGE_QUOTA_EXCEEDED_KEY, exceeded ? 'true' : 'false');
    }
  } catch (e) {
    // Ignore storage errors
  }

  if (exceeded) {
    try {
      disableNetwork(db).catch(() => {});
    } catch (e) {
      // Ignore
    }
  }

  quotaListeners.forEach((listener) => {
    try {
      listener(exceeded);
    } catch (e) {
      // Ignore listener error
    }
  });
}

export async function retryCloudConnection(): Promise<boolean> {
  try {
    await enableNetwork(db);
    // Test a read operation
    await getDocs(collection(db, LICENSES_COLLECTION));
    setFirestoreQuotaExceeded(false);
    return true;
  } catch (err) {
    if (isResourceExhaustedError(err)) {
      setFirestoreQuotaExceeded(true);
      try {
        await disableNetwork(db);
      } catch (e) {}
    }
    return false;
  }
}

export function subscribeQuotaState(callback: (exceeded: boolean) => void): () => void {
  quotaListeners.push(callback);
  callback(isQuotaExceededFlag);
  return () => {
    const idx = quotaListeners.indexOf(callback);
    if (idx >= 0) quotaListeners.splice(idx, 1);
  };
}

export function getFirestoreUpgradeUrl(): string {
  const projectId = firebaseConfig.projectId || 'crucial-spider-zhh41';
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  return `https://console.firebase.google.com/project/${projectId}/firestore/databases/${databaseId}/data?openUpgradeDialog=true`;
}

function isResourceExhaustedError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code;
  return (
    code === 'resource-exhausted' ||
    code === 'failed-precondition' ||
    code === 'unavailable' ||
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Quota exceeded') ||
    msg.includes('Free daily write units') ||
    msg.includes('free tier database')
  );
}

// Global handler to intercept any unhandled Firestore quota errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (isResourceExhaustedError(event.reason)) {
      event.preventDefault();
      setFirestoreQuotaExceeded(true);
    }
  });

  window.addEventListener('error', (event) => {
    if (isResourceExhaustedError(event.error || event.message)) {
      event.preventDefault();
      setFirestoreQuotaExceeded(true);
    }
  });
}

/**
 * Check if the browser currently has internet connection
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

/**
 * Initialize / Seed database with official default licenses if not already done
 */
export async function initializeDatabaseSeed(): Promise<void> {
  try {
    const localCached = localStorage.getItem(LOCAL_STORAGE_LICENSES_KEY);
    if (!localCached) {
      // Pre-sign seed licenses with QR payloads
      const signedSeeds: DriverLicense[] = [];
      for (const lic of SEED_LICENSES) {
        const qrJson = await generateQRPayload(lic);
        const parsed = JSON.parse(qrJson);
        signedSeeds.push({
          ...lic,
          signature: parsed.sig,
        });
      }
      localStorage.setItem(LOCAL_STORAGE_LICENSES_KEY, JSON.stringify(signedSeeds));
      if (!localStorage.getItem(LOCAL_STORAGE_MY_LICENSE_KEY)) {
        localStorage.setItem(LOCAL_STORAGE_MY_LICENSE_KEY, signedSeeds[0].id);
      }
    }
  } catch (error) {
    console.warn('Initialisation cache local:', error);
  }
}

/**
 * Get all cached licenses from local storage
 */
export function getLocalLicenses(): DriverLicense[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_LICENSES_KEY);
    if (raw !== null) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Erreur lecture cache local:', e);
  }
  return SEED_LICENSES;
}

/**
 * Save licenses to local storage
 */
export function setLocalLicenses(licenses: DriverLicense[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_LICENSES_KEY, JSON.stringify(licenses));
  } catch (e) {
    console.error('Erreur écriture cache local:', e);
  }
}

/**
 * Fetch all licenses from Firestore with local cache sync
 */
export async function fetchAllLicenses(): Promise<DriverLicense[]> {
  try {
    if (!isOnline() || isQuotaExceededFlag) {
      return getLocalLicenses();
    }

    const snapshot = await getDocs(collection(db, LICENSES_COLLECTION));
    if (snapshot.empty) {
      const fallback = getLocalLicenses();
      return fallback;
    }

    const licenses: DriverLicense[] = [];
    snapshot.forEach((docSnap) => {
      licenses.push(docSnap.data() as DriverLicense);
    });

    setLocalLicenses(licenses);
    return licenses;
  } catch (error) {
    if (isResourceExhaustedError(error)) {
      setFirestoreQuotaExceeded(true);
    }
    console.warn('Lecture Firestore indisponible, utilisation du cache local:', error);
    return getLocalLicenses();
  }
}

/**
 * Save or update a driver license (Firestore + LocalStorage)
 */
export async function saveDriverLicense(license: DriverLicense): Promise<void> {
  // 1. Ensure signature exists
  if (!license.signature) {
    const qrText = await generateQRPayload(license);
    const parsed = JSON.parse(qrText);
    license.signature = parsed.sig;
  }

  // 2. Update local storage immediately (Instant feedback)
  const current = getLocalLicenses();
  const index = current.findIndex((l) => l.id === license.id);
  if (index >= 0) {
    current[index] = license;
  } else {
    current.unshift(license);
  }
  setLocalLicenses(current);

  // 3. Sync to Firestore if online and quota not exceeded
  if (isOnline() && !isQuotaExceededFlag) {
    try {
      await setDoc(doc(db, LICENSES_COLLECTION, license.id), license, { merge: true });
    } catch (e) {
      if (isResourceExhaustedError(e)) {
        setFirestoreQuotaExceeded(true);
      }
      console.warn('Sauvegarde Firestore différée (stocké localement):', e);
    }
  }
}

/**
 * Update status of a license (e.g. revoke, suspend, activate)
 */
export async function updateLicenseStatus(
  licenseId: string,
  status: DriverLicense['status'],
  restrictions?: string
): Promise<void> {
  const current = getLocalLicenses();
  const target = current.find((l) => l.id === licenseId);
  if (target) {
    target.status = status;
    if (restrictions !== undefined) target.restrictions = restrictions;
    // Re-generate signature to reflect new status in QR code
    const qrText = await generateQRPayload(target);
    const parsed = JSON.parse(qrText);
    target.signature = parsed.sig;
    setLocalLicenses(current);

    if (isOnline() && !isQuotaExceededFlag) {
      try {
        await updateDoc(doc(db, LICENSES_COLLECTION, licenseId), {
          status,
          restrictions: target.restrictions,
          signature: target.signature,
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        if (isResourceExhaustedError(e)) {
          setFirestoreQuotaExceeded(true);
        }
        console.warn('Erreur mise à jour Firestore:', e);
      }
    }
  }
}

/**
 * Delete a license
 */
export async function deleteLicense(licenseId: string): Promise<void> {
  const current = getLocalLicenses().filter((l) => l.id !== licenseId);
  setLocalLicenses(current);

  // If the deleted license was the active driver, switch active driver key if needed
  try {
    if (localStorage.getItem(LOCAL_STORAGE_MY_LICENSE_KEY) === licenseId) {
      if (current.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_MY_LICENSE_KEY, current[0].id);
      } else {
        localStorage.removeItem(LOCAL_STORAGE_MY_LICENSE_KEY);
      }
    }
  } catch (e) {
    // Ignore storage errors
  }

  if (isOnline() && !isQuotaExceededFlag) {
    try {
      await deleteDoc(doc(db, LICENSES_COLLECTION, licenseId));
    } catch (e) {
      if (isResourceExhaustedError(e)) {
        setFirestoreQuotaExceeded(true);
      }
      console.warn('Erreur suppression Firestore:', e);
    }
  }
}

/**
 * Delete a violation from local storage and Firestore
 */
export async function deleteViolation(violationId: string): Promise<void> {
  const current = getLocalViolations().filter((v) => v.id !== violationId);
  setLocalViolations(current);

  if (isOnline() && !isQuotaExceededFlag) {
    try {
      await deleteDoc(doc(db, VIOLATIONS_COLLECTION, violationId));
    } catch (e) {
      if (isResourceExhaustedError(e)) {
        setFirestoreQuotaExceeded(true);
      }
      console.warn('Erreur suppression violation Firestore:', e);
    }
  }
}

/**
 * Update payment status of a violation (e.g. mark as paid after Mobile Money)
 */
export async function updateViolationPaymentStatus(
  violationId: string,
  paymentStatus: 'paid' | 'unpaid' | 'contested',
  receiptNumber?: string
): Promise<void> {
  const current = getLocalViolations();
  const target = current.find((v) => v.id === violationId);
  if (target) {
    target.paymentStatus = paymentStatus;
    if (receiptNumber) {
      target.notes = target.notes
        ? `${target.notes} | Quittance Trésor: ${receiptNumber}`
        : `Quittance Trésor: ${receiptNumber}`;
    }
    setLocalViolations(current);

    if (isOnline() && !isQuotaExceededFlag) {
      try {
        await updateDoc(doc(db, VIOLATIONS_COLLECTION, violationId), {
          paymentStatus,
          notes: target.notes,
          paidAt: new Date().toISOString(),
        });
      } catch (e) {
        if (isResourceExhaustedError(e)) {
          setFirestoreQuotaExceeded(true);
        }
        console.warn('Erreur mise à jour paiement infraction Firestore:', e);
      }
    }
  }
}

// ----------------- OFFLINE VIOLATIONS MANAGER -----------------

/**
 * Get offline recorded violations
 */
export function getLocalViolations(): Violation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_VIOLATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Erreur lecture violations locales:', e);
  }
  return [];
}

/**
 * Save offline violations to local storage
 */
export function setLocalViolations(violations: Violation[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_VIOLATIONS_KEY, JSON.stringify(violations));
  } catch (e) {
    console.error('Erreur écriture violations locales:', e);
  }
}

/**
 * Record a violation (Offline-First: Saved locally, then synced to Firestore when online)
 */
export async function recordViolation(violation: Omit<Violation, 'id' | 'syncStatus'>): Promise<Violation> {
  const id = `viol-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const fullViolation: Violation = {
    ...violation,
    id,
    syncStatus: 'pending_sync',
  };

  // 1. Deduct points from local license if applicable
  if (violation.pointsDeducted > 0) {
    const licenses = getLocalLicenses();
    const target = licenses.find((l) => l.licenseNumber === violation.licenseNumber || l.nina === violation.nina);
    if (target) {
      target.points = Math.max(0, (target.points || 12) - violation.pointsDeducted);
      if (target.points === 0) {
        target.status = 'suspended';
        target.restrictions = 'Suspension automatique : Solde de points épuisé (0/12)';
      }
      // Re-sign
      const qrText = await generateQRPayload(target);
      const parsed = JSON.parse(qrText);
      target.signature = parsed.sig;
      setLocalLicenses(licenses);
    }
  }

  // 2. Save into local pending queue
  const current = getLocalViolations();
  current.unshift(fullViolation);
  setLocalViolations(current);

  // 3. Attempt immediate sync if online and quota not exceeded
  if (isOnline() && !isQuotaExceededFlag) {
    try {
      await setDoc(doc(db, VIOLATIONS_COLLECTION, fullViolation.id), {
        ...fullViolation,
        syncStatus: 'synced',
      });
      fullViolation.syncStatus = 'synced';
      // Update local copy status
      const updated = getLocalViolations().map((v) => (v.id === id ? { ...v, syncStatus: 'synced' as const } : v));
      setLocalViolations(updated);
    } catch (e) {
      if (isResourceExhaustedError(e)) {
        setFirestoreQuotaExceeded(true);
      }
      console.log('Violation enregistrée localement (synchronisation différée).');
    }
  }

  return fullViolation;
}

/**
 * Synchronize all pending offline violations to Firestore
 */
export async function syncPendingViolations(): Promise<{ syncedCount: number; errorCount: number }> {
  if (!isOnline()) {
    throw new Error('Connexion Internet requise pour la synchronisation.');
  }
  if (isQuotaExceededFlag) {
    throw new Error('Quota journalier Firestore gratuit atteint. Les données restent conservées en local.');
  }

  const all = getLocalViolations();
  const pending = all.filter((v) => v.syncStatus === 'pending_sync');
  let syncedCount = 0;
  let errorCount = 0;

  for (const item of pending) {
    try {
      await setDoc(doc(db, VIOLATIONS_COLLECTION, item.id), {
        ...item,
        syncStatus: 'synced',
      });
      item.syncStatus = 'synced';
      syncedCount++;
    } catch (e) {
      if (isResourceExhaustedError(e)) {
        setFirestoreQuotaExceeded(true);
        errorCount++;
        break;
      }
      errorCount++;
      console.error(`Échec synchronisation infraction ${item.id}:`, e);
    }
  }

  setLocalViolations(all);
  return { syncedCount, errorCount };
}

/**
 * Fetch all violations from Firestore and merge with local
 */
export async function fetchAllViolations(): Promise<Violation[]> {
  const local = getLocalViolations();
  if (!isOnline() || isQuotaExceededFlag) {
    return local;
  }

  try {
    const q = query(collection(db, VIOLATIONS_COLLECTION), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const serverList: Violation[] = [];
    snapshot.forEach((snap) => {
      serverList.push(snap.data() as Violation);
    });

    // Merge without duplicates
    const map = new Map<string, Violation>();
    serverList.forEach((v) => map.set(v.id, v));
    local.forEach((v) => map.set(v.id, v)); // local overrides/includes pending

    const combined = Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setLocalViolations(combined);
    return combined;
  } catch (error) {
    if (isResourceExhaustedError(error)) {
      setFirestoreQuotaExceeded(true);
    }
    console.warn('Erreur chargement violations Firestore:', error);
    return local;
  }
}

// ----------------- OFFLINE INSPECTION & ACTIVITY LOGS -----------------

/**
 * Retrieve all local offline activity inspection logs
 */
export function getLocalActivityLogs(): OfflineActivityLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ACTIVITY_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Erreur lecture journal activité:', e);
  }
  return [];
}

/**
 * Save offline activity inspection logs into localStorage
 */
export function setLocalActivityLogs(logs: OfflineActivityLog[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ACTIVITY_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Erreur écriture journal activité:', e);
  }
}

/**
 * Record a roadside inspection/verification check into local activity journal
 */
export function recordLocalActivityLog(
  entry: Omit<OfflineActivityLog, 'id' | 'timestamp' | 'syncStatus'>
): OfflineActivityLog {
  const newLog: OfflineActivityLog = {
    ...entry,
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    syncStatus: 'local_stored',
  };

  const logs = getLocalActivityLogs();
  // Keep latest 250 records to prevent excessive storage consumption
  logs.unshift(newLog);
  if (logs.length > 250) {
    logs.splice(250);
  }
  setLocalActivityLogs(logs);

  // Background attempt to mirror log to Firestore if online
  if (isOnline() && !isQuotaExceededFlag) {
    setDoc(doc(db, INSPECTION_LOGS_COLLECTION, newLog.id), {
      ...newLog,
      syncStatus: 'synced',
    })
      .then(() => {
        const currentLogs = getLocalActivityLogs();
        const updated = currentLogs.map((l) =>
          l.id === newLog.id ? { ...l, syncStatus: 'synced' as const } : l
        );
        setLocalActivityLogs(updated);
      })
      .catch((e) => {
        if (isResourceExhaustedError(e)) {
          setFirestoreQuotaExceeded(true);
        }
        // Will stay local_stored
      });
  }

  return newLog;
}

/**
 * Clear all offline activity logs from local storage
 */
export function clearLocalActivityLogs(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_ACTIVITY_LOGS_KEY);
  } catch (e) {
    console.error('Erreur purge journal activité:', e);
  }
}

/**
 * Sync all pending offline inspection logs to Firestore
 */
export async function syncPendingActivityLogs(): Promise<{ syncedCount: number; errorCount: number }> {
  if (!isOnline()) {
    return { syncedCount: 0, errorCount: 0 };
  }

  const all = getLocalActivityLogs();
  const pending = all.filter((l) => l.syncStatus === 'local_stored');
  let syncedCount = 0;
  let errorCount = 0;

  for (const item of pending) {
    try {
      await setDoc(doc(db, INSPECTION_LOGS_COLLECTION, item.id), {
        ...item,
        syncStatus: 'synced',
      });
      item.syncStatus = 'synced';
      syncedCount++;
    } catch (e) {
      if (isResourceExhaustedError(e)) {
        setFirestoreQuotaExceeded(true);
        errorCount++;
        break;
      }
      errorCount++;
    }
  }

  setLocalActivityLogs(all);
  return { syncedCount, errorCount };
}
