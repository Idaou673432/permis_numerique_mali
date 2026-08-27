import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { DriverLicense, Violation } from '../types';
import { generateQRPayload } from '../lib/crypto';
import { updateViolationPaymentStatus } from '../lib/firebase';
import { exportDriverLicenseToPDF } from '../lib/pdfExport';
import { FinePaymentModal } from './FinePaymentModal';
import { CitizenGuideModal } from './CitizenGuideModal';
import { InstallAppModal } from './InstallAppModal';
import { UpdatePhotoModal } from './UpdatePhotoModal';
import {
  ShieldCheck,
  QrCode,
  RotateCw,
  Maximize2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Car,
  Bike,
  Truck,
  Bus,
  FileText,
  User,
  HeartHandshake,
  Smartphone,
  X,
  Share2,
  Calendar,
  MapPin,
  Flame,
  KeyRound,
  Copy,
  Search,
  Printer,
  Sparkles,
  Award,
  Phone,
  CreditCard,
  HelpCircle,
  FileDown,
  Loader2,
  Camera,
} from 'lucide-react';

interface DriverCardProps {
  license: DriverLicense;
  allLicenses: DriverLicense[];
  onSelectLicense: (license: DriverLicense) => void;
  driverViolations: Violation[];
  isOnline: boolean;
  onRefreshViolations?: () => void;
  onRefreshLicenses?: () => void;
}

