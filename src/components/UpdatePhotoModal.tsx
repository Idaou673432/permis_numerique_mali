import React, { useState, useEffect } from 'react';
import { DriverLicense } from '../types';
import { saveDriverLicense } from '../lib/firebase';
import { PhotoUploader } from './PhotoUploader';
import { X, Camera, Save, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface UpdatePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  license: DriverLicense;
  onPhotoUpdated: (updatedLicense: DriverLicense) => void;
}

export const UpdatePhotoModal: React.FC<UpdatePhotoModalProps> = ({
  isOpen,
  onClose,
  license,
  onPhotoUpdated,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string>(license.photoUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhotoUrl(license.photoUrl || '');
      setErrorMessage(null);
    }
  }, [isOpen, license.photoUrl, license.id]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updated: DriverLicense = {
        ...license,
        photoUrl: photoUrl.trim(),
        updatedAt: new Date().toISOString(),
        signature: undefined, // Re-signs with updated payload
      };

      await saveDriverLicense(updated);
      onPhotoUpdated(updated);
      onClose();
    } catch (err: any) {
      console.error('Erreur mise à jour photo:', err);
      setErrorMessage('Erreur lors de l\'enregistrement : ' + (err.message || 'Impossible de sauvegarder'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#008543] flex items-center justify-center font-bold">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Photo d'Identité du Permis
              </h3>
              <p className="text-[11px] text-slate-500 font-medium truncate max-w-[240px]">
                {license.fullName} ({license.licenseNumber})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <PhotoUploader
            photoUrl={photoUrl}
            onChange={(url) => setPhotoUrl(url)}
            label="Nouvelle photo d'identité (Caméra ou Fichier)"
          />

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#008543] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer la photo'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
