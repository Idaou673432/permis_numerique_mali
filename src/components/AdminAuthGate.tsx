import React, { useState } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Building2,
  AlertCircle,
  CheckCircle2,
  Phone,
  UserCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AdminUser } from '../types';
import { authenticateAdmin } from '../lib/firebase';

interface AdminAuthGateProps {
  onAuthenticated: (admin: AdminUser) => void;
  onCancel?: () => void;
}

export const AdminAuthGate: React.FC<AdminAuthGateProps> = ({
  onAuthenticated,
  onCancel,
}) => {
  const [authMode, setAuthMode] = useState<'pin' | 'credentials'>('pin');
  const [pinCode, setPinCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick unlock using standard 00223 code
  const handleQuickUnlock = async (codeToUse: string = '00223') => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await authenticateAdmin(codeToUse);
      if (res.success && res.admin) {
        onAuthenticated(res.admin);
      } else {
        setErrorMessage(res.error || 'Authentification échouée.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Erreur de connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinCode.trim()) {
      setErrorMessage('Veuillez saisir le code de sécurité.');
      return;
    }
    await handleQuickUnlock(pinCode.trim());
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Veuillez renseigner votre identifiant et votre code PIN.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await authenticateAdmin(username.trim(), password.trim());
      if (res.success && res.admin) {
        onAuthenticated(res.admin);
      } else {
        setErrorMessage(res.error || 'Identifiant ou mot de passe incorrect.');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Erreur lors de la vérification.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl text-slate-900 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Official Header */}
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#008543] flex items-center justify-center shadow-xs">
          <Building2 className="w-8 h-8" />
        </div>
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200 uppercase tracking-wider mb-1.5">
            <Lock className="w-3 h-3 text-[#008543]" />
            Accès Restreint & Sécurisé
          </span>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Portail Administration DNTT
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Direction Nationale des Transports Terrestres — République du Mali
          </p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="mt-6 flex bg-slate-100 p-1 rounded-2xl">
        <button
          type="button"
          onClick={() => {
            setAuthMode('pin');
            setErrorMessage(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            authMode === 'pin'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5 text-[#008543]" />
          <span>Code PIN</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setAuthMode('credentials');
            setErrorMessage(null);
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            authMode === 'credentials'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 text-[#008543]" />
          <span>Identifiant Agent</span>
        </button>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Form: PIN Mode */}
      {authMode === 'pin' && (
        <form onSubmit={handlePinSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span>Code secret DNTT :</span>
              <span className="text-[10px] text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                Saisie Sécurisée
              </span>
            </label>
            <div className="relative">
              <input
                id="admin-input-pincode"
                type={showPassword ? 'text' : 'password'}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-center text-lg font-mono tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:text-sm placeholder:tracking-normal focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="btn-submit-admin-pin"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#008543] hover:bg-[#007038] disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            {isLoading ? (
              <span>Vérification sécurisée en cours...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Accéder au Portail Administrateur</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Form: Credentials Mode */}
      {authMode === 'credentials' && (
        <form onSubmit={handleCredentialsSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Identifiant / Matricule ou N° Téléphone :
            </label>
            <input
              id="admin-input-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: admin, agent_sikasso ou +223 70 00 22 33"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Code PIN / Mot de passe :</span>
              <span className="text-[10px] text-slate-400">Confidentiel</span>
            </label>
            <div className="relative">
              <input
                id="admin-input-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                title={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            id="btn-submit-admin-credentials"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#008543] hover:bg-[#007038] disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold rounded-2xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            {isLoading ? (
              <span>Authentification en cours...</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Se Connecter</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* Security Footer Note */}
      <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-1.5">
        <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-[#008543]" />
          Chiffrement ECDSA P-256 & Authentification Sécurisée DNTT
        </p>
      </div>

    </div>
  );
};
