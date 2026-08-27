import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

interface InstallPwaBannerProps {
  onOpenInstallModal: () => void;
}

export const InstallPwaBanner: React.FC<InstallPwaBannerProps> = ({ onOpenInstallModal }) => {
  const { isInstalled, isInstallable, isIOS, triggerInstall } = usePWA();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('dntt_pwa_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('dntt_pwa_banner_dismissed', 'true');
  };

  // If already installed or dismissed, do not render banner
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleQuickInstall = async () => {
    if (isInstallable) {
      const success = await triggerInstall();
      if (!success) {
        onOpenInstallModal();
      }
    } else {
      onOpenInstallModal();
    }
  };

  return (
    <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-emerald-950 text-white px-4 py-2.5 sm:py-3 shadow-md relative z-30">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center shrink-0 border border-emerald-400/40 shadow-inner">
            <img
              src="/app_launch_cover.jpg"
              alt="Permis Mali Logo"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left">
            <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
              <span>Installer l'application sur votre téléphone</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-400/30">
                100% Hors-Ligne
              </span>
            </p>
            <p className="text-[11px] text-slate-300 hidden sm:block">
              Accédez à votre permis de conduire et présentez le QR code au contrôle même sans connexion Internet.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            id="btn-banner-install-app"
            onClick={handleQuickInstall}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#008543] hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstallable ? 'Installer en 1 clic' : 'Installer l\'App'}</span>
          </button>

          <button
            onClick={onOpenInstallModal}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer hidden md:flex items-center gap-1"
          >
            <span>Détails</span>
            <ChevronRight className="w-3 h-3" />
          </button>

          <button
            onClick={handleDismiss}
            title="Masquer"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
};
