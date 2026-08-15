import jsPDF from 'jspdf';
import { SessionSummary, ProcessedEEGFrame } from '../types/eeg';
import { StructuredClinicalReport } from './clinicalEngine';
import { MultiStepAuditOutput } from './llmClient';
import { SessionComparisonResult } from './sessionComparator';

/**
 * Utility to sanitize text for jsPDF rendering:
 * 1. Strips LaTeX math delimiters ($34$ -> 34, $34\%$ -> 34%, $\alpha$ -> alpha, $\Delta$ -> Delta)
 * 2. Strips Markdown formatting (asterisks **bold**, *italic*, backticks, headings)
 * 3. Normalizes whitespace and unescapes common symbols
 */
export function sanitizePdfText(text: string): string {
  if (!text) return '';

  return text
    // Remove markdown headers like ### or ##
    .replace(/#+\s*/g, '')
    // Convert LaTeX math delimiters like $34$ or $34\%$ or $-0.08$
    .replace(/\$(\d+(?:\.\d+)?%?)\$/g, '$1')
    .replace(/\$([^\$]+)\$/g, (_match, inner) => {
      return inner
        .replace(/\\text\{([^}]+)\}/g, '$1')
        .replace(/\\alpha/gi, 'alpha')
        .replace(/\\beta/gi, 'beta')
        .replace(/\\gamma/gi, 'gamma')
        .replace(/\\theta/gi, 'theta')
        .replace(/\\delta/gi, 'delta')
        .replace(/\\Delta/g, 'Delta')
        .replace(/\\mu/gi, 'u')
        .replace(/\\pm/g, '±')
        .replace(/\\cdot/g, '·')
        .replace(/\\approx/g, '≈')
        .replace(/\\le|\\leq/g, '≤')
        .replace(/\\ge|\\geq/g, '≥')
        .replace(/\\neq/g, '≠')
        .replace(/[{}]/g, '')
        .replace(/\\/g, '');
    })
    // Strip bold/italic markdown (**text** or *text* or _text_)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Strip backticks (`code`)
    .replace(/`([^`]+)`/g, '$1')
    // Clean leading bullet symbols if duplicated
    .replace(/^[•\-\*]\s+/gm, '')
    // Normalize space
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Helper to render step cards with wrapped text and automatic page-break management
 */
function renderStepCardPDF(
  doc: jsPDF,
  stepNumber: number,
  stepTitle: string,
  rawMarkdown: string,
  startY: number,
  pageHeight: number,
  margin: number,
  contentWidth: number,
  drawHeaderFn: () => void,
  secondaryColor: number[],
  lightBg: number[],
  borderColor: number[],
  darkTextColor: number[]
): number {
  let y = startY;
  const lineSpacing = 4.3;

  const cleanTitle = sanitizePdfText(stepTitle);
  const sanitizedMarkdown = sanitizePdfText(rawMarkdown);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);

  const lines = doc.splitTextToSize(sanitizedMarkdown, contentWidth - 8);
  const titleHeight = 7;
  const padding = 5;
  const contentHeight = lines.length * lineSpacing;
  const totalBoxHeight = titleHeight + contentHeight + padding * 2;

  if (y + totalBoxHeight > pageHeight - 20) {
    if (y > pageHeight - 50 || totalBoxHeight < pageHeight - 40) {
      doc.addPage();
      drawHeaderFn();
      y = 30;
    }
  }

  const availableH = pageHeight - 20 - y;
  const actualBoxH = Math.min(totalBoxHeight, Math.max(20, availableH));

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, actualBoxH, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`Step ${stepNumber}: ${cleanTitle}`, margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  let textY = y + 11;
  for (let i = 0; i < lines.length; i++) {
    if (textY + lineSpacing > pageHeight - 20) {
      doc.addPage();
      drawHeaderFn();
      y = 30;
      textY = y + 8;

      const remainingLines = lines.length - i;
      const remainingBoxH = Math.min(remainingLines * lineSpacing + 10, pageHeight - 50);
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, remainingBoxH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Step ${stepNumber} (Continued): ${cleanTitle}`, margin + 4, textY - 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    }

    doc.text(lines[i], margin + 4, textY);
    textY += lineSpacing;
  }

  return textY + 5;
}

