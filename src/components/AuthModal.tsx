import React, { useState } from 'react';
import { UserRole } from '../types';
import { auth } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  X,
  Shield,
  User,
  ShieldAlert,
  Building2,
  Lock,
  Mail,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: UserRole) => void;
  currentRole: UserRole;
  currentUserEmail?: string | null;
  onAuthSuccess: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSelectRole,
  currentRole,
  currentUserEmail,
  onAuthSuccess,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFirebaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      if (isSignUp) {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        onAuthSuccess(res.user.email || email);
      } else {
        const res = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess(res.user.email || email);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Échec de connexion Firebase.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoleSelect = (role: UserRole, mockEmail: string) => {
    onSelectRole(role);
    onAuthSuccess(mockEmail);
    onClose();
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onAuthSuccess('');
    } catch (e) {
      // Ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full text-slate-900 space-y-6 shadow-xl relative animate-in fade-in zoom-in-95">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 hover:bg-slate-200 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title & Crest */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#008543] flex items-center justify-center mx-auto mb-2">
            <Shield className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Espace d'Authentification DNTT</h3>
          <p className="text-xs text-slate-500">
            Sélectionnez un profil préconfiguré ou connectez-vous avec Firebase
          </p>
        </div>

        {/* Quick Profile Selection */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Connexion Rapide (Profils Démo)
          </span>

          <div className="space-y-2">
            <button
              onClick={() => handleQuickRoleSelect('driver', 'mamadou.keita@citoyen.ml')}
              className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                currentRole === 'driver'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Mamadou Keïta (Conducteur)</h4>
                  <p className="text-[10px] text-slate-500">Accès au titre de conduite et QR code</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                Citoyen
              </span>
            </button>

            <button
              onClick={() => handleQuickRoleSelect('officer', 'brigadier.diarra@police.ml')}
              className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                currentRole === 'officer'
                  ? 'bg-amber-50 border-amber-500 text-amber-900'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Brigadier O. Diarra (Police)</h4>
                  <p className="text-[10px] text-slate-500">Scanner de contrôle & PV d'infractions</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                Contrôle
              </span>
            </button>

            <button
              onClick={() => handleQuickRoleSelect('admin', 'directeur@dntt.gouv.ml')}
              className={`w-full p-3 rounded-2xl border text-left transition flex items-center justify-between ${
                currentRole === 'admin'
                  ? 'bg-blue-50 border-blue-500 text-blue-900'
                  : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Direction DNTT (Administration)</h4>
                  <p className="text-[10px] text-slate-500">Délivrance, révocation & clés ECDSA</p>
                </div>
              </div>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                Admin
              </span>
            </button>
          </div>
        </div>

        {/* Current user session info */}
        {currentUserEmail && (
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600">Connecté en tant que: <strong className="text-slate-900">{currentUserEmail}</strong></span>
            <button
              onClick={handleSignOut}
              className="text-rose-600 hover:text-rose-700 font-semibold"
            >
              Déconnexion
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
