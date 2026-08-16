import jsPDF from 'jspdf';
import { SessionSummary, ProcessedEEGFrame } from '../types/eeg';
import { StructuredClinicalReport } from './clinicalEngine';
import {
  MultiStepAuditOutput,
  AiTakeawayCard,
  buildSingleSessionExecutiveSummary,
  buildDualSessionExecutiveSummary,
  buildSingleSessionPlainEnglishCards,
  buildDualSessionPlainEnglishCards,
} from './llmClient';
import { SessionComparisonResult } from './sessionComparator';

/**
 * Utility to sanitize text for jsPDF rendering:
 * 1. Strips LaTeX math delimiters ($34$ -> 34, $34\%$ -> 34%, \alpha -> alpha, \Delta -> Delta)
 * 2. Converts math symbols (<=, >=, ~=, !=, +/-) to 100% clean ASCII representation
 * 3. Strips Markdown formatting (asterisks **bold**, *italic*, backticks, headings, table pipes)
 * 4. Normalizes whitespace and enforces pure ASCII characters to prevent font encoding corruption
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
        .replace(/\\pm/g, '+/-')
        .replace(/\\cdot/g, '*')
        .replace(/\\approx/g, '~=')
        .replace(/\\le|\\leq/g, '<=')
        .replace(/\\ge|\\geq/g, '>=')
        .replace(/\\neq/g, '!=')
        .replace(/[{}]/g, '')
        .replace(/\\/g, '');
    })
    // Explicit LaTeX commands unescaped or outside math blocks
    .replace(/\\le|\\leq/g, '<=')
    .replace(/\\ge|\\geq/g, '>=')
    .replace(/\\approx/g, '~=')
    .replace(/\\neq/g, '!=')
    .replace(/\\pm/g, '+/-')
    .replace(/\\alpha/gi, 'alpha')
    .replace(/\\beta/gi, 'beta')
    .replace(/\\gamma/gi, 'gamma')
    .replace(/\\theta/gi, 'theta')
    .replace(/\\delta/gi, 'delta')
    .replace(/\\Delta/g, 'Delta')
    .replace(/\\mu/gi, 'u')
    .replace(/\\degree/gi, ' deg')
    .replace(/\\to|\\rightarrow/gi, '->')
    .replace(/\\leftarrow/gi, '<-')
    // Unicode math & comparison symbols
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≈/g, '~=')
    .replace(/≠/g, '!=')
    .replace(/±/g, '+/-')
    .replace(/·/g, '*')
    .replace(/×/g, 'x')
    .replace(/÷/g, '/')
    .replace(/°/g, ' deg')
    .replace(/α/g, 'alpha')
    .replace(/β/g, 'beta')
    .replace(/γ/g, 'gamma')
    .replace(/θ/g, 'theta')
    .replace(/δ/g, 'delta')
    .replace(/Δ/g, 'Delta')
    .replace(/μ/g, 'u')
    .replace(/→|⇒/g, '->')
    .replace(/←|⇐/g, '<-')
    .replace(/↔/g, '<->')
    // Typography, quotes, dashes, bullets
    .replace(/[“”"]/g, '"')
    .replace(/[‘’']/g, "'")
    .replace(/—/g, '--')
    .replace(/–/g, '-')
    .replace(/…/g, '...')
    .replace(/•/g, '-')
    // Strip bold/italic markdown (**text** or *text* or _text_)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    // Strip backticks (`code`)
    .replace(/`([^`]+)`/g, '$1')
    // Strip table pipes
    .replace(/\|/g, ' ')
    // Strip remaining backslashes
    .replace(/\\/g, '')
    // Clean leading bullet symbols if duplicated
    .replace(/^[•\-\*]\s+/gm, '')
    // Replace tabs & non-breaking spaces
    .replace(/[\t\u00A0]/g, ' ')
    // Normalize unicode non-ASCII characters to ASCII equivalent or drop
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    // Normalize spaces
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Helper to render step cards with wrapped text and automatic page-break management.
 * Guarantees that card boxes match exact line counts and never leak past margins.
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
  const bottomLimit = pageHeight - 18; // 279mm
  const titleBoxH = 7;
  const cardPadding = 4;

  const cleanTitle = sanitizePdfText(stepTitle);
  const cleanMarkdown = sanitizePdfText(rawMarkdown);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);

  const lines: string[] = doc.splitTextToSize(cleanMarkdown, contentWidth - 12);

  if (bottomLimit - y < 25) {
    doc.addPage();
    drawHeaderFn();
    y = 23;
  }

  let lineIdx = 0;
  let isFirstBox = true;

  while (lineIdx < lines.length) {
    const availH = bottomLimit - y;
    const maxLinesOnPage = Math.max(1, Math.floor((availH - titleBoxH - cardPadding * 2) / lineSpacing));
    const linesChunk = lines.slice(lineIdx, lineIdx + maxLinesOnPage);
    const boxH = Math.min(availH, titleBoxH + linesChunk.length * lineSpacing + cardPadding * 2);

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    const titleHeading = cleanTitle.replace(/^Step\s*\d+:\s*/i, '');
    const headerTag = isFirstBox
      ? titleHeading
      : `${titleHeading} (Continued)`;
    const splitHeaderTag: string[] = doc.splitTextToSize(headerTag, contentWidth - 8);
    doc.text(splitHeaderTag[0], margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

    let textY = y + 10;
    linesChunk.forEach((line: string) => {
      doc.text(line, margin + 4, textY);
      textY += lineSpacing;
    });

    lineIdx += linesChunk.length;
    isFirstBox = false;

    if (lineIdx < lines.length) {
      doc.addPage();
      drawHeaderFn();
      y = 23;
    } else {
      y = y + boxH + 5;
    }
  }

  return y;
}

