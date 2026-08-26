import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { DriverLicense, VerificationResult, Violation, InfractionTemplate, OfflineActivityLog } from '../types';
import { verifyQRPayload, generateQRPayload } from '../lib/crypto';
import { OFFICIAL_INFRACTIONS } from '../data/seedData';
import {
  recordViolation,
  syncPendingViolations,
  recordLocalActivityLog,
  getLocalActivityLogs,
  clearLocalActivityLogs,
  syncPendingActivityLogs,
} from '../lib/firebase';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  RotateCw,
  Upload,
  UserCheck,
  FileWarning,
  MapPin,
  Car,
  BadgeAlert,
  Save,
  RefreshCw,
  Sparkles,
  Search,
  KeyRound,
  Eye,
  FileText,
  UserX,
  CreditCard,
  Printer,
  ChevronRight,
  Moon,
  Sun,
  ClipboardList,
  History,
  Download,
  Trash2,
  Filter,
  Check,
  Clock,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OfficerScannerProps {
  allLicenses: DriverLicense[];
  isOnline: boolean;
  onViolationRecorded: () => void;
  pendingViolationsCount: number;
}

export const OfficerScanner: React.FC<OfficerScannerProps> = ({
  allLicenses,
  isOnline,
  onViolationRecorded,
  pendingViolationsCount,
}) => {
  // Navigation & Control Mode
  const [controlMode, setControlMode] = useState<'id' | 'qr'>('id');
  const [idInput, setIdInput] = useState('');

  // Tactical Night Mode & Shift Stats
  const [isNightMode, setIsNightMode] = useState(false);
  const [sessionChecksCount, setSessionChecksCount] = useState(0);
  const [sessionValidCount, setSessionValidCount] = useState(0);
  const [sessionViolationsCount, setSessionViolationsCount] = useState(0);

  // Offline Activity Logs State
  const [activityLogs, setActivityLogs] = useState<OfflineActivityLog[]>(() => getLocalActivityLogs());
  const [showActivityLogModal, setShowActivityLogModal] = useState(false);
  const [logFilterStatus, setLogFilterStatus] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [isSyncingLogs, setIsSyncingLogs] = useState(false);

  // Camera & Scan State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [scannedLicenseDetails, setScannedLicenseDetails] = useState<DriverLicense | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showViolationForm, setShowViolationForm] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sanction & Roadside Infraction Form State
  const [selectedInfraction, setSelectedInfraction] = useState<InfractionTemplate>(OFFICIAL_INFRACTIONS[0]);
  const [vehiclePlate, setVehiclePlate] = useState('ML-');
  const [sanctionDriverName, setSanctionDriverName] = useState('');
  const [sanctionLicenseNumber, setSanctionLicenseNumber] = useState('');
  const [sanctionNina, setSanctionNina] = useState('');
  const [location, setLocation] = useState('Bamako - Pont des Martyrs (Axe Rive Gauche)');
  const [officerBadge, setOfficerBadge] = useState('BKO-PN-4092');
  const [officerName, setOfficerName] = useState('Brigadier-Chef O. Diarra');
  const [violationNotes, setViolationNotes] = useState('');
  const [infractionSavedMessage, setInfractionSavedMessage] = useState<string | null>(null);

  // Video & Canvas Refs for live QR scanning
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sound beep feedback using Web Audio API
  const playFeedbackSound = (type: 'success' | 'warning' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.setValueAtTime(370, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.setValueAtTime(160, audioCtx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      // Audio context might be restricted
    }
  };

  // 1. VERIFY BY UNIQUE LICENSE ID (OR NINA)
  const handleVerifyById = async (targetIdQuery?: string) => {
    const rawQuery = (targetIdQuery !== undefined ? targetIdQuery : idInput).trim();
    if (!rawQuery) {
      alert('Veuillez saisir un numéro de permis (ID Unique) ou un numéro NINA.');
      return;
    }

    setIsVerifying(true);
    setInfractionSavedMessage(null);
    setShowViolationForm(false);

    // Simulate cryptographic local registry search
    await new Promise((r) => setTimeout(r, 250));

    const normalized = rawQuery.toLowerCase();
    const foundLicense = allLicenses.find(
      (lic) =>
        lic.licenseNumber.toLowerCase() === normalized ||
        lic.nina.toLowerCase() === normalized ||
        lic.id.toLowerCase() === normalized
    );

    if (foundLicense) {
      setScannedLicenseDetails(foundLicense);
      setSanctionLicenseNumber(foundLicense.licenseNumber);
      setSanctionDriverName(foundLicense.fullName);
      setSanctionNina(foundLicense.nina);

      const isDateExpired = new Date(foundLicense.expiryDate).getTime() < Date.now();

      if (foundLicense.status === 'suspended' || foundLicense.status === 'revoked') {
        setVerificationResult({
          status: 'suspended',
          isSignatureValid: true,
          isExpired: isDateExpired,
          message: 'Permis SUSPENDU ou RÉVOQUÉ par décision administrative DNTT',
          details: `Motif : Titre sous le coup d'une suspension ou solde de points épuisé (${foundLicense.points ?? 0}/12 pts). Conduite interdite.`,
          verifiedAt: new Date().toISOString(),
          fullLicense: foundLicense,
        });
        // Preselect suspension sanction
        const inf = OFFICIAL_INFRACTIONS.find((i) => i.code === 'INF-013') || OFFICIAL_INFRACTIONS[0];
        setSelectedInfraction(inf);
        playFeedbackSound('warning');
        setSessionChecksCount((c) => c + 1);

        // Record in Offline Activity Journal
        recordLocalActivityLog({
          method: 'id_lookup',
          licenseNumber: foundLicense.licenseNumber,
          driverName: foundLicense.fullName,
          nina: foundLicense.nina,
          status: 'suspended',
          isSignatureValid: true,
          points: foundLicense.points ?? 0,
          officerBadge,
          officerName,
          location,
          details: `Permis suspendu/révoqué (${foundLicense.points ?? 0}/12 pts). Recherche ID: ${rawQuery}`,
        });
        setActivityLogs(getLocalActivityLogs());
      } else if (foundLicense.status === 'expired' || isDateExpired) {
        setVerificationResult({
          status: 'expired',
          isSignatureValid: true,
          isExpired: true,
          message: 'Permis EXPIRÉ — Date de validité échue',
          details: `Date d'expiration dépassée depuis le ${foundLicense.expiryDate}. Le conducteur n'a pas renouvelé son titre.`,
          verifiedAt: new Date().toISOString(),
          fullLicense: foundLicense,
        });
        // Preselect expired license sanction
        const inf = OFFICIAL_INFRACTIONS.find((i) => i.code === 'INF-012') || OFFICIAL_INFRACTIONS[0];
        setSelectedInfraction(inf);
        playFeedbackSound('warning');
        setSessionChecksCount((c) => c + 1);

        // Record in Offline Activity Journal
        recordLocalActivityLog({
          method: 'id_lookup',
          licenseNumber: foundLicense.licenseNumber,
          driverName: foundLicense.fullName,
          nina: foundLicense.nina,
          status: 'expired',
          isSignatureValid: true,
          points: foundLicense.points ?? 12,
          officerBadge,
          officerName,
          location,
          details: `Permis expiré le ${foundLicense.expiryDate}. Recherche ID: ${rawQuery}`,
        });
        setActivityLogs(getLocalActivityLogs());
      } else {
        // Active & Valid!
        setVerificationResult({
          status: 'valid',
          isSignatureValid: true,
          isExpired: false,
          message: 'PERMIS VALIDE & EN RÈGLE (ID RECONNU DNTT MALI)',
          details: `Titre officiel authentifié pour ${foundLicense.fullName}. Solde de points : ${foundLicense.points ?? 12}/12 pts. Aucune sanction requise.`,
          verifiedAt: new Date().toISOString(),
          fullLicense: foundLicense,
        });
        playFeedbackSound('success');
        setSessionChecksCount((c) => c + 1);
        setSessionValidCount((c) => c + 1);
        confetti({
          particleCount: 45,
          spread: 65,
          origin: { y: 0.65 },
          colors: ['#008543', '#FCD116', '#10b981'],
        });

        // Record in Offline Activity Journal
        recordLocalActivityLog({
          method: 'id_lookup',
          licenseNumber: foundLicense.licenseNumber,
          driverName: foundLicense.fullName,
          nina: foundLicense.nina,
          status: 'valid',
          isSignatureValid: true,
          points: foundLicense.points ?? 12,
          officerBadge,
          officerName,
          location,
          details: `Contrôle conforme - Titre valide ${foundLicense.points ?? 12}/12 pts. Recherche ID: ${rawQuery}`,
        });
        setActivityLogs(getLocalActivityLogs());
      }
    } else {
      // ID NOT FOUND / UNKNOWN / FAKE
      setScannedLicenseDetails(null);
      setSanctionLicenseNumber(rawQuery.toUpperCase());
      setSanctionDriverName('Conducteur non identifié');
      setSanctionNina('NON COMMUNIQUÉ');

      setVerificationResult({
        status: 'invalid',
        isSignatureValid: false,
        isExpired: false,
        message: `ID UNIQUE INVALIDE OU NON ENREGISTRÉ : "${rawQuery.toUpperCase()}"`,
        details: 'Aucun enregistrement ne correspond à cet identifiant dans le registre central de la DNTT Mali. Risque de faux permis ou conduite sans titre.',
        verifiedAt: new Date().toISOString(),
      });

      // Preselect Conduite sans permis / Faux titre
      const inf = OFFICIAL_INFRACTIONS.find((i) => i.code === 'INF-011') || OFFICIAL_INFRACTIONS[0];
      setSelectedInfraction(inf);
      playFeedbackSound('error');
      setSessionChecksCount((c) => c + 1);

      // Record in Offline Activity Journal
      recordLocalActivityLog({
        method: 'id_lookup',
        licenseNumber: rawQuery.toUpperCase(),
        driverName: 'Conducteur non identifié',
        status: 'invalid',
        isSignatureValid: false,
        officerBadge,
        officerName,
        location,
        details: `Identifiant inconnu dans le registre DNTT: ${rawQuery}`,
      });
      setActivityLogs(getLocalActivityLogs());
    }

    setIsVerifying(false);
  };

  // 2. CAMERA SCANNER HANDLERS
  const startCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Votre navigateur ne prend pas en charge l\'accès direct à la caméra. Vous pouvez contrôler par ID Unique ou importer une capture QR.'
      );
      setIsCameraActive(false);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch (idealErr: any) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        requestScanFrame();
      }
    } catch (err: any) {
      const errName = err?.name || '';
      const errMsg = err?.message || String(err);

      if (
        errName === 'NotAllowedError' ||
        errName === 'PermissionDeniedError' ||
        errMsg.toLowerCase().includes('dismissed') ||
        errMsg.toLowerCase().includes('permission') ||
        errMsg.toLowerCase().includes('denied')
      ) {
        setCameraError(
          'L\'accès à la caméra a été refusé ou annulé. Vous pouvez autoriser la caméra dans votre navigateur, vérifier par ID Unique ou importer une photo de QR code.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraError('Aucune caméra n\'a été détectée sur cet appareil.');
      } else {
        setCameraError(`Impossible de démarrer la caméra (${errName || errMsg}). Utilisez le contrôle par ID Unique.`);
      }
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const requestScanFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameId.current = requestAnimationFrame(requestScanFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code && code.data) {
      handleProcessQRData(code.data);
      stopCamera();
      return;
    }

    animationFrameId.current = requestAnimationFrame(requestScanFrame);
  };

  // Process and cryptographically verify QR Code Payload
  const handleProcessQRData = async (rawPayload: string) => {
    setIsVerifying(true);
    setInfractionSavedMessage(null);
    setShowViolationForm(false);

    const result = await verifyQRPayload(rawPayload);
    setVerificationResult(result);

    if (result.driverData) {
      const full = allLicenses.find(
        (l) => l.licenseNumber === result.driverData?.num || l.nina === result.driverData?.nina
      );
      setScannedLicenseDetails(full || null);
      setSanctionLicenseNumber(result.driverData.num);
      setSanctionDriverName(result.driverData.nom);
      setSanctionNina(result.driverData.nina);

      if (result.status === 'expired') {
        const inf = OFFICIAL_INFRACTIONS.find((i) => i.code === 'INF-012') || OFFICIAL_INFRACTIONS[0];
        setSelectedInfraction(inf);
      } else if (result.status === 'suspended') {
        const inf = OFFICIAL_INFRACTIONS.find((i) => i.code === 'INF-013') || OFFICIAL_INFRACTIONS[0];
        setSelectedInfraction(inf);
      }
    } else {
      setScannedLicenseDetails(null);
      setSanctionLicenseNumber('QR-INCONNU');
      setSanctionDriverName('Conducteur non identifié');
      setSanctionNina('NON DÉCLARÉ');
      const inf = OFFICIAL_INFRACTIONS.find((i) => i.code === 'INF-014') || OFFICIAL_INFRACTIONS[0];
      setSelectedInfraction(inf);
    }

    setIsVerifying(false);

    if (result.status === 'valid') {
      playFeedbackSound('success');
      setSessionChecksCount((c) => c + 1);
      setSessionValidCount((c) => c + 1);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#10b981', '#f59e0b', '#047857'],
      });
    } else if (result.status === 'suspended') {
      playFeedbackSound('warning');
      setSessionChecksCount((c) => c + 1);
    } else if (result.status === 'expired') {
      playFeedbackSound('warning');
      setSessionChecksCount((c) => c + 1);
    } else {
      playFeedbackSound('error');
      setSessionChecksCount((c) => c + 1);
    }

    // Record QR Inspection into Offline Activity Log
    recordLocalActivityLog({
      method: isCameraActive ? 'qr_camera' : 'qr_image',
      licenseNumber: result.driverData?.num || 'QR-NON-IDENTIFIÉ',
      driverName: result.driverData?.nom || 'Conducteur non identifié',
      nina: result.driverData?.nina,
      status: result.status,
      isSignatureValid: result.isSignatureValid,
      points: scannedLicenseDetails?.points ?? (result.driverData ? 12 : undefined),
      officerBadge,
      officerName,
      location,
      details: result.message || 'Contrôle par scan QR code cryptographique',
    });
    setActivityLogs(getLocalActivityLogs());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);

        if (code && code.data) {
          handleProcessQRData(code.data);
        } else {
          setVerificationResult({
            status: 'invalid',
            isSignatureValid: false,
            isExpired: false,
            message: 'Aucun code QR détecté sur cette image.',
            verifiedAt: new Date().toISOString(),
          });
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // 3. ROADSIDE SANCTION RECORDING
  const handleSaveViolation = async (e: React.FormEvent) => {
    e.preventDefault();

    const licenseNum = sanctionLicenseNumber || 'ID-INVALIDE';
    const driverNom = sanctionDriverName || 'Conducteur Non Identifié';
    const ninaNum = sanctionNina || 'NON RENSEIGNÉ';

    try {
      await recordViolation({
        licenseNumber: licenseNum,
        driverName: driverNom,
        nina: ninaNum,
        vehiclePlate: vehiclePlate.toUpperCase(),
        violationType: selectedInfraction.label,
        violationCategory: selectedInfraction.category,
        fineAmountFCFA: selectedInfraction.amountFCFA,
        pointsDeducted: selectedInfraction.points,
        location,
        city: 'Bamako',
        officerBadge,
        officerName,
        officerId: 'off-01',
        timestamp: new Date().toISOString(),
        notes: violationNotes,
        paymentStatus: 'unpaid',
      });

      setInfractionSavedMessage(
        `Procès-Verbal N° PV-${Date.now().toString().slice(-4)} dressé et enregistré avec succès (${selectedInfraction.amountFCFA.toLocaleString('fr-FR')} FCFA). Sanction appliquée.`
      );
      setShowViolationForm(false);
      onViolationRecorded();
    } catch (err: any) {
      alert('Erreur lors de l\'enregistrement de la sanction : ' + err.message);
    }
  };

  // 4. SYNC PENDING OFFLINE VIOLATIONS
  const handleSyncViolations = async () => {
    setIsSyncing(true);
    setSyncStatusMessage(null);
    try {
      const { syncedCount, errorCount } = await syncPendingViolations();
      if (errorCount === 0) {
        setSyncStatusMessage(`${syncedCount} infraction(s) synchronisée(s) avec succès vers la base centrale DNTT.`);
      } else {
        setSyncStatusMessage(`${syncedCount} synchronisée(s), ${errorCount} erreur(s).`);
      }
      onViolationRecorded();
    } catch (err: any) {
      setSyncStatusMessage(`Échec: ${err.message}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMessage(null), 5000);
    }
  };

  // 5. OFFLINE ACTIVITY LOGS HANDLERS
  const [logModalMessage, setLogModalMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isConfirmingClearLogs, setIsConfirmingClearLogs] = useState(false);

  const handleSyncLogs = async () => {
    setIsSyncingLogs(true);
    setLogModalMessage(null);
    try {
      const res = await syncPendingActivityLogs();
      setActivityLogs(getLocalActivityLogs());
      if (res.errorCount === 0) {
        setLogModalMessage({
          type: 'success',
          text: `${res.syncedCount} entrée(s) de vérification synchronisée(s) avec succès vers la base centrale DNTT.`,
        });
      } else {
        setLogModalMessage({
          type: 'info',
          text: `${res.syncedCount} synchronisée(s), ${res.errorCount} échec(s).`,
        });
      }
    } catch (e: any) {
      setLogModalMessage({
        type: 'error',
        text: 'Erreur lors de la synchronisation du journal : ' + e.message,
      });
    } finally {
      setIsSyncingLogs(false);
      setTimeout(() => setLogModalMessage(null), 6000);
    }
  };

  const handleExportLogsJSON = () => {
    if (activityLogs.length === 0) {
      setLogModalMessage({
        type: 'info',
        text: 'Le journal d\'activité est actuellement vide.',
      });
      setTimeout(() => setLogModalMessage(null), 4000);
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activityLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `journal_controles_${officerBadge}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearLogs = () => {
    clearLocalActivityLogs();
    setActivityLogs([]);
    setIsConfirmingClearLogs(false);
    setLogModalMessage({
      type: 'success',
      text: 'Journal d\'activité local réinitialisé avec succès.',
    });
    setTimeout(() => setLogModalMessage(null), 4000);
  };

  const filteredLogs = activityLogs.filter((log) => {
    if (logFilterStatus !== 'all' && log.status !== logFilterStatus) {
      return false;
    }
    if (logSearchQuery.trim()) {
      const q = logSearchQuery.toLowerCase();
      return (
        log.driverName.toLowerCase().includes(q) ||
        log.licenseNumber.toLowerCase().includes(q) ||
        (log.nina && log.nina.toLowerCase().includes(q)) ||
        log.location.toLowerCase().includes(q) ||
        log.officerBadge.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className={`max-w-4xl mx-auto space-y-6 transition-colors duration-200 ${isNightMode ? 'bg-slate-950 text-slate-100 p-4 rounded-3xl' : ''}`}>
      
      {/* Top Police Terminal Header */}
      <div className={`border rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs transition ${
        isNightMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                TERMINAL DE CONTRÔLE ROUTIER
              </h2>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                POLICE NATIONALE / GENDARMERIE
              </span>
            </div>
            <p className={`text-xs ${isNightMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Vérification immédiate par <strong>ID Unique de Permis</strong> ou <strong>Scan QR</strong> • Journal d'activité hors-ligne
            </p>
          </div>
        </div>

        {/* Toolbar: Night Mode, Activity Log & Sync */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* OFFLINE ACTIVITY LOG BUTTON */}
          <button
            type="button"
            id="btn-open-activity-log"
            onClick={() => {
              setActivityLogs(getLocalActivityLogs());
              setShowActivityLogModal(true);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition shadow-xs cursor-pointer ${
              isNightMode
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                : 'bg-emerald-50 hover:bg-emerald-100 text-[#008543] border-emerald-200'
            }`}
            title="Consulter le journal d'activité des vérifications hors-ligne"
          >
            <ClipboardList className="w-4 h-4" />
            <span>Journal d'activité</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
              isNightMode ? 'bg-amber-400/20 text-amber-300' : 'bg-[#008543] text-white'
            }`}>
              {activityLogs.length}
            </span>
          </button>

          {/* Night Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsNightMode(!isNightMode)}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
              isNightMode
                ? 'bg-amber-400 text-slate-950 border-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
            title="Mode Nuit / Haute Visibilité Nocturne"
          >
            {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{isNightMode ? 'Mode Jour' : 'Mode Nuit'}</span>
          </button>

          {/* Offline Queue Sync Card */}
          <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl ${
            isNightMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <span className="text-[9px] text-slate-400 block font-semibold">En attente</span>
              <span className="text-xs font-bold text-amber-500 font-mono">
                {pendingViolationsCount} PV
              </span>
            </div>

            <button
              id="btn-sync-violations"
              onClick={handleSyncViolations}
              disabled={isSyncing || pendingViolationsCount === 0 || !isOnline}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                pendingViolationsCount > 0 && isOnline
                  ? 'bg-[#008543] hover:bg-[#007038] text-white shadow-xs'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50'
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Envoi...' : 'Sync'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Roadside Shift Statistics Bar */}
      <div className={`grid grid-cols-3 gap-3 p-3 rounded-2xl border text-center text-xs ${
        isNightMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="p-2 rounded-xl bg-slate-500/10">
          <span className="text-[10px] text-slate-400 block font-medium">Contrôles Session</span>
          <span className="text-base font-extrabold text-slate-800 dark:text-white font-mono">
            {sessionChecksCount}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-emerald-500/10">
          <span className="text-[10px] text-emerald-600 block font-medium">Permis Conformes</span>
          <span className="text-base font-extrabold text-[#008543] font-mono">
            {sessionValidCount}
          </span>
        </div>
        <div className="p-2 rounded-xl bg-amber-500/10">
          <span className="text-[10px] text-amber-600 block font-medium">Anomalies / PV</span>
          <span className="text-base font-extrabold text-amber-600 font-mono">
            {sessionChecksCount - sessionValidCount}
          </span>
        </div>
      </div>

      {syncStatusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#008543] shrink-0" />
          <span>{syncStatusMessage}</span>
        </div>
      )}

      {/* VERIFICATION MODES TABS */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 gap-1.5">
        <button
          id="tab-control-id"
          type="button"
          onClick={() => {
            setControlMode('id');
            stopCamera();
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
            controlMode === 'id'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 text-emerald-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <KeyRound className="w-4 h-4 text-[#008543]" />
          <span>1. Contrôle par ID Unique / N° Permis</span>
        </button>

        <button
          id="tab-control-qr"
          type="button"
          onClick={() => setControlMode('qr')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition ${
            controlMode === 'qr'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80 text-emerald-900'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="w-4 h-4 text-amber-600" />
          <span>2. Contrôle par QR Code (Caméra / Fichier)</span>
        </button>
      </div>

      {/* MAIN CONTROL WORKSPACE */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left Column: Verification Tool (ID Entry or QR Scanner) */}
        <div className="md:col-span-6 space-y-4">
          
          {/* MODE 1: VERIFICATION BY UNIQUE ID */}
          {controlMode === 'id' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 text-slate-900 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#008543] flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Saisie de l'ID Unique par l'Agent</h3>
                  <p className="text-[11px] text-slate-500">
                    Le citoyen donne son ID Unique (ou N° de permis / NINA) pour vérification immédiate.
                  </p>
                </div>
              </div>

              {/* ID Search Input & Button */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerifyById();
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    ID Unique du Permis ou Numéro NINA du Citoyen *
                  </label>
                  <div className="relative">
                    <input
                      id="input-license-id"
                      type="text"
                      value={idInput}
                      onChange={(e) => setIdInput(e.target.value)}
                      placeholder="Ex: ML-BKO-2024-884920 ou 1028374920192A"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-24 py-3 text-slate-900 font-mono font-bold uppercase text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button
                      id="btn-verify-id"
                      type="submit"
                      disabled={isVerifying}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 bg-[#008543] hover:bg-[#007038] text-white font-bold rounded-lg text-xs transition flex items-center gap-1 shadow-xs"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Vérifier</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* QUICK TEST CHIPS (Presets de Test) */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Exemples d'ID Citoyens pour tester les verdicts :
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {allLicenses.slice(0, 3).map((lic) => (
                    <button
                      key={lic.id}
                      type="button"
                      onClick={() => {
                        setIdInput(lic.licenseNumber);
                        handleVerifyById(lic.licenseNumber);
                      }}
                      className={`p-2.5 rounded-xl border text-left font-medium transition flex items-center justify-between gap-1.5 ${
                        lic.status === 'active'
                          ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 hover:bg-emerald-100'
                          : lic.status === 'expired'
                          ? 'bg-red-50/70 border-red-200 text-red-950 hover:bg-red-100'
                          : 'bg-amber-50/70 border-amber-200 text-amber-950 hover:bg-amber-100'
                      }`}
                    >
                      <div className="truncate">
                        <span className="font-bold block truncate">{lic.fullName}</span>
                        <span className="font-mono text-[10px] opacity-80">{lic.licenseNumber}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase shrink-0">
                        {lic.status === 'active' ? '✅ Valide' : lic.status === 'expired' ? '❌ Expiré' : '⚠️ Suspendu'}
                      </span>
                    </button>
                  ))}

                  {/* Unknown/Fake ID Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const fakeId = 'ML-FAUX-999999';
                      setIdInput(fakeId);
                      handleVerifyById(fakeId);
                    }}
                    className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/80 hover:bg-rose-100 text-rose-950 text-left font-medium transition flex items-center justify-between gap-1.5"
                  >
                    <div>
                      <span className="font-bold block">Faux ID / Inconnu</span>
                      <span className="font-mono text-[10px] text-rose-700">ML-FAUX-999999</span>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 uppercase shrink-0">
                      🚨 Invalide
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: CAMERA QR SCANNER */}
          {controlMode === 'qr' && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 text-slate-900 relative overflow-hidden shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold tracking-wider uppercase text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-[#008543]" />
                  Viseur Caméra QR
                </span>

                {isCameraActive && (
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    Recherche active
                  </span>
                )}
              </div>

              {/* Viewfinder Video / Canvas Area */}
              <div className="relative aspect-square sm:aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                <canvas ref={canvasRef} className="hidden" />
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                />

                {!isCameraActive && (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                      <CameraOff className="w-8 h-8 text-slate-500" />
                    </div>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      Activez la caméra pour scanner le QR code d'un permis ou importez une capture.
                    </p>
                    <button
                      id="btn-start-camera"
                      type="button"
                      onClick={startCamera}
                      className="px-5 py-2.5 bg-[#008543] hover:bg-[#007038] text-white font-semibold rounded-xl text-xs shadow-xs transition flex items-center gap-2 mx-auto"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Démarrer la Caméra</span>
                    </button>
                  </div>
                )}

                {/* Laser Overlay */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <div className="absolute top-0 left-0 w-5 h-5 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl"></div>
                      <div className="absolute top-0 right-0 w-5 h-5 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr"></div>
                      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl"></div>
                      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br"></div>
                    </div>
                    <p className="text-[10px] text-white/90 bg-slate-950/80 px-3 py-1 rounded-full mt-3 font-mono">
                      Cadrez le QR Code officiel DNTT
                    </p>
                  </div>
                )}
              </div>

              {/* Controls Bar */}
              <div className="flex items-center justify-between gap-2">
                {isCameraActive ? (
                  <button
                    id="btn-stop-camera"
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Arrêter la caméra</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2 bg-[#008543] hover:bg-[#007038] text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Activer Caméra</span>
                  </button>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition flex items-center gap-1.5 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-600" />
                  <span>Importer Image QR</span>
                </button>
              </div>

              {cameraError && (
                <div className="bg-rose-50 p-3 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{cameraError}</span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setControlMode('id')}
                      className="px-3 py-1 bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition"
                    >
                      Utiliser le Contrôle par ID Unique
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Right Column: Instant Official Verdict & Direct Action */}
        <div className="md:col-span-6 space-y-4">
          
          {isVerifying ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-800 space-y-3 shadow-xs">
              <RotateCw className="w-8 h-8 text-[#008543] animate-spin mx-auto" />
              <h3 className="text-sm font-bold">Interrogation du Registre DNTT Mali...</h3>
              <p className="text-xs text-slate-500">Vérification de l'ID et de l'authenticité administrative</p>
            </div>
          ) : !verificationResult ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-800 space-y-3 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-7 h-7 text-slate-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-700">En attente de vérification</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Saisissez l'<strong>ID Unique</strong> communiqué par le citoyen ou scannez son <strong>QR Code</strong> pour afficher instantanément le verdict.
              </p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in zoom-in-95">
              
              {/* --- 1. VERDICT BANNER : PERMIS VALIDE (BON) --- */}
              {verificationResult.status === 'valid' && (
                <div className="bg-emerald-50 border-2 border-emerald-500 p-5 rounded-3xl text-emerald-950 shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <ShieldCheck className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-emerald-700 uppercase block">
                        RÉSULTAT DU CONTRÔLE POLICE
                      </span>
                      <h3 className="text-base font-bold text-emerald-950">
                        PERMIS VALIDE & AUTHENTIQUE
                      </h3>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-white/80 rounded-2xl border border-emerald-200 text-xs space-y-1">
                    <p className="font-semibold text-emerald-900">
                      ✅ {verificationResult.message}
                    </p>
                    <p className="text-emerald-800 text-[11px]">
                      {verificationResult.details}
                    </p>
                    <div className="pt-1.5 flex items-center gap-2 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>CONDUCTEUR EN PARFAITE RÈGLE — AUCUNE SANCTION REQUISE</span>
                    </div>
                  </div>
                </div>
              )}

              {/* --- 2. VERDICT BANNER : PERMIS EXPIRÉ --- */}
              {verificationResult.status === 'expired' && (
                <div className="bg-red-50 border-2 border-red-500 p-5 rounded-3xl text-red-950 shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <AlertTriangle className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-red-700 uppercase block">
                        RÉSULTAT DU CONTRÔLE POLICE
                      </span>
                      <h3 className="text-base font-bold text-red-950">
                        PERMIS EXPIRÉ (NON VALIDE)
                      </h3>
                    </div>
                  </div>

                  <div className="p-3 bg-white/80 rounded-2xl border border-red-200 text-xs space-y-2">
                    <p className="font-semibold text-red-900">
                      ❌ {verificationResult.message}
                    </p>
                    <p className="text-red-800 text-[11px]">
                      {verificationResult.details}
                    </p>
                    
                    {/* Direct Sanction Action */}
                    <button
                      type="button"
                      onClick={() => setShowViolationForm(true)}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2 mt-2"
                    >
                      <BadgeAlert className="w-4 h-4" />
                      <span>🚨 Sanctionner le Conducteur (Dresser le PV pour Permis Expiré)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* --- 3. VERDICT BANNER : PERMIS SUSPENDU --- */}
              {verificationResult.status === 'suspended' && (
                <div className="bg-amber-50 border-2 border-amber-500 p-5 rounded-3xl text-amber-950 shadow-xs space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center font-bold shadow-xs">
                      <FileWarning className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-amber-700 uppercase block">
                        RÉSULTAT DU CONTRÔLE POLICE
                      </span>
                      <h3 className="text-base font-bold text-amber-950">
                        PERMIS SUSPENDU / RETIRÉ
                      </h3>
                    </div>
                  </div>

                  <div className="p-3 bg-white/80 rounded-2xl border border-amber-200 text-xs space-y-2">
                    <p className="font-semibold text-amber-900">
                      ⚠️ {verificationResult.message}
                    </p>
                    <p className="text-amber-800 text-[11px]">
                      {verificationResult.details}
                    </p>

                    {/* Direct Sanction Action */}
                    <button
                      type="button"
                      onClick={() => setShowViolationForm(true)}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2 mt-2"
                    >
                      <BadgeAlert className="w-4 h-4" />
                      <span>🚨 Sanctionner le Conducteur (PV pour Conduite sous Suspension)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* --- 4. VERDICT BANNER : ID INVALIDE / NON ENREGISTRÉ (FAUX PERMIS) --- */}
              {(verificationResult.status === 'invalid' || verificationResult.status === 'forged') && (
                <div className="bg-rose-950 text-white border-2 border-rose-600 p-5 rounded-3xl shadow-md space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0 animate-pulse">
                      <UserX className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold tracking-widest text-rose-300 uppercase block">
                        ALERTE POLICE NATIONALE
                      </span>
                      <h3 className="text-base font-bold text-white">
                        ID INVALIDE / TITRE NON ENREGISTRÉ
                      </h3>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-2xl border border-rose-700/60 text-xs space-y-2">
                    <p className="font-bold text-rose-300">
                      🚨 {verificationResult.message}
                    </p>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {verificationResult.details || 'Cet identifiant ne figure pas au registre officiel DNTT. Conduite sans titre valable.'}
                    </p>

                    {/* Immediate Sanction Action */}
                    <button
                      id="btn-sanction-invalid-license"
                      type="button"
                      onClick={() => setShowViolationForm(true)}
                      className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs transition flex items-center justify-center gap-2 mt-2"
                    >
                      <BadgeAlert className="w-4 h-4" />
                      <span>🚨 Sanctionner Immédiatement (PV pour Défaut de Permis - 25 000 FCFA)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CONDUCTEUR IDENTIFIÉ DÉTAILS (Si trouvé) */}
              {scannedLicenseDetails && (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 text-slate-900 space-y-3 shadow-xs">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img
                        src={scannedLicenseDetails.photoUrl}
                        alt="Photo Conducteur"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 uppercase">
                        {scannedLicenseDetails.fullName}
                      </h4>
                      <p className="text-xs font-mono font-bold text-[#008543]">
                        ID Permis : {scannedLicenseDetails.licenseNumber}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        NINA : <span className="font-mono text-slate-700">{scannedLicenseDetails.nina}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block">Date de Naiss.</span>
                      <span className="font-semibold text-slate-800 text-[11px]">{scannedLicenseDetails.dateOfBirth}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block">Validité</span>
                      <span className="font-semibold text-slate-800 text-[11px]">{scannedLicenseDetails.expiryDate}</span>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block">Points Restants</span>
                      <span className="font-bold text-[#008543] font-mono text-[11px]">
                        {scannedLicenseDetails.points ?? 12}/12 pts
                      </span>
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                      Catégories Autorisées :
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {scannedLicenseDetails.categories.map((c) => (
                        <span
                          key={c}
                          className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-xs rounded-lg"
                        >
                          Cat. {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Toggle Violation Form for other infractions (ex: excès de vitesse, feu rouge...) */}
                  {verificationResult.status === 'valid' && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowViolationForm(!showViolationForm)}
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
                      >
                        <BadgeAlert className="w-3.5 h-3.5 text-amber-600" />
                        <span>{showViolationForm ? 'Fermer le formulaire' : 'Dresser un PV pour autre infraction routière (Vitesse, Feu...)'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* ROADSIDE SANCTION / PROCÈS-VERBAL FORM */}
      {showViolationForm && (
        <div className="bg-white border-2 border-amber-300 rounded-3xl p-6 text-slate-900 space-y-5 animate-in slide-in-from-top-4 duration-300 shadow-xs">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <BadgeAlert className="w-6 h-6 text-amber-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">Procès-Verbal de Sanction Routière (PV)</h3>
                <p className="text-xs text-slate-500">
                  Application immédiate des dispositions du Code de la Route Malien
                </p>
              </div>
            </div>

            <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Enregistrement Officiel
            </span>
          </div>

          {infractionSavedMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#008543] shrink-0" />
              <span>{infractionSavedMessage}</span>
            </div>
          )}

          <form onSubmit={handleSaveViolation} className="space-y-4 text-xs">
            
            {/* Driver Identity in Sanction Form */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Nom du Contrevenant *</label>
                <input
                  type="text"
                  value={sanctionDriverName}
                  onChange={(e) => setSanctionDriverName(e.target.value)}
                  placeholder="Ex: Amadou Diallo"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-bold uppercase focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">ID Permis / Réf Titre *</label>
                <input
                  type="text"
                  value={sanctionLicenseNumber}
                  onChange={(e) => setSanctionLicenseNumber(e.target.value)}
                  placeholder="Ex: ML-BKO-2024-XXXXXX ou ID-INVALIDE"
                  required
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-mono font-bold uppercase focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">Numéro NINA (Si disponible)</label>
                <input
                  type="text"
                  value={sanctionNina}
                  onChange={(e) => setSanctionNina(e.target.value)}
                  placeholder="Ex: 1048291049281M"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 font-mono focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            {/* Infraction Selection */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Motif de la Sanction & Infraction Constatée (Barème Officiel DNTT) *
              </label>
              <select
                id="select-infraction"
                value={selectedInfraction.code}
                onChange={(e) => {
                  const target = OFFICIAL_INFRACTIONS.find((inf) => inf.code === e.target.value);
                  if (target) setSelectedInfraction(target);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none text-xs font-bold"
              >
                {OFFICIAL_INFRACTIONS.map((inf) => (
                  <option key={inf.code} value={inf.code}>
                    {inf.label} — {inf.amountFCFA.toLocaleString('fr-FR')} FCFA (-{inf.points} pt)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Fine Preview */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Montant de l'Amende Forfaitaire</span>
                <span className="text-base font-bold text-amber-700 font-mono">
                  {selectedInfraction.amountFCFA.toLocaleString('fr-FR')} FCFA
                </span>
              </div>

              {/* Points Deduction */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[10px]">Déduction de Points sur le Permis</span>
                <span className="text-base font-bold text-rose-600 font-mono">
                  -{selectedInfraction.points} point(s)
                </span>
              </div>

              {/* Vehicle Plate */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Immatriculation du Véhicule *
                </label>
                <input
                  type="text"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  placeholder="Ex: CH 8920 MD"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono uppercase focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Location */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Lieu du Contrôle / Point d'Arrêt *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Bamako - Pont des Martyrs"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              {/* Officer Details */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Matricule & Nom de l'Agent Verbalisateur
                </label>
                <input
                  type="text"
                  value={`${officerBadge} - ${officerName}`}
                  onChange={(e) => setOfficerBadge(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Observations & Circonstances de l'Infraction
              </label>
              <textarea
                value={violationNotes}
                onChange={(e) => setViolationNotes(e.target.value)}
                placeholder="Ex: ID non répertorié au registre DNTT lors du contrôle routier ou infraction constatée..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowViolationForm(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition text-xs cursor-pointer"
              >
                Annuler
              </button>

              <button
                id="btn-submit-violation"
                type="submit"
                className="px-5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-2 text-xs cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Enregistrer & Dresser le PV de Sanction</span>
              </button>
            </div>

          </form>

        </div>
      )}

      {/* OFFLINE ACTIVITY JOURNAL MODAL */}
      {showActivityLogModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className={`rounded-3xl max-w-4xl w-full p-5 sm:p-7 space-y-5 shadow-2xl border my-auto max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 ${
            isNightMode
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}>
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#008543]/10 text-[#008543] flex items-center justify-center font-bold">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold">
                      Journal d'Activité Local — Contrôles Hors-Ligne
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Poste de Contrôle Routier
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Historique autonome des vérifications enregistrées localement sur ce terminal avant synchronisation centrale.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowActivityLogModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
              <div className={`p-2.5 rounded-2xl border ${
                isNightMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] text-slate-400 block font-medium">Total Contrôles</span>
                <span className="text-base font-extrabold font-mono text-slate-800 dark:text-slate-100">
                  {activityLogs.length}
                </span>
              </div>
              <div className={`p-2.5 rounded-2xl border ${
                isNightMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] text-emerald-600 block font-medium">Permis Conformes</span>
                <span className="text-base font-extrabold font-mono text-[#008543]">
                  {activityLogs.filter((l) => l.status === 'valid').length}
                </span>
              </div>
              <div className={`p-2.5 rounded-2xl border ${
                isNightMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] text-amber-600 block font-medium">Suspendus / Expirés</span>
                <span className="text-base font-extrabold font-mono text-amber-600">
                  {activityLogs.filter((l) => l.status === 'suspended' || l.status === 'expired').length}
                </span>
              </div>
              <div className={`p-2.5 rounded-2xl border ${
                isNightMode ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] text-rose-600 block font-medium">Non Reconnu / Faux</span>
                <span className="text-base font-extrabold font-mono text-rose-600">
                  {activityLogs.filter((l) => l.status === 'invalid' || l.status === 'forged').length}
                </span>
              </div>
            </div>

            {/* Feedback message banner in modal */}
            {logModalMessage && (
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
                  logModalMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : logModalMessage.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                    : 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300'
                }`}
              >
                <span>{logModalMessage.text}</span>
                <button
                  type="button"
                  onClick={() => setLogModalMessage(null)}
                  className="text-[10px] underline opacity-80 hover:opacity-100"
                >
                  Fermer
                </button>
              </div>
            )}

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  placeholder="Rechercher par nom, n° permis, NINA, lieu..."
                  className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border outline-none transition ${
                    isNightMode
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-amber-400'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#008543] focus:bg-white'
                  }`}
                />
              </div>

              {/* Status Select Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={logFilterStatus}
                  onChange={(e) => setLogFilterStatus(e.target.value)}
                  className={`px-3 py-2 text-xs rounded-xl border font-semibold outline-none transition ${
                    isNightMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="all">Tous les statuts ({activityLogs.length})</option>
                  <option value="valid">Conformes uniquement</option>
                  <option value="suspended">Suspendus / Révoqués</option>
                  <option value="expired">Expirés</option>
                  <option value="invalid">Non Répertoriés / Faux</option>
                </select>

                {/* Export JSON Button */}
                <button
                  type="button"
                  id="btn-export-logs"
                  onClick={handleExportLogsJSON}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 shrink-0 cursor-pointer"
                  title="Télécharger l'historique en JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Exporter</span>
                </button>

                {/* Sync to Server Button */}
                <button
                  type="button"
                  id="btn-sync-logs-server"
                  onClick={handleSyncLogs}
                  disabled={isSyncingLogs || !isOnline}
                  className={`px-3 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                    isOnline
                      ? 'bg-[#008543] hover:bg-[#007038] text-white shadow-xs'
                      : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
                  }`}
                  title="Synchroniser le journal vers la base centrale DNTT"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingLogs ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isSyncingLogs ? 'Sync...' : 'Sync Cloud'}</span>
                </button>
              </div>
            </div>

            {/* Logs List View */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
              {filteredLogs.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {activityLogs.length === 0
                        ? 'Aucune vérification enregistrée dans ce journal'
                        : 'Aucun enregistrement ne correspond aux critères de recherche'}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                      {activityLogs.length === 0
                        ? 'Chaque contrôle routier effectué par ID Unique ou scan QR code sera automatiquement consigné ici en mémoire locale hors-ligne.'
                        : 'Modifiez vos filtres ou votre mot-clé de recherche pour afficher les résultats.'}
                    </p>
                  </div>
                </div>
              ) : (
                filteredLogs.map((log) => {
                  const logDate = new Date(log.timestamp);
                  const formattedTime = logDate.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                  const formattedDate = logDate.toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={log.id}
                      className={`p-3.5 rounded-2xl border transition hover:border-slate-300 dark:hover:border-slate-700 ${
                        isNightMode
                          ? 'bg-slate-800/40 border-slate-800'
                          : 'bg-slate-50/70 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        
                        {/* Driver & License Details */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                              {log.driverName}
                            </span>
                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold">
                              {log.licenseNumber}
                            </span>
                            {log.nina && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                NINA: {log.nina}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {formattedDate} à {formattedTime}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {log.location}
                            </span>
                            <span>• Agent: <strong>{log.officerBadge}</strong></span>
                          </div>
                        </div>

                        {/* Status Badge & Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Method Badge */}
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                            {log.method === 'qr_camera'
                              ? 'Scan Caméra'
                              : log.method === 'qr_image'
                              ? 'Scan Image'
                              : 'Recherche ID'}
                          </span>

                          {/* Verification Outcome */}
                          {log.status === 'valid' && (
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-[#008543] border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Valide ({log.points ?? 12} pts)</span>
                            </span>
                          )}

                          {log.status === 'suspended' && (
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Suspendu</span>
                            </span>
                          )}

                          {log.status === 'expired' && (
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Expiré</span>
                            </span>
                          )}

                          {(log.status === 'invalid' || log.status === 'forged') && (
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Non Répertorié</span>
                            </span>
                          )}

                          {/* Re-verify Shortcut Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setIdInput(log.licenseNumber);
                              setControlMode('id');
                              setShowActivityLogModal(false);
                              handleVerifyById(log.licenseNumber);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-slate-600 dark:text-slate-300 transition text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Re-contrôler ce titre"
                          >
                            <span>Dossier</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>

                      </div>

                      {log.details && (
                        <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 italic">
                          {log.details}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3 text-xs">
              {isConfirmingClearLogs ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-rose-600 font-semibold">Purger tout le journal ?</span>
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px]"
                  >
                    Oui, Purger
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsConfirmingClearLogs(false)}
                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px]"
                  >
                    Non
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-clear-logs"
                  onClick={() => setIsConfirmingClearLogs(true)}
                  disabled={activityLogs.length === 0}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 ${
                    activityLogs.length === 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purger le journal</span>
                </button>
              )}

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  {activityLogs.length} enregistrement(s) en cache local
                </span>
                <button
                  type="button"
                  onClick={() => setShowActivityLogModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
