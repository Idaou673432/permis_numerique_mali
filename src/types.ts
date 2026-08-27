export type LicenseCategory = 'A1' | 'A' | 'B' | 'C' | 'D' | 'E';

export type LicenseStatus = 'active' | 'suspended' | 'expired' | 'revoked';

export type UserRole = 'driver' | 'officer' | 'admin';

export interface DriverLicense {
  id: string;
  licenseNumber: string; // Ex: ML-BKO-2024-884920
  fullName: string;
  nina: string; // Numéro d'Identification Nationale
  nif?: string; // Numéro d'Identification Fiscale
  dateOfBirth: string; // YYYY-MM-DD
  placeOfBirth: string; // Ex: Bamako, Mali
  gender: 'M' | 'F';
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  address: string;
  city: string;
  region: string; // Ex: Bamako, Koulikoro, Sikasso, Ségou, Kayes, Mopti, Gao, Tombouctou, Kidal, Taoudénit, Ménaka
  issueDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  categories: LicenseCategory[];
  issuingAuthority: string; // Ex: Direction Nationale des Transports Terrestres (DNTT)
  status: LicenseStatus;
  photoUrl: string;
  signature?: string; // Base64 ECDSA cryptographic signature
  keyFingerprint?: string;
  restrictions?: string; // Ex: Port de lunettes obligatoire (Code 01)
  points: number; // 12 points par défaut
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface QRPayload {
  v: number; // Version du protocole QR (ex: 1)
  id: string; // ID Permis
  num: string; // Numéro de permis
  nom: string; // Nom et prénom
  nina: string; // NINA
  cat: LicenseCategory[]; // Catégories
  iss: string; // Date émission YYYY-MM-DD
  exp: string; // Date expiration YYYY-MM-DD
  stat: LicenseStatus; // Statut
  ts: number; // Horodatage signature
  sig: string; // Signature ECDSA en Base64
}

export interface VerificationResult {
  status: 'valid' | 'invalid' | 'expired' | 'suspended' | 'forged';
  isSignatureValid: boolean;
  isExpired: boolean;
  message: string;
  details?: string;
  driverData?: QRPayload;
  fullLicense?: DriverLicense;
  verifiedAt: string;
  officerNotes?: string;
}

export interface Violation {
  id: string;
  licenseNumber: string;
  driverName: string;
  nina: string;
  vehiclePlate: string;
  violationType: string;
  violationCategory: 'mineure' | 'grave' | 'delit';
  fineAmountFCFA: number;
  pointsDeducted: number;
  location: string;
  city: string;
  officerBadge: string;
  officerName: string;
  officerId: string;
  timestamp: string;
  syncStatus: 'synced' | 'pending_sync';
  notes?: string;
  paymentStatus: 'unpaid' | 'paid' | 'contested';
}

export interface DNTTKeyPair {
  keyId: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk?: JsonWebKey;
  fingerprint: string;
  createdAt: string;
  algorithm: string;
}

export interface InfractionTemplate {
  code: string;
  label: string;
  category: 'mineure' | 'grave' | 'delit';
  amountFCFA: number;
  points: number;
  description: string;
}

export interface OfflineActivityLog {
  id: string;
  timestamp: string;
  method: 'qr_camera' | 'qr_image' | 'id_lookup';
  licenseNumber: string;
  driverName: string;
  nina?: string;
  status: 'valid' | 'invalid' | 'expired' | 'suspended' | 'forged';
  isSignatureValid: boolean;
  points?: number;
  officerBadge: string;
  officerName: string;
  location: string;
  details?: string;
  syncStatus: 'local_stored' | 'synced';
}

export type AdminRole = 'super_admin' | 'agent_dntt' | 'controleur_regional';

export interface AdminUser {
  id: string;
  username: string; // Identifiant / Matricule
  fullName: string;
  role: AdminRole;
  phone: string; // Ex: +223 70 12 34 56
  passcode: string; // Code d'accès (ex: 00223)
  agency: string; // Ex: DNTT Siège Bamako
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

