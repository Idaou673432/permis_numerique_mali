/**
 * @license
 * Permis Numérique Mali - Digital Driver's License Application
 * Direction Nationale des Transports Terrestres (DNTT) - République du Mali
 */

import React, { useState, useEffect } from 'react';
import { UserRole, DriverLicense, Violation } from './types';
import {
  initializeDatabaseSeed,
  fetchAllLicenses,
  fetchAllViolations,
  getLocalLicenses,
  isOnline as checkIsOnline,
  subscribeQuotaState,
  getFirestoreUpgradeUrl,
} from './lib/firebase';
import { Header } from './components/Header';
import { DriverCard } from './components/DriverCard';
import { OfficerScanner } from './components/OfficerScanner';
import { AdminPortal } from './components/AdminPortal';
import { AuthModal } from './components/AuthModal';
import { CitizenGuideModal } from './components/CitizenGuideModal';
import { InstallAppModal } from './components/InstallAppModal';
import { InstallPwaBanner } from './components/InstallPwaBanner';
import { AppSplashScreen } from './components/AppSplashScreen';
import {
  QrCode,
  ScanLine,
  Building2,
  WifiOff,
  Database,
  ExternalLink,
  RotateCw,
} from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('driver');
  const [licenses, setLicenses] = useState<DriverLicense[]>([]);
  const [activeLicense, setActiveLicense] = useState<DriverLicense | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(checkIsOnline());
  const [isQuotaExceeded, setIsQuotaExceeded] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>('mamadou.keita@citoyen.ml');
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);

  // Network Connectivity & Quota Listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribeQuota = subscribeQuotaState((exceeded) => {
      setIsQuotaExceeded(exceeded);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeQuota();
    };
  }, []);

  // Initialize and load licenses & violations
  const loadAppData = async () => {
    try {
      await initializeDatabaseSeed();
      const allLics = await fetchAllLicenses();
      const allViols = await fetchAllViolations();

      setLicenses(allLics);
      if (allLics.length > 0) {
        // Keep active license or pick first
        setActiveLicense((prev) => {
          if (prev) {
            const updated = allLics.find((l) => l.id === prev.id);
            if (updated) return updated;
          }
          return allLics[0];
        });
      } else {
        setActiveLicense(null);
      }
      setViolations(allViols);
    } catch (err) {
      console.warn('Erreur chargement données:', err);
      const cached = getLocalLicenses();
      setLicenses(cached);
      if (cached.length > 0) setActiveLicense(cached[0]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppData();
  }, []);

  // Filter violations for currently active driver
  const currentDriverViolations = violations.filter(
    (v) =>
      v.licenseNumber === activeLicense?.licenseNumber ||
      v.nina === activeLicense?.nina
  );

  const pendingViolationsCount = violations.filter(
    (v) => v.syncStatus === 'pending_sync'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      
      {/* Animated Cover Splash Screen on App Launch */}
      {showSplash && (
        <AppSplashScreen onComplete={() => setShowSplash(false)} />
      )}

      {/* Install PWA Banner */}
      <InstallPwaBanner onOpenInstallModal={() => setIsInstallModalOpen(true)} />

      {/* Official Header */}
      <Header
        currentRole={currentRole}
        onSelectRole={setCurrentRole}
        isOnline={isOnline}
        isQuotaExceeded={isQuotaExceeded}
        onRefreshData={loadAppData}
        pendingViolationsCount={pendingViolationsCount}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        onShowCover={() => setShowSplash(true)}
        currentUserEmail={currentUserEmail}
      />

      {/* Offline Status Banner */}
      {!isOnline && (
        <div className="bg-amber-50 text-amber-900 border-b border-amber-200 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Mode Hors-Ligne Actif :</strong> L'application fonctionne en totale autonomie. Les permis et vérifications cryptographiques ECDSA s'exécutent localement.
            </span>
          </div>
        </div>
      )}

      {/* Quota Exceeded Notification Banner */}
      {isQuotaExceeded && (
        <div className="bg-sky-50 text-sky-950 border-b border-sky-200 px-4 py-2.5 text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-600 shrink-0" />
              <span>
                <strong>Mode Autonome Actif (Quota Firebase Gratuit atteint) :</strong> Le quota d'écriture gratuit de Firestore pour aujourd'hui a été atteint (réinitialisation sous 24h). Toutes les opérations, signatures ECDSA, vérifications et modifications continuent de fonctionner parfaitement en persistance locale.
              </span>
            </div>
            <a
              href={getFirestoreUpgradeUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-800 rounded-lg border border-sky-300 font-semibold text-[11px] shrink-0 transition"
            >
              <span>Consulter Firebase Console</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-10">
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <RotateCw className="w-8 h-8 text-[#008543] animate-spin" />
            <p className="text-xs font-semibold text-slate-500">
              Chargement du système sécurisé DNTT Mali...
            </p>
          </div>
        ) : (
          <>
            {currentRole === 'driver' && activeLicense && (
              <DriverCard
                license={activeLicense}
                allLicenses={licenses}
                onSelectLicense={(lic) => setActiveLicense(lic)}
                driverViolations={currentDriverViolations}
                isOnline={isOnline}
                onRefreshViolations={loadAppData}
                onRefreshLicenses={loadAppData}
              />
            )}

            {currentRole === 'officer' && (
              <OfficerScanner
                allLicenses={licenses}
                isOnline={isOnline}
                onViolationRecorded={loadAppData}
                pendingViolationsCount={pendingViolationsCount}
              />
            )}

            {currentRole === 'admin' && (
              <AdminPortal
                licenses={licenses}
                violations={violations}
                onRefresh={loadAppData}
                isOnline={isOnline}
              />
            )}
          </>
        )}

      </main>

      {/* Bottom Mobile Navigation Bar (Clean Minimalism) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-2 shadow-lg">
        <div className="grid grid-cols-3 gap-2">
          
          <button
            onClick={() => setCurrentRole('driver')}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition ${
              currentRole === 'driver'
                ? 'text-[#008543] font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <div className={`w-6 h-6 rounded-full overflow-hidden mb-0.5 border ${currentRole === 'driver' ? 'border-[#008543] ring-2 ring-emerald-500/30' : 'border-slate-300 opacity-70'}`}>
              <img
                src="/app_launch_cover.jpg"
                alt="Conducteur Permis"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-[10px]">Conducteur</span>
          </button>

          <button
            onClick={() => setCurrentRole('officer')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition relative ${
              currentRole === 'officer'
                ? 'text-amber-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ScanLine className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Contrôle Police</span>
            {pendingViolationsCount > 0 && (
              <span className="absolute top-1 right-5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setCurrentRole('admin')}
            className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition ${
              currentRole === 'admin'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">DNTT Admin</span>
          </button>

        </div>
      </div>

      {/* Profile & Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSelectRole={(role) => setCurrentRole(role)}
        currentRole={currentRole}
        currentUserEmail={currentUserEmail}
        onAuthSuccess={(email) => setCurrentUserEmail(email)}
      />

      {/* Citizen Guide & Official FAQ Modal */}
      <CitizenGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onOpenInstall={() => setIsInstallModalOpen(true)}
      />

      {/* PWA Mobile App Installation Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

    </div>
  );
}