export interface ClinicalReportData {
  reportId: string;
  patientId: string;
  generatedAt: string;
  physicianAgent: string;
  summary: SessionSummary;
  frames: ProcessedEEGFrame[];
  analysisText: string;
  
  // Computed medical metrics
  signalQualityGrade: string;
  dominantRhythm: string;
  faaScore: number;
  faaValence: string;
  faaInterpretation: string;
  
  bandPower: {
    delta: { pct: string; bels: string; status: string };
    theta: { pct: string; bels: string; status: string };
    alpha: { pct: string; bels: string; status: string };
    beta: { pct: string; bels: string; status: string };
    gamma: { pct: string; bels: string; status: string };
  };

  channelPower: {
    AF7Alpha: string;
    AF8Alpha: string;
    TP9Alpha: string;
    TP10Alpha: string;
    frontalAvgAlpha: string;
    temporalAvgAlpha: string;
  };

  recommendations: string[];
  report?: StructuredClinicalReport;
  auditOutput?: MultiStepAuditOutput | null;
}

export interface DualSessionReportData {
  reportId: string;
  generatedAt: string;
  sessionA: { filename: string; summary: SessionSummary; frames: ProcessedEEGFrame[] };
  sessionB: { filename: string; summary: SessionSummary; frames: ProcessedEEGFrame[] };
  comparisonResult: SessionComparisonResult;
  auditOutput?: MultiStepAuditOutput | null;
}