/**
 * Helper to render an individual Takeaway / Brain State Card box in PDF.
 * Supports auto page-break management, left accent bar, category label, metric badge, wrapped title, and wrapped insight text.
 */
function renderCardBoxPDF(
  doc: jsPDF,
  card: AiTakeawayCard,
  startY: number,
  pageHeight: number,
  margin: number,
  contentWidth: number,
  drawHeaderFn: () => void,
  primaryColor: number[],
  secondaryColor: number[],
  accentColor: number[],
  lightBg: number[],
  borderColor: number[],
  darkTextColor: number[],
  mutedTextColor: number[]
): number {
  let y = startY;
  const bottomLimit = pageHeight - 18; // 279mm
  const cardPadding = 4;
  const lineSpacing = 4.2;

  const cleanCategory = sanitizePdfText(card.category).toUpperCase();
  const cleanTitle = sanitizePdfText(card.title);
  const cleanBadge = card.metricBadge ? sanitizePdfText(card.metricBadge) : '';
  const cleanInsight = sanitizePdfText(card.insight);
  const tagText = card.isAiGenerated ? 'AI Synthesized' : 'Calculated Metric';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  const titleLines: string[] = doc.splitTextToSize(cleanTitle, contentWidth - 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  const insightLines: string[] = doc.splitTextToSize(cleanInsight, contentWidth - 14);

  const contentHeight = 6 + titleLines.length * lineSpacing + 2 + insightLines.length * lineSpacing;
  const boxH = Math.max(20, cardPadding + contentHeight + cardPadding);

  if (bottomLimit - y < boxH) {
    doc.addPage();
    drawHeaderFn();
    y = 23;
  }

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, boxH, 1.8, 1.8, 'FD');

  let barColor = secondaryColor;
  if (card.impactColor === 'emerald') barColor = [16, 185, 129];
  else if (card.impactColor === 'purple') barColor = [147, 51, 234];
  else if (card.impactColor === 'amber') barColor = [245, 158, 11];
  else if (card.impactColor === 'rose') barColor = [225, 29, 72];
  else if (card.impactColor === 'cyan') barColor = [8, 145, 178];
  else if (card.impactColor === 'indigo') barColor = [79, 70, 229];

  doc.setFillColor(barColor[0], barColor[1], barColor[2]);
  doc.rect(margin, y, 2.5, boxH, 'F');

  // Category + Tag
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(barColor[0], barColor[1], barColor[2]);

  const maxCategoryWidth = cleanBadge ? contentWidth - 45 : contentWidth - 10;
  const fullCatTag = `${cleanCategory} [${tagText}]`;
  const splitCatTag: string[] = doc.splitTextToSize(fullCatTag, maxCategoryWidth);
  doc.text(splitCatTag[0], margin + 5, y + 5.5);

  if (cleanBadge) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(cleanBadge, margin + contentWidth - 5, y + 5.5, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);

  let titleY = y + 10.5;
  titleLines.forEach((tLine: string) => {
    doc.text(tLine, margin + 5, titleY);
    titleY += lineSpacing;
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  let lineY = titleY + 1.0;
  insightLines.forEach((line: string) => {
    doc.text(line, margin + 5, lineY);
    lineY += lineSpacing;
  });

  return y + boxH + 5;
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
  const bottomLimit = pageHeight - 18; // 279mm printable limit
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

  // Header Banner
  const drawHeader = (customTitle?: string) => {
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 16, 'F');

    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(0, 16, pageWidth, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(customTitle || 'Clinical Assessment Report', margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`REPORT ID: ${sanitizePdfText(data.reportId)}`, pageWidth - margin - 50, 11);
    doc.text(`DATE: ${sanitizePdfText(data.generatedAt)}`, pageWidth - margin, 11, { align: 'right' });

    y = 23;
  };

  // Footer
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.text('EEG Mind Analyzer -- Clinical Assessment Report', margin, pageHeight - 5);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  };

  // Build / resolve executive summary & cards
  const execSummary = data.auditOutput?.executiveSummary || buildSingleSessionExecutiveSummary(data.summary, data.auditOutput?.steps);
  const plainEnglishCards = (execSummary.plainEnglishCards && execSummary.plainEnglishCards.length > 0)
    ? execSummary.plainEnglishCards
    : buildSingleSessionPlainEnglishCards(data.summary);
  const takeawayCards = (execSummary.takeawayCards && execSummary.takeawayCards.length > 0)
    ? execSummary.takeawayCards
    : (buildSingleSessionExecutiveSummary(data.summary, data.auditOutput?.steps).takeawayCards || []);

  // PAGE 1: METADATA & EXECUTIVE IMPRESSION
  drawHeader();

  // --- SECTION 1: ESSENTIAL SESSION METADATA ---
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);

  // Row 1: Session Date/Time | Duration
  doc.text('Date & Time:', margin + 4, y + 6.5);
  doc.setFont('helvetica', 'normal');
  const dateStr = sanitizePdfText(data.summary.sessionDateFormatted || data.generatedAt);
  doc.text(doc.splitTextToSize(dateStr, 55)[0], margin + 28, y + 6.5);

  const col2X = margin + 96;
  doc.setFont('helvetica', 'bold');
  doc.text('Duration:', col2X, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(sanitizePdfText(data.summary.totalDurationFormatted), col2X + 28, y + 6.5);

  // Row 2: Signal Quality | Total Samples
  doc.setFont('helvetica', 'bold');
  doc.text('Signal Quality:', margin + 4, y + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(16, 185, 129);
  doc.text(`${data.summary.dataQualityPercent}% (${data.signalQualityGrade})`, margin + 28, y + 13.5);

  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text('Samples:', col2X, y + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.summary.totalSamples.toLocaleString()} frames`, col2X + 28, y + 13.5);

  y += 25;

  // --- SECTION 2: CLINICAL IMPRESSION ---
  if (bottomLimit - y < 35) {
    doc.addPage();
    drawHeader();
  }

  const execHeadlineRaw = execSummary.executiveHeadline || (
    data.dominantRhythm.includes('Co-Dominant')
      ? `Primary Neuro-State: ${data.dominantRhythm}`
      : `Primary Neuro-State: ${data.dominantRhythm} Dominance`
  );
  const cleanHeadline = sanitizePdfText(execHeadlineRaw);
  const splitHeadline: string[] = doc.splitTextToSize(cleanHeadline, contentWidth - 14);

  const summaryTextRaw = execSummary.keyTakeaways?.[0] ||
    data.report?.findings.clinicalSummaryText ||
    `The recording exhibits clean electroencephalographic rhythms with an overall signal contact efficiency of ${data.summary.dataQualityPercent}%. Frontal Alpha Asymmetry (FAA) measures ${data.faaScore.toFixed(3)} Bels (${data.faaValence}), reflecting ${data.faaInterpretation}.`;
  const cleanSummary = sanitizePdfText(summaryTextRaw);
  const splitSummary: string[] = doc.splitTextToSize(cleanSummary, contentWidth - 14);

  const cardHeight = Math.max(28, 11 + splitHeadline.length * 4.8 + splitSummary.length * 4.3 + 5);

  if (bottomLimit - y < cardHeight) {
    doc.addPage();
    drawHeader();
  }

  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(margin, y, 3, cardHeight, 'F');

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. Clinical Impression', margin + 6, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  let innerY = y + 11.5;
  splitHeadline.forEach((line: string) => {
    doc.text(line, margin + 6, innerY);
    innerY += 4.8;
  });
  innerY += 1;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  splitSummary.forEach((line: string) => {
    doc.text(line, margin + 6, innerY);
    innerY += 4.3;
  });

  y += cardHeight + 6;

  // --- SECTION 3: PLAIN-LANGUAGE BRAIN STATE SUMMARY CARDS ---
  if (plainEnglishCards.length > 0) {
    if (bottomLimit - y < 35) {
      doc.addPage();
      drawHeader();
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('2. Brain State Summary', margin, y);
    y += 6;

    plainEnglishCards.forEach((card) => {
      y = renderCardBoxPDF(
        doc, card, y, pageHeight, margin, contentWidth, drawHeader,
        primaryColor, secondaryColor, accentColor, lightBg, borderColor, darkTextColor, mutedTextColor
      );
    });

    y += 2;
  }

  // --- SECTION 4: EXECUTIVE KEY TAKEAWAY CARDS ---
  if (takeawayCards.length > 0) {
    if (bottomLimit - y < 35) {
      doc.addPage();
      drawHeader();
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('3. Key Takeaway Insights', margin, y);
    y += 6;

    takeawayCards.forEach((card) => {
      y = renderCardBoxPDF(
        doc, card, y, pageHeight, margin, contentWidth, drawHeader,
        primaryColor, secondaryColor, accentColor, lightBg, borderColor, darkTextColor, mutedTextColor
      );
    });

    y += 2;
  }

  // --- SECTION 5: SPECTRAL POWER DENSITY (PSD) BREAKDOWN TABLE ---
  if (bottomLimit - y < 50) {
    doc.addPage();
    drawHeader();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('4. Frequency Band Spectrum', margin, y);
  y += 6;

  const tableHeaders = ['Frequency Band', 'Hz Range', 'Rel Power %', 'Power (Bels)', 'Diagnostic Interpretation'];
  const colWidths = [30, 24, 24, 24, 84];
  
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  let xPos = margin + 2;
  tableHeaders.forEach((hdr, idx) => {
    doc.text(hdr, xPos, y + 4.8);
    xPos += colWidths[idx];
  });

  y += 7;

  const rows = [
    { name: 'Delta (d)', hz: '1.0 - 4.0 Hz', pct: `${data.bandPower.delta.pct}%`, bels: `${data.bandPower.delta.bels} Bels`, desc: 'Deep restorative slow-wave activity; motor inhibition baseline' },
    { name: 'Theta (t)', hz: '4.0 - 8.0 Hz', pct: `${data.bandPower.theta.pct}%`, bels: `${data.bandPower.theta.bels} Bels`, desc: 'Deep meditation, memory encoding, limbic activity & creative flow' },
    { name: 'Alpha (a)', hz: '7.5 - 13.0 Hz', pct: `${data.bandPower.alpha.pct}%`, bels: `${data.bandPower.alpha.bels} Bels`, desc: 'Relaxed alertness, cortical readiness & parasympathetic dominance' },
    { name: 'Beta (b)', hz: '13.0 - 30.0 Hz', pct: `${data.bandPower.beta.pct}%`, bels: `${data.bandPower.beta.bels} Bels`, desc: 'Active prefrontal cognitive processing & task-oriented attention' },
    { name: 'Gamma (g)', hz: '30.0 - 44.0 Hz', pct: `${data.bandPower.gamma.pct}%`, bels: `${data.bandPower.gamma.bels} Bels`, desc: 'High-frequency sensory binding & peak cognitive focus state' },
  ];

  rows.forEach((r, idx) => {
    const cleanDesc = sanitizePdfText(r.desc);
    const descLines: string[] = doc.splitTextToSize(cleanDesc, colWidths[4] - 4);
    const rowH = Math.max(7, descLines.length * 4.0 + 3);

    if (bottomLimit - y < rowH) {
      doc.addPage();
      drawHeader();
    }

    const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
    doc.setFillColor(bg[0], bg[1], bg[2]);
    doc.rect(margin, y, contentWidth, rowH, 'F');

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, y + rowH, margin + contentWidth, y + rowH);

    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.setFont('helvetica', r.name.toLowerCase().includes(data.dominantRhythm.toLowerCase()) ? 'bold' : 'normal');
    doc.setFontSize(8.5);

    let rowX = margin + 2;
    doc.text(sanitizePdfText(r.name), rowX, y + 4.8); rowX += colWidths[0];
    doc.text(sanitizePdfText(r.hz), rowX, y + 4.8); rowX += colWidths[1];
    doc.text(sanitizePdfText(r.pct), rowX, y + 4.8); rowX += colWidths[2];
    doc.text(sanitizePdfText(r.bels), rowX, y + 4.8); rowX += colWidths[3];
    
    let descY = y + 4.8;
    descLines.forEach((dLine: string) => {
      doc.text(dLine, rowX, descY);
      descY += 4.0;
    });

    y += rowH;
  });

  y += 5;

  // --- SECTION 6: SPATIAL TOPOGRAPHY & FAA ---
  if (bottomLimit - y < 40) {
    doc.addPage();
    drawHeader();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('5. Regional Topography & Hemispheric Balance (FAA)', margin, y);
  y += 6;

  const line1 = sanitizePdfText(`Frontal Cortex (AF7 Left: ${data.channelPower.AF7Alpha} Bels, AF8 Right: ${data.channelPower.AF8Alpha} Bels | Avg: ${data.channelPower.frontalAvgAlpha} Bels)`);
  const line2 = sanitizePdfText(`Temporal Lobes (TP9 Left: ${data.channelPower.TP9Alpha} Bels, TP10 Right: ${data.channelPower.TP10Alpha} Bels | Avg: ${data.channelPower.temporalAvgAlpha} Bels)`);
  const line3 = sanitizePdfText(`Orientation: ${data.faaInterpretation}`);

  const splitLine1: string[] = doc.splitTextToSize(line1, contentWidth - 10);
  const splitLine2: string[] = doc.splitTextToSize(line2, contentWidth - 10);
  const splitLine3: string[] = doc.splitTextToSize(line3, contentWidth - 10);

  const boxH = Math.max(26, 12 + (splitLine1.length + splitLine2.length + splitLine3.length) * 4.2);

  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  doc.text(`FAA Index: ${data.faaScore.toFixed(3)} Bels`, margin + 4, y + 6);
  
  const valText = sanitizePdfText(`Valence: ${data.faaValence}`);
  doc.text(valText, margin + contentWidth - 4, y + 6, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);

  let topoY = y + 11.5;
  splitLine1.forEach((l: string) => { doc.text(l, margin + 4, topoY); topoY += 4.2; });
  splitLine2.forEach((l: string) => { doc.text(l, margin + 4, topoY); topoY += 4.2; });
  splitLine3.forEach((l: string) => { doc.text(l, margin + 4, topoY); topoY += 4.2; });

  y += boxH + 5;

  // --- SECTION 7: QUANTITATIVE COGNITIVE SCORES & AUTONOMIC DYNAMICS ---
  if (bottomLimit - y < 35) {
    doc.addPage();
    drawHeader();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('6. Cognitive Scores & Autonomic Dynamics', margin, y);
  y += 6;

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
    doc.setFontSize(13);
    doc.setTextColor(s.color[0], s.color[1], s.color[2]);
    doc.text(`${s.score}/100`, sbX + scoreBoxWidth / 2, y + 9.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(s.label, sbX + scoreBoxWidth / 2, y + 15.5, { align: 'center' });
  });

  y += 24;

  if (data.summary.hasHeartRate || data.summary.hasMotionData) {
    let autoText = '';
    if (data.summary.hasHeartRate) {
      autoText += `Avg HR: ${data.summary.avgHeartRate} BPM (${data.summary.minHeartRate}-${data.summary.maxHeartRate}) | HRV RMSSD: ${data.summary.hrvRmssd} ms | Recovery: ${data.summary.stressRecoveryRatio}/100`;
    }
    if (data.summary.hasMotionData) {
      if (autoText) autoText += ' | ';
      autoText += `Gyro Motion: ${data.summary.avgGyroMagnitude} deg/s | Restlessness: ${data.summary.restlessnessIndex}/100`;
      if (data.summary.hasPostureDrift) autoText += ' (Posture Drift Detected)';
    }

    const cleanAuto = sanitizePdfText(autoText);
    const autoLines: string[] = doc.splitTextToSize(cleanAuto, contentWidth - 10);

    let stateLines: string[] = [];
    if (data.summary.cardioNeuroState) {
      const cleanState = sanitizePdfText(`State: ${data.summary.cardioNeuroState.shortTag} - ${data.summary.cardioNeuroState.insight}`);
      stateLines = doc.splitTextToSize(cleanState, contentWidth - 10);
    }

    const autoBoxH = Math.max(16, 8 + (autoLines.length + stateLines.length) * 4.0 + 4);

    if (bottomLimit - y < autoBoxH) {
      doc.addPage();
      drawHeader();
    }

    doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth, autoBoxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('Autonomic & Somatic Dynamics', margin + 3, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

    let lineY = y + 9.5;
    autoLines.forEach((line: string) => {
      doc.text(line, margin + 3, lineY);
      lineY += 4.0;
    });

    if (stateLines.length > 0) {
      doc.setFont('helvetica', 'italic');
      stateLines.forEach((line: string) => {
        doc.text(line, margin + 3, lineY);
        lineY += 4.0;
      });
    }

    y += autoBoxH + 5;
  }

  // --- SECTION 8: CLINICAL ASSESSMENT AUDIT STEPS ---
  if (bottomLimit - y < 35) {
    doc.addPage();
    drawHeader();
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('7. Multi-Step Audit Steps', margin, y);
  y += 6;

  const auditStepsToPrint = data.auditOutput?.steps || [];
  if (auditStepsToPrint.length > 0) {
    auditStepsToPrint.forEach((st) => {
      y = renderStepCardPDF(
        doc, st.stepNumber, st.stepTitle, st.detailsMarkdown, y, pageHeight,
        margin, contentWidth, drawHeader, secondaryColor, lightBg, borderColor, darkTextColor
      );
    });
  } else {
    const primaryBandKey = (['delta', 'theta', 'alpha', 'beta', 'gamma'] as const).find((b) => data.dominantRhythm.toLowerCase().includes(b)) || 'alpha';
    const primaryPct = data.bandPower[primaryBandKey]?.pct || '35';

    const observations = data.report?.findings.diagnosticObservations || [
      `Frontal Alpha Asymmetry of ${data.faaScore.toFixed(3)} Bels indicates ${data.faaValence.toLowerCase()} emotional orientation.`,
      `Dominant power frequency isolated in the ${data.dominantRhythm} spectrum (${primaryPct}% total power).`,
      `Signal artifact rejection audit passed with ${data.summary.dataQualityPercent}% contact cleanliness.`,
    ];

    observations.forEach((obs) => {
      const cleanObs = sanitizePdfText(obs);
      const obsLines: string[] = doc.splitTextToSize(`- ${cleanObs}`, contentWidth - 10);
      const obsBoxH = Math.max(12, obsLines.length * 4.2 + 4);

      if (bottomLimit - y < obsBoxH) {
        doc.addPage();
        drawHeader();
      }

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, obsBoxH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

      let oY = y + 5.5;
      obsLines.forEach((l: string) => {
        doc.text(l, margin + 4, oY);
        oY += 4.2;
      });

      y += obsBoxH + 4;
    });
  }

  // --- SECTION 9: PRESCRIBED BIOFEEDBACK PROTOCOLS & ACTION PLAN ---
  if (bottomLimit - y < 35) {
    doc.addPage();
    drawHeader();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('8. Biofeedback Recommendations', margin, y);
  y += 6;

  const protocols = data.auditOutput?.executiveSummary?.topRecommendations?.map((r, i) => ({
    title: `Protocol ${i + 1}`,
    mechanism: r,
  })) || data.report?.findings.protocols || [
    { title: 'Resonant Frequency Breathing (6 Breaths/Min)', mechanism: 'Elevates Frontal Alpha power and regulates autonomic nervous tone.' },
    { title: 'Pomodoro SMR Task Structuring (25m / 5m Rest)', mechanism: 'Mitigates prefrontal Beta fatigue and preserves cognitive workload reserve.' },
    { title: 'Theta-Alpha Entrainment Meditation', mechanism: 'Promotes temporal TP9/TP10 Theta-Alpha synchrony for stress recovery.' },
  ];

  protocols.forEach((prot: { title: string; mechanism: string }, protIdx: number) => {
    const cleanTitle = sanitizePdfText(prot.title);
    const cleanMech = sanitizePdfText(prot.mechanism);
    const recLines: string[] = doc.splitTextToSize(`Recommendation: ${cleanMech}`, contentWidth - 10);
    const protBoxHeight = Math.max(15, 6.5 + recLines.length * 4.2 + 4.5);

    if (bottomLimit - y < protBoxHeight) {
      doc.addPage();
      drawHeader();
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, protBoxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`${protIdx + 1}. ${cleanTitle}`, margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

    let rY = y + 10.5;
    recLines.forEach((l: string) => {
      doc.text(l, margin + 4, rY);
      rY += 4.2;
    });

    y += protBoxHeight + 4;
  });

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
  const bottomLimit = pageHeight - 18; // 279mm printable limit
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
    doc.rect(0, 0, pageWidth, 16, 'F');

    doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.rect(0, 16, pageWidth, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Session Comparison Report', margin, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`REPORT ID: ${sanitizePdfText(data.reportId)}`, pageWidth - margin - 50, 11);
    doc.text(`DATE: ${sanitizePdfText(data.generatedAt)}`, pageWidth - margin, 11, { align: 'right' });

    y = 23;
  };

  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(mutedTextColor[0], mutedTextColor[1], mutedTextColor[2]);

    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.text('EEG Mind Analyzer -- Session Comparison Report', margin, pageHeight - 5);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  };

  // Build / resolve executive summary & cards for dual session comparison
  const execSummary = data.auditOutput?.executiveSummary || buildDualSessionExecutiveSummary(data.sessionA, data.sessionB, data.comparisonResult, data.auditOutput?.steps);
  const plainEnglishCards = (execSummary.plainEnglishCards && execSummary.plainEnglishCards.length > 0)
    ? execSummary.plainEnglishCards
    : buildDualSessionPlainEnglishCards(data.sessionA, data.sessionB, data.comparisonResult);
  const takeawayCards = (execSummary.takeawayCards && execSummary.takeawayCards.length > 0)
    ? execSummary.takeawayCards
    : (buildDualSessionExecutiveSummary(data.sessionA, data.sessionB, data.comparisonResult, data.auditOutput?.steps).takeawayCards || []);

  // PAGE 1
  drawHeader();

  // SECTION 1: METADATA COMPARISON
  if (bottomLimit - y < 35) {
    doc.addPage();
    drawHeader();
  }

  const sessAText = sanitizePdfText(`${data.sessionA.filename} (${data.comparisonResult.sessionAInfo.duration}, ${data.comparisonResult.sessionAInfo.quality}% clean)`);
  const sessALines: string[] = doc.splitTextToSize(sessAText, contentWidth - 52);

  const sessBText = sanitizePdfText(`${data.sessionB.filename} (${data.comparisonResult.sessionBInfo.duration}, ${data.comparisonResult.sessionBInfo.quality}% clean)`);
  const sessBLines: string[] = doc.splitTextToSize(sessBText, contentWidth - 52);

  const metaBoxH = Math.max(22, 10 + (sessALines.length + sessBLines.length) * 4.3 + 8);

  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.4);
  doc.roundedRect(margin, y, contentWidth, metaBoxH, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  let metaY = y + 6;
  doc.text('Session A (Baseline):', margin + 4, metaY);
  doc.setFont('helvetica', 'normal');
  sessALines.forEach((line) => {
    doc.text(line, margin + 48, metaY);
    metaY += 4.3;
  });
  metaY += 2;

  doc.setFont('helvetica', 'bold');
  doc.text('Session B (Comparison):', margin + 4, metaY);
  doc.setFont('helvetica', 'normal');
  sessBLines.forEach((line) => {
    doc.text(line, margin + 48, metaY);
    metaY += 4.3;
  });
  metaY += 2;

  doc.setFont('helvetica', 'bold');
  doc.text('Signal Quality Delta:', margin + 4, metaY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(data.comparisonResult.overviewDeltas.qualityDelta >= 0 ? 16 : 225, 185, 129);
  doc.text(`${data.comparisonResult.overviewDeltas.qualityDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.qualityDelta}%`, margin + 48, metaY);

  y += metaBoxH + 5;

  // SECTION 2: EXECUTIVE SHIFT IMPRESSION
  if (bottomLimit - y < 35) {
    doc.addPage();
    drawHeader();
  }

  const execHeadlineRaw = execSummary.executiveHeadline || 'Cross-Session State Adaptation & Shift';
  const cleanHeadline = sanitizePdfText(execHeadlineRaw);
  const splitHeadline: string[] = doc.splitTextToSize(cleanHeadline, contentWidth - 14);

  const takeawaysToPrint = execSummary.keyTakeaways?.map(t => sanitizePdfText(t)) || [
    sanitizePdfText(`Transition from Session A (${data.sessionA.summary.dominantWave}) to Session B (${data.sessionB.summary.dominantWave}). Tranquility shifted by ${data.comparisonResult.overviewDeltas.calmDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.calmDelta} points and Focus shifted by ${data.comparisonResult.overviewDeltas.focusDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.focusDelta} points.`)
  ];

  const takeawayLines: string[] = [];
  takeawaysToPrint.slice(0, 3).forEach((t) => {
    const split: string[] = doc.splitTextToSize(`- ${t}`, contentWidth - 14);
    takeawayLines.push(...split);
  });

  const cardHeight = Math.max(28, 11 + splitHeadline.length * 4.8 + takeawayLines.length * 4.3 + 5);

  if (bottomLimit - y < cardHeight) {
    doc.addPage();
    drawHeader();
  }

  doc.setFillColor(243, 244, 246);
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

  doc.setFillColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.rect(margin, y, 3, cardHeight, 'F');

  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. Executive Shift Impression', margin + 6, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  let innerY = y + 11.5;
  splitHeadline.forEach((line: string) => {
    doc.text(line, margin + 6, innerY);
    innerY += 4.8;
  });
  innerY += 1;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  takeawayLines.forEach((line: string) => {
    doc.text(line, margin + 6, innerY);
    innerY += 4.3;
  });

  y += cardHeight + 6;

  // --- SECTION 3: PLAIN-LANGUAGE CROSS-SESSION BRAIN SHIFT SUMMARY ---
  if (plainEnglishCards.length > 0) {
    if (bottomLimit - y < 35) {
      doc.addPage();
      drawHeader();
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('2. Brain Shift Summary', margin, y);
    y += 6;

    plainEnglishCards.forEach((card) => {
      y = renderCardBoxPDF(
        doc, card, y, pageHeight, margin, contentWidth, drawHeader,
        primaryColor, secondaryColor, accentColor, lightBg, borderColor, darkTextColor, mutedTextColor
      );
    });

    y += 2;
  }

  // --- SECTION 4: EXECUTIVE KEY TAKEAWAY CARDS ---
  if (takeawayCards.length > 0) {
    if (bottomLimit - y < 35) {
      doc.addPage();
      drawHeader();
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('3. Key Takeaway Insights', margin, y);
    y += 6;

    takeawayCards.forEach((card) => {
      y = renderCardBoxPDF(
        doc, card, y, pageHeight, margin, contentWidth, drawHeader,
        primaryColor, secondaryColor, accentColor, lightBg, borderColor, darkTextColor, mutedTextColor
      );
    });

    y += 2;
  }

  // --- SECTION 5: COGNITIVE SCORE DELTAS ---
  if (bottomLimit - y < 35) {
    doc.addPage();
    drawHeader();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('4. Cognitive Score Deltas', margin, y);
  y += 6;

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
    doc.setFontSize(8);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    doc.text(d.label, sbX + scoreBoxWidth / 2, y + 15.5, { align: 'center' });
  });

  y += 25;

  // --- SECTION 6: 4-SENSOR SPATIAL POWER SHIFTS TABLE ---
  if (bottomLimit - y < 45) {
    doc.addPage();
    drawHeader();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('5. Spatial Power Shifts (Bels)', margin, y);
  y += 6;

  const tableHeaders = ['Sensor', 'Delta (d)', 'Theta (t)', 'Alpha (a)', 'Beta (b)', 'Gamma (g)'];
  const colW = [22, 32, 32, 32, 32, 32];

  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(margin, y, contentWidth, 7, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  let xP = margin + 2;
  tableHeaders.forEach((hdr, idx) => {
    doc.text(hdr, xP, y + 4.8);
    xP += colW[idx];
  });

  y += 7;

  const fmtVal = (v: number | string): string => {
    const num = typeof v === 'number' ? v : parseFloat(v);
    if (Number.isNaN(num)) return '0.00';
    return `${num > 0 ? '+' : ''}${num.toFixed(2)}`;
  };

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
    doc.setFontSize(8.5);

    let rowX = margin + 2;
    doc.text(s, rowX, y + 4.8); rowX += colW[0];
    doc.setFont('helvetica', 'normal');
    doc.text(fmtVal(sStats.delta), rowX, y + 4.8); rowX += colW[1];
    doc.text(fmtVal(sStats.theta), rowX, y + 4.8); rowX += colW[2];
    doc.text(fmtVal(sStats.alpha), rowX, y + 4.8); rowX += colW[3];
    doc.text(fmtVal(sStats.beta), rowX, y + 4.8); rowX += colW[4];
    doc.text(fmtVal(sStats.gamma), rowX, y + 4.8);

    y += 7;
  });

  y += 5;

  // --- SECTION 7: MULTI-STEP COMPARATIVE AUDIT STEPS ---
  if (bottomLimit - y < 35) {
    doc.addPage();
    drawHeader();
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('6. Comparative Assessment', margin, y);
  y += 6;

  const stepsToPrint = data.auditOutput?.steps || [];
  if (stepsToPrint.length > 0) {
    stepsToPrint.forEach((st) => {
      y = renderStepCardPDF(
        doc, st.stepNumber, st.stepTitle, st.detailsMarkdown, y, pageHeight,
        margin, contentWidth, drawHeader, secondaryColor, lightBg, borderColor, darkTextColor
      );
    });
  } else {
    const compObs = data.comparisonResult.executiveSummary || [
      `Transition from Session A (${data.sessionA.summary.dominantWave}) to Session B (${data.sessionB.summary.dominantWave}).`,
      `Tranquility shifted by ${data.comparisonResult.overviewDeltas.calmDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.calmDelta} points and Focus shifted by ${data.comparisonResult.overviewDeltas.focusDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.focusDelta} points.`,
      `Frontal Alpha Asymmetry (FAA) shifted by ${data.comparisonResult.overviewDeltas.faaDelta > 0 ? '+' : ''}${data.comparisonResult.overviewDeltas.faaDelta.toFixed(3)} Bels.`,
    ];

    compObs.forEach((obs, obsIdx) => {
      const cleanObs = sanitizePdfText(obs);
      const splitObs: string[] = doc.splitTextToSize(`- ${cleanObs}`, contentWidth - 10);
      const obsBoxH = Math.max(14, 7 + splitObs.length * 4.2 + 4);

      if (bottomLimit - y < obsBoxH) {
        doc.addPage();
        drawHeader();
      }

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, obsBoxH, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(`Comparative Takeaway ${obsIdx + 1}`, margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

      let lineY = y + 11;
      splitObs.forEach((l: string) => {
        doc.text(l, margin + 4, lineY);
        lineY += 4.2;
      });

      y += obsBoxH + 4;
    });
  }

  // --- SECTION 8: ADAPTIVE RECOMMENDATIONS ---
  if (bottomLimit - y < 35) {
    doc.addPage();
    drawHeader();
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('7. Biofeedback Protocols', margin, y);
  y += 6;

  const recs = data.comparisonResult.recommendations || [];
  recs.forEach((r, idx) => {
    const cleanRec = sanitizePdfText(r);
    const splitRec: string[] = doc.splitTextToSize(cleanRec, contentWidth - 16);
    const boxH = Math.max(12, splitRec.length * 4.2 + 4);

    if (bottomLimit - y < boxH) {
      doc.addPage();
      drawHeader();
    }

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, boxH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(`${idx + 1}.`, margin + 3, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

    let recY = y + 5.5;
    splitRec.forEach((l: string) => {
      doc.text(l, margin + 8, recY);
      recY += 4.2;
    });

    y += boxH + 4;
  });

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  doc.save(`EEG_Comparative_Neuro_Report_${data.reportId}.pdf`);
};
