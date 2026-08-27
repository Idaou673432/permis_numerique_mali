import React from 'react';
import { UserRole } from '../types';
import { Shield, QrCode, ScanLine, Building2, Wifi, WifiOff, RefreshCw, UserCheck, HelpCircle, Smartphone } from 'lucide-react';

interface HeaderProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  isOnline: boolean;
  isQuotaExceeded?: boolean;
  onRefreshData?: () => void;
  pendingViolationsCount: number;
  onOpenAuth?: () => void;
  onOpenGuide?: () => void;
  onOpenInstall?: () => void;
  onShowCover?: () => void;
  currentUserEmail?: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onSelectRole,
  isOnline,
  isQuotaExceeded,
  onRefreshData,
  pendingViolationsCount,
  onOpenAuth,
  onOpenGuide,
  onOpenInstall,
  onShowCover,
  currentUserEmail,
}) => {
  return (
    <header className="bg-white text-slate-800 border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Mali Flag Top Stripe */}
      <div className="h-1 w-full flex">
        <div className="h-full w-1/3 bg-[#008543]"></div>
        <div className="h-full w-1/3 bg-[#FCD116]"></div>
        <div className="h-full w-1/3 bg-[#CE1126]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Logo & Government Header */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div
              onClick={onShowCover}
              className={`flex items-center gap-3 ${onShowCover ? 'cursor-pointer group' : ''}`}
              title={onShowCover ? "Cliquer pour revoir l'animation de lancement PERMIS MALI" : undefined}
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#008543] group-hover:scale-105 group-hover:bg-emerald-100 transition">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5 group-hover:text-[#008543] transition">
                    PERMIS NUMÉRIQUE <span className="text-[#008543]">MALI</span>
                  </h1>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                    DNTT
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-normal">
                  Direction Nationale des Transports Terrestres
                </p>
              </div>
            </div>

            {/* Mobile Actions: Install App + Guide + Network indicator */}
            <div className="flex items-center gap-1.5 sm:hidden">
              {onOpenInstall && (
                <button
                  type="button"
                  id="btn-mobile-install-app"
                  onClick={onOpenInstall}
                  title="Installer sur le téléphone"
                  className="flex items-center gap-1 px-2 py-1 bg-[#008543] text-white rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Installer</span>
                </button>
              )}
              {onOpenGuide && (
                <button
                  type="button"
                  onClick={onOpenGuide}
                  title="Guide Citoyen & FAQ"
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                >
                  <HelpCircle className="w-4 h-4 text-[#008543]" />
                </button>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  isQuotaExceeded
                    ? 'bg-sky-50 text-sky-800 border border-sky-200'
                    : isOnline
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {isQuotaExceeded ? (
                  <>
                    <Shield className="w-3 h-3 text-sky-600" />
                    <span>Local</span>
                  </>
                ) : isOnline ? (
                  <>
                    <Wifi className="w-3 h-3 text-[#008543]" />
                    <span>En ligne</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-amber-600" />
                    <span>Hors-ligne</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Role Navigation Tabs (Desktop only; on mobile the bottom navigation bar is used) */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 justify-center">
            <button
              id="tab-driver-portal"
              onClick={() => onSelectRole('driver')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'driver'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${currentRole === 'driver' ? 'bg-[#008543]' : 'bg-slate-300'}`}></div>
              <QrCode className="w-3.5 h-3.5" />
              <span>Conducteur</span>
            </button>

            <button
              id="tab-officer-scanner"
              onClick={() => onSelectRole('officer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                currentRole === 'officer'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${currentRole === 'officer' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
              <ScanLine className="w-3.5 h-3.5" />
              <span>Contrôle Police</span>
              {pendingViolationsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
              )}
            </button>

            <button
              id="tab-admin-portal"
              onClick={() => onSelectRole('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'admin'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${currentRole === 'admin' ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              <Building2 className="w-3.5 h-3.5" />
              <span>DNTT Admin</span>
            </button>
          </div>

          {/* Desktop Right Actions: Install App, Guide, Network, Sync, Profile */}
          <div className="hidden sm:flex items-center gap-2">
            {onOpenInstall && (
              <button
                type="button"
                id="btn-header-install-app"
                onClick={onOpenInstall}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#008543] hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                title="Installer sur le téléphone ou le PC"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Installer l'App</span>
              </button>
            )}

            {onOpenGuide && (
              <button
                type="button"
                id="btn-open-citizen-guide"
                onClick={onOpenGuide}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg text-xs font-bold transition shadow-2xs"
                title="Guide Citoyen & FAQ Officielle"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#008543]" />
                <span>Guide & FAQ</span>
              </button>
            )}

            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
                isQuotaExceeded
                  ? 'bg-sky-50 text-sky-800 border-sky-200'
                  : isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isQuotaExceeded ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-sky-600" />
                  <span>Mode Autonome (Local)</span>
                </>
              ) : isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-[#008543]" />
                  <span>Firebase Connecté</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mode Hors-Ligne</span>
                </>
              )}
            </span>

            {onRefreshData && (
              <button
                id="btn-refresh-data"
                onClick={onRefreshData}
                title="Actualiser les données"
                className="p-1.5 text-slate-500 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              id="btn-user-auth"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 transition cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5 text-[#008543]" />
              <span className="max-w-[120px] truncate">
                {currentUserEmail ? currentUserEmail.split('@')[0] : 'Profils'}
              </span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

