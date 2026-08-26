import React, { useState } from 'react';
import {
  X,
  Shield,
  HelpCircle,
  QrCode,
  Flame,
  Phone,
  Car,
  Bike,
  Truck,
  Bus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CreditCard,
  Download,
  Smartphone,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface CitizenGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CitizenGuideModal: React.FC<CitizenGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeSection, setActiveSection] = useState<'control' | 'points' | 'categories' | 'payment' | 'emergency'>('control');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative border border-slate-200 my-6 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#008543] font-bold shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Guide Citoyen & FAQ Officielle
                </h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                  DNTT Mali
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tout savoir sur le permis numérique, les contrôles et vos droits
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveSection('control')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeSection === 'control'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-[#008543]" />
            <span>Contrôle Routier</span>
          </button>

          <button
            onClick={() => setActiveSection('points')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeSection === 'points'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Permis à Points (12 pts)</span>
          </button>

          <button
            onClick={() => setActiveSection('categories')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeSection === 'categories'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-blue-600" />
            <span>Catégories</span>
          </button>

          <button
            onClick={() => setActiveSection('payment')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeSection === 'payment'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
            <span>Paiement Amendes</span>
          </button>

          <button
            onClick={() => setActiveSection('emergency')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
              activeSection === 'emergency'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Phone className="w-3.5 h-3.5 text-rose-600" />
            <span>Numéros d'Urgence</span>
          </button>
        </div>

        {/* Section 1: Contrôle Routier */}
        {activeSection === 'control' && (
          <div className="space-y-3.5 text-xs text-slate-700 max-h-[50vh] overflow-y-auto pr-1">
            <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4 text-[#008543]" />
                <h4>Comment présenter mon permis lors d'un contrôle de police ou gendarmerie ?</h4>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Il vous suffit d'ouvrir l'application sur votre smartphone et de présenter soit votre <strong>QR Code sécurisé</strong> (cliquez sur "QR Plein Écran"), soit votre <strong>N° Unique de Permis</strong> (ex: <span className="font-mono font-bold">ML-BKO-2024-00189</span>).
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <Smartphone className="w-4 h-4 text-blue-600" />
                <h4>Est-ce que le permis numérique fonctionne sans connexion Internet ?</h4>
              </div>
              <p className="text-slate-600 leading-relaxed">
                <strong>Oui, à 100%.</strong> Le permis est stocké localement sur votre téléphone et sécurisé par une <strong>signature cryptographique souveraine ECDSA</strong>. Les agents de contrôle disposent de terminaux capables de valider l'authenticité de votre QR code sans aucun réseau mobile.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-slate-900 font-bold">
                <FileText className="w-4 h-4 text-amber-600" />
                <h4>Puis-je imprimer une version papier de secours ?</h4>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Oui. Vous pouvez cliquer sur <strong>« Attestation PDF / Imprimer »</strong> pour obtenir une version papier officielle certifiée avec le filigrane de la République du Mali, votre photo et le QR code de contrôle.
              </p>
            </div>
          </div>
        )}

        {/* Section 2: Permis à Points */}
        {activeSection === 'points' && (
          <div className="space-y-3.5 text-xs text-slate-700 max-h-[50vh] overflow-y-auto pr-1">
            <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                <Flame className="w-4 h-4 text-amber-600" />
                <h4>Barème du Permis à Points (Capital : 12 points)</h4>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Tout conducteur détenteur d'un permis malien dispose d'un capital initial de <strong>12 points</strong>. En cas d'infraction constatée au code de la route, des points sont déduits en plus de l'amende forfaitaire.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <strong className="text-slate-900 block">Défaut de port de ceinture / Casque moto</strong>
                  <span className="text-[11px] text-slate-500">Infraction de 1ère classe • 5 000 FCFA</span>
                </div>
                <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-xs">-1 point</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <strong className="text-slate-900 block">Usage du téléphone portable au volant</strong>
                  <span className="text-[11px] text-slate-500">Infraction de 2ème classe • 10 000 FCFA</span>
                </div>
                <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-xs">-2 points</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <strong className="text-slate-900 block">Non-respect d'un feu tricolore / Stop</strong>
                  <span className="text-[11px] text-slate-500">Infraction de 3ème classe • 15 000 FCFA</span>
                </div>
                <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-xs">-3 points</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <strong className="text-slate-900 block">Grand excès de vitesse / Surcharge dangereuse</strong>
                  <span className="text-[11px] text-slate-500">Infraction grave • 25 000 FCFA</span>
                </div>
                <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold rounded text-xs">-4 points</span>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <strong className="text-slate-900 block">Conduite en état d'ivresse / Délit de fuite</strong>
                  <span className="text-[11px] text-slate-500">Délit routier majeur • 50 000 FCFA</span>
                </div>
                <span className="px-2 py-0.5 bg-rose-200 text-rose-900 font-bold rounded text-xs">-6 points (Suspension)</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-[11px] space-y-1">
              <strong className="block font-bold">Récupération des points :</strong>
              <p>
                Si vous ne commettez aucune infraction pendant <strong>2 ans consécutifs</strong>, votre capital de points est automatiquement rétabli à 12 points.
              </p>
            </div>
          </div>
        )}

        {/* Section 3: Catégories de Permis */}
        {activeSection === 'categories' && (
          <div className="space-y-3 text-xs text-slate-700 max-h-[50vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 text-[#008543] flex items-center justify-center font-bold text-xs">
                    A1/A
                  </span>
                  <Bike className="w-4 h-4 text-slate-600" />
                  <span>Deux-roues & Motocyclettes</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Motos légères et grosses cylindrées. Âge minimum requis : 18 ans. Port du casque obligatoire.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    B
                  </span>
                  <Car className="w-4 h-4 text-slate-600" />
                  <span>Véhicules Légers & Particuliers</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Voitures de tourisme, taxis et camionnettes ne dépassant pas 3,5 tonnes (jusqu'à 8 passagers).
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                    C
                  </span>
                  <Truck className="w-4 h-4 text-slate-600" />
                  <span>Poids Lourds & Fret</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Véhicules affectés au transport de marchandises de plus de 3,5 tonnes. Contrôle médical régulier.
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                    D
                  </span>
                  <Bus className="w-4 h-4 text-slate-600" />
                  <span>Transport en Commun & Sotramas</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Autocars, minibus, Sotramas et transport de voyageurs de plus de 8 places assises.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Paiement Amendes */}
        {activeSection === 'payment' && (
          <div className="space-y-3.5 text-xs text-slate-700 max-h-[50vh] overflow-y-auto pr-1">
            <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                <CreditCard className="w-4 h-4 text-[#008543]" />
                <h4>Règlement Instantané des Contraventions DNTT</h4>
              </div>
              <p className="text-slate-600 leading-relaxed">
                Les citoyens peuvent régler leurs amendes directement depuis l'application via les services de <strong>Mobile Money agréés au Mali</strong> :
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-3 bg-orange-50 rounded-xl border border-orange-200">
                <strong className="text-orange-900 block text-xs">Orange Money</strong>
                <span className="text-[10px] text-orange-700 font-mono font-bold">*144#</span>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <strong className="text-blue-900 block text-xs">Moov Money</strong>
                <span className="text-[10px] text-blue-700 font-mono font-bold">*166#</span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <strong className="text-emerald-900 block text-xs">SAMA Money</strong>
                <span className="text-[10px] text-emerald-700 font-mono font-bold">App & Code</span>
              </div>

              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
                <strong className="text-sky-900 block text-xs">Wave Mali</strong>
                <span className="text-[10px] text-sky-700 font-mono font-bold">App & QR</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1">
              <strong className="text-slate-900 block">Quittance Numérique du Trésor Public :</strong>
              <p>
                Dès validation de votre paiement, une <strong>quittance électronique certifiée</strong> est générée. Votre infraction est immédiatement marquée comme <em>« Réglée »</em> dans la base nationale DNTT.
              </p>
            </div>
          </div>
        )}

        {/* Section 5: Numéros d'Urgence */}
        {activeSection === 'emergency' && (
          <div className="space-y-3 text-xs text-slate-700 max-h-[50vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
                <div>
                  <strong className="text-blue-950 block text-sm">Police Secours</strong>
                  <span className="text-[11px] text-blue-700">Sécurité routière & constats urbains</span>
                </div>
                <a
                  href="tel:17"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs font-mono shadow-xs"
                >
                  📞 17
                </a>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <strong className="text-emerald-950 block text-sm">Gendarmerie Nationale</strong>
                  <span className="text-[11px] text-emerald-700">Postes de contrôle interurbains</span>
                </div>
                <a
                  href="tel:80001114"
                  className="px-3 py-1.5 bg-[#008543] hover:bg-emerald-800 text-white font-bold rounded-lg text-xs font-mono shadow-xs"
                >
                  📞 80 00 11 14
                </a>
              </div>

              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                <div>
                  <strong className="text-red-950 block text-sm">Protection Civile</strong>
                  <span className="text-[11px] text-red-700">Sapeurs-pompiers & secours urgences</span>
                </div>
                <a
                  href="tel:18"
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs font-mono shadow-xs"
                >
                  📞 18
                </a>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <strong className="text-slate-900 block text-sm">DNTT Mali (Siège)</strong>
                  <span className="text-[11px] text-slate-500">Bamako - Sogoniko</span>
                </div>
                <a
                  href="tel:+22320203300"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg text-[11px] font-mono shadow-xs"
                >
                  +223 20 20 33 00
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
          <span className="text-[11px] text-slate-400">
            République du Mali • Ministère des Transports et des Infrastructures
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition"
          >
            Fermer le Guide
          </button>
        </div>

      </div>
    </div>
  );
};