export const DriverCard: React.FC<DriverCardProps> = ({
  license,
  allLicenses,
  onSelectLicense,
  driverViolations,
  isOnline,
  onRefreshViolations,
  onRefreshLicenses,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrString, setQrString] = useState<string>('');
  const [isFullscreenQR, setIsFullscreenQR] = useState(false);
  const [activeTab, setActiveTab] = useState<'card' | 'details' | 'infractions' | 'security'>('card');
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [selectedViolationForPayment, setSelectedViolationForPayment] = useState<Violation | null>(null);
  const [paymentSuccessToast, setPaymentSuccessToast] = useState<string | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [pdfSuccessToast, setPdfSuccessToast] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showUpdatePhotoModal, setShowUpdatePhotoModal] = useState(false);

  // Filter licenses by licenseNumber, nina, fullName, or nif
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredLicenses = allLicenses.filter((lic) => {
    if (!normalizedSearch) return true;
    return (
      lic.licenseNumber.toLowerCase().includes(normalizedSearch) ||
      lic.nina.toLowerCase().includes(normalizedSearch) ||
      lic.fullName.toLowerCase().includes(normalizedSearch) ||
      (lic.nif && lic.nif.toLowerCase().includes(normalizedSearch)) ||
      lic.id.toLowerCase().includes(normalizedSearch)
    );
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filteredLicenses.length > 0) {
      onSelectLicense(filteredLicenses[0]);
    }
  };

  // Generate cryptographic QR payload whenever license changes
  useEffect(() => {
    let isMounted = true;
    generateQRPayload(license).then((payload) => {
      if (isMounted) setQrString(payload);
    });
    return () => {
      isMounted = false;
    };
  }, [license]);

  const getQrDataUrl = async (): Promise<string | null> => {
    try {
      const svgElement =
        (document.querySelector('#hidden-qr-export svg') as SVGElement | null) ||
        (document.querySelector('#card-verso-qr svg') as SVGElement | null);
      if (svgElement) {
        const xml = new XMLSerializer().serializeToString(svgElement);
        const svg64 = btoa(unescape(encodeURIComponent(xml)));
        const image64 = 'data:image/svg+xml;base64,' + svg64;
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, 300, 300);
              ctx.drawImage(img, 0, 0, 300, 300);
              resolve(canvas.toDataURL('image/png'));
            } else {
              resolve(null);
            }
          };
          img.onerror = () => resolve(null);
          img.src = image64;
        });
      }
    } catch (err) {
      console.warn('Erreur conversion QR code:', err);
    }
    return null;
  };

  const handleExportPDF = async () => {
    if (isExportingPDF) return;
    setIsExportingPDF(true);
    try {
      const qrData = await getQrDataUrl();
      await exportDriverLicenseToPDF(license, qrData);
      setPdfSuccessToast(`Permis n° ${license.licenseNumber} exporté en PDF avec succès !`);
      setTimeout(() => setPdfSuccessToast(null), 4000);
    } catch (error) {
      console.error('Erreur lors de l\'exportation PDF:', error);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const getStatusBadge = (status: DriverLicense['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            VALIDE & EN RÈGLE
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <Clock className="w-3.5 h-3.5 text-red-600" />
            EXPIRÉ
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            SUSPENDU
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            RÉVOQUÉ
          </span>
        );
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'A1':
      case 'A':
        return <Bike className="w-3.5 h-3.5" />;
      case 'B':
        return <Car className="w-3.5 h-3.5" />;
      case 'C':
        return <Truck className="w-3.5 h-3.5" />;
      case 'D':
        return <Bus className="w-3.5 h-3.5" />;
      default:
        return <Car className="w-3.5 h-3.5" />;
    }
  };

  const handleSimulateDownload = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const handlePrintCertificate = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Impression directe:', e);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Hidden QR SVG for instant high-res rasterization in PDF generator */}
      <div id="hidden-qr-export" className="hidden" aria-hidden="true">
        {qrString ? (
          <QRCodeSVG
            value={qrString}
            size={300}
            level="M"
            includeMargin={true}
            fgColor="#000000"
          />
        ) : null}
      </div>

      {/* PDF Export Success Toast */}
      {pdfSuccessToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#008543] shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">{pdfSuccessToast}</p>
              <p className="text-[11px] text-emerald-800">Le fichier PDF sécurisé conforme DNTT Mali a été téléchargé sur votre appareil.</p>
            </div>
          </div>
          <button
            onClick={() => setPdfSuccessToast(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 text-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {/* Driver Selector & Quick Search by License Number / NINA */}
      <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-3.5 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <label htmlFor="driver-license-search" className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#008543]" />
                Rechercher & Sélectionner un Titulaire / Permis
              </label>
              {searchTerm && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-semibold">
                  {filteredLicenses.length} / {allLicenses.length}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Trouvez rapidement un titre par <strong>Numéro de permis (ID Unique)</strong>, <strong>Numéro NINA</strong> ou <strong>Nom</strong>.
            </p>
          </div>

          {/* Offline Badge */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-emerald-900 shrink-0">
            <Smartphone className="w-3.5 h-3.5 text-[#008543] shrink-0" />
            <div className="text-left">
              <p className="text-[10px] font-bold leading-tight">PWA Hors-Ligne</p>
              <p className="text-[9px] text-emerald-700">Stockage local sécurisé</p>
            </div>
          </div>
        </div>

        {/* Search Bar with Submit & Clear */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="driver-license-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par N° Permis (ex: ML-BKO-2024...), NINA (ex: 10283...), ou Nom..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 bg-slate-200/60 hover:bg-slate-200 rounded-lg transition"
                title="Effacer la recherche"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {filteredLicenses.length > 0 && searchTerm && (
            <button
              type="submit"
              className="px-3.5 py-2 bg-[#008543] hover:bg-[#007038] text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <span>Afficher</span>
            </button>
          )}
        </form>

        {/* Filtered License Quick Selectors */}
        {filteredLicenses.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1">
            {filteredLicenses.map((lic) => {
              const isSelected = lic.id === license.id;
              return (
                <button
                  key={lic.id}
                  type="button"
                  onClick={() => onSelectLicense(lic)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center gap-2 text-left border ${
                    isSelected
                      ? 'bg-[#008543] text-white border-[#008543] shadow-xs ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <User className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                  <div className="truncate">
                    <span className="font-bold block truncate">{lic.fullName}</span>
                    <span className={`text-[10px] font-mono block ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                      {lic.licenseNumber} • NINA: {lic.nina}
                    </span>
                  </div>
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ml-1 ${
                      lic.status === 'active'
                        ? 'bg-emerald-400'
                        : lic.status === 'expired'
                        ? 'bg-red-400'
                        : 'bg-amber-400'
                    }`}
                    title={lic.status === 'active' ? 'Valide' : lic.status === 'expired' ? 'Expiré' : 'Suspendu'}
                  />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 space-y-1.5">
            <p className="font-medium text-slate-700">
              Aucun permis ne correspond à la recherche « <span className="font-mono text-slate-900">{searchTerm}</span> »
            </p>
            <p className="text-[11px] text-slate-400">
              Vérifiez les chiffres du N° de permis ou du NINA.
            </p>
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition inline-block"
            >
              Réinitialiser la recherche
            </button>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('card')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'card'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <QrCode className="w-4 h-4 text-[#008543]" />
          <span>Titre de Conduite (Carte)</span>
        </button>

        <button
          onClick={() => setActiveTab('details')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'details'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <FileText className="w-4 h-4 text-blue-600" />
          <span>Détails Biométriques</span>
        </button>

        <button
          onClick={() => setActiveTab('infractions')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap relative ${
            activeTab === 'infractions'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-500" />
          <span>Infractions & Points ({license.points ?? 12}/12 pts)</span>
          {driverViolations.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {driverViolations.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap ${
            activeTab === 'security'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Preuve Cryptographique ECDSA</span>
        </button>
      </div>

      {/* TAB 1: DIGITAL CARD VIEW */}
      {activeTab === 'card' && (
        <div className="space-y-6">
          
          {/* Official License Unique ID Presentation Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white p-4 sm:p-5 rounded-2xl border border-emerald-800/40 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    ID Unique Officiel du Titre de Conduite
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-bold font-mono tracking-wide text-white bg-slate-800/80 px-3 py-1 rounded-xl border border-slate-700 select-all">
                    {license.licenseNumber}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  👮‍♂️ <strong>Pour le contrôle de police :</strong> donnez cet ID Unique au policier ou présentez votre QR Code.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(license.licenseNumber);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2500);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                  copiedId
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40'
                }`}
              >
                {copiedId ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    <span>ID Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copier mon ID Unique</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card Flip Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusBadge(license.status)}
              <span className="text-xs text-slate-400 hidden sm:inline">
                Délivré par la DNTT Mali
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-flip-card"
                onClick={() => setIsFlipped(!isFlipped)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 shadow-xs transition"
              >
                <RotateCw className="w-3.5 h-3.5 text-amber-500" />
                <span>{isFlipped ? 'Afficher Recto' : 'Afficher Verso / QR'}</span>
              </button>

              <button
                id="btn-fullscreen-qr"
                onClick={() => setIsFullscreenQR(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#008543] hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>QR Plein Écran</span>
              </button>
            </div>
          </div>

          {/* 3D Flip Card Container */}
          <div className="relative mx-auto w-full max-w-xl aspect-[1.586/1] min-h-[320px] sm:min-h-[360px] perspective-1000">
            
            {/* --- RECTO (FRONT OF CARD) --- */}
            <div
              className={`w-full h-full rounded-3xl p-5 sm:p-6 text-slate-900 shadow-md transition-all duration-700 transform-style-preserve-3d border border-slate-200 relative overflow-hidden bg-gradient-to-br from-emerald-50/60 via-amber-50/30 to-white ${
                isFlipped ? 'rotate-y-180 opacity-0 pointer-events-none absolute inset-0' : 'relative opacity-100'
              }`}
            >
              {/* Guilloché Security Pattern Background */}
              <div
                className="absolute inset-0 opacity-5 pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(#047857 1px, transparent 1px), radial-gradient(#d97706 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 8px 8px',
                }}
              />

              {/* Top Flag & Header */}
              <div className="relative z-10 border-b border-slate-200/80 pb-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#008543] text-yellow-300 flex items-center justify-center font-bold text-xs shadow-xs">
                      ML
                    </div>
                    <div>
                      <h2 className="text-xs sm:text-sm font-bold tracking-wider text-slate-900 uppercase">
                        RÉPUBLIQUE DU MALI
                      </h2>
                      <p className="text-[9px] text-emerald-800 font-semibold tracking-wide">
                        PERMIS DE CONDUIRE NUMÉRIQUE • DRIVING LICENCE
                      </p>
                    </div>
                  </div>

                  {/* Mali National Flag Icon */}
                  <div className="flex h-4 w-7 rounded overflow-hidden shadow-xs border border-slate-300">
                    <div className="w-1/3 bg-[#008543]"></div>
                    <div className="w-1/3 bg-[#FCD116]"></div>
                    <div className="w-1/3 bg-[#CE1126]"></div>
                  </div>
                </div>
              </div>

              {/* Main Card Body */}
              <div className="relative z-10 grid grid-cols-12 gap-3 mt-3.5">
                
                {/* Photo & Biometric Box */}
                <div className="col-span-4 flex flex-col items-center">
                  <div
                    onClick={() => setShowUpdatePhotoModal(true)}
                    className="group cursor-pointer relative w-24 h-32 sm:w-28 sm:h-36 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center transition-all hover:border-emerald-500 hover:shadow-md"
                    title="Cliquer pour changer ou ajouter votre photo d'identité"
                  >
                    {license.photoUrl ? (
                      <img
                        src={license.photoUrl}
                        alt={license.fullName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400">
                        <User className="w-10 h-10 stroke-1 text-slate-400" />
                        <span className="text-[8px] font-bold mt-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          + Ajouter photo
                        </span>
                      </div>
                    )}

                    {/* Hover overlay hint */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold transition-opacity">
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>Modifier</span>
                    </div>

                    {/* Hologram Overlay Simulation */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-yellow-400/10 to-emerald-400/10 opacity-60 pointer-events-none"></div>
                    <div className="absolute bottom-1 right-1 bg-[#008543] text-yellow-300 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                      DNTT
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      GS: {license.bloodGroup}
                    </span>
                  </div>
                </div>

                {/* Driver Identifiers & Details */}
                <div className="col-span-8 space-y-1.5 text-left">
                  
                  {/* License Number */}
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">
                      5. N° Titre de Conduite
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-[#008543] font-mono tracking-tight bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                      {license.licenseNumber}
                    </span>
                  </div>

                  {/* Full Name */}
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">
                      1. Nom & Prénoms
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 tracking-wide uppercase">
                      {license.fullName}
                    </span>
                  </div>

                  {/* Date & Place of birth */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">
                        2. Date de Naiss.
                      </span>
                      <span className="text-[11px] font-semibold text-slate-800">
                        {license.dateOfBirth}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">
                        3. Lieu de Naiss.
                      </span>
                      <span className="text-[11px] font-semibold text-slate-800 truncate block">
                        {license.placeOfBirth}
                      </span>
                    </div>
                  </div>

                  {/* NINA / NIF */}
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block">
                      4. NINA (Identifiant National)
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-slate-800">
                      {license.nina}
                    </span>
                  </div>

                  {/* Validity Dates */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">
                        4a. Délivré le
                      </span>
                      <span className="text-[10px] font-semibold text-slate-800">
                        {license.issueDate}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">
                        4b. Expire le
                      </span>
                      <span className={`text-[10px] font-bold ${license.status === 'expired' ? 'text-red-600' : 'text-[#008543]'}`}>
                        {license.expiryDate}
                      </span>
                    </div>
                  </div>

                  {/* Authorized Categories Pills */}
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-bold text-slate-400 mr-1">
                      9. Catégories:
                    </span>
                    {license.categories.map((cat) => (
                      <span
                        key={cat}
                        className="inline-flex items-center gap-1 bg-[#008543] text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-xs"
                      >
                        {getCategoryIcon(cat)}
                        <span>{cat}</span>
                      </span>
                    ))}
                  </div>

                </div>

              </div>

              {/* Bottom Microprint Footer */}
              <div className="absolute bottom-2 left-6 right-6 flex items-center justify-between text-[8px] text-slate-400 font-mono border-t border-slate-200/60 pt-1">
                <span>DNTT • RÉPUBLIQUE DU MALI</span>
                <span>ECDSA P-256 SIGNED</span>
              </div>
            </div>

            {/* --- VERSO (BACK OF CARD WITH QR CODE) --- */}
            <div
              className={`w-full h-full rounded-3xl p-5 sm:p-6 text-slate-900 shadow-md transition-all duration-700 transform-style-preserve-3d border border-slate-200 relative overflow-hidden bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 ${
                !isFlipped ? 'rotate-y-180 opacity-0 pointer-events-none absolute inset-0' : 'relative opacity-100'
              }`}
            >
              {/* Top Bar on Verso */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#008543]" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    SÉCURITÉ & CATÉGORIES DNTT
                  </span>
                </div>
                <span className="text-[9px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-semibold">
                  SIG: ECDSA/SHA-256
                </span>
              </div>

              <div className="grid grid-cols-12 gap-3 mt-3">
                {/* Left: Category Matrix Table */}
                <div className="col-span-7 space-y-1">
                  <div className="bg-white rounded-xl p-2 border border-slate-200 shadow-xs">
                    <table className="w-full text-left text-[9px]">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                          <th className="pb-1">Cat.</th>
                          <th className="pb-1">Validité</th>
                          <th className="pb-1">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {['A1', 'A', 'B', 'C', 'D', 'E'].map((c) => {
                          const isAuthorized = license.categories.includes(c as any);
                          return (
                            <tr key={c} className={isAuthorized ? 'font-bold text-slate-900 bg-emerald-50/60' : 'text-slate-400'}>
                              <td className="py-0.5 flex items-center gap-1">
                                {getCategoryIcon(c)}
                                <span>{c}</span>
                              </td>
                              <td className="py-0.5">{isAuthorized ? `${license.issueDate} / ${license.expiryDate}` : '---'}</td>
                              <td className="py-0.5">
                                {isAuthorized ? (
                                  <span className="text-[#008543] font-bold">ACTIF</span>
                                ) : (
                                  <span className="text-slate-300">NON</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Restrictions / Remarks */}
                  <div className="text-[9px] bg-amber-50 p-1.5 rounded-lg border border-amber-200 text-amber-900">
                    <span className="font-bold">12. Restrictions: </span>
                    <span>{license.restrictions || 'Aucune restriction médicale spécifique.'}</span>
                  </div>
                </div>

                {/* Right: Cryptographic QR Code */}
                <div className="col-span-5 flex flex-col items-center justify-center bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs">
                  <div
                    onClick={() => setIsFullscreenQR(true)}
                    className="cursor-pointer group relative p-1 bg-white rounded-xl hover:scale-105 transition-transform"
                    title="Cliquer pour agrandir le QR Code"
                  >
                    {qrString ? (
                      <QRCodeSVG
                        value={qrString}
                        size={105}
                        level="M"
                        includeMargin={false}
                        fgColor="#064e3b"
                      />
                    ) : (
                      <div className="w-[105px] h-[105px] bg-slate-100 animate-pulse rounded"></div>
                    )}
                    <div className="absolute inset-0 bg-black/30 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white text-[10px] font-bold">
                      <Maximize2 className="w-4 h-4" />
                    </div>
                  </div>
                  <span className="text-[8px] font-mono font-semibold text-slate-500 mt-1 text-center">
                    QR SÉCURISÉ HORS-LIGNE
                  </span>
                </div>
              </div>

              {/* Bottom MRZ Security Strip */}
              <div className="absolute bottom-2 left-4 right-4 bg-slate-900 text-yellow-400 font-mono text-[8px] sm:text-[9px] px-2 py-1 rounded tracking-widest text-center truncate">
                {`D1MLI${license.licenseNumber.replace(/[^A-Z0-9]/g, '')}<<<<${license.nina.slice(0, 10)}<<${license.expiryDate.replace(/-/g, '')}`}
              </div>
            </div>

          </div>

          {/* Quick Actions Under Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2.5">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#008543]" />
                Actions Rapides Citoyen
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <button
                id="btn-export-pdf"
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#008543] hover:bg-emerald-800 disabled:opacity-75 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
              >
                {isExportingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-200" />
                ) : (
                  <FileDown className="w-4 h-4 text-emerald-200" />
                )}
                <span>{isExportingPDF ? 'Exportation PDF...' : 'Exporter en PDF'}</span>
              </button>

              <button
                id="btn-show-qr-direct"
                onClick={() => setIsFullscreenQR(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Présenter QR au Contrôle</span>
              </button>

              <button
                id="btn-print-certificate"
                onClick={() => setShowCertificateModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 shadow-xs transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#008543]" />
                <span>Imprimer l'Attestation</span>
              </button>

              <button
                id="btn-open-guide-card"
                onClick={() => setShowGuideModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-[#008543]" />
                <span>Guide Citoyen & FAQ</span>
              </button>

              <button
                id="btn-open-install-modal-card"
                onClick={() => setShowInstallModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-emerald-200" />
                <span>Installer sur mon Téléphone</span>
              </button>

              <button
                id="btn-update-photo-card"
                onClick={() => setShowUpdatePhotoModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 shadow-xs transition cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#008543]" />
                <span>{license.photoUrl ? 'Changer ma Photo' : 'Ajouter ma Photo'}</span>
              </button>

              <button
                id="btn-download-license"
                onClick={handleSimulateDownload}
                className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 shadow-xs transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-400" />
                <span>{downloadSuccess ? 'Titre Sauvegardé !' : 'Enregistrer Image / Pass'}</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: DETAILED BIOMETRICS */}
      {activeTab === 'details' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 text-slate-800 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-[#008543] flex items-center justify-center font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{license.fullName}</h3>
              <p className="text-xs text-slate-400">N° {license.licenseNumber} • Région: {license.region}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-slate-400 block mb-1">Identifiant NINA</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{license.nina}</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-slate-400 block mb-1">NIF (Identifiant Fiscal)</span>
              <span className="font-mono font-bold text-slate-700 text-sm">{license.nif || 'Non renseigné'}</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-slate-400 block mb-1">Date et Lieu de Naissance</span>
              <span className="font-bold text-slate-800">{license.dateOfBirth} à {license.placeOfBirth}</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-slate-400 block mb-1">Groupe Sanguin</span>
              <span className="font-bold text-rose-600 text-sm">{license.bloodGroup}</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-slate-400 block mb-1">Adresse Domiciliaire</span>
              <span className="font-medium text-slate-700">{license.address}, {license.city}</span>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <span className="text-slate-400 block mb-1">Autorité Émettrice</span>
              <span className="font-medium text-[#008543]">{license.issuingAuthority}</span>
            </div>
          </div>

          {/* Emergency Contact */}
          {license.emergencyContact && (
            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <HeartHandshake className="w-5 h-5 text-[#008543]" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Contact d'Urgence en cas d'accident</h4>
                  <p className="text-xs text-slate-700">
                    {license.emergencyContact.name} ({license.emergencyContact.relationship}) :{' '}
                    <span className="font-mono font-bold text-slate-900">{license.emergencyContact.phone}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Bar inside Biometrics */}
          <div className="pt-2 flex flex-wrap gap-2.5 justify-end">
            <button
              id="btn-details-export-pdf"
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#008543] hover:bg-emerald-800 disabled:opacity-75 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              {isExportingPDF ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>{isExportingPDF ? 'Exportation...' : 'Exporter le Permis en PDF'}</span>
            </button>
            <button
              id="btn-details-print"
              onClick={() => setShowCertificateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-400" />
              <span>Imprimer l'Attestation</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: INFRACTIONS & POINTS */}
      {activeTab === 'infractions' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 text-slate-800 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Relevé d'Infractions & Permis à Points</h3>
              <p className="text-xs text-slate-400">Réglementation de la circulation routière - République du Mali</p>
            </div>

            {/* Points Visual Gauge */}
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Solde de Points</span>
                <span className={`text-xl font-bold ${(license.points ?? 12) > 6 ? 'text-[#008543]' : 'text-red-600'}`}>
                  {license.points ?? 12} / 12 pts
                </span>
              </div>
            </div>
          </div>

          {paymentSuccessToast && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#008543] shrink-0" />
                <span>{paymentSuccessToast}</span>
              </div>
              <button
                onClick={() => setPaymentSuccessToast(null)}
                className="text-emerald-700 hover:text-emerald-900 p-1 text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {driverViolations.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-[#008543] mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-900">Aucune infraction enregistrée</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Le conducteur est en totale conformité avec le code de la route malien. Solde intact.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {driverViolations.map((v) => {
                const isPaid = v.paymentStatus === 'paid';
                return (
                  <div
                    key={v.id}
                    className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 border border-red-200 rounded text-[10px] font-bold uppercase">
                          {v.violationCategory}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900">{v.violationType}</h4>
                        {isPaid ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[10px] font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#008543]" />
                            RÉGLÉE (Trésor Public)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold">
                            EN ATTENTE DE PAIEMENT
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {v.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(v.timestamp).toLocaleString('fr-FR')}
                        </span>
                        <span>Agent: {v.officerBadge}</span>
                      </p>
                      {v.notes && (
                        <p className="text-[10px] text-slate-400 font-mono italic">
                          {v.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2 sm:shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200">
                      <div className="text-left sm:text-right">
                        <span className="text-sm font-bold text-slate-900 block font-mono">
                          {v.fineAmountFCFA.toLocaleString('fr-FR')} FCFA
                        </span>
                        <span className="text-[10px] text-red-600 font-bold">
                          -{v.pointsDeducted} pt(s) déduit(s)
                        </span>
                      </div>

                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => setSelectedViolationForPayment(v)}
                          className="px-3 py-1.5 bg-[#008543] hover:bg-[#007038] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Payer Mobile Money</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CRYPTO & SECURITY SPECS */}
      {activeTab === 'security' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 text-slate-800 text-xs shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-6 h-6 text-[#008543]" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Sécurité Cryptographique du Titre</h3>
              <p className="text-xs text-slate-400">Architecture de signature asymétrique ECDSA P-256 / SHA-256</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-slate-900">1. Signature Électronique DNTT</h4>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Les données d'identité et les droits de conduire sont condensés sous forme canonique puis signés
                avec la clé privée souveraine de la Direction Nationale des Transports Terrestres du Mali.
              </p>
              <div className="bg-slate-900 p-2.5 rounded-xl font-mono text-[9px] text-emerald-400 break-all">
                {license.signature || 'Signature ECDSA incorporée dans le QR'}
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h4 className="font-bold text-[#008543]">2. Contrôle 100% Autonome (Hors-Ligne)</h4>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Le terminal de l'agent de police ou de gendarmerie vérifie instantanément l'intégrité de la
                signature à l'aide de la clé publique DNTT embarquée. Aucune requête réseau ni connexion 4G/5G
                n'est requise lors du contrôle.
              </p>
              <div className="flex items-center gap-2 text-emerald-800 font-semibold text-[11px]">
                <CheckCircle2 className="w-4 h-4 text-[#008543]" />
                <span>Protection totale contre la falsification et la copie</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN HIGH-BRIGHTNESS QR MODAL */}
      {isFullscreenQR && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <button
              onClick={() => setIsFullscreenQR(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[10px] font-bold tracking-widest text-[#008543] uppercase block">
                RÉPUBLIQUE DU MALI • DNTT
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                {license.fullName}
              </h3>
              <p className="text-xs font-mono font-semibold text-slate-500">
                {license.licenseNumber}
              </p>
            </div>

            {/* High Contrast QR Code */}
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 shadow-inner inline-block">
              {qrString ? (
                <QRCodeSVG
                  value={qrString}
                  size={240}
                  level="M"
                  includeMargin={true}
                  fgColor="#000000"
                />
              ) : null}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                {getStatusBadge(license.status)}
              </div>
              <p className="text-[11px] text-slate-500">
                Présentez cet écran au scanner de l'agent de contrôle routier.
              </p>
            </div>

            <button
              onClick={() => setIsFullscreenQR(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* OFFICIAL ATTESTATION / PRINTABLE CERTIFICATE MODAL */}
      {showCertificateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto printable-modal-overlay">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-200 my-6 animate-in fade-in zoom-in-95 printable-document">
            
            {/* Modal Header / Actions */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3.5 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-[#008543]" />
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Attestation Officielle de Permis de Conduire Numérique
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-trigger-print"
                  onClick={handlePrintCertificate}
                  className="px-3.5 py-1.5 bg-[#008543] hover:bg-[#007038] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimer / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCertificateModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="border-2 border-emerald-800/60 rounded-2xl p-6 bg-emerald-50/20 space-y-5 text-slate-900 relative overflow-hidden">
              {/* Watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                <span className="text-7xl font-bold font-serif uppercase tracking-widest text-emerald-950">
                  RÉPUBLIQUE DU MALI
                </span>
              </div>

              {/* Official Header */}
              <div className="text-center space-y-1 border-b-2 border-emerald-800/30 pb-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="flex h-3.5 w-6 rounded overflow-hidden shadow-xs border border-slate-300">
                    <div className="w-1/3 bg-[#008543]"></div>
                    <div className="w-1/3 bg-[#FCD116]"></div>
                    <div className="w-1/3 bg-[#CE1126]"></div>
                  </div>
                  <span className="font-bold text-xs tracking-widest text-emerald-900 uppercase">
                    RÉPUBLIQUE DU MALI
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Un Peuple - Un But - Une Foi</p>
                <h2 className="text-base font-extrabold text-[#008543] uppercase tracking-wide pt-1">
                  DIRECTION NATIONALE DES TRANSPORTS TERRESTRES (DNTT)
                </h2>
                <p className="text-xs font-bold text-slate-800">
                  ATTESTATION OFFICIELLE DE VALIDITÉ DU TITRE DE CONDUITE
                </p>
              </div>

              {/* Content Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                {/* Photo */}
                <div className="flex flex-col items-center justify-center">
                  <div className="w-28 h-32 rounded-xl overflow-hidden border-2 border-emerald-700 shadow-sm bg-slate-100">
                    <img
                      src={license.photoUrl}
                      alt={license.fullName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 font-bold">
                    NINA: {license.nina}
                  </span>
                </div>

                {/* Driver Details */}
                <div className="sm:col-span-2 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 bg-white/80 p-3 rounded-xl border border-emerald-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Nom et Prénom :</span>
                      <strong className="text-slate-900 text-sm font-bold">{license.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">N° Permis (ID Unique) :</span>
                      <strong className="text-[#008543] font-mono text-sm font-bold">{license.licenseNumber}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Né(e) le :</span>
                      <span className="text-slate-800 font-medium">{license.dateOfBirth} à {license.placeOfBirth}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Groupe Sanguin :</span>
                      <strong className="text-rose-600 font-bold">{license.bloodGroup}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Date d'Émission :</span>
                      <span className="text-slate-800 font-medium">{license.issueDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold block">Date d'Expiration :</span>
                      <strong className="text-slate-900 font-bold">{license.expiryDate}</strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                    <div>
                      <span className="text-[10px] text-emerald-800 font-bold block">Catégories Autorisées :</span>
                      <div className="flex gap-1.5 mt-0.5">
                        {license.categories.map((c) => (
                          <span key={c} className="px-2 py-0.5 bg-[#008543] text-white rounded font-bold text-[10px]">
                            Cat. {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-emerald-800 font-bold block">Solde de Points :</span>
                      <span className="text-base font-bold text-[#008543]">{license.points ?? 12} / 12 pts</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* QR & Security Footer */}
              <div className="flex items-center justify-between border-t border-emerald-800/20 pt-3 text-[10px] text-slate-600">
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-950">Sécurité & Authenticité Numérique :</p>
                  <p className="font-mono text-[9px] text-slate-500">Signé ECDSA P-256 / SHA-256 DNTT Mali</p>
                  <p className="text-[9px] text-slate-400">Vérifiable 100% hors-ligne par les terminaux de police</p>
                </div>

                <div className="shrink-0 bg-white p-1.5 rounded-xl border border-emerald-200 shadow-xs">
                  {qrString && (
                    <QRCodeSVG
                      value={qrString}
                      size={68}
                      level="M"
                      includeMargin={false}
                      fgColor="#064e3b"
                    />
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* FINE PAYMENT MODAL */}
      <FinePaymentModal
        isOpen={!!selectedViolationForPayment}
        onClose={() => setSelectedViolationForPayment(null)}
        violation={selectedViolationForPayment}
        license={license}
        onPaymentSuccess={async (violationId, receiptNumber) => {
          await updateViolationPaymentStatus(violationId, 'paid', receiptNumber);
          setPaymentSuccessToast(`Amende réglée avec succès ! Quittance n° ${receiptNumber} émise par le Trésor Public.`);
          if (onRefreshViolations) {
            onRefreshViolations();
          }
        }}
      />

      {/* CITIZEN GUIDE & FAQ MODAL */}
      <CitizenGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        onOpenInstall={() => setShowInstallModal(true)}
      />

      {/* INSTALL APP MODAL */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
      />

      {/* UPDATE PHOTO MODAL */}
      <UpdatePhotoModal
        isOpen={showUpdatePhotoModal}
        onClose={() => setShowUpdatePhotoModal(false)}
        license={license}
        onPhotoUpdated={(updatedLic) => {
          onSelectLicense(updatedLic);
          if (onRefreshLicenses) {
            onRefreshLicenses();
          }
        }}
      />

    </div>
  );
};
