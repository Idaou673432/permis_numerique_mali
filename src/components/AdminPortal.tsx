import React, { useState } from 'react';
import { DriverLicense, LicenseCategory, LicenseStatus, Violation, DNTTKeyPair } from '../types';
import { saveDriverLicense, updateLicenseStatus, deleteLicense, deleteViolation } from '../lib/firebase';
import { generateDNTTKeyPair, DNTT_KEY_FINGERPRINT, DEFAULT_DNTT_PUBLIC_KEY_JWK, DEFAULT_DNTT_PRIVATE_KEY_JWK, signData, verifySignature } from '../lib/crypto';
import { MALIAN_REGIONS, CATEGORY_DESCRIPTIONS } from '../data/seedData';
import {
  Building2,
  PlusCircle,
  Users,
  KeyRound,
  FileCheck2,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Lock,
  RefreshCw,
  Download,
  Filter,
  ShieldCheck,
  Smartphone,
  Flame,
  Award,
  Sparkles,
  QrCode,
  Eye,
  Trash2,
  Edit3,
  Upload,
  Camera,
  Image as ImageIcon,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface AdminPortalProps {
  licenses: DriverLicense[];
  violations: Violation[];
  onRefresh: () => void;
  isOnline: boolean;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  licenses,
  violations,
  onRefresh,
  isOnline,
}) => {
  const [activeTab, setActiveTab] = useState<'directory' | 'issue' | 'crypto' | 'violations'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLicenseForQR, setSelectedLicenseForQR] = useState<DriverLicense | null>(null);

  // Global Action Feedback & Alert State
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Deletion Modal State
  const [deletingLicense, setDeletingLicense] = useState<DriverLicense | null>(null);
  const [deletingViolation, setDeletingViolation] = useState<Violation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New License Form State
  const [newFullName, setNewFullName] = useState('');
  const [newNina, setNewNina] = useState('');
  const [newNif, setNewNif] = useState('');
  const [isCustomId, setIsCustomId] = useState(false);
  const [customLicenseNumber, setCustomLicenseNumber] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newDob, setNewDob] = useState('1995-05-15');
  const [newPob, setNewPob] = useState('Bamako');
  const [newGender, setNewGender] = useState<'M' | 'F'>('M');
  const [newBloodGroup, setNewBloodGroup] = useState<DriverLicense['bloodGroup']>('O+');
  const [newAddress, setNewAddress] = useState('Badalabougou Rue 12');
  const [newCity, setNewCity] = useState('Bamako');
  const [newRegion, setNewRegion] = useState(MALIAN_REGIONS[0]);
  const [newCategories, setNewCategories] = useState<LicenseCategory[]>(['B']);
  const [newPhotoUrl, setNewPhotoUrl] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=face');
  const [newRestrictions, setNewRestrictions] = useState('Aucune restriction');
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueSuccessMessage, setIssueSuccessMessage] = useState<string | null>(null);

  // Edit License Modal State
  const [editingLicense, setEditingLicense] = useState<DriverLicense | null>(null);
  const [editCategories, setEditCategories] = useState<LicenseCategory[]>([]);
  const [editPhotoUrl, setEditPhotoUrl] = useState<string>('');
  const [editRestrictions, setEditRestrictions] = useState<string>('');
  const [editStatus, setEditStatus] = useState<LicenseStatus>('active');
  const [editPoints, setEditPoints] = useState<number>(12);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

  // Open Edit Modal for a License
  const handleOpenEdit = (lic: DriverLicense) => {
    setEditingLicense(lic);
    setEditCategories([...lic.categories]);
    setEditPhotoUrl(lic.photoUrl);
    setEditRestrictions(lic.restrictions || 'Aucune restriction');
    setEditStatus(lic.status);
    setEditPoints(lic.points ?? 12);
    setEditErrorMessage(null);
  };

  // Toggle category in Edit Modal
  const toggleEditCategory = (cat: LicenseCategory) => {
    if (editCategories.includes(cat)) {
      if (editCategories.length > 1) {
        setEditCategories(editCategories.filter((c) => c !== cat));
        setEditErrorMessage(null);
      } else {
        setEditErrorMessage('Le permis doit comporter au moins une catégorie autorisée.');
      }
    } else {
      setEditCategories([...editCategories, cat]);
      setEditErrorMessage(null);
    }
  };

  // Handle local file upload for photo (converts to base64)
  const handlePhotoFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setActionFeedback({
        type: 'error',
        message: 'Veuillez sélectionner un fichier image valide (JPG, PNG, WebP).',
      });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setActionFeedback({
        type: 'error',
        message: "L'image sélectionnée est trop volumineuse (maximum 3 Mo).",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setter(result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save modified license
  const handleSaveEditedLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLicense) return;

    if (editCategories.length === 0) {
      setEditErrorMessage('Veuillez conserver au moins une catégorie autorisée.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const updatedLicense: DriverLicense = {
        ...editingLicense,
        categories: editCategories,
        photoUrl: editPhotoUrl || editingLicense.photoUrl,
        restrictions: editRestrictions,
        status: editStatus,
        points: editPoints,
        updatedAt: new Date().toISOString(),
        signature: undefined, // Will be re-signed automatically in saveDriverLicense
      };

      await saveDriverLicense(updatedLicense);
      setEditingLicense(null);
      onRefresh();
      setActionFeedback({
        type: 'success',
        message: `Permis de ${updatedLicense.fullName} mis à jour avec succès (catégories et informations appliquées).`,
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Erreur lors de la mise à jour: ' + err.message,
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Status Change Handler (Suspend / Activate)
  const handleUpdateStatus = async (licenseId: string, status: LicenseStatus, restrictions?: string) => {
    try {
      await updateLicenseStatus(licenseId, status, restrictions);
      onRefresh();
      setActionFeedback({
        type: 'success',
        message: `Statut du permis mis à jour : ${status === 'active' ? 'Activé (En règle)' : 'Suspendu'}.`,
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Erreur lors du changement de statut: ' + err.message,
      });
    }
  };

  // Delete License Handler (Permanent Deletion)
  const handleConfirmDeleteLicense = async () => {
    if (!deletingLicense) return;
    setIsDeleting(true);
    try {
      await deleteLicense(deletingLicense.id);
      const deletedName = deletingLicense.fullName;
      const deletedNum = deletingLicense.licenseNumber;
      setDeletingLicense(null);
      onRefresh();
      setActionFeedback({
        type: 'success',
        message: `Le permis de ${deletedName} (${deletedNum}) a été définitivement supprimé du registre.`,
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Erreur lors de la suppression du permis: ' + err.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete Violation Handler (Permanent Deletion)
  const handleConfirmDeleteViolation = async () => {
    if (!deletingViolation) return;
    setIsDeleting(true);
    try {
      await deleteViolation(deletingViolation.id);
      const driver = deletingViolation.driverName;
      const motif = deletingViolation.violationType;
      setDeletingViolation(null);
      onRefresh();
      setActionFeedback({
        type: 'success',
        message: `Le procès-verbal de contravention pour ${driver} (${motif}) a été supprimé.`,
      });
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        message: 'Erreur lors de la suppression de la contravention: ' + err.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Crypto Management State
  const [currentFingerprint, setCurrentFingerprint] = useState(DNTT_KEY_FINGERPRINT);
  const [publicKeyJson, setPublicKeyJson] = useState(JSON.stringify(DEFAULT_DNTT_PUBLIC_KEY_JWK, null, 2));
  const [testPayload, setTestPayload] = useState('{"id":"TEST-ML-01","nom":"Mali Test"}');
  const [testSignature, setTestSignature] = useState('');
  const [testResult, setTestResult] = useState<boolean | null>(null);

  // Filtered Licenses
  const filteredLicenses = licenses.filter((lic) => {
    const matchesSearch =
      lic.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lic.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lic.nina.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lic.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lic.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Statistics
  const totalLicenses = licenses.length;
  const activeLicenses = licenses.filter((l) => l.status === 'active').length;
  const suspendedLicenses = licenses.filter((l) => l.status === 'suspended').length;
  const totalFinesFCFA = violations.reduce((sum, v) => sum + (v.fineAmountFCFA || 0), 0);

  // Handle Category Toggle in Form
  const toggleCategory = (cat: LicenseCategory) => {
    if (newCategories.includes(cat)) {
      if (newCategories.length > 1) {
        setNewCategories(newCategories.filter((c) => c !== cat));
      }
    } else {
      setNewCategories([...newCategories, cat]);
    }
  };

  // Issue New License with Cryptographic Signature
  const handleIssueLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsIssuing(true);
    setIssueSuccessMessage(null);

    try {
      let licenseNumber = customLicenseNumber.trim().toUpperCase();
      
      if (!isCustomId || !licenseNumber) {
        const currentYear = new Date().getFullYear();
        const randomId = Math.floor(100000 + Math.random() * 900000);
        const regionCode = newRegion.includes('Bamako') ? 'BKO' : newRegion.includes('Sikasso') ? 'SIK' : 'ML';
        licenseNumber = `ML-${regionCode}-${currentYear}-${randomId}`;
      } else {
        // Validate uniqueness of custom ID
        const existing = licenses.find(
          (l) => l.licenseNumber.toUpperCase() === licenseNumber || l.id.toUpperCase() === licenseNumber
        );
        if (existing) {
          throw new Error(`L'ID Unique / N° de Permis "${licenseNumber}" est déjà attribué à ${existing.fullName}.`);
        }
      }

      const id = `lic-${Date.now()}`;
      const issueDate = new Date().toISOString().split('T')[0];
      const expiryDate = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const newLicense: DriverLicense = {
        id,
        licenseNumber,
        fullName: newFullName.toUpperCase(),
        nina: newNina.trim().toUpperCase(),
        nif: newNif ? newNif.trim().toUpperCase() : undefined,
        dateOfBirth: newDob,
        placeOfBirth: newPob,
        gender: newGender,
        bloodGroup: newBloodGroup,
        address: newAddress,
        city: newCity,
        region: newRegion,
        issueDate,
        expiryDate,
        categories: newCategories,
        issuingAuthority: 'Direction Nationale des Transports Terrestres (DNTT)',
        status: 'active',
        photoUrl: newPhotoUrl,
        points: 12,
        restrictions: newRestrictions,
        createdAt: new Date().toISOString(),
      };

      await saveDriverLicense(newLicense);
      setIssueSuccessMessage(`Permis biométrique enregistré avec succès avec l'ID Unique officiel : ${licenseNumber}. Ce numéro est prêt pour le contrôle routier par la police.`);
      onRefresh();
      
      // Reset form
      setNewFullName('');
      setNewNina('');
      setNewNif('');
      setCustomLicenseNumber('');
    } catch (error: any) {
      alert('Erreur lors de la génération du permis: ' + error.message);
    } finally {
      setIsIssuing(false);
    }
  };

  // Generate New Authority Keypair
  const handleGenerateNewKeys = async () => {
    if (!confirm('Générer une nouvelle paire de clés ECDSA DNTT ? Les anciens permis resteront vérifiables avec la clé antérieure.')) {
      return;
    }
    try {
      const keys = await generateDNTTKeyPair();
      setCurrentFingerprint(keys.fingerprint);
      setPublicKeyJson(JSON.stringify(keys.publicKeyJwk, null, 2));
      alert(`Nouvelle paire de clés ECDSA P-256 générée !\nEmpreinte: ${keys.fingerprint}`);
    } catch (e: any) {
      alert('Erreur: ' + e.message);
    }
  };

  // Test Sign & Verify
  const handleTestSign = async () => {
    try {
      const sig = await signData(testPayload);
      setTestSignature(sig);
      const isOk = await verifySignature(testPayload, sig);
      setTestResult(isOk);
    } catch (e: any) {
      alert('Erreur test: ' + e.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Admin Executive Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 text-slate-900 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#008543] flex items-center justify-center font-bold">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
                DIRECTION NATIONALE DES TRANSPORTS TERRESTRES
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                PORTAIL DNTT
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Système central de délivrance, révocation et signature des permis de conduire de la République du Mali
            </p>
          </div>
        </div>

        {/* Global Stats Counter */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 block font-semibold">Total Titres</span>
            <span className="text-sm font-bold text-slate-900 font-mono">{totalLicenses}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] text-[#008543] block font-semibold">Actifs</span>
            <span className="text-sm font-bold text-[#008543] font-mono">{activeLicenses}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] text-amber-700 block font-semibold">Suspendus</span>
            <span className="text-sm font-bold text-amber-700 font-mono">{suspendedLicenses}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-center">
            <span className="text-[10px] text-slate-600 block font-semibold">Amendes</span>
            <span className="text-sm font-bold text-slate-900 font-mono">
              {(totalFinesFCFA / 1000).toFixed(0)}k FCFA
            </span>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionFeedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : actionFeedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#008543] shrink-0" />}
            {actionFeedback.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
            {actionFeedback.type === 'info' && <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-slate-500 hover:text-slate-800 px-2 py-0.5 text-[11px] underline"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto pb-1">
        <button
          id="admin-tab-directory"
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition ${
            activeTab === 'directory'
              ? 'bg-[#008543] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registre des Permis ({licenses.length})</span>
        </button>

        <button
          id="admin-tab-issue"
          onClick={() => setActiveTab('issue')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition ${
            activeTab === 'issue'
              ? 'bg-[#008543] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          <span>Délivrer un Permis (Signature ECDSA)</span>
        </button>

        <button
          id="admin-tab-crypto"
          onClick={() => setActiveTab('crypto')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition ${
            activeTab === 'crypto'
              ? 'bg-[#008543] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Clés Cryptographiques & Sécurité</span>
        </button>

        <button
          id="admin-tab-violations"
          onClick={() => setActiveTab('violations')}
          className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition ${
            activeTab === 'violations'
              ? 'bg-[#008543] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Infractions & Amendes ({violations.length})</span>
        </button>
      </div>

      {/* TAB 1: REGISTRE DES PERMIS */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          
          {/* Search & Status Filters */}
          <div className="bg-white border border-slate-200 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher nom, NINA, permis..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              {['all', 'active', 'suspended', 'expired', 'revoked'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                  }`}
                >
                  {st === 'all' ? 'Tous' : st === 'active' ? 'Actifs' : st === 'suspended' ? 'Suspendus' : st === 'expired' ? 'Expirés' : 'Révoqués'}
                </button>
              ))}
            </div>
          </div>

          {/* Licenses Table / List */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Conducteur</th>
                    <th className="p-3.5">N° Permis & NINA</th>
                    <th className="p-3.5">Catégories</th>
                    <th className="p-3.5">Validité</th>
                    <th className="p-3.5">Points</th>
                    <th className="p-3.5">Statut</th>
                    <th className="p-3.5 text-right">Actions DNTT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLicenses.map((lic) => (
                    <tr key={lic.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={lic.photoUrl}
                            alt={lic.fullName}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-xl object-cover border border-slate-200"
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{lic.fullName}</span>
                            <span className="text-[10px] text-slate-500">{lic.city} ({lic.region})</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#008543] font-bold block">{lic.licenseNumber}</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(lic.licenseNumber);
                              setCopiedId(lic.licenseNumber);
                              setTimeout(() => setCopiedId(null), 2000);
                            }}
                            title="Copier l'ID Unique"
                            className="p-1 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition"
                          >
                            {copiedId === lic.licenseNumber ? (
                              <CheckCircle2 className="w-3 h-3 text-[#008543]" />
                            ) : (
                              <KeyRound className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <span className="text-[10px] text-slate-500">NINA: {lic.nina}</span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex gap-1 flex-wrap">
                          {lic.categories.map((c) => (
                            <span key={c} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-bold">
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <span className="text-slate-800 block font-medium">{lic.expiryDate}</span>
                        <span className="text-[10px] text-slate-400">Émis le {lic.issueDate}</span>
                      </td>

                      <td className="p-3.5">
                        <span className={`font-bold font-mono ${(lic.points ?? 12) > 6 ? 'text-[#008543]' : 'text-rose-600'}`}>
                          {lic.points ?? 12}/12 pts
                        </span>
                      </td>

                      <td className="p-3.5">
                        {lic.status === 'active' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            ACTIF
                          </span>
                        )}
                        {lic.status === 'suspended' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            SUSPENDU
                          </span>
                        )}
                        {lic.status === 'expired' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                            EXPIRÉ
                          </span>
                        )}
                        {lic.status === 'revoked' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                            RÉVOQUÉ
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(lic)}
                            title="Modifier catégories & photo d'identité"
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-semibold rounded-lg border border-slate-300 transition flex items-center gap-1"
                          >
                            <Edit3 className="w-3 h-3 text-[#008543]" />
                            <span>Modifier</span>
                          </button>

                          <button
                            onClick={() => setSelectedLicenseForQR(lic)}
                            title="Voir QR Code sécurisé"
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition"
                          >
                            <QrCode className="w-3.5 h-3.5 text-[#008543]" />
                          </button>

                          {lic.status === 'active' ? (
                            <button
                              onClick={() => handleUpdateStatus(lic.id, 'suspended', 'Suspension administrative par la DNTT')}
                              title="Suspendre le permis"
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-semibold rounded-lg border border-amber-200 transition"
                            >
                              Suspendre
                            </button>
                          ) : (
                            <button
                              onClick={() => handleUpdateStatus(lic.id, 'active', 'Aucune')}
                              title="Réactiver le permis"
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-lg border border-emerald-200 transition"
                            >
                              Activer
                            </button>
                          )}

                          <button
                            id={`btn-delete-license-${lic.id}`}
                            onClick={() => setDeletingLicense(lic)}
                            title="Supprimer définitivement du registre"
                            className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-200 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: DÉLIVRER UN NOUVEAU PERMIS */}
      {activeTab === 'issue' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 text-slate-900 space-y-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#008543] flex items-center justify-center font-bold">
              <PlusCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Formulaire de Délivrance de Permis Numérique</h3>
              <p className="text-xs text-slate-500">
                Génération automatique du payload conforme et signature avec la clé privée ECDSA de l'État Malien
              </p>
            </div>
          </div>

          {issueSuccessMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-[#008543] shrink-0" />
              <span>{issueSuccessMessage}</span>
            </div>
          )}

          <form onSubmit={handleIssueLicense} className="space-y-4 text-xs">
            {/* Unique License ID Configuration Section */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-[#008543]" />
                    Numéro & Identifiant Unique du Permis (ID de Contrôle)
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Cet identifiant unique sera communiqué par le citoyen aux policiers lors des contrôles routiers.
                  </p>
                </div>

                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsCustomId(false)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      !isCustomId ? 'bg-[#008543] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Auto-Génération DNTT
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCustomId(true)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      isCustomId ? 'bg-[#008543] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ID Personnalisé / Manuel
                  </button>
                </div>
              </div>

              {isCustomId ? (
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Saisir l'ID Unique Personnalisé * (Ex: ML-2024-B-78901 ou N° Officiel)
                  </label>
                  <input
                    type="text"
                    value={customLicenseNumber}
                    onChange={(e) => setCustomLicenseNumber(e.target.value)}
                    placeholder="Ex: ML-BKO-2024-998877"
                    required
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              ) : (
                <div className="p-2.5 bg-white rounded-xl border border-dashed border-emerald-300 flex items-center justify-between text-xs">
                  <span className="text-slate-600">
                    Modèle d'ID généré : <strong className="font-mono text-[#008543]">ML-{newRegion.includes('Bamako') ? 'BKO' : 'ML'}-{new Date().getFullYear()}-[6 CHIFFRES]</strong>
                  </span>
                  <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                    Garanti Unique & Conforme
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* Full Name */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Nom et Prénoms *</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Ex: Sékou KANTÉ"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                />
              </div>

              {/* NINA */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Numéro NINA (Identifiant National) *</label>
                <input
                  type="text"
                  value={newNina}
                  onChange={(e) => setNewNina(e.target.value)}
                  placeholder="Ex: 1048291049281M"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* NIF */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">NIF (Identifiant Fiscal)</label>
                <input
                  type="text"
                  value={newNif}
                  onChange={(e) => setNewNif(e.target.value)}
                  placeholder="Ex: 084920194K"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* DOB */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Date de Naissance *</label>
                <input
                  type="date"
                  value={newDob}
                  onChange={(e) => setNewDob(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* POB */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Lieu de Naissance *</label>
                <input
                  type="text"
                  value={newPob}
                  onChange={(e) => setNewPob(e.target.value)}
                  placeholder="Ex: Bamako (Commune III)"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Blood Group */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Groupe Sanguin</label>
                <select
                  value={newBloodGroup}
                  onChange={(e) => setNewBloodGroup(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              {/* Region */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Région Administrative</label>
                <select
                  value={newRegion}
                  onChange={(e) => setNewRegion(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {MALIAN_REGIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* City & Address */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Ville & Commune</label>
                <input
                  type="text"
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  placeholder="Ex: Bamako"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Photo Input (Upload, Presets or URL) */}
              <div className="sm:col-span-2 md:col-span-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-[#008543]" />
                    Photo d'identité du Titulaire (Téléverser ou Sélectionner) *
                  </label>
                  <label className="cursor-pointer px-3 py-1 bg-[#008543] hover:bg-[#007038] text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs">
                    <Upload className="w-3 h-3" />
                    <span>Choisir une photo (Fichier local)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoFileUpload(e, setNewPhotoUrl)}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative w-14 h-16 rounded-xl overflow-hidden border border-slate-300 shrink-0 bg-slate-200 shadow-xs">
                    <img
                      src={newPhotoUrl}
                      alt="Aperçu photo"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="text"
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      placeholder="Ou collez directement une URL d'image (ex: https://...)"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-900 text-[11px] focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    
                    {/* Quick photo avatars */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      <span className="text-[10px] text-slate-500 font-medium">Exemples :</span>
                      {[
                        { label: 'Homme 1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face' },
                        { label: 'Femme 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=face' },
                        { label: 'Homme 2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face' },
                        { label: 'Femme 2', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setNewPhotoUrl(preset.url)}
                          className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-600 hover:text-slate-900 transition shrink-0"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Authorized Categories Picker */}
            <div>
              <label className="block text-slate-700 font-semibold mb-2">
                Catégories de Conduite Autorisées (Cocher au moins une) *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {(['A1', 'A', 'B', 'C', 'D', 'E'] as LicenseCategory[]).map((cat) => {
                  const isChecked = newCategories.includes(cat);
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`p-2.5 rounded-2xl border text-left font-semibold transition flex flex-col justify-between ${
                        isChecked
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">Cat. {cat}</span>
                        {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-[#008543]" />}
                      </div>
                      <span className="text-[9px] font-normal text-slate-500 mt-1">
                        {CATEGORY_DESCRIPTIONS[cat]?.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Restrictions */}
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                Mentions & Restrictions Médicales / Techniques
              </label>
              <input
                type="text"
                value={newRestrictions}
                onChange={(e) => setNewRestrictions(e.target.value)}
                placeholder="Ex: Port de verres correcteurs obligatoire (Code 01)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                id="btn-submit-issue-license"
                disabled={isIssuing}
                className="px-6 py-3 bg-[#008543] hover:bg-[#007038] text-white font-semibold rounded-xl shadow-xs transition flex items-center gap-2 text-xs"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>{isIssuing ? 'Génération & Signature...' : 'Générer & Signer le Permis Numérique'}</span>
              </button>
            </div>

          </form>
        </div>
      )}

      {/* TAB 3: GESTION CRYPTOGRAPHIQUE ECDSA */}
      {activeTab === 'crypto' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 text-slate-900 space-y-6 text-xs shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Gestionnaire de Clés Asymétriques DNTT</h3>
                <p className="text-xs text-slate-500">
                  Algorithme ECDSA standardisé NIST P-256 avec hachage SHA-256 (W3C Web Crypto API)
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateNewKeys}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold rounded-xl border border-slate-200 transition flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Générer Nouveau Bi-Clé</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Key Pair Specs */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900">Clé Publique Officielle DNTT</h4>
                <span className="font-mono text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                  {currentFingerprint}
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Cette clé est intégrée dans l'application de contrôle des forces de l'ordre pour authentifier les permis hors-ligne.
              </p>
              <textarea
                readOnly
                value={publicKeyJson}
                rows={7}
                className="w-full bg-slate-950 font-mono text-[10px] text-emerald-400 p-3 rounded-xl border border-slate-800 outline-none resize-none"
              />
            </div>

            {/* Test Bench Sign & Verify */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-900">Banc d'Essai Cryptographique</h4>
              <p className="text-slate-500 text-[11px]">
                Testez la conformité de signature et vérification en temps réel.
              </p>

              <div>
                <label className="block text-slate-600 text-[10px] font-semibold mb-1">Payload JSON de test :</label>
                <input
                  type="text"
                  value={testPayload}
                  onChange={(e) => setTestPayload(e.target.value)}
                  className="w-full bg-white text-slate-900 font-mono text-[11px] p-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleTestSign}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-xs"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Signer avec Clé Privée & Vérifier avec Clé Publique</span>
              </button>

              {testSignature && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 block">Signature Base64 générée :</span>
                  <div className="p-2 bg-white rounded-xl border border-slate-200 font-mono text-[9px] text-amber-700 break-all">
                    {testSignature}
                  </div>
                  {testResult === true && (
                    <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-semibold flex items-center gap-1.5 mt-2">
                      <CheckCircle2 className="w-4 h-4 text-[#008543]" />
                      <span>Signature ECDSA validée avec succès à 100% !</span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* TAB 4: INFRACTIONS & AMENDES */}
      {activeTab === 'violations' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 text-slate-900 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Registre Central des Infractions & Procès-Verbaux</h3>
              <p className="text-xs text-slate-500">Total : {violations.length} contravention(s) constatée(s)</p>
            </div>
            <span className="text-sm font-bold text-amber-700 font-mono">
              Recouvrement estimé : {totalFinesFCFA.toLocaleString('fr-FR')} FCFA
            </span>
          </div>

          {violations.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-10 h-10 text-[#008543] mx-auto mb-2" />
              <p className="text-xs text-slate-500">Aucun procès-verbal n'a encore été transmis.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Conducteur & NINA</th>
                    <th className="p-3">Immatriculation</th>
                    <th className="p-3">Motif de l'Infraction</th>
                    <th className="p-3">Lieu & Date</th>
                    <th className="p-3">Amende</th>
                    <th className="p-3">Statut Sync</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {violations.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3">
                        <span className="font-bold text-slate-900 block">{v.driverName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{v.licenseNumber}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{v.vehiclePlate}</td>
                      <td className="p-3">
                        <span className="font-medium text-slate-800">{v.violationType}</span>
                        <span className="text-[10px] text-rose-600 block">-{v.pointsDeducted} pt(s)</span>
                      </td>
                      <td className="p-3">
                        <span>{v.location}</span>
                        <span className="text-[10px] text-slate-400 block">
                          {new Date(v.timestamp).toLocaleString('fr-FR')}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">
                        {v.fineAmountFCFA.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            v.syncStatus === 'synced'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {v.syncStatus === 'synced' ? 'Synchronisé' : 'En attente'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          id={`btn-delete-violation-${v.id}`}
                          onClick={() => setDeletingViolation(v)}
                          title="Supprimer ce procès-verbal"
                          className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 hover:border-rose-200 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* QR MODAL FROM DIRECTORY */}
      {selectedLicenseForQR && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl relative border border-slate-200 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900">
              QR Code Sécurisé — {selectedLicenseForQR.fullName}
            </h3>
            <p className="text-xs font-mono text-slate-600">
              {selectedLicenseForQR.licenseNumber}
            </p>
            <div className="bg-white p-3 rounded-2xl border border-slate-200 inline-block shadow-inner">
              <QRCodeSVG
                value={JSON.stringify({
                  v: 1,
                  id: selectedLicenseForQR.id,
                  num: selectedLicenseForQR.licenseNumber,
                  nom: selectedLicenseForQR.fullName,
                  nina: selectedLicenseForQR.nina,
                  cat: selectedLicenseForQR.categories,
                  iss: selectedLicenseForQR.issueDate,
                  exp: selectedLicenseForQR.expiryDate,
                  stat: selectedLicenseForQR.status,
                  ts: Math.floor(Date.now() / 1000),
                  sig: selectedLicenseForQR.signature || 'DNTT_MALI_SIGNATURE',
                })}
                size={220}
                level="M"
              />
            </div>
            <button
              onClick={() => setSelectedLicenseForQR(null)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* EDIT LICENSE MODAL (CATEGORIES & PHOTO MANAGEMENT) */}
      {editingLicense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-2xl w-full text-slate-900 space-y-5 shadow-2xl relative border border-slate-200 animate-in fade-in my-8">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#008543] flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Modifier le Permis • {editingLicense.fullName}
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    N° Permis : <strong className="text-[#008543]">{editingLicense.licenseNumber}</strong> • NINA : {editingLicense.nina}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEditingLicense(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedLicense} className="space-y-4 text-xs">
              
              {/* SECTION 1: PHOTO MANAGEMENT */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-[#008543]" />
                    Photo d'identité du Titulaire (Changer la photo)
                  </label>
                  
                  {/* File Upload Button */}
                  <label className="cursor-pointer px-3 py-1.5 bg-[#008543] hover:bg-[#007038] text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Téléverser une photo (Fichier local)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handlePhotoFileUpload(e, setEditPhotoUrl)}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-2xl overflow-hidden border-2 border-slate-300 shrink-0 bg-slate-200 shadow-sm">
                    <img
                      src={editPhotoUrl || editingLicense.photoUrl}
                      alt={editingLicense.fullName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[8px] px-1 py-0.5 rounded font-mono">
                      Aperçu
                    </div>
                  </div>

                  <div className="flex-1 space-y-2">
                    <label className="block text-slate-600 font-semibold text-[11px]">
                      Ou saisissez / collez une URL d'image :
                    </label>
                    <input
                      type="text"
                      value={editPhotoUrl}
                      onChange={(e) => setEditPhotoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:ring-2 focus:ring-emerald-500 outline-none font-medium"
                    />

                    {/* Presets */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                      <span className="text-[10px] text-slate-500 font-semibold">Exemples :</span>
                      {[
                        { label: 'Homme 1', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face' },
                        { label: 'Femme 1', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=face' },
                        { label: 'Homme 2', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face' },
                        { label: 'Femme 2', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setEditPhotoUrl(preset.url)}
                          className="px-2 py-0.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-700 transition shrink-0 font-medium"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CATEGORY MANAGEMENT (ADD / REMOVE / MODIFY) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-slate-800 font-bold text-xs flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#008543]" />
                      Gestion des Catégories de Conduite (Ajouter / Supprimer)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Cliquez sur une catégorie pour l'activer ou la retirer du permis.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[#008543] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                    {editCategories.length} catégorie(s) active(s)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {(['A1', 'A', 'B', 'C', 'D', 'E'] as LicenseCategory[]).map((cat) => {
                    const isChecked = editCategories.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleEditCategory(cat)}
                        className={`p-3 rounded-2xl border text-left font-semibold transition flex flex-col justify-between ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-xs ring-1 ring-emerald-500/20'
                            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">Cat. {cat}</span>
                          {isChecked ? (
                            <span className="p-0.5 rounded-full bg-emerald-600 text-white">
                              <CheckCircle2 className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-normal">Retirée</span>
                          )}
                        </div>
                        <span className="text-[9px] font-normal text-slate-500 mt-1 line-clamp-2">
                          {CATEGORY_DESCRIPTIONS[cat]?.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: STATUS & RESTRICTIONS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Statut Administratif du Permis
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as LicenseStatus)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="active">Valide & Actif (En règle)</option>
                    <option value="suspended">Suspendu (Temporairement)</option>
                    <option value="expired">Expiré (À renouveler)</option>
                    <option value="revoked">Révoqué (Annulé)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Solde de Points (sur 12)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={12}
                    value={editPoints}
                    onChange={(e) => setEditPoints(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">
                    Restrictions & Mentions Spéciales
                  </label>
                  <input
                    type="text"
                    value={editRestrictions}
                    onChange={(e) => setEditRestrictions(e.target.value)}
                    placeholder="Ex: Port de verres correcteurs obligatoire"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLicense(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 bg-[#008543] hover:bg-[#007038] text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>{isSavingEdit ? 'Enregistrement & Signature...' : 'Enregistrer les Modifications'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION PERMIS */}
      {deletingLicense && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-slate-900 space-y-5 shadow-2xl relative border border-slate-200 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Supprimer le Permis du Registre
                </h3>
                <p className="text-xs text-slate-500">
                  Cette action administrative est irréversible.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={deletingLicense.photoUrl}
                  alt={deletingLicense.fullName}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-300"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{deletingLicense.fullName}</h4>
                  <p className="text-[11px] font-mono text-slate-600 font-semibold">{deletingLicense.licenseNumber}</p>
                  <p className="text-[10px] text-slate-400">NINA: {deletingLicense.nina} | {deletingLicense.city}</p>
                </div>
              </div>

              <div className="text-[11px] text-rose-700 bg-rose-50/70 border border-rose-200 p-2.5 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Le titre sera radié du registre national DNTT et ne pourra plus être validé par les forces de l'ordre lors des contrôles routiers.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingLicense(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Annuler
              </button>
              <button
                type="button"
                id="btn-confirm-delete-license"
                disabled={isDeleting}
                onClick={handleConfirmDeleteLicense}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Suppression en cours...' : 'Confirmer la Radiation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION CONTRAVENTION / PV */}
      {deletingViolation && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full text-slate-900 space-y-5 shadow-2xl relative border border-slate-200 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Supprimer le Procès-Verbal
                </h3>
                <p className="text-xs text-slate-500">
                  Retrait définitif de cette infraction du registre.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Conducteur :</span>
                <span className="font-bold text-slate-900">{deletingViolation.driverName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Immatriculation :</span>
                <span className="font-mono font-bold text-slate-800">{deletingViolation.vehiclePlate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Motif infraction :</span>
                <span className="font-medium text-rose-600">{deletingViolation.violationType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Montant amende :</span>
                <span className="font-mono font-bold text-slate-900">
                  {deletingViolation.fineAmountFCFA.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingViolation(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Annuler
              </button>
              <button
                type="button"
                id="btn-confirm-delete-violation"
                disabled={isDeleting}
                onClick={handleConfirmDeleteViolation}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-xs flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? 'Suppression...' : 'Supprimer ce PV'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
