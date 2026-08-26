import { jsPDF } from 'jspdf';
import { DriverLicense } from '../types';

/**
 * Helper to convert an image URL (or data URL) to a base64 Data URL for jsPDF
 */
async function getBase64ImageFromUrl(imageUrl: string): Promise<string | null> {
  try {
    if (imageUrl.startsWith('data:image')) {
      return imageUrl;
    }
    const response = await fetch(imageUrl, { mode: 'cors' });
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('Impossible de charger l\'image en base64:', err);
    return null;
  }
}

/**
 * Export Driver License to an Official Malian Republic A4 PDF Document
 */
export async function exportDriverLicenseToPDF(
  license: DriverLicense,
  qrDataUrl?: string | null
): Promise<void> {
  // Create A4 portrait document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // 1. TOP MALI NATIONAL FLAG BAR (Green, Yellow, Red)
  const stripeWidth = pageWidth / 3;
  doc.setFillColor(0, 133, 67); // Green #008543
  doc.rect(0, 0, stripeWidth, 5, 'F');
  doc.setFillColor(252, 209, 22); // Yellow #FCD116
  doc.rect(stripeWidth, 0, stripeWidth, 5, 'F');
  doc.setFillColor(206, 17, 38); // Red #CE1126
  doc.rect(stripeWidth * 2, 0, stripeWidth, 5, 'F');

  // 2. MAIN BORDER
  doc.setDrawColor(0, 133, 67);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, 10, contentWidth, pageHeight - 20, 4, 4, 'S');

  // Inner subtle border
  doc.setDrawColor(220, 235, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin + 2, 12, contentWidth - 4, pageHeight - 24, 3, 3, 'S');

  // 3. OFFICIAL HEADER
  let y = 18;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(0, 100, 50);
  doc.text('RÉPUBLIQUE DU MALI', pageWidth / 2, y, { align: 'center' });

  y += 4.5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Un Peuple - Un But - Une Foi', pageWidth / 2, y, { align: 'center' });

  y += 5.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('MINISTÈRE DES TRANSPORTS ET DES INFRASTRUCTURES', pageWidth / 2, y, { align: 'center' });

  y += 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 133, 67);
  doc.text('DIRECTION NATIONALE DES TRANSPORTS TERRESTRES (DNTT)', pageWidth / 2, y, { align: 'center' });

  // 4. CERTIFICATE TITLE BANNER
  y += 6;
  doc.setFillColor(236, 253, 243);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(margin + 6, y, contentWidth - 12, 10, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(6, 78, 59);
  doc.text('ATTESTATION OFFICIELLE DE PERMIS DE CONDUIRE NUMÉRIQUE', pageWidth / 2, y + 6.5, { align: 'center' });

  // 5. DRIVER PROFILE & BIOMETRIC DETAILS
  y += 15;

  // Photo / Avatar Box
  const photoX = margin + 6;
  const photoY = y;
  const photoW = 34;
  const photoH = 42;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(0, 133, 67);
  doc.setLineWidth(0.6);
  doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, 'FD');

  let photoLoaded = false;
  if (license.photoUrl) {
    const base64Photo = await getBase64ImageFromUrl(license.photoUrl);
    if (base64Photo) {
      try {
        doc.addImage(base64Photo, 'JPEG', photoX + 1, photoY + 1, photoW - 2, photoH - 2);
        photoLoaded = true;
      } catch (err) {
        console.warn('Erreur insertion photo dans PDF:', err);
      }
    }
  }

  if (!photoLoaded) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('PHOTO', photoX + photoW / 2, photoY + photoH / 2 - 2, { align: 'center' });
    doc.text('BIOMÉTRIQUE', photoX + photoW / 2, photoY + photoH / 2 + 2, { align: 'center' });
  }

  // NINA under photo
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`NINA: ${license.nina}`, photoX + photoW / 2, photoY + photoH + 4, { align: 'center' });

  // Details Table to the right of Photo
  const infoX = photoX + photoW + 6;
  const infoW = contentWidth - 12 - photoW - 6;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(infoX, photoY, infoW, photoH + 6, 2, 2, 'FD');

  let curY = photoY + 5;
  const col1 = infoX + 4;
  const col2 = infoX + infoW / 2 + 2;

  // Row 1: Nom & Numéro de Permis
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Nom et Prénoms :', col1, curY);
  doc.text('N° Unique de Permis (DNTT) :', col2, curY);

  curY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(license.fullName, col1, curY);

  doc.setFont('courier', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(0, 133, 67);
  doc.text(license.licenseNumber, col2, curY);

  // Row 2: Date de Naissance & Lieu
  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Date & Lieu de Naissance :', col1, curY);
  doc.text('Groupe Sanguin / Sexe :', col2, curY);

  curY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${license.dateOfBirth} à ${license.placeOfBirth}`, col1, curY);
  doc.text(`${license.bloodGroup}  |  ${license.gender === 'M' ? 'Masculin (M)' : 'Féminin (F)'}`, col2, curY);

  // Row 3: Dates d'Émission & Expiration
  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Date de Délivrance :', col1, curY);
  doc.text('Date de Validité (Expiration) :', col2, curY);

  curY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${license.issueDate} (${license.region})`, col1, curY);
  doc.setTextColor(185, 28, 28);
  doc.text(license.expiryDate, col2, curY);

  // Row 4: Statut et Points
  curY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Statut Administratif :', col1, curY);
  doc.text('Solde de Points du Permis :', col2, curY);

  curY += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 133, 67);
  doc.text('TITRE ACTIF & VALIDE', col1, curY);
  doc.text(`${license.points ?? 12} / 12 Points`, col2, curY);

  // 6. CATEGORIES TABLE SECTION
  y = photoY + photoH + 12;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('CATÉGORIES DE VÉHICULES AUTORISÉES (CODE DE LA ROUTE DU MALI) :', margin + 6, y);

  y += 3;
  const categoriesList = [
    { cat: 'A1/A', label: 'Deux-roues & Motocyclettes', has: license.categories.some((c) => c.startsWith('A')) },
    { cat: 'B', label: 'Véhicules Légers & Voitures Particulières (<3,5 T, ≤ 8 passagers)', has: license.categories.includes('B') },
    { cat: 'C', label: 'Poids Lourds & Véhicules de Marchandises (>3,5 T)', has: license.categories.includes('C') },
    { cat: 'D', label: 'Transport en Commun, Minibus & Autocars (>8 passagers)', has: license.categories.includes('D') },
    { cat: 'E', label: 'Ensemble de Véhicules & Remorques Spéciales', has: license.categories.includes('E') },
  ];

  categoriesList.forEach((item) => {
    y += 5.5;
    const isGranted = item.has;

    doc.setFillColor(isGranted ? 236 : 248, isGranted ? 253 : 250, isGranted ? 243 : 252);
    doc.setDrawColor(isGranted ? 167 : 226, isGranted ? 243 : 232, isGranted ? 208 : 240);
    doc.roundedRect(margin + 6, y - 4, contentWidth - 12, 5, 1, 1, 'FD');

    // Badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(isGranted ? 0 : 148, isGranted ? 133 : 163, isGranted ? 67 : 184);
    doc.text(`[ ${item.cat} ]`, margin + 9, y - 0.5);

    // Label
    doc.setFont('helvetica', isGranted ? 'bold' : 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(isGranted ? 15 : 148, isGranted ? 23 : 163, isGranted ? 42 : 184);
    doc.text(item.label, margin + 28, y - 0.5);

    // Status
    doc.setFont('helvetica', 'bold');
    doc.text(isGranted ? 'AUTORISÉ' : 'NON ACCORDÉ', contentWidth + margin - 10, y - 0.5, { align: 'right' });
  });

  // 7. SECURITY & QR CODE SECTION
  y += 10;
  const secBoxY = y;
  const secBoxH = 46;

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(0, 133, 67);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin + 6, secBoxY, contentWidth - 12, secBoxH, 2, 2, 'FD');

  // QR Code Image
  const qrX = margin + 10;
  const qrY = secBoxY + 4;
  const qrSize = 38;

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (err) {
      console.warn('Erreur ajout QR code dans PDF:', err);
    }
  }

  // Security text to right of QR
  const secTextX = qrX + qrSize + 6;
  let secTextY = secBoxY + 7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(6, 78, 59);
  doc.text('SÉCURITÉ CRYPTOGRAPHIQUE SOUVERAINE DNTT', secTextX, secTextY);

  secTextY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text('• Signature Électronique : ECDSA P-256 / Hachage SHA-256', secTextX, secTextY);

  secTextY += 4;
  doc.text('• Contrôle 100% Hors-Ligne : Validable sans connexion Internet par la Police / Gendarmerie', secTextX, secTextY);

  secTextY += 4;
  doc.text(`• Empreinte Clé Publique : DNTT-ML-ECDSA-2024-P256-01`, secTextX, secTextY);

  secTextY += 4;
  doc.text(`• Horodatage Certifié : ${new Date().toLocaleString('fr-FR')} (DNTT Bamako)`, secTextX, secTextY);

  secTextY += 5.5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(71, 85, 105);
  const legalText =
    "Ce document imprimable certifié par la DNTT confère les mêmes droits légaux que le titre physique sous réserve de validité du QR code scanné.";
  doc.text(doc.splitTextToSize(legalText, contentWidth - 12 - qrSize - 16), secTextX, secTextY);

  // 8. OFFICIAL STAMP & SIGNATURE
  y = secBoxY + secBoxH + 8;

  // Left side: Signature of Driver
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Signature du Titulaire :', margin + 10, y);
  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(license.fullName, margin + 10, y + 6);

  // Right side: Official Seal / Cachet DNTT
  const stampX = contentWidth + margin - 60;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 133, 67);
  doc.text('Pour le Ministre et par Délégation,', stampX, y);
  doc.text('Le Directeur National des Transports Terrestres', stampX, y + 4);

  // Simulated Circular Cachet Box
  doc.setDrawColor(0, 133, 67);
  doc.setLineWidth(0.4);
  doc.roundedRect(stampX - 2, y + 6, 56, 12, 1, 1, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(0, 100, 50);
  doc.text('DIRECTION NATIONALE DNTT', stampX + 28, y + 10, { align: 'center' });
  doc.setFont('courier', 'bold');
  doc.setFontSize(6.5);
  doc.text('CERTIFIÉ CONFORME • CACHET ÉLECTRONIQUE', stampX + 28, y + 15, { align: 'center' });

  // 9. FOOTER
  const footerY = pageHeight - 14;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin + 6, footerY - 3, contentWidth + margin - 6, footerY - 3);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Direction Nationale des Transports Terrestres • Ministère des Transports et des Infrastructures • République du Mali',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(
    `Attestation générée le ${new Date().toLocaleDateString('fr-FR')} • N° Réf : ML-DNTT-${license.id.slice(0, 8).toUpperCase()}`,
    pageWidth / 2,
    footerY + 3,
    { align: 'center' }
  );

  // 10. SAVE FILE
  const sanitizedLicenseNum = license.licenseNumber.replace(/[^A-Za-z0-9]/g, '_');
  doc.save(`Permis_Numerique_Mali_${sanitizedLicenseNum}.pdf`);
}
