import React from 'react';
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  WifiOff,
  Zap,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, triggerInstall } = usePWA();
  const [installing, setInstalling] = React.useState(false);
  const [justInstalled, setJustInstalled] = React.useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setInstalling(true);
    const success = await triggerInstall();
    setInstalling(false);
    if (success) {
      setJustInstalled(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Top Mali Flag Stripe */}
        <div className="h-1.5 w-full flex">
          <div className="h-full w-1/3 bg-[#008543]"></div>
          <div className="h-full w-1/3 bg-[#FCD116]"></div>
          <div className="h-full w-1/3 bg-[#CE1126]"></div>
        </div>

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between bg-radial from-emerald-50/50 via-white to-white">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#008543] text-white flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Installer l'Application Mobile
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                  PWA DNTT
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Permis Numérique République du Mali
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Key Advantages Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#008543] flex items-center justify-center mb-2">
                <WifiOff className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">100% Hors-Ligne</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                Toujours accessible sans connexion Internet ni forfait.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-2">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Accès Instantané</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                Icône sur votre écran d'accueil comme une application native.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col items-center text-center">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center mb-2">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Certifié DNTT</h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                Signature cryptographique ECDSA P-256 infalsifiable.
              </p>
            </div>
          </div>

          {/* If already installed */}
          {isInstalled || justInstalled ? (
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-[#008543] mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">
                Application déjà installée sur cet appareil !
              </h4>
              <p className="text-xs text-emerald-800">
                Vous pouvez ouvrir le Permis Numérique directement depuis l'écran d'accueil de votre téléphone.
              </p>
            </div>
          ) : isInstallable ? (
            /* Direct Native Install for Android / Chrome / Edge */
            <div className="space-y-3">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
                  <Sparkles className="w-4 h-4 text-[#008543]" />
                  <span>Installation automatique en 1 clic</span>
                </div>
                <p className="text-xs text-slate-600">
                  Cliquez sur le bouton ci-dessous pour ajouter l'application officielle du Permis Malien à vos applications mobiles.
                </p>
              </div>

              <button
                id="btn-confirm-pwa-install"
                onClick={handleInstallClick}
                disabled={installing}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 bg-[#008543] hover:bg-emerald-800 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-800/20 transition cursor-pointer disabled:opacity-70"
              >
                <Download className="w-5 h-5" />
                <span>{installing ? 'Installation en cours...' : 'Installer sur mon téléphone'}</span>
              </button>
            </div>
          ) : isIOS ? (
            /* Specific Step-by-Step for iOS Safari */
            <div className="space-y-3.5">
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Smartphone className="w-4 h-4" />
                  <span>Guide d'installation pour iPhone & iPad (Safari)</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Suivez ces 2 étapes simples dans le navigateur Safari :
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Share className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">Étape 1 : </span>
                    <span className="text-slate-600">
                      Appuyez sur le bouton <strong>Partager</strong> en bas de l'écran dans Safari.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#008543] flex items-center justify-center shrink-0">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-900">Étape 2 : </span>
                    <span className="text-slate-600">
                      Faites défiler vers le bas et sélectionnez <strong>« Sur l'écran d'accueil »</strong> (ou <em>Add to Home Screen</em>).
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Generic Guide for other browsers / desktop */
            <div className="space-y-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-[#008543]" />
                  <span>Installation manuelle depuis votre navigateur</span>
                </h4>
                <p className="text-xs text-slate-600">
                  1. Ouvrez le menu de votre navigateur (les 3 points en haut à droite <strong>⋮</strong>).<br />
                  2. Sélectionnez <strong>« Installer l'application »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.<br />
                  3. Confirmez pour profiter de l'expérience plein écran et hors-ligne.
                </p>
              </div>

              {/* Retry Install Trigger */}
              <button
                id="btn-retry-pwa-install"
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Tenter l'installation automatique</span>
              </button>
            </div>
          )}

          {/* Offline Security Note */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-900 leading-relaxed">
              <strong>Contrôle routier garanti sans réseau :</strong> Une fois installée, l'application fonctionne de manière autonome en brousse ou en ville même en l'absence de réseau GSM.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            DNTT Mali • Version 1.2
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
};