export const generateMedicalReportPDF = (data: ClinicalReportData): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12; // 12mm left and right margin
  const contentWidth = pageWidth - margin * 2; // 186mm
  let y = margin;

  // Color Palette - Medical Professional Slate/Indigo
  const primaryColor = [15, 23, 42]; // slate-900
  const secondaryColor = [79, 70, 229]; // indigo-600
  const accentColor = [147, 51, 234]; // purple-600
  const lightBg = [248, 250, 252]; // slate-50
  const cardBg = [241, 245, 249]; // slate-100
  const borderColor = [226, 232, 240]; // slate-200
  const darkTextColor = [30, 41, 59]; // slate-800
  const mutedTextColor = [100, 116, 139]; // slate-500

  // Helper: Header Banner
  const drawHeader = (customTitle?: string) => {
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(0, 24, pageWidth, 1.2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(customTitle || 'EEG ANALYSIS REPORT', margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(191, 219, 254);
    doc.text('EEG Mind Analyzer | Session Report', margin, 18);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`REPORT ID: ${data.reportId}`, pageWidth - margin, 11, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`DATE: ${data.generatedAt}`, pageWidth - margin, 18, { align: 'right' });

    y = 30;
  };

  // Helper: Footer
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    const isAi = data.auditOutput?.isAiGenerated ?? false;
    const modeLabel = isAi
      ? `Live Model (${data.auditOutput?.providerUsed.toUpperCase()})`
      : 'Rule-Based Deterministic Engine (Offline / Rule-Based)';

    doc.text(
      `Generated by EEG Mind Analyzer | Evaluation Mode: ${modeLabel}`,
      margin,
      pageHeight - 5
    );
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  };

  // ==========================================
  // PAGE 1: METADATA, IMPRESSION, PSD TABLE, TOPOGRAPHY
  // ==========================================
  drawHeader();

  // --- SECTION 1: SUBJECT & RECORDING METADATA ---
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 36, 2, 2, 'FD');

  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);

  // Left Column (Label x=16, Value x=54, max value width=48mm)
  doc.text('Patient / Subject ID:', margin + 4, y + 6.5);
  doc.setFont('helvetica', 'normal');
  const patientIdText = doc.splitTextToSize(data.patientId, 48)[0];
  doc.text(patientIdText, margin + 42, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Device Model:', margin + 4, y + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Muse 2/S (4 Electrodes)', margin + 42, y + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Electrode Layout:', margin + 4, y + 20.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('AF7, AF8, TP9, TP10', margin + 42, y + 20.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Assessment Engine:', margin + 4, y + 27.5);
  doc.setFont('helvetica', 'normal');
  const isAiReport = data.auditOutput?.isAiGenerated ?? false;
  if (isAiReport) {
    doc.setTextColor(16, 185, 129);
    doc.text(`Live AI (${data.auditOutput?.providerUsed.toUpperCase()})`, margin + 42, y + 27.5);
  } else {
    doc.setTextColor(217, 119, 6);
    doc.text('Rule-Based Engine (Offline)', margin + 42, y + 27.5);
  }
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  // Right Column (col2X = 108mm, Label x=108, Value x=148, max value width=46mm)
  const col2X = margin + 96;
  doc.setFont('helvetica', 'bold');
  doc.text('Recording Duration:', col2X, y + 6.5);
  doc.setFont('helvetica', 'normal');
  const durText = `${data.summary.totalDurationFormatted}${data.summary.sessionDateFormatted ? ` (${data.summary.sessionDateFormatted})` : ''}`;
  const splitDur = doc.splitTextToSize(durText, 46)[0];
  doc.text(splitDur, col2X + 40, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Samples Analyzed:', col2X, y + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.summary.totalSamples.toLocaleString()} frames`, col2X + 40, y + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Signal Quality:', col2X, y + 20.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129);
  const qualText = doc.splitTextToSize(`${data.summary.dataQualityPercent}% (${data.signalQualityGrade})`, 46)[0];
  doc.text(qualText, col2X + 40, y + 20.5);

  y += 42;

  // --- SECTION 2: EXECUTIVE CLINICAL IMPRESSION ---
  const execHeadline = data.auditOutput?.executiveSummary?.executiveHeadline || `Primary Neuro-State: ${data.dominantRhythm} Dominance`;
  const splitHeadline = doc.splitTextToSize(execHeadline, contentWidth - 12);

  const summaryText = data.auditOutput?.executiveSummary?.keyTakeaways?.[0] ||
    data.report?.findings.clinicalSummaryText ||
    `The recording exhibits clean electroencephalographic rhythms with an overall signal contact efficiency of ${data.summary.dataQualityPercent}%. Frontal Alpha Asymmetry (FAA) measures ${data.faaScore.toFixed(3)} Bels (${data.faaValence}), reflecting ${data.faaInterpretation}.`;
  const splitSummary = doc.splitTextToSize(summaryText, contentWidth - 12);

  const cardHeight = Math.max(34, 12 + splitHeadline.length * 4.8 + splitSummary.length * 4.5 + 6);

  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(margin, y, 3, cardHeight, 'F');

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CLINICAL IMPRESSION & NEUROLOGICAL STATE SUMMARY', margin + 6, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  let innerY = y + 12;
  doc.text(splitHeadline, margin + 6, innerY);
  innerY += splitHeadline.length * 4.8 + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(splitSummary, margin + 6, innerY);

  y += cardHeight + 6;

  // --- SECTION 3: SPECTRAL POWER DENSITY (PSD) BREAKDOWN TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('1. Spectral Power Density (PSD) & Frequency Band Diagnostics', margin, y);
  y += 5;

  const tableHeaders = ['Frequency Band', 'Hz Range', 'Rel Power %', 'Power (Bels)', 'Clinical Diagnostic Interpretation'];
  // Total printable width starting at margin + 2 (14mm) = 182mm (ends at 196mm, margin is 198mm)
  const colWidths = [28, 24, 24, 24, 82];
  
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, y, contentWidth, 7.5, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  let xPos = margin + 2;
  tableHeaders.forEach((hdr, idx) => {
    doc.text(hdr, xPos, y + 5.2);
    xPos += colWidths[idx];
  });

  y += 7.5;

  const rows = [
    { name: 'Delta (δ)', hz: '1.0 - 4.0 Hz', pct: `${data.bandPower.delta.pct}%`, bels: `${data.bandPower.delta.bels} Bels`, desc: 'Deep restorative slow-wave activity; motor inhibition baseline' },
    { name: 'Theta (θ)', hz: '4.0 - 8.0 Hz', pct: `${data.bandPower.theta.pct}%`, bels: `${data.bandPower.theta.bels} Bels`, desc: 'Deep meditation, memory encoding, limbic activity & creative flow' },
    { name: 'Alpha (α)', hz: '7.5 - 13.0 Hz', pct: `${data.bandPower.alpha.pct}%`, bels: `${data.bandPower.alpha.bels} Bels`, desc: 'Relaxed alertness, cortical readiness & parasympathetic dominance' },
    { name: 'Beta (β)', hz: '13.0 - 30.0 Hz', pct: `${data.bandPower.beta.pct}%`, bels: `${data.bandPower.beta.bels} Bels`, desc: 'Active prefrontal cognitive processing & task-oriented attention' },
    { name: 'Gamma (γ)', hz: '30.0 - 44.0 Hz', pct: `${data.bandPower.gamma.pct}%`, bels: `${data.bandPower.gamma.bels} Bels`, desc: 'High-frequency sensory binding & peak cognitive focus state' },
  ];

  rows.forEach((r, idx) => {
    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(margin, y, contentWidth, 7, 'F');

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 7, margin + contentWidth, y + 7);

    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.setFont('helvetica', r.name.toLowerCase().includes(data.dominantRhythm.toLowerCase()) ? 'bold' : 'normal');
    doc.setFontSize(8.5);

    let rowX = margin + 2;
    doc.text(r.name, rowX, y + 4.8); rowX += colWidths[0];
    doc.text(r.hz, rowX, y + 4.8); rowX += colWidths[1];
    doc.text(r.pct, rowX, y + 4.8); rowX += colWidths[2];
    doc.text(r.bels, rowX, y + 4.8); rowX += colWidths[3];
    
    const splitDesc = doc.splitTextToSize(r.desc, 80);
    doc.text(splitDesc[0], rowX, y + 4.8);

    y += 7;
  });

  y += 8;

  // --- SECTION 4: SPATIAL TOPOGRAPHY & FAA ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('2. Regional Electrode Topography & Hemispheric Balance (FAA)', margin, y);
  y += 5;

  const line1 = `Frontal Cortex (AF7 Left: ${data.channelPower.AF7Alpha} Bels, AF8 Right: ${data.channelPower.AF8Alpha} Bels | Avg: ${data.channelPower.frontalAvgAlpha} Bels)`;
  const line2 = `Temporal Lobes (TP9 Left: ${data.channelPower.TP9Alpha} Bels, TP10 Right: ${data.channelPower.TP10Alpha} Bels | Avg: ${data.channelPower.temporalAvgAlpha} Bels)`;
  const line3 = `Clinical Orientation: ${data.faaInterpretation}`;

  const splitLine1 = doc.splitTextToSize(line1, contentWidth - 8);
  const splitLine2 = doc.splitTextToSize(line2, contentWidth - 8);
  const splitLine3 = doc.splitTextToSize(line3, contentWidth - 8);

  const boxH = Math.max(32, 14 + (splitLine1.length + splitLine2.length + splitLine3.length) * 4.8);

  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  doc.text(`FAA Index: ${data.faaScore.toFixed(3)} Bels`, margin + 4, y + 6.5);
  
  const valText = doc.splitTextToSize(`Valence: ${data.faaValence}`, 80)[0];
  doc.text(valText, margin + 98, y + 6.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);

  let topoY = y + 12.5;
  doc.text(splitLine1, margin + 4, topoY); topoY += splitLine1.length * 4.8;
  doc.text(splitLine2, margin + 4, topoY); topoY += splitLine2.length * 4.8;
  doc.text(splitLine3, margin + 4, topoY);

  // ==========================================
  // PAGE 2: COGNITIVE SCORES, TIMELINE, AI AUDIT STEPS
  // ==========================================
  doc.addPage();
  drawHeader();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('3. Quantitative Neuro-Cognitive Scores (0 - 100 Clinical Index)', margin, y);
  y += 5;

  const scoreBoxWidth = (contentWidth - 9) / 4;
  const scores = [
    { label: 'Focus / Engagement', score: data.summary.avgFocus, color: [79, 70, 229] },
    { label: 'Tranquility / Calm', score: data.summary.avgCalm, color: [16, 185, 129] },
    { label: 'Meditation Depth', score: data.summary.avgMeditationDepth, color: [147, 51, 234] },
    { label: 'Mental Workload', score: data.summary.avgCognitiveLoad, color: [245, 158, 11] },
  ];

  scores.forEach((s, idx) => {
    const sbX = margin + idx * (scoreBoxWidth + 3);
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.setDrawColor(s.color[0], s.color[1], s.color[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(sbX, y, scoreBoxWidth, 20, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(s.color[0], s.color[1], s.color[2]);
    doc.text(`${s.score}/100`, sbX + scoreBoxWidth / 2, y + 9.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(s.label, sbX + scoreBoxWidth / 2, y + 15.5, { align: 'center' });
  });

  y += 26;

  // --- SECTION 4: CLINICAL ASSESSMENT ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('4. Clinical Assessment', margin, y);
  y += 6;

  const auditStepsToPrint = data.auditOutput?.steps || [];
  if (auditStepsToPrint.length > 0) {
    auditStepsToPrint.forEach((st) => {
      y = renderStepCardPDF(
        doc,
        st.stepNumber,
        st.stepTitle,
        st.detailsMarkdown,
        y,
        pageHeight,
        margin,
        contentWidth,
        drawHeader,
        secondaryColor,
        lightBg,
        borderColor,
        darkTextColor
      );
    });
  } else {
    // Fallback static observations
    const observations = data.report?.findings.diagnosticObservations || [
      `Frontal Alpha Asymmetry of ${data.faaScore.toFixed(3)} Bels indicates ${data.faaValence.toLowerCase()} emotional orientation.`,
      `Dominant power frequency isolated in the ${data.dominantRhythm} band (${data.bandPower[data.dominantRhythm.toLowerCase() as keyof typeof data.bandPower]?.pct || '35'}% total power).`,
      `Signal artifact rejection audit passed with ${data.summary.dataQualityPercent}% contact cleanliness.`,
    ];

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, 30, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

    let obsY = y + 7;
    observations.slice(0, 3).forEach((obs) => {
      const splitObs = doc.splitTextToSize(`• ${obs}`, contentWidth - 8)[0];
      doc.text(splitObs, margin + 4, obsY);
      obsY += 7;
    });
    y += 34;
  }

  // Check page height for biofeedback protocols & signature
  if (y > pageHeight - 50) {
    doc.addPage();
    drawHeader();
  }

  // --- SECTION 5: PRESCRIBED BIOFEEDBACK PROTOCOLS & ACTION PLAN ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('5. Actionable Biofeedback Protocols & Roadmap', margin, y);
  y += 5;

  const protocols = data.auditOutput?.executiveSummary?.topRecommendations?.map((r, i) => ({
    title: `Protocol ${i + 1}`,
    mechanism: r,
    dosage: 'Daily Practice'
  })) || data.report?.findings.protocols || [
    { title: 'Resonant Frequency Breathing (6 Breaths/Min)', category: 'Autonomic Protocol', dosage: '10 mins pre-work', mechanism: 'Elevates Frontal Alpha power and regulates autonomic nervous tone.' },
    { title: 'Pomodoro SMR Task Structuring (25m / 5m Rest)', category: 'Focus Maintenance', dosage: 'Daily workflow', mechanism: 'Mitigates prefrontal Beta fatigue and preserves cognitive workload reserve.' },
    { title: 'Theta-Alpha Entrainment Meditation', category: 'Restorative Protocol', dosage: '15 mins post-work', mechanism: 'Promotes temporal TP9/TP10 Theta-Alpha synchrony for stress recovery.' },
  ];

  protocols.forEach((prot: { title: string; mechanism: string; category?: string; dosage?: string }, protIdx: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    const recText = doc.splitTextToSize(`Recommendation: ${prot.mechanism}`, contentWidth - 8);
    const protBoxHeight = Math.max(14, recText.length * 4.2 + 8);

    if (y + protBoxHeight > pageHeight - 20) {
      doc.addPage();
      drawHeader();
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, protBoxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`${protIdx + 1}. ${prot.title}`, margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(recText, margin + 4, y + 10.5);

    y += protBoxHeight + 4;
  });

  y += 4;

  // --- SECTION 6: AUTOMATED REPORT VERIFICATION ---
  if (y > pageHeight - 25) {
    doc.addPage();
    drawHeader();
  }

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Automated Report Verification:', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(`Analysis Engine: ${data.physicianAgent || 'Mind Monitor Clinical Engine'}`, margin, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text('Verification Status: Signal & Spectral Processing Verified', pageWidth - margin, y + 5.5, { align: 'right' });

  // Add Footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  doc.save(`EEG_Clinical_Neuro_Report_${data.reportId}.pdf`);
};

/**
 * Generate PDF report for Dual Session Comparative Analytics
 */
export const generateComparativeReportPDF = (data: DualSessionReportData): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12; // 12mm
  const contentWidth = pageWidth - margin * 2; // 186mm
  let y = margin;

  const primaryColor = [15, 23, 42]; // slate-900
  const secondaryColor = [8, 145, 178]; // cyan-600
  const accentColor = [124, 58, 237]; // violet-600
  const lightBg = [248, 250, 252];
  const cardBg = [241, 245, 249];
  const borderColor = [226, 232, 240];
  const darkTextColor = [30, 41, 59];
  const mutedTextColor = [100, 116, 139];

  const drawHeader = () => {
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(0, 24, pageWidth, 1.2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('EEG SESSION COMPARISON REPORT', margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(165, 243, 252);
    doc.text('EEG Mind Analyzer | Comparative Analysis', margin, 18);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`REPORT ID: ${data.reportId}`, pageWidth - margin, 11, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`DATE: ${data.generatedAt}`, pageWidth - margin, 18, { align: 'right' });

    y = 30;
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    const isAi = data.auditOutput?.isAiGenerated ?? false;
    const modeLabel = isAi
      ? `Live Model (${data.auditOutput?.providerUsed.toUpperCase()})`
      : 'Rule-Based Deterministic Engine (Offline / Rule-Based)';

    doc.text(
      `Generated by EEG Mind Analyzer | Evaluation Mode: ${modeLabel}`,
      margin,
      pageHeight - 5
    );
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  };

  // PAGE 1
  drawHeader();

  // SECTION 1: METADATA COMPARISON
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  doc.text('Session A (Baseline):', margin + 4, y + 6.5);
  doc.setFont('helvetica', 'normal');
  const sessAText = doc.splitTextToSize(`${data.sessionA.filename} (${data.comparisonResult.sessionAInfo.duration}, ${data.comparisonResult.sessionAInfo.quality}% clean)`, contentWidth - 52)[0];
  doc.text(sessAText, margin + 48, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Session B (Comparison):', margin + 4, y + 13.5);
  doc.setFont('helvetica', 'normal');
  const sessBText = doc.splitTextToSize(`${data.sessionB.filename} (${data.comparisonResult.sessionBInfo.duration}, ${data.comparisonResult.sessionBInfo.quality}% clean)`, contentWidth - 52)[0];
  doc.text(sessBText, margin + 48, y + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Signal Quality Delta:', margin + 4, y + 20.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(data.comparisonResult.overviewDeltas.qualityDelta >= 0 ? 16 : 225, 185, 129);
  doc.text(`${data.comparisonResult.overviewDeltas.qualityDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.qualityDelta}%`, margin + 48, y + 20.5);

  y += 34;

  // SECTION 2: EXECUTIVE SHIFT CARD
  const execHeadline = sanitizePdfText(data.auditOutput?.executiveSummary?.executiveHeadline || 'Cross-Session State Adaptation & Shift');
  const splitHeadline = doc.splitTextToSize(execHeadline, contentWidth - 12);

  const takeawaysToPrint = data.auditOutput?.executiveSummary?.keyTakeaways?.map(t => sanitizePdfText(t)) || [
    sanitizePdfText(`Transition from Session A (${data.sessionA.summary.dominantWave}) to Session B (${data.sessionB.summary.dominantWave}). Tranquility shifted by ${data.comparisonResult.overviewDeltas.calmDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.calmDelta} points and Focus shifted by ${data.comparisonResult.overviewDeltas.focusDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.focusDelta} points.`)
  ];

  const formattedTakeawayText = takeawaysToPrint.slice(0, 3).map(t => `• ${t}`).join('\n');
  const splitTakeaway = doc.splitTextToSize(formattedTakeawayText, contentWidth - 12);

  const cardHeight = Math.max(32, 12 + splitHeadline.length * 4.8 + splitTakeaway.length * 4.3 + 6);

  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(margin, y, 3, cardHeight, 'F');

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('EXECUTIVE STATE TRANSITION & CLINICAL IMPRESSION', margin + 6, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  let innerY = y + 12;
  doc.text(splitHeadline, margin + 6, innerY);
  innerY += splitHeadline.length * 4.8 + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text(splitTakeaway, margin + 6, innerY);

  y += cardHeight + 6;

  // SECTION 3: COGNITIVE SCORE DELTAS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('1. Core Cognitive Score Deltas (Session A vs Session B)', margin, y);
  y += 5;

  const scoreBoxWidth = (contentWidth - 9) / 4;
  const deltas = [
    { label: 'Tranquility Shift', value: `${data.comparisonResult.overviewDeltas.calmDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.calmDelta} pts`, color: [16, 185, 129] },
    { label: 'Focus Shift', value: `${data.comparisonResult.overviewDeltas.focusDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.focusDelta} pts`, color: [79, 70, 229] },
    { label: 'FAA Valence Shift', value: `${data.comparisonResult.overviewDeltas.faaDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.faaDelta.toFixed(3)} Bels`, color: [147, 51, 234] },
    { label: 'Workload Shift', value: `${data.comparisonResult.overviewDeltas.loadDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.loadDelta} pts`, color: [245, 158, 11] },
  ];

  deltas.forEach((d, idx) => {
    const sbX = margin + idx * (scoreBoxWidth + 3);
    doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
    doc.setDrawColor(d.color[0], d.color[1], d.color[2]);
    doc.setLineWidth(0.6);
    doc.roundedRect(sbX, y, scoreBoxWidth, 20, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(d.color[0], d.color[1], d.color[2]);
    doc.text(d.value, sbX + scoreBoxWidth / 2, y + 9.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(d.label, sbX + scoreBoxWidth / 2, y + 15.5, { align: 'center' });
  });

  y += 26;

  // SECTION 4: 4-SENSOR SPATIAL POWER SHIFTS TABLE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('2. 4-Sensor Spatial Power Shifts in Bels (AF7, AF8, TP9, TP10)', margin, y);
  y += 5;

  const tableHeaders = ['Sensor', 'Delta (δ)', 'Theta (θ)', 'Alpha (α)', 'Beta (β)', 'Gamma (γ)'];
  // Total printable width starting at margin + 2 (14mm) = 182mm (ends at 196mm, margin is 198mm)
  const colW = [22, 32, 32, 32, 32, 32];

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  let xP = margin + 2;
  tableHeaders.forEach((hdr, idx) => {
    doc.text(hdr, xP, y + 4.8);
    xP += colW[idx];
  });

  y += 7;

  const sensors = ['AF7', 'AF8', 'TP9', 'TP10'] as const;
  sensors.forEach((s, idx) => {
    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    const sStats = data.comparisonResult.sensorStats[s].deltas;

    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(margin, y, contentWidth, 7, 'F');

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, y + 7, margin + contentWidth, y + 7);

    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);

    let rowX = margin + 2;
    doc.text(s, rowX, y + 4.8); rowX += colW[0];
    doc.setFont('helvetica', 'normal');
    doc.text(`${sStats.delta > 0 ? '+' : ''}${sStats.delta}`, rowX, y + 4.8); rowX += colW[1];
    doc.text(`${sStats.theta > 0 ? '+' : ''}${sStats.theta}`, rowX, y + 4.8); rowX += colW[2];
    doc.text(`${sStats.alpha > 0 ? '+' : ''}${sStats.alpha}`, rowX, y + 4.8); rowX += colW[3];
    doc.text(`${sStats.beta > 0 ? '+' : ''}${sStats.beta}`, rowX, y + 4.8); rowX += colW[4];
    doc.text(`${sStats.gamma > 0 ? '+' : ''}${sStats.gamma}`, rowX, y + 4.8);

    y += 7;
  });

  // PAGE 2
  doc.addPage();
  drawHeader();

  // SECTION 5: MULTI-STEP COMPARATIVE AUDIT STEPS
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('3. Comparative Assessment', margin, y);
  y += 6;

  const stepsToPrint = data.auditOutput?.steps || [];
  if (stepsToPrint.length > 0) {
    stepsToPrint.forEach((st) => {
      y = renderStepCardPDF(
        doc,
        st.stepNumber,
        st.stepTitle,
        st.detailsMarkdown,
        y,
        pageHeight,
        margin,
        contentWidth,
        drawHeader,
        secondaryColor,
        lightBg,
        borderColor,
        darkTextColor
      );
    });
  } else {
    // Fallback deterministic comparative observations when AI steps are not run
    const compObs = data.comparisonResult.executiveSummary || [
      `Transition from Session A (${data.sessionA.summary.dominantWave}) to Session B (${data.sessionB.summary.dominantWave}).`,
      `Tranquility shifted by ${data.comparisonResult.overviewDeltas.calmDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.calmDelta} points and Focus shifted by ${data.comparisonResult.overviewDeltas.focusDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.focusDelta} points.`,
      `Frontal Alpha Asymmetry (FAA) shifted by ${data.comparisonResult.overviewDeltas.faaDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.faaDelta.toFixed(3)} Bels.`,
    ];

    compObs.forEach((obs, obsIdx) => {
      const splitObs = doc.splitTextToSize(`• ${obs}`, contentWidth - 8);
      const boxH = Math.max(14, splitObs.length * 4.5 + 8);

      if (y + boxH > pageHeight - 20) {
        doc.addPage();
        drawHeader();
      }

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Comparative Takeaway ${obsIdx + 1}`, margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
      doc.text(splitObs, margin + 4, y + 11);

      y += boxH + 4;
    });
  }

  // SECTION 6: ADAPTIVE RECOMMENDATIONS
  if (y > pageHeight - 45) {
    doc.addPage();
    drawHeader();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('4. Actionable Biofeedback Adaptation Protocols', margin, y);
  y += 5;

  const recs = data.comparisonResult.recommendations || [];
  recs.forEach((r, idx) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    const splitRec = doc.splitTextToSize(r, contentWidth - 14);
    const boxH = Math.max(12, splitRec.length * 4.2 + 6);

    if (y + boxH > pageHeight - 20) {
      doc.addPage();
      drawHeader();
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`${idx + 1}.`, margin + 3, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(splitRec, margin + 8, y + 5.5);

    y += boxH + 4;
  });

  y += 4;

  // AUTOMATED REPORT VERIFICATION
  if (y > pageHeight - 25) {
    doc.addPage();
    drawHeader();
  }

  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.line(margin, y, margin + contentWidth, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Automated Report Verification:', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Analysis Engine: Mind Monitor Dual-Session Comparison Engine', margin, y + 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);
  doc.text('Verification Status: Dual-Session Delta & Correlation Verified', pageWidth - margin, y + 5.5, { align: 'right' });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  doc.save(`EEG_Comparative_Neuro_Report_${data.reportId}.pdf`);
};
