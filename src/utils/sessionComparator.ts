import { ProcessedEEGFrame, SessionSummary } from '../types/eeg';

export interface SensorChannelStats {
  name: 'AF7' | 'AF8' | 'TP9' | 'TP10';
  label: string;
  region: 'Frontal Left' | 'Frontal Right' | 'Temporal Left' | 'Temporal Right';
  sessionA: {
    delta: number;
    theta: number;
    alpha: number;
    beta: number;
    gamma: number;
    total: number;
  };
  sessionB: {
    delta: number;
    theta: number;
    alpha: number;
    beta: number;
    gamma: number;
    total: number;
  };
  deltas: {
    delta: number;
    theta: number;
    alpha: number;
    beta: number;
    gamma: number;
    total: number;
  };
  dominantWaveA: string;
  dominantWaveB: string;
  interpretation: string;
}

export interface WavebandStats {
  wave: 'Delta' | 'Theta' | 'Alpha' | 'Beta' | 'Gamma';
  freqRange: string;
  functionalRole: string;
  sessionAAvgRel: number;
  sessionBAvgRel: number;
  relDiff: number; // percentage point difference
  percentChange: number; // relative % change
  sensorDistributionA: { AF7: number; AF8: number; TP9: number; TP10: number };
  sensorDistributionB: { AF7: number; AF8: number; TP9: number; TP10: number };
  spatialShiftDescription: string;
  correlationSummary: string;
}

export interface CrossFrequencyRatio {
  name: string;
  description: string;
  sessionAVal: number;
  sessionBVal: number;
  deltaVal: number;
  percentChange: number;
  clinicalSignificance: string;
}

export interface RegionalPowerDistribution {
  frontalPowerA: number; // AF7 + AF8
  frontalPowerB: number;
  temporalPowerA: number; // TP9 + TP10
  temporalPowerB: number;
  frontalTemporalRatioA: number;
  frontalTemporalRatioB: number;
  leftPowerA: number; // AF7 + TP9
  leftPowerB: number;
  rightPowerA: number; // AF8 + TP10
  rightPowerB: number;
  hemisphericRatioA: number; // Left / Right
  hemisphericRatioB: number;
  regionalShiftInterpretation: string;
}

export interface ComparisonAlignmentOptions {
  alignmentMode: 'trim' | 'window' | 'normalized';
  windowOffsetSecA?: number;
  windowOffsetSecB?: number;
  windowDurationSec?: number;
}

export interface ComparisonAlignmentInfo {
  mode: 'trim' | 'window' | 'normalized';
  durAOrigSec: number;
  durBOrigSec: number;
  durAAlignedSec: number;
  durBAlignedSec: number;
  offsetASec: number;
  offsetBSec: number;
  description: string;
}

export interface SessionComparisonResult {
  sessionAInfo: {
    duration: string;
    samples: number;
    quality: number;
    dominantWave: string;
    avgFocus: number;
    avgCalm: number;
    avgMeditation: number;
    avgCognitiveLoad: number;
    faa: number;
  };
  sessionBInfo: {
    duration: string;
    samples: number;
    quality: number;
    dominantWave: string;
    avgFocus: number;
    avgCalm: number;
    avgMeditation: number;
    avgCognitiveLoad: number;
    faa: number;
  };
  overviewDeltas: {
    focusDelta: number;
    calmDelta: number;
    meditationDelta: number;
    loadDelta: number;
    faaDelta: number;
    qualityDelta: number;
  };
  alignmentInfo: ComparisonAlignmentInfo;
  sensorStats: Record<'AF7' | 'AF8' | 'TP9' | 'TP10', SensorChannelStats>;
  wavebandStats: Record<'Delta' | 'Theta' | 'Alpha' | 'Beta' | 'Gamma', WavebandStats>;
  ratios: CrossFrequencyRatio[];
  regional: RegionalPowerDistribution;
  executiveSummary: string[];
  sensorCorrelationsText: string[];
  wavebandCorrelationsText: string[];
  recommendations: string[];
  timeSeriesData: Array<{
    timeFormatted: string;
    timeSec: number;
    focusA?: number;
    focusB?: number;
    calmA?: number;
    calmB?: number;
    faaA?: number;
    faaB?: number;
    // Sensor & Band power breakdown
    all_deltaA?: number; all_deltaB?: number;
    all_thetaA?: number; all_thetaB?: number;
    all_alphaA?: number; all_alphaB?: number;
    all_betaA?: number;  all_betaB?: number;
    all_gammaA?: number; all_gammaB?: number;

    AF7_deltaA?: number; AF7_deltaB?: number;
    AF7_thetaA?: number; AF7_thetaB?: number;
    AF7_alphaA?: number; AF7_alphaB?: number;
    AF7_betaA?: number;  AF7_betaB?: number;
    AF7_gammaA?: number; AF7_gammaB?: number;

    AF8_deltaA?: number; AF8_deltaB?: number;
    AF8_thetaA?: number; AF8_thetaB?: number;
    AF8_alphaA?: number; AF8_alphaB?: number;
    AF8_betaA?: number;  AF8_betaB?: number;
    AF8_gammaA?: number; AF8_gammaB?: number;

    TP9_deltaA?: number; TP9_deltaB?: number;
    TP9_thetaA?: number; TP9_thetaB?: number;
    TP9_alphaA?: number; TP9_alphaB?: number;
    TP9_betaA?: number;  TP9_betaB?: number;
    TP9_gammaA?: number; TP9_gammaB?: number;

    TP10_deltaA?: number; TP10_deltaB?: number;
    TP10_thetaA?: number; TP10_thetaB?: number;
    TP10_alphaA?: number; TP10_alphaB?: number;
    TP10_betaA?: number;  TP10_betaB?: number;
    TP10_gammaA?: number; TP10_gammaB?: number;
  }>;
}

