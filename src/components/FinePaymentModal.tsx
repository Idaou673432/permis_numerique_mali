import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Violation, DriverLicense } from '../types';
import {
  X,
  CreditCard,
  CheckCircle2,
  Phone,
  ShieldCheck,
  Printer,
  Sparkles,
  ArrowRight,
  Download,
  Building2,
  Calendar,
  MapPin,
  Car,
} from 'lucide-react';

interface FinePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  violation: Violation | null;
  license: DriverLicense;
  onPaymentSuccess: (violationId: string, receiptNumber: string) => void;
}

export const FinePaymentModal: React.FC<FinePaymentModalProps> = ({
  isOpen,
  onClose,
  violation,
  license,
  onPaymentSuccess,
}) => {
  const [provider, setProvider] = useState<'orange' | 'moov' | 'sama' | 'wave'>('orange');
  const [phoneNumber, setPhoneNumber] = useState('76 45 89 12');
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    receiptNumber: string;
    paidAt: string;
    amount: number;
    providerName: string;
    transactionRef: string;
  } | null>(null);

  if (!isOpen || !violation) return null;

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate mobile money API push and Treasury confirmation
    setTimeout(() => {
      const receiptNo = `QUI-DNTT-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
      const providerLabel =
        provider === 'orange'
          ? 'Orange Money Mali'
          : provider === 'moov'
          ? 'Moov Money Mali'
          : provider === 'sama'
          ? 'SAMA Money'
          : 'Wave Mali';

      const receipt = {
        receiptNumber: receiptNo,
        paidAt: new Date().toISOString(),
        amount: violation.fineAmountFCFA,
        providerName: providerLabel,
        transactionRef: `TRX-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      };

      setReceiptData(receipt);
      setIsProcessing(false);
      onPaymentSuccess(violation.id, receiptNo);
    }, 1500);
  };

  const handlePrintReceipt = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('Impression reçu:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 space-y-5 shadow-2xl relative border border-slate-200 my-6 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#008543] font-bold shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {receiptData ? 'Quittance Officielle de Paiement' : 'Paiement Amende Mobile Money'}
              </h3>
              <p className="text-xs text-slate-500">
                Direction Nationale des Transports Terrestres • Trésor Public
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setReceiptData(null);
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP 1: PAYMENT FORM */}
        {!receiptData ? (
          <form onSubmit={handleProcessPayment} className="space-y-4 text-xs">
            {/* Infraction Summary Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400">Infraction Routière</span>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                  {violation.violationCategory}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900">{violation.violationType}</h4>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block">Lieu :</span>
                  <strong className="text-slate-800">{violation.location}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Véhicule :</span>
                  <strong className="text-slate-800 font-mono">{violation.vehiclePlate}</strong>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-700">Montant à régler :</span>
                <span className="text-base font-extrabold text-[#008543] font-mono">
                  {violation.fineAmountFCFA.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
            </div>

            {/* Provider Selection */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-800 block">
                Sélectionnez le mode de paiement Mobile Money au Mali :
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setProvider('orange')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    provider === 'orange'
                      ? 'bg-orange-500 text-white border-orange-600 shadow-xs font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block">Orange Money</span>
                  <span className={`text-[9px] ${provider === 'orange' ? 'text-orange-100' : 'text-slate-400'}`}>
                    *144#
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider('moov')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    provider === 'moov'
                      ? 'bg-blue-600 text-white border-blue-700 shadow-xs font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block">Moov Money</span>
                  <span className={`text-[9px] ${provider === 'moov' ? 'text-blue-100' : 'text-slate-400'}`}>
                    *166#
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider('sama')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    provider === 'sama'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block">SAMA Money</span>
                  <span className={`text-[9px] ${provider === 'sama' ? 'text-emerald-100' : 'text-slate-400'}`}>
                    Code & App
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider('wave')}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                    provider === 'wave'
                      ? 'bg-sky-500 text-white border-sky-600 shadow-xs font-bold'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <span className="text-xs font-bold block">Wave Mali</span>
                  <span className={`text-[9px] ${provider === 'wave' ? 'text-sky-100' : 'text-slate-400'}`}>
                    Scan & App
                  </span>
                </button>
              </div>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-1.5">
              <label htmlFor="fine-payer-phone" className="font-bold text-slate-800 block">
                Numéro de Téléphone Mobile Money Mali :
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-mono font-bold text-xs">
                  +223 (ML)
                </span>
                <input
                  id="fine-payer-phone"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Ex: 76 12 34 56 ou 66 78 90 12"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Une notification USSD push ou demande de confirmation de code PIN sera envoyée sur votre téléphone.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-3 bg-[#008543] hover:bg-[#007038] text-white font-bold rounded-2xl text-xs transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Communication avec la passerelle Mobile Money...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Confirmer le Paiement ({violation.fineAmountFCFA.toLocaleString('fr-FR')} FCFA)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* STEP 2: OFFICIAL TREASURY RECEIPT */
          <div className="space-y-4 text-xs animate-in fade-in">
            <div className="border-2 border-emerald-700/60 rounded-2xl p-5 bg-emerald-50/20 space-y-4 text-slate-900 relative">
              {/* Receipt Header */}
              <div className="text-center space-y-1 border-b border-emerald-700/30 pb-3">
                <div className="flex items-center justify-center gap-1.5">
                  <div className="flex h-3 w-5 rounded overflow-hidden border border-slate-300">
                    <div className="w-1/3 bg-[#008543]"></div>
                    <div className="w-1/3 bg-[#FCD116]"></div>
                    <div className="w-1/3 bg-[#CE1126]"></div>
                  </div>
                  <span className="font-bold text-[11px] tracking-wider text-emerald-950 uppercase">
                    RÉPUBLIQUE DU MALI • TRÉSOR PUBLIC
                  </span>
                </div>
                <h4 className="text-xs font-extrabold text-[#008543] uppercase">
                  QUITTANCE NUMÉRIQUE DE RÈGLEMENT D'AMENDE
                </h4>
                <p className="text-[10px] font-mono text-slate-600 font-bold">
                  RÉF : {receiptData.receiptNumber}
                </p>
              </div>

              {/* Receipt Details */}
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Contrevenant / Conducteur :</span>
                  <strong className="text-slate-900">{license.fullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">N° Permis DNTT :</span>
                  <strong className="text-[#008543] font-mono">{license.licenseNumber}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Motif de l'infraction :</span>
                  <span className="text-slate-800 font-medium">{violation.violationType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode de règlement :</span>
                  <strong className="text-slate-900">{receiptData.providerName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Réf. Transaction :</span>
                  <span className="font-mono text-slate-700">{receiptData.transactionRef}</span>
                </div>
                <div className="flex justify-between border-t border-emerald-700/20 pt-2 text-xs">
                  <span className="font-bold text-slate-900">Montant acquitté :</span>
                  <strong className="font-bold font-mono text-emerald-800 text-sm">
                    {receiptData.amount.toLocaleString('fr-FR')} FCFA
                  </strong>
                </div>
              </div>

              {/* QR Verification for Receipt */}
              <div className="flex items-center justify-between border-t border-emerald-700/20 pt-3 text-[10px]">
                <div className="space-y-0.5 text-slate-500">
                  <p className="font-bold text-emerald-950">Statut : RÉGLÉ & ARCHIVÉ DNTT</p>
                  <p>Date : {new Date(receiptData.paidAt).toLocaleString('fr-FR')}</p>
                </div>
                <div className="bg-white p-1 rounded-xl border border-emerald-300">
                  <QRCodeSVG
                    value={JSON.stringify({
                      receipt: receiptData.receiptNumber,
                      lic: license.licenseNumber,
                      amount: receiptData.amount,
                      paid: true,
                    })}
                    size={56}
                    level="L"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                <span>Imprimer la Quittance</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReceiptData(null);
                  onClose();
                }}
                className="px-5 py-2 bg-[#008543] hover:bg-[#007038] text-white font-bold rounded-xl text-xs transition shadow-xs"
              >
                Terminer
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
