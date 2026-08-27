import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, User, RefreshCw, Check, AlertCircle } from 'lucide-react';

interface PhotoUploaderProps {
  photoUrl: string;
  onChange: (photoUrl: string) => void;
  label?: string;
  required?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photoUrl,
  onChange,
  label = "Photo d'identité biométrique",
  required = false,
}) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Resize and compress image to keep database size optimal and fast
  const processAndSetImage = (dataUrl: string) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Standard passport photo aspect ratio (approx 3:4)
      const targetWidth = 320;
      const targetHeight = 400;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Calculate crop to fill
        const scale = Math.max(targetWidth / img.width, targetHeight / img.height);
        const x = (targetWidth - img.width * scale) / 2;
        const y = (targetHeight - img.height * scale) / 2;
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Convert to high quality compressed JPEG data URL (< 60KB)
        const compressed = canvas.toDataURL('image/jpeg', 0.85);
        onChange(compressed);
      } else {
        onChange(dataUrl);
      }
    };
    img.src = dataUrl;
  };

  // Handle local file selection (from phone gallery or PC disk)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        processAndSetImage(result);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be re-selected if needed
    e.target.value = '';
  };

  // Start live webcam / smartphone camera
  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError(
        'Impossible d\'accéder à la caméra. Vérifiez les autorisations de votre navigateur ou téléversez un fichier depuis votre galerie.'
      );
      setIsCameraActive(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  // Capture frame from live video stream
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // If front camera, flip horizontally for natural mirror feel
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      processAndSetImage(dataUrl);
    }
    stopCamera();
  };

  // Toggle front/rear camera on phones
  const toggleFacingMode = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-[#008543]" />
          <span>{label}</span>
          {required && <span className="text-rose-500">*</span>}
        </label>

        {photoUrl && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 transition cursor-pointer"
            title="Effacer la photo"
          >
            <Trash2 className="w-3 h-3" />
            <span>Supprimer la photo</span>
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
        
        {/* Live Camera Stream Modal View */}
        {isCameraActive ? (
          <div className="space-y-3">
            <div className="relative w-full max-w-sm mx-auto aspect-[3/4] bg-slate-900 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center border-2 border-emerald-500">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />

              {/* Passport Biometric Oval Guideline */}
              <div className="absolute inset-0 border-2 border-dashed border-white/50 rounded-full m-8 pointer-events-none flex items-center justify-center">
                <span className="text-[10px] text-white/80 font-semibold bg-black/40 px-2 py-0.5 rounded-full">
                  Cadrez le visage
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={capturePhoto}
                className="px-4 py-2 bg-[#008543] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Prendre la photo</span>
              </button>

              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-xs transition cursor-pointer"
                title="Changer de caméra"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={stopCamera}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          /* Normal Preview & Action Buttons View */
          <div className="flex flex-col sm:flex-row items-center gap-4">
            
            {/* Avatar / Photo Thumbnail */}
            <div className="relative w-20 h-24 sm:w-24 sm:h-30 rounded-2xl overflow-hidden border-2 border-slate-300 shrink-0 bg-white shadow-xs flex items-center justify-center">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Aperçu photo d'identité"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300 p-2 text-center">
                  <User className="w-10 h-10 text-slate-400 stroke-1" />
                  <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase leading-tight">
                    Aucune photo
                  </span>
                </div>
              )}

              {/* Watermark badge */}
              <div className="absolute bottom-1 right-1 bg-[#008543] text-yellow-300 text-[8px] font-bold px-1 rounded">
                DNTT
              </div>
            </div>

            {/* Controls */}
            <div className="flex-1 space-y-2 w-full text-center sm:text-left">
              <p className="text-xs text-slate-600 leading-snug">
                {photoUrl ? (
                  <span className="text-emerald-800 font-semibold flex items-center justify-center sm:justify-start gap-1">
                    <Check className="w-3.5 h-3.5 text-[#008543]" />
                    Photo d'identité chargée avec succès.
                  </span>
                ) : (
                  <span>
                    Vous pouvez <strong>téléverser une photo</strong> depuis vos fichiers ou la <strong>prendre directement avec votre caméra</strong>.
                  </span>
                )}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                {/* File Upload Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#008543] hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{photoUrl ? 'Remplacer le fichier' : 'Choisir un fichier (Galerie / PC)'}</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Camera Capture Button */}
                <button
                  type="button"
                  onClick={() => startCamera('user')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-[#008543]" />
                  <span>Prendre en photo</span>
                </button>
              </div>

              {cameraError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[11px]">{cameraError}</span>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