// Helper for safe number coercion
function safeNum(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

// Helper for average of valid numbers
function safeAvg(vals: number[]): number {
  if (!vals || vals.length === 0) return 0;
  const valid = vals.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

// Compute channel averages for a session
function computeChannelAverages(frames: ProcessedEEGFrame[]) {
  const channels = ['AF7', 'AF8', 'TP9', 'TP10'] as const;
  const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'] as const;

  const result: Record<string, Record<string, number>> = {
    AF7: { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0, total: 0 },
    AF8: { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0, total: 0 },
    TP9: { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0, total: 0 },
    TP10: { delta: 0, theta: 0, alpha: 0, beta: 0, gamma: 0, total: 0 },
  };

  if (!frames || frames.length === 0) return result;

  channels.forEach((ch) => {
    bands.forEach((b) => {
      const vals = frames.map((f) => f.channels[ch]?.[b] || 0);
      result[ch][b] = safeAvg(vals);
    });
    result[ch].total =
      result[ch].delta + result[ch].theta + result[ch].alpha + result[ch].beta + result[ch].gamma;
  });

  return result;
}

// Compute relative band powers overall
function computeOverallBandPercentages(frames: ProcessedEEGFrame[]) {
  return {
    delta: +(safeAvg(frames.map((f) => f.relDelta))).toFixed(1),
    theta: +(safeAvg(frames.map((f) => f.relTheta))).toFixed(1),
    alpha: +(safeAvg(frames.map((f) => f.relAlpha))).toFixed(1),
    beta: +(safeAvg(frames.map((f) => f.relBeta))).toFixed(1),
    gamma: +(safeAvg(frames.map((f) => f.relGamma))).toFixed(1),
  };
}

export function compareEEGSessions(
  sessionA: { summary: SessionSummary; frames: ProcessedEEGFrame[] },
  sessionB: { summary: SessionSummary; frames: ProcessedEEGFrame[] },
  alignmentOpts?: ComparisonAlignmentOptions
): SessionComparisonResult {
  const origFA = sessionA.frames || [];
  const origFB = sessionB.frames || [];

  const durAOrig = origFA.length > 0 ? origFA[origFA.length - 1].timeSec : 0;
  const durBOrig = origFB.length > 0 ? origFB[origFB.length - 1].timeSec : 0;

  const mode = alignmentOpts?.alignmentMode || 'trim';

  let fA: ProcessedEEGFrame[] = origFA;
  let fB: ProcessedEEGFrame[] = origFB;
  let offsetA = 0;
  let offsetB = 0;
  let description = '';

  if (mode === 'trim') {
    const minDur = Math.min(durAOrig, durBOrig);
    fA = origFA.filter((f) => f.timeSec <= minDur);
    fB = origFB.filter((f) => f.timeSec <= minDur);
    const minsA = Math.floor(durAOrig / 60);
    const secsA = Math.floor(durAOrig % 60);
    const minsB = Math.floor(durBOrig / 60);
    const secsB = Math.floor(durBOrig % 60);
    const minsMin = Math.floor(minDur / 60);
    const secsMin = Math.floor(minDur % 60);
    description = `Session A (${minsA}m ${secsA}s) and Session B (${minsB}m ${secsB}s) trimmed to shortest duration (${minsMin}m ${secsMin}s).`;
  } else if (mode === 'window') {
    offsetA = alignmentOpts?.windowOffsetSecA || 0;
    offsetB = alignmentOpts?.windowOffsetSecB || 0;
    const winDur = alignmentOpts?.windowDurationSec || Math.min(durAOrig, durBOrig);

    fA = origFA.filter((f) => f.timeSec >= offsetA && f.timeSec <= offsetA + winDur);
    fB = origFB.filter((f) => f.timeSec >= offsetB && f.timeSec <= offsetB + winDur);

    const minsWin = Math.floor(winDur / 60);
    const secsWin = Math.floor(winDur % 60);
    description = `Custom window comparison of ${minsWin}m ${secsWin}s (Session A offset: ${Math.floor(offsetA)}s, Session B offset: ${Math.floor(offsetB)}s).`;
  } else if (mode === 'normalized') {
    description = `Normalized session timeline comparison (0% to 100% progress across Session A ${Math.floor(durAOrig / 60)}m vs Session B ${Math.floor(durBOrig / 60)}m).`;
  }

  const durAAligned = fA.length > 0 ? fA[fA.length - 1].timeSec - fA[0].timeSec : 0;
  const durBAligned = fB.length > 0 ? fB[fB.length - 1].timeSec - fB[0].timeSec : 0;

  const alignmentInfo: ComparisonAlignmentInfo = {
    mode,
    durAOrigSec: durAOrig,
    durBOrigSec: durBOrig,
    durAAlignedSec: durAAligned,
    durBAlignedSec: durBAligned,
    offsetASec: offsetA,
    offsetBSec: offsetB,
    description,
  };

  // Re-compute average scores for aligned windows
  const avgFocusA = safeAvg(fA.map((f) => f.focusScore));
  const avgFocusB = safeAvg(fB.map((f) => f.focusScore));

  const avgCalmA = safeAvg(fA.map((f) => f.calmScore));
  const avgCalmB = safeAvg(fB.map((f) => f.calmScore));

  const avgMedA = safeAvg(fA.map((f) => f.meditationDepth));
  const avgMedB = safeAvg(fB.map((f) => f.meditationDepth));

  const avgLoadA = safeAvg(fA.map((f) => f.cognitiveLoad));
  const avgLoadB = safeAvg(fB.map((f) => f.cognitiveLoad));

  const avgFaaA = safeAvg(fA.map((f) => f.frontalAsymmetry));
  const avgFaaB = safeAvg(fB.map((f) => f.frontalAsymmetry));

  const sA = sessionA.summary;
  const sB = sessionB.summary;

  const sessionAInfo = {
    duration: mode === 'trim' || mode === 'window' ? `${Math.floor(durAAligned / 60)}m ${Math.floor(durAAligned % 60)}s` : sA.totalDurationFormatted,
    samples: fA.length,
    quality: sA.dataQualityPercent,
    dominantWave: sA.dominantWave,
    avgFocus: Math.round(fA.length > 0 ? avgFocusA : sA.avgFocus),
    avgCalm: Math.round(fA.length > 0 ? avgCalmA : sA.avgCalm),
    avgMeditation: Math.round(fA.length > 0 ? avgMedA : sA.avgMeditationDepth),
    avgCognitiveLoad: Math.round(fA.length > 0 ? avgLoadA : sA.avgCognitiveLoad),
    faa: +(fA.length > 0 ? avgFaaA : sA.avgFrontalAsymmetry).toFixed(3),
  };

  const sessionBInfo = {
    duration: mode === 'trim' || mode === 'window' ? `${Math.floor(durBAligned / 60)}m ${Math.floor(durBAligned % 60)}s` : sB.totalDurationFormatted,
    samples: fB.length,
    quality: sB.dataQualityPercent,
    dominantWave: sB.dominantWave,
    avgFocus: Math.round(fB.length > 0 ? avgFocusB : sB.avgFocus),
    avgCalm: Math.round(fB.length > 0 ? avgCalmB : sB.avgCalm),
    avgMeditation: Math.round(fB.length > 0 ? avgMedB : sB.avgMeditationDepth),
    avgCognitiveLoad: Math.round(fB.length > 0 ? avgLoadB : sB.avgCognitiveLoad),
    faa: +(fB.length > 0 ? avgFaaB : sB.avgFrontalAsymmetry).toFixed(3),
  };

  const overviewDeltas = {
    focusDelta: sessionBInfo.avgFocus - sessionAInfo.avgFocus,
    calmDelta: sessionBInfo.avgCalm - sessionAInfo.avgCalm,
    meditationDelta: sessionBInfo.avgMeditation - sessionAInfo.avgMeditation,
    loadDelta: sessionBInfo.avgCognitiveLoad - sessionAInfo.avgCognitiveLoad,
    faaDelta: +(sessionBInfo.faa - sessionAInfo.faa).toFixed(3),
    qualityDelta: sB.dataQualityPercent - sA.dataQualityPercent,
  };

  // Sensor stats
  const chA = computeChannelAverages(fA);
  const chB = computeChannelAverages(fB);

  const sensorMeta = {
    AF7: { label: 'Left Forehead', region: 'Frontal Left' as const },
    AF8: { label: 'Right Forehead', region: 'Frontal Right' as const },
    TP9: { label: 'Left Ear', region: 'Temporal Left' as const },
    TP10: { label: 'Right Ear', region: 'Temporal Right' as const },
  };

  const sensorStats = {} as Record<'AF7' | 'AF8' | 'TP9' | 'TP10', SensorChannelStats>;

  (['AF7', 'AF8', 'TP9', 'TP10'] as const).forEach((ch) => {
    const a = chA[ch];
    const b = chB[ch];

    const deltas = {
      delta: +(b.delta - a.delta).toFixed(3),
      theta: +(b.theta - a.theta).toFixed(3),
      alpha: +(b.alpha - a.alpha).toFixed(3),
      beta: +(b.beta - a.beta).toFixed(3),
      gamma: +(b.gamma - a.gamma).toFixed(3),
      total: +(b.total - a.total).toFixed(3),
    };

    const findDom = (vals: Record<string, number>) => {
      const entries = [
        { w: 'Delta', v: vals.delta },
        { w: 'Theta', v: vals.theta },
        { w: 'Alpha', v: vals.alpha },
        { w: 'Beta', v: vals.beta },
        { w: 'Gamma', v: vals.gamma },
      ];
      entries.sort((x, y) => y.v - x.v);
      return entries[0].w;
    };

    const domA = findDom(a);
    const domB = findDom(b);

    let interpretation = '';
    if (ch === 'AF7') {
      if (deltas.alpha > 0.05 && deltas.beta > 0.05) {
        interpretation =
          'Left frontal Alpha and Beta power elevated concurrently. This reflects sustained high-engagement executive flow, combining active analytical focus with relaxed prefrontal poise.';
      } else if (deltas.alpha > 0.05 && deltas.beta <= 0) {
        interpretation =
          'Left frontal Alpha power increased markedly while Beta stabilized. This reflects reduced verbal self-criticism, enhanced inner emotional poise, and a shift towards relaxed executive control.';
      } else if (deltas.alpha > 0.05) {
        interpretation =
          'Left frontal Alpha power increased, reflecting reduced verbal self-talk and enhanced executive quietude.';
      } else if (deltas.alpha < -0.05) {
        interpretation =
          'Left frontal Alpha power decreased, indicating reduced prefrontal quietude or increased verbal self-talk and task framing.';
      } else if (deltas.beta > 0.05) {
        interpretation =
          'Left frontal Beta elevated, signaling increased verbal processing, active task framing, or problem solving in Session B.';
      } else if (deltas.beta < -0.05) {
        interpretation =
          'Left frontal Beta decreased, reflecting lower verbal processing load and reduced prefrontal cognitive strain.';
      } else {
        interpretation =
          'Left frontal sensor showed stable power levels, maintaining similar executive and verbal regulation characteristics across both sessions.';
      }
    } else if (ch === 'AF8') {
      if (deltas.alpha > 0.05 && deltas.beta > 0.05) {
        interpretation =
          'Right frontal Alpha and Beta power increased concurrently, indicating active prefrontal spatial/analytical processing operating in tandem with emotional composure.';
      } else if (deltas.beta < -0.05 && deltas.alpha > 0.05) {
        interpretation =
          'Right frontal Beta decreased while Alpha surged, indicating reduced vigilance/anxiety, lower risk monitoring tension, and smoother cognitive ease.';
      } else if (deltas.alpha > 0.05) {
        interpretation =
          'Right frontal Alpha power increased, reflecting reduced right prefrontal vigilance, lower anxiety, and a transition toward emotional equilibrium.';
      } else if (deltas.alpha < -0.05) {
        interpretation =
          'Right frontal Alpha power decreased, pointing toward heightened right prefrontal vigilance, cautious evaluation, or mental friction.';
      } else if (deltas.beta > 0.05) {
        interpretation =
          'Right frontal Beta increased, suggesting heightened analytical evaluation, active error checking, or mild cognitive friction.';
      } else if (deltas.beta < -0.05) {
        interpretation =
          'Right frontal Beta decreased, confirming a reduction in prefrontal stress monitoring and risk evaluation tension.';
      } else {
        interpretation =
          'Right frontal sensor exhibited consistent spectral power, preserving similar spatial reasoning and risk evaluation profiles.';
      }
    } else if (ch === 'TP9') {
      if ((deltas.theta > 0.05 || deltas.alpha > 0.05) && deltas.beta > 0.05) {
        interpretation =
          'Left temporal Theta/Alpha and Beta elevated together, reflecting active auditory/verbal processing integrated with quiet introspective grounding.';
      } else if (deltas.theta > 0.05 || deltas.alpha > 0.05) {
        interpretation =
          'Left temporal Theta/Alpha power expanded, indicating quieted auditory chatter, reduced internal monologue, and deeper introspective restfulness.';
      } else if (deltas.theta < -0.05 || deltas.alpha < -0.05) {
        interpretation =
          'Left temporal Theta/Alpha power decreased, suggesting active internal verbal dialogue or reduced introspective quietude.';
      } else if (deltas.beta > 0.05) {
        interpretation =
          'Left temporal Beta increased, pointing to active auditory or verbal processing during Session B.';
      } else if (deltas.beta < -0.05) {
        interpretation =
          'Left temporal Beta decreased, reflecting reduced auditory tracking or muscle tension around the left temporal region.';
      } else {
        interpretation =
          'Left temporal sensor maintained balanced spectral output with negligible shift in internal monologue or sensory processing.';
      }
    } else if (ch === 'TP10') {
      if ((deltas.alpha > 0.05 || deltas.theta > 0.05) && deltas.beta > 0.05) {
        interpretation =
          'Right temporal Alpha/Theta and Beta elevated concurrently, reflecting heightened somatic awareness alongside environmental sensory tracking.';
      } else if (deltas.alpha > 0.05 || deltas.theta > 0.05) {
        interpretation =
          'Right temporal Alpha/Theta power increased, reflecting heightened non-verbal grounding, emotional tranquility, and sensory relaxation.';
      } else if (deltas.alpha < -0.05 || deltas.theta < -0.05) {
        interpretation =
          'Right temporal Alpha/Theta power decreased, indicating reduced somatic relaxation or elevated environmental sensory vigilance.';
      } else if (deltas.beta > 0.05) {
        interpretation =
          'Right temporal Beta rose, indicating heightened somatic vigilance or environmental sensory monitoring.';
      } else if (deltas.beta < -0.05) {
        interpretation =
          'Right temporal Beta decreased, reflecting reduced environmental tension or muscle relaxation over the right temporal lobe.';
      } else {
        interpretation =
          'Right temporal sensor exhibited steady spectral power, preserving baseline emotional tone and bodily awareness.';
      }
    }

    sensorStats[ch] = {
      name: ch,
      label: sensorMeta[ch].label,
      region: sensorMeta[ch].region,
      sessionA: { ...a } as SensorChannelStats['sessionA'],
      sessionB: { ...b } as SensorChannelStats['sessionB'],
      deltas,
      dominantWaveA: domA,
      dominantWaveB: domB,
      interpretation,
    };
  });

  // Waveband Stats
  const bandsA = computeOverallBandPercentages(fA);
  const bandsB = computeOverallBandPercentages(fB);

  const wavebandMeta = {
    Delta: { range: '0.5 - 4 Hz', role: 'Deep restorative sleep, bodily recovery & subconscious processing' },
    Theta: { range: '4 - 8 Hz', role: 'Subconscious focus, deep meditation, intuition & memory encoding' },
    Alpha: { range: '8 - 13 Hz', role: 'Relaxed alertness, mental calm, non-judgmental awareness & idle state' },
    Beta: { range: '13 - 30 Hz', role: 'Active concentration, analytical thinking, decision making & alertness' },
    Gamma: { range: '30 - 44 Hz', role: 'Peak cognitive synthesis, information binding, insight & high engagement' },
  } as const;

  const wavebandStats = {} as Record<'Delta' | 'Theta' | 'Alpha' | 'Beta' | 'Gamma', WavebandStats>;

  (['Delta', 'Theta', 'Alpha', 'Beta', 'Gamma'] as const).forEach((w) => {
    const key = w.toLowerCase() as 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
    const valA = +(bandsA[key] || 0).toFixed(1);
    const valB = +(bandsB[key] || 0).toFixed(1);

    const diff = +(valB - valA).toFixed(1);
    const pctChange = valA > 0 ? +(((valB - valA) / valA) * 100).toFixed(1) : 0;

    const distribA = {
      AF7: +(chA.AF7[key] || 0).toFixed(2),
      AF8: +(chA.AF8[key] || 0).toFixed(2),
      TP9: +(chA.TP9[key] || 0).toFixed(2),
      TP10: +(chA.TP10[key] || 0).toFixed(2),
    };

    const distribB = {
      AF7: +(chB.AF7[key] || 0).toFixed(2),
      AF8: +(chB.AF8[key] || 0).toFixed(2),
      TP9: +(chB.TP9[key] || 0).toFixed(2),
      TP10: +(chB.TP10[key] || 0).toFixed(2),
    };

    const chList = [
      { name: 'AF7 (Left Frontal)', val: distribB.AF7 },
      { name: 'AF8 (Right Frontal)', val: distribB.AF8 },
      { name: 'TP9 (Left Temporal)', val: distribB.TP9 },
      { name: 'TP10 (Right Temporal)', val: distribB.TP10 },
    ];
    chList.sort((x, y) => y.val - x.val);
    const topSensorName = chList[0].name;

    let spatialShiftDescription = '';
    if (diff > 2) {
      spatialShiftDescription = `Overall ${w} power expanded by +${diff}% in Session B. Highest power concentration observed at ${topSensorName}.`;
    } else if (diff < -2) {
      spatialShiftDescription = `Overall ${w} power dropped by ${Math.abs(diff)}% in Session B. Reduced cortical synchrony in ${w} range.`;
    } else {
      spatialShiftDescription = `${w} power remained consistent within a ${diff}% variance band across both recordings.`;
    }

    const correlationSummary = `${w} band stability: ${pctChange >= 0 ? '+' : ''}${pctChange}% change relative to baseline Session A.`;

    wavebandStats[w] = {
      wave: w,
      freqRange: wavebandMeta[w].range,
      functionalRole: wavebandMeta[w].role,
      sessionAAvgRel: valA,
      sessionBAvgRel: valB,
      relDiff: diff,
      percentChange: pctChange,
      sensorDistributionA: distribA,
      sensorDistributionB: distribB,
      spatialShiftDescription,
      correlationSummary,
    };
  });

  // Cross-Frequency Ratios
  const thetaA = safeNum(bandsA.theta, 0);
  const betaA = bandsA.beta && bandsA.beta > 0 ? bandsA.beta : 0.001;
  const alphaA = bandsA.alpha && bandsA.alpha > 0 ? bandsA.alpha : 0.001;

  const thetaB = safeNum(bandsB.theta, 0);
  const betaB = bandsB.beta && bandsB.beta > 0 ? bandsB.beta : 0.001;
  const alphaB = bandsB.alpha && bandsB.alpha > 0 ? bandsB.alpha : 0.001;

  const tbrA = +(thetaA / betaA).toFixed(3);
  const tbrB = +(thetaB / betaB).toFixed(3);

  const tarA = +(thetaA / alphaA).toFixed(3);
  const tarB = +(thetaB / alphaB).toFixed(3);

  const barA = +(betaA / alphaA).toFixed(3);
  const barB = +(betaB / alphaA).toFixed(3);

  const tasiA = +((thetaA * alphaA) / betaA).toFixed(3);
  const tasiB = +((thetaB * alphaB) / betaB).toFixed(3);

  const ratios: CrossFrequencyRatio[] = [
    {
      name: 'Theta / Beta Ratio (TBR)',
      description: 'Executive Control & Attention Load Index',
      sessionAVal: tbrA,
      sessionBVal: tbrB,
      deltaVal: +(tbrB - tbrA).toFixed(3),
      percentChange: tbrA > 0 ? +(((tbrB - tbrA) / tbrA) * 100).toFixed(1) : 0,
      clinicalSignificance:
        tbrB < tbrA - 0.02
          ? 'TBR reduced in Session B, indicating stronger prefrontal executive activation, reduced mind-wandering, and improved attention density.'
          : tbrB > tbrA + 0.02
          ? 'TBR elevated in Session B, reflecting a shift toward relaxed subconscious processing, reduced cognitive strain, or mild drowsiness.'
          : 'TBR remained consistent between sessions, preserving steady executive attention control.',
    },
    {
      name: 'Theta / Alpha Ratio (TAR)',
      description: 'Internalization vs Somatic Calm Index',
      sessionAVal: tarA,
      sessionBVal: tarB,
      deltaVal: +(tarB - tarA).toFixed(3),
      percentChange: tarA > 0 ? +(((tarB - tarA) / tarA) * 100).toFixed(1) : 0,
      clinicalSignificance:
        tarB > tarA + 0.02
          ? 'TAR increased in Session B, pointing toward deeper hypnagogic meditation, internal imagery, and limbically mediated relaxation.'
          : tarB < tarA - 0.02
          ? 'TAR decreased in Session B, signaling an alert baseline with cortical readiness dominating over deep meditative theta.'
          : 'TAR remained stable across both sessions, maintaining consistent meditative depth.',
    },
    {
      name: 'Beta / Alpha Ratio (BAR)',
      description: 'Arousal & Prefrontal Workload Ratio',
      sessionAVal: barA,
      sessionBVal: barB,
      deltaVal: +(barB - barA).toFixed(3),
      percentChange: barA > 0 ? +(((barB - barA) / barA) * 100).toFixed(1) : 0,
      clinicalSignificance:
        barB < barA - 0.02
          ? 'BAR decreased in Session B, confirming reduced autonomic stress, lower mental fatigue, and a parasympathetic transition.'
          : barB > barA + 0.02
          ? 'BAR increased in Session B, reflecting heightened analytical engagement, active problem solving, or mild environmental arousal.'
          : 'BAR remained steady between recordings, preserving stable prefrontal arousal.',
    },
    {
      name: 'Theta-Alpha Synergy Index (TASI)',
      description: 'Deep Meditative Flow & Mindfulness Synergy',
      sessionAVal: tasiA,
      sessionBVal: tasiB,
      deltaVal: +(tasiB - tasiA).toFixed(3),
      percentChange: tasiA > 0 ? +(((tasiB - tasiA) / tasiA) * 100).toFixed(1) : 0,
      clinicalSignificance:
        tasiB > tasiA + 0.02
          ? 'TASI elevated in Session B, confirming enhanced Alpha-Theta synergy with low Beta interference — indicative of deep meditative mindfulness and effortless flow state.'
          : tasiB < tasiA - 0.02
          ? 'TASI decreased in Session B, reflecting higher prefrontal Beta arousal or reduced Alpha-Theta synchrony during recording.'
          : 'TASI remained consistent between recordings, preserving steady meditative mindfulness synergy.',
    },
  ];

  // Regional Power Distribution
  const fPowerA = +(chA.AF7.total + chA.AF8.total).toFixed(2);
  const fPowerB = +(chB.AF7.total + chB.AF8.total).toFixed(2);
  const tPowerA = +(chA.TP9.total + chA.TP10.total).toFixed(2);
  const tPowerB = +(chB.TP9.total + chB.TP10.total).toFixed(2);

  const lPowerA = +(chA.AF7.total + chA.TP9.total).toFixed(2);
  const lPowerB = +(chB.AF7.total + chB.TP9.total).toFixed(2);
  const rPowerA = +(chA.AF8.total + chA.TP10.total).toFixed(2);
  const rPowerB = +(chB.AF8.total + chB.TP10.total).toFixed(2);

  const ratioA = tPowerA > 0 ? fPowerA / tPowerA : 1;
  const ratioB = tPowerB > 0 ? fPowerB / tPowerB : 1;
  const hRatioA = rPowerA > 0 ? lPowerA / rPowerA : 1;
  const hRatioB = rPowerB > 0 ? lPowerB / rPowerB : 1;

  let regionalShiftInterpretation = '';
  if (ratioB > ratioA + 0.1) {
    regionalShiftInterpretation = 'Frontal cortical power dominated in Session B relative to temporal channels, indicating increased prefrontal engagement and executive cognitive processing.';
  } else if (ratioB < ratioA - 0.1) {
    regionalShiftInterpretation = 'Temporal lobe power expanded in Session B relative to frontal nodes, consistent with heightened sensory relaxation and quieted internal monologue.';
  } else {
    regionalShiftInterpretation = 'Frontal-temporal regional power distribution remained balanced and consistent across both sessions.';
  }

  if (hRatioB > hRatioA + 0.1) {
    regionalShiftInterpretation += ' Additionally, hemispheric power shifted toward the left channels (AF7/TP9), consistent with left-sided approach motivation.';
  } else if (hRatioB < hRatioA - 0.1) {
    regionalShiftInterpretation += ' Additionally, hemispheric power shifted toward the right channels (AF8/TP10), consistent with right-sided analytical vigilance.';
  }

  const regional: RegionalPowerDistribution = {
    frontalPowerA: fPowerA,
    frontalPowerB: fPowerB,
    temporalPowerA: tPowerA,
    temporalPowerB: tPowerB,
    frontalTemporalRatioA: tPowerA > 0 ? +(fPowerA / tPowerA).toFixed(2) : 1,
    frontalTemporalRatioB: tPowerB > 0 ? +(fPowerB / tPowerB).toFixed(2) : 1,
    leftPowerA: lPowerA,
    leftPowerB: lPowerB,
    rightPowerA: rPowerA,
    rightPowerB: rPowerB,
    hemisphericRatioA: rPowerA > 0 ? +(lPowerA / rPowerA).toFixed(2) : 1,
    hemisphericRatioB: rPowerB > 0 ? +(lPowerB / rPowerB).toFixed(2) : 1,
    regionalShiftInterpretation,
  };

  const faaValenceText = Math.abs(overviewDeltas.faaDelta) <= 0.02
    ? 'stable / symmetrical'
    : overviewDeltas.faaDelta > 0.02
    ? 'more positive / approach-oriented'
    : 'more analytical / reflective';

  // Executive Summaries
  const executiveSummary: string[] = [
    `Cognitive State Transition: Tranquility shifted by ${overviewDeltas.calmDelta > 0 ? '+' : ''}${overviewDeltas.calmDelta} points (${sessionAInfo.avgCalm} ➔ ${sessionBInfo.avgCalm}), while Focus shifted by ${overviewDeltas.focusDelta > 0 ? '+' : ''}${overviewDeltas.focusDelta} points (${sessionAInfo.avgFocus} ➔ ${sessionBInfo.avgFocus}).`,
    `Frontal Alpha Asymmetry (FAA): Shifted by ${overviewDeltas.faaDelta > 0 ? '+' : ''}${overviewDeltas.faaDelta.toFixed(3)} Bels (${sessionAInfo.faa} ➔ ${sessionBInfo.faa}), reflecting a ${faaValenceText} emotional valence in Session B.`,
    `Spectral Topography: Dominant rhythm in Session A was ${sA.dominantWave}, transitioning to ${sB.dominantWave} in Session B.`,
  ];

  const sensorCorrelationsText: string[] = [
    `Frontal Left (AF7): Alpha shift of ${sensorStats.AF7.deltas.alpha > 0 ? '+' : ''}${sensorStats.AF7.deltas.alpha} Bels, Beta shift of ${sensorStats.AF7.deltas.beta > 0 ? '+' : ''}${sensorStats.AF7.deltas.beta} Bels.`,
    `Frontal Right (AF8): Alpha shift of ${sensorStats.AF8.deltas.alpha > 0 ? '+' : ''}${sensorStats.AF8.deltas.alpha} Bels, Beta shift of ${sensorStats.AF8.deltas.beta > 0 ? '+' : ''}${sensorStats.AF8.deltas.beta} Bels.`,
    `Temporal Left (TP9): Theta shift of ${sensorStats.TP9.deltas.theta > 0 ? '+' : ''}${sensorStats.TP9.deltas.theta} Bels, Alpha shift of ${sensorStats.TP9.deltas.alpha > 0 ? '+' : ''}${sensorStats.TP9.deltas.alpha} Bels.`,
    `Temporal Right (TP10): Theta shift of ${sensorStats.TP10.deltas.theta > 0 ? '+' : ''}${sensorStats.TP10.deltas.theta} Bels, Alpha shift of ${sensorStats.TP10.deltas.alpha > 0 ? '+' : ''}${sensorStats.TP10.deltas.alpha} Bels.`,
  ];

  const wavebandCorrelationsText: string[] = [
    `Alpha (8-13Hz): Relative power shifted by ${wavebandStats.Alpha.relDiff > 0 ? '+' : ''}${wavebandStats.Alpha.relDiff}% (${wavebandStats.Alpha.percentChange}% change relative to Session A).`,
    `Beta (13-30Hz): Relative power shifted by ${wavebandStats.Beta.relDiff > 0 ? '+' : ''}${wavebandStats.Beta.relDiff}% (${wavebandStats.Beta.percentChange}% change relative to Session A).`,
    `Theta (4-8Hz): Relative power shifted by ${wavebandStats.Theta.relDiff > 0 ? '+' : ''}${wavebandStats.Theta.relDiff}% (${wavebandStats.Theta.percentChange}% change relative to Session A).`,
  ];

  const recommendations: string[] = [];
  if (overviewDeltas.calmDelta > 10) {
    recommendations.push(
      'Session B demonstrated significant autonomic calming. Integrate Session B protocols (e.g., slow-paced breathing, reduced visual stimulation) into daily pre-work routines.'
    );
  } else if (overviewDeltas.calmDelta < -10) {
    recommendations.push(
      'Session B exhibited lower tranquility scores. Consider introducing a 5-minute parasympathetic grounding break (respiration rate ~6 bpm) before complex cognitive tasks.'
    );
  }

  if (overviewDeltas.focusDelta > 15) {
    recommendations.push(
      `Session B demonstrated a notable boost in focus engagement (+${overviewDeltas.focusDelta} pts). Maintain pre-session task framing routines that contributed to this prefrontal activation.`
    );
  } else if (overviewDeltas.focusDelta < -15) {
    recommendations.push(
      `Session B showed reduced prefrontal focus (${overviewDeltas.focusDelta} pts). Consider incorporating SMR (12-15 Hz) focus sprint intervals to support sustained attention.`
    );
  }

  if (overviewDeltas.loadDelta > 15) {
    recommendations.push(
      'Elevated cognitive load detected in Session B. Schedule short 2-minute visual pause breaks every 20 minutes to prevent mental fatigue accumulation.'
    );
  }

  if (sB.dataQualityPercent < 85) {
    recommendations.push(
      `Data quality in Session B dropped to ${sB.dataQualityPercent}%. Clean headband sensor electrodes with a damp cloth to maintain lower HSI contact impedance.`
    );
  }

  // Helper to convert channel Bels powers to channel relative percentage powers (%)
  function getChannelRelativePowers(ch?: { delta: number; theta: number; alpha: number; beta: number; gamma: number }) {
    if (!ch || typeof ch.delta !== 'number' || !Number.isFinite(ch.delta)) {
      return { delta: undefined, theta: undefined, alpha: undefined, beta: undefined, gamma: undefined };
    }
    const dP = typeof ch.delta === 'number' && Number.isFinite(ch.delta) ? Math.pow(10, ch.delta) : 0;
    const tP = typeof ch.theta === 'number' && Number.isFinite(ch.theta) ? Math.pow(10, ch.theta) : 0;
    const aP = typeof ch.alpha === 'number' && Number.isFinite(ch.alpha) ? Math.pow(10, ch.alpha) : 0;
    const bP = typeof ch.beta === 'number' && Number.isFinite(ch.beta) ? Math.pow(10, ch.beta) : 0;
    const gP = typeof ch.gamma === 'number' && Number.isFinite(ch.gamma) ? Math.pow(10, ch.gamma) : 0;

    const totalP = dP + tP + aP + bP + gP || 1;

    return {
      delta: +((dP / totalP) * 100).toFixed(2),
      theta: +((tP / totalP) * 100).toFixed(2),
      alpha: +((aP / totalP) * 100).toFixed(2),
      beta: +((bP / totalP) * 100).toFixed(2),
      gamma: +((gP / totalP) * 100).toFixed(2),
    };
  }

  // Time-Series Overlaid Alignment
  const timeSeriesData: SessionComparisonResult['timeSeriesData'] = [];

  if (mode === 'normalized') {
    // 100 percentage points across relative timeline
    const numPoints = 100;
    for (let i = 0; i < numPoints; i++) {
      const pct = i;
      const idxA = Math.min(fA.length - 1, Math.floor((pct / 100) * (fA.length - 1)));
      const idxB = Math.min(fB.length - 1, Math.floor((pct / 100) * (fB.length - 1)));

      const frameA = fA[idxA];
      const frameB = fB[idxB];

      const af7A = getChannelRelativePowers(frameA?.channels?.AF7);
      const af7B = getChannelRelativePowers(frameB?.channels?.AF7);
      const af8A = getChannelRelativePowers(frameA?.channels?.AF8);
      const af8B = getChannelRelativePowers(frameB?.channels?.AF8);
      const tp9A = getChannelRelativePowers(frameA?.channels?.TP9);
      const tp9B = getChannelRelativePowers(frameB?.channels?.TP9);
      const tp10A = getChannelRelativePowers(frameA?.channels?.TP10);
      const tp10B = getChannelRelativePowers(frameB?.channels?.TP10);

      timeSeriesData.push({
        timeFormatted: `${pct}%`,
        timeSec: pct,
        focusA: frameA ? Math.round(frameA.focusScore) : undefined,
        focusB: frameB ? Math.round(frameB.focusScore) : undefined,
        calmA: frameA ? Math.round(frameA.calmScore) : undefined,
        calmB: frameB ? Math.round(frameB.calmScore) : undefined,
        faaA: frameA ? +frameA.frontalAsymmetry.toFixed(3) : undefined,
        faaB: frameB ? +frameB.frontalAsymmetry.toFixed(3) : undefined,

        all_deltaA: frameA ? +frameA.relDelta.toFixed(2) : undefined,
        all_deltaB: frameB ? +frameB.relDelta.toFixed(2) : undefined,
        all_thetaA: frameA ? +frameA.relTheta.toFixed(2) : undefined,
        all_thetaB: frameB ? +frameB.relTheta.toFixed(2) : undefined,
        all_alphaA: frameA ? +frameA.relAlpha.toFixed(2) : undefined,
        all_alphaB: frameB ? +frameB.relAlpha.toFixed(2) : undefined,
        all_betaA: frameA ? +frameA.relBeta.toFixed(2) : undefined,
        all_betaB: frameB ? +frameB.relBeta.toFixed(2) : undefined,
        all_gammaA: frameA ? +frameA.relGamma.toFixed(2) : undefined,
        all_gammaB: frameB ? +frameB.relGamma.toFixed(2) : undefined,

        AF7_deltaA: af7A.delta,
        AF7_deltaB: af7B.delta,
        AF7_thetaA: af7A.theta,
        AF7_thetaB: af7B.theta,
        AF7_alphaA: af7A.alpha,
        AF7_alphaB: af7B.alpha,
        AF7_betaA: af7A.beta,
        AF7_betaB: af7B.beta,
        AF7_gammaA: af7A.gamma,
        AF7_gammaB: af7B.gamma,

        AF8_deltaA: af8A.delta,
        AF8_deltaB: af8B.delta,
        AF8_thetaA: af8A.theta,
        AF8_thetaB: af8B.theta,
        AF8_alphaA: af8A.alpha,
        AF8_alphaB: af8B.alpha,
        AF8_betaA: af8A.beta,
        AF8_betaB: af8B.beta,
        AF8_gammaA: af8A.gamma,
        AF8_gammaB: af8B.gamma,

        TP9_deltaA: tp9A.delta,
        TP9_deltaB: tp9B.delta,
        TP9_thetaA: tp9A.theta,
        TP9_thetaB: tp9B.theta,
        TP9_alphaA: tp9A.alpha,
        TP9_alphaB: tp9B.alpha,
        TP9_betaA: tp9A.beta,
        TP9_betaB: tp9B.beta,
        TP9_gammaA: tp9A.gamma,
        TP9_gammaB: tp9B.gamma,

        TP10_deltaA: tp10A.delta,
        TP10_deltaB: tp10B.delta,
        TP10_thetaA: tp10A.theta,
        TP10_thetaB: tp10B.theta,
        TP10_alphaA: tp10A.alpha,
        TP10_alphaB: tp10B.alpha,
        TP10_betaA: tp10A.beta,
        TP10_betaB: tp10B.beta,
        TP10_gammaA: tp10A.gamma,
        TP10_gammaB: tp10B.gamma,
      });
    }
  } else {
    // Time seconds sampling (1Hz frame resolution for high-fidelity oscilloscope trajectory)
    const maxLen = Math.max(fA.length, fB.length);
    const step = 1;

    for (let i = 0; i < maxLen; i += step) {
      const frameA = i < fA.length ? fA[i] : undefined;
      const frameB = i < fB.length ? fB[i] : undefined;

      const curSec = frameA?.timeSec ?? frameB?.timeSec ?? i;
      const mins = Math.floor(curSec / 60).toString().padStart(2, '0');
      const secs = Math.floor(curSec % 60).toString().padStart(2, '0');
      const timeFormatted = `+${mins}:${secs}`;

      const af7A = getChannelRelativePowers(frameA?.channels?.AF7);
      const af7B = getChannelRelativePowers(frameB?.channels?.AF7);
      const af8A = getChannelRelativePowers(frameA?.channels?.AF8);
      const af8B = getChannelRelativePowers(frameB?.channels?.AF8);
      const tp9A = getChannelRelativePowers(frameA?.channels?.TP9);
      const tp9B = getChannelRelativePowers(frameB?.channels?.TP9);
      const tp10A = getChannelRelativePowers(frameA?.channels?.TP10);
      const tp10B = getChannelRelativePowers(frameB?.channels?.TP10);

      timeSeriesData.push({
        timeFormatted,
        timeSec: curSec,
        focusA: frameA ? Math.round(frameA.focusScore) : undefined,
        focusB: frameB ? Math.round(frameB.focusScore) : undefined,
        calmA: frameA ? Math.round(frameA.calmScore) : undefined,
        calmB: frameB ? Math.round(frameB.calmScore) : undefined,
        faaA: frameA ? +frameA.frontalAsymmetry.toFixed(3) : undefined,
        faaB: frameB ? +frameB.frontalAsymmetry.toFixed(3) : undefined,

        all_deltaA: frameA ? +frameA.relDelta.toFixed(2) : undefined,
        all_deltaB: frameB ? +frameB.relDelta.toFixed(2) : undefined,
        all_thetaA: frameA ? +frameA.relTheta.toFixed(2) : undefined,
        all_thetaB: frameB ? +frameB.relTheta.toFixed(2) : undefined,
        all_alphaA: frameA ? +frameA.relAlpha.toFixed(2) : undefined,
        all_alphaB: frameB ? +frameB.relAlpha.toFixed(2) : undefined,
        all_betaA: frameA ? +frameA.relBeta.toFixed(2) : undefined,
        all_betaB: frameB ? +frameB.relBeta.toFixed(2) : undefined,
        all_gammaA: frameA ? +frameA.relGamma.toFixed(2) : undefined,
        all_gammaB: frameB ? +frameB.relGamma.toFixed(2) : undefined,

        AF7_deltaA: af7A.delta,
        AF7_deltaB: af7B.delta,
        AF7_thetaA: af7A.theta,
        AF7_thetaB: af7B.theta,
        AF7_alphaA: af7A.alpha,
        AF7_alphaB: af7B.alpha,
        AF7_betaA: af7A.beta,
        AF7_betaB: af7B.beta,
        AF7_gammaA: af7A.gamma,
        AF7_gammaB: af7B.gamma,

        AF8_deltaA: af8A.delta,
        AF8_deltaB: af8B.delta,
        AF8_thetaA: af8A.theta,
        AF8_thetaB: af8B.theta,
        AF8_alphaA: af8A.alpha,
        AF8_alphaB: af8B.alpha,
        AF8_betaA: af8A.beta,
        AF8_betaB: af8B.beta,
        AF8_gammaA: af8A.gamma,
        AF8_gammaB: af8B.gamma,

        TP9_deltaA: tp9A.delta,
        TP9_deltaB: tp9B.delta,
        TP9_thetaA: tp9A.theta,
        TP9_thetaB: tp9B.theta,
        TP9_alphaA: tp9A.alpha,
        TP9_alphaB: tp9B.alpha,
        TP9_betaA: tp9A.beta,
        TP9_betaB: tp9B.beta,
        TP9_gammaA: tp9A.gamma,
        TP9_gammaB: tp9B.gamma,

        TP10_deltaA: tp10A.delta,
        TP10_deltaB: tp10B.delta,
        TP10_thetaA: tp10A.theta,
        TP10_thetaB: tp10B.theta,
        TP10_alphaA: tp10A.alpha,
        TP10_alphaB: tp10B.alpha,
        TP10_betaA: tp10A.beta,
        TP10_betaB: tp10B.beta,
        TP10_gammaA: tp10A.gamma,
        TP10_gammaB: tp10B.gamma,
      });
    }
  }

  return {
    sessionAInfo,
    sessionBInfo,
    overviewDeltas,
    alignmentInfo,
    sensorStats,
    wavebandStats,
    ratios,
    regional,
    executiveSummary,
    sensorCorrelationsText,
    wavebandCorrelationsText,
    recommendations,
    timeSeriesData,
  };
}
