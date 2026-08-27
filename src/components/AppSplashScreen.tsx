import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Sparkles, ArrowRight, CheckCircle2, Lock } from 'lucide-react';

interface AppSplashScreenProps {
  onComplete: () => void;
  autoDismissMs?: number;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  onComplete,
  autoDismissMs = 3200,
}) => {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Step progression animation
    const timer1 = setTimeout(() => setStep(1), 600);
    const timer2 = setTimeout(() => setStep(2), 1400);
    const timer3 = setTimeout(() => setStep(3), 2200);

    // Progress bar animation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2;
      });
    }, autoDismissMs / 50);

    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      onComplete();
    }, autoDismissMs);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(dismissTimer);
      clearInterval(interval);
    };
  }, [autoDismissMs, onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950 text-white overflow-hidden select-none"
      >
        {/* Background Image with animated subtle zoom and dark gradient overlay */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.img
            src="/app_launch_cover.jpg"
            alt="Permis Mali Cover"
            className="w-full h-full object-cover object-center"
            initial={{ scale: 1.15, filter: 'blur(4px)' }}
            animate={{ scale: 1.0, filter: 'blur(0px)' }}
            transition={{ duration: 3.5, ease: 'easeOut' }}
            onError={(e) => {
              // Fallback to relative path if needed
              (e.target as HTMLImageElement).src = './assets/images/app_launch_cover_1787846617815.jpg';
            }}
          />
          {/* Subtle Vignette & Mali Gradient Tints */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/60" />
          <div className="absolute inset-0 bg-radial from-transparent via-transparent to-black/80" />
        </div>

        {/* Mali Tricolor Top Border Accent */}
        <div className="relative z-10 w-full flex h-1.5 shrink-0">
          <div className="flex-1 bg-[#008543]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#CE1126]" />
        </div>

        {/* Top Header Badge */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative z-10 pt-6 px-4 text-center max-w-sm"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/20 shadow-lg text-[11px] font-semibold text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>RÉPUBLIQUE DU MALI • DNTT</span>
          </div>
        </motion.div>

        {/* Center Animated Crest Focal Area */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 my-auto max-w-md w-full">
          {/* Golden Aura Ring around the central badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8, type: 'spring' }}
            className="relative"
          >
            <div className="absolute -inset-4 bg-radial from-amber-400/30 via-emerald-500/10 to-transparent rounded-full blur-xl animate-pulse" />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="mt-2"
          >
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
              PERMIS <span className="text-[#FCD116]">MALI</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 mt-1 font-medium tracking-wide drop-shadow">
              VOTRE PERMIS, PARTOUT, TOUT LE TEMPS
            </p>
          </motion.div>

          {/* Security & System Readiness Steps */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            className="mt-6 w-full space-y-2 bg-black/40 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 text-left"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-2 text-slate-200">
                {step >= 1 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 animate-pulse" />
                )}
                <span>Chiffrement ECDSA P-256 National</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {step >= 1 ? 'ACTIF' : '...'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-2 text-slate-200">
                {step >= 2 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0 animate-pulse" />
                )}
                <span>Intégrité & Cache Hors-Ligne DNTT</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {step >= 2 ? 'SYNCHRO' : '...'}
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="flex items-center gap-2 text-slate-200">
                {step >= 3 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0 animate-pulse" />
                )}
                <span>QR Code Biométrique Sécurisé</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {step >= 3 ? 'PRÊT' : '...'}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Loading Progress & Launch Button */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative z-10 w-full max-w-md px-6 pb-8 space-y-4"
        >
          {/* Animated Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-300 font-medium">
              <span>Initialisation sécurisée...</span>
              <span className="font-mono text-emerald-400">{progress}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-xs">
              <motion.div
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-400 rounded-full"
                style={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
          </div>

          {/* Interactive Enter / Skip Button */}
          <button
            type="button"
            id="btn-splash-launch"
            onClick={onComplete}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-[#008543] to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 active:scale-[0.98] text-white rounded-2xl font-bold text-sm shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 border border-emerald-400/40 transition cursor-pointer"
          >
            <span>Accéder à l'application</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
