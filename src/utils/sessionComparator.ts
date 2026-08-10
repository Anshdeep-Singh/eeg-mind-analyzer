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
    alphaA?: number;
    alphaB?: number;
  }>;
}

// Helper for average of valid numbers
function safeAvg(vals: number[]): number {
  if (!vals || vals.length === 0) return 0;
  const valid = vals.filter((v) => !isNaN(v) && v !== null && v !== undefined);
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
    delta: safeAvg(frames.map((f) => f.relDelta)),
    theta: safeAvg(frames.map((f) => f.relTheta)),
    alpha: safeAvg(frames.map((f) => f.relAlpha)),
    beta: safeAvg(frames.map((f) => f.relBeta)),
    gamma: safeAvg(frames.map((f) => f.relGamma)),
  };
}

export function compareEEGSessions(
  sessionA: { summary: SessionSummary; frames: ProcessedEEGFrame[] },
  sessionB: { summary: SessionSummary; frames: ProcessedEEGFrame[] }
): SessionComparisonResult {
  const sA = sessionA.summary;
  const sB = sessionB.summary;
  const fA = sessionA.frames;
  const fB = sessionB.frames;

  // Overview info
  const sessionAInfo = {
    duration: sA.totalDurationFormatted,
    samples: sA.validSamplesCount,
    quality: sA.dataQualityPercent,
    dominantWave: sA.dominantWave,
    avgFocus: sA.avgFocus,
    avgCalm: sA.avgCalm,
    avgMeditation: sA.avgMeditationDepth,
    avgCognitiveLoad: sA.avgCognitiveLoad,
    faa: sA.avgFrontalAsymmetry,
  };

  const sessionBInfo = {
    duration: sB.totalDurationFormatted,
    samples: sB.validSamplesCount,
    quality: sB.dataQualityPercent,
    dominantWave: sB.dominantWave,
    avgFocus: sB.avgFocus,
    avgCalm: sB.avgCalm,
    avgMeditation: sB.avgMeditationDepth,
    avgCognitiveLoad: sB.avgCognitiveLoad,
    faa: sB.avgFrontalAsymmetry,
  };

  const overviewDeltas = {
    focusDelta: sB.avgFocus - sA.avgFocus,
    calmDelta: sB.avgCalm - sA.avgCalm,
    meditationDelta: sB.avgMeditationDepth - sA.avgMeditationDepth,
    loadDelta: sB.avgCognitiveLoad - sA.avgCognitiveLoad,
    faaDelta: sB.avgFrontalAsymmetry - sA.avgFrontalAsymmetry,
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

    // Find dominant wave for channel
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

    // Deep Sensor Interpretation
    let interpretation = '';
    if (ch === 'AF7') {
      if (deltas.alpha > 0.05 && deltas.beta <= 0) {
        interpretation =
          'Left frontal Alpha power increased markedly while Beta stabilized. This reflects reduced verbal self-criticism, enhanced inner emotional poise, and a shift towards relaxed executive control.';
      } else if (deltas.beta > 0.05) {
        interpretation =
          'Left frontal Beta elevated, signaling increased verbal processing, active task framing, or problem solving in Session B.';
      } else {
        interpretation =
          'Left frontal sensor showed stable power levels, maintaining similar executive and verbal regulation characteristics across both sessions.';
      }
    } else if (ch === 'AF8') {
      if (deltas.beta < -0.05 && deltas.alpha > 0.05) {
        interpretation =
          'Right frontal Beta decreased while Alpha surged, indicating reduced vigilance/anxiety, lower risk monitoring tension, and smoother cognitive ease.';
      } else if (deltas.beta > 0.05) {
        interpretation =
          'Right frontal Beta increased, suggesting heightened analytical evaluation, active error checking, or mild cognitive friction.';
      } else {
        interpretation =
          'Right frontal sensor exhibited consistent spectral power, preserving similar spatial reasoning and risk evaluation profiles.';
      }
    } else if (ch === 'TP9') {
      if (deltas.theta > 0.05 || deltas.alpha > 0.05) {
        interpretation =
          'Left temporal Theta/Alpha power expanded, indicating quieted auditory chatter, reduced internal monologue, and deeper introspective restfulness.';
      } else if (deltas.beta > 0.05) {
        interpretation =
          'Left temporal Beta increased, pointing to active auditory or verbal processing during Session B.';
      } else {
        interpretation =
          'Left temporal sensor maintained balanced spectral output with negligible shift in internal monologue or sensory processing.';
      }
    } else if (ch === 'TP10') {
      if (deltas.alpha > 0.05 || deltas.theta > 0.05) {
        interpretation =
          'Right temporal Alpha/Theta power increased, reflecting heightened non-verbal grounding, emotional tranquility, and sensory relaxation.';
      } else if (deltas.beta > 0.05) {
        interpretation =
          'Right temporal Beta rose, indicating heightened somatic vigilance or environmental sensory monitoring.';
      } else {
        interpretation =
          'Right temporal sensor exhibited steady spectral power, preserving baseline emotional tone and bodily awareness.';
      }
    }

    sensorStats[ch] = {
      name: ch,
      label: sensorMeta[ch].label,
      region: sensorMeta[ch].region,
      sessionA: { ...a } as any,
      sessionB: { ...b } as any,
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
    const valA = bandsA[key];
    const valB = bandsB[key];

    const diff = +(valB - valA).toFixed(2);
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

    // Calculate Frontal vs Temporal shift for this wave
    const frontalA = distribA.AF7 + distribA.AF8;
    const frontalB = distribB.AF7 + distribB.AF8;
    const temporalA = distribA.TP9 + distribA.TP10;
    const temporalB = distribB.TP9 + distribB.TP10;

    const frontalShift = +(frontalB - frontalA).toFixed(2);
    const temporalShift = +(temporalB - temporalA).toFixed(2);

    let spatialShiftDescription = '';
    if (Math.abs(frontalShift) > Math.abs(temporalShift)) {
      spatialShiftDescription = `Primary shift occurred frontally (AF7/AF8: ${
        frontalShift > 0 ? '+' : ''
      }${frontalShift} Bels), affecting executive cognitive channels more than temporal channels.`;
    } else {
      spatialShiftDescription = `Primary shift occurred temporally (TP9/TP10: ${
        temporalShift > 0 ? '+' : ''
      }${temporalShift} Bels), reflecting changes in internal auditory/somatic channels.`;
    }

    let correlationSummary = '';
    if (w === 'Alpha') {
      if (diff > 2) {
        correlationSummary =
          'Alpha power increased significantly across the recording. This indicates improved mental tranquility, lower anxious reactivity, and enhanced non-judgmental presence in Session B.';
      } else if (diff < -2) {
        correlationSummary =
          'Alpha power suppressed in Session B, indicating higher active task processing, analytical load, or heightened external alertness.';
      } else {
        correlationSummary =
          'Alpha power remained stable between sessions, preserving similar baseline mental relaxation.';
      }
    } else if (w === 'Beta') {
      if (diff > 2) {
        correlationSummary =
          'Beta power surged in Session B, reflecting increased active analytical processing, focused problem solving, or heightened mental workload.';
      } else if (diff < -2) {
        correlationSummary =
          'Beta power decreased, indicating reduced cognitive strain, diminished mental tension, and a transition into calmer brain dynamics.';
      } else {
        correlationSummary =
          'Beta power levels were virtually identical between sessions, maintaining a consistent level of cognitive activation.';
      }
    } else if (w === 'Theta') {
      if (diff > 2) {
        correlationSummary =
          'Theta power rose notably in Session B. Combined with sensor distributions, this reflects deeper subconscious meditation or inward cognitive absorption.';
      } else if (diff < -2) {
        correlationSummary =
          'Theta power dropped in Session B, signaling a shift out of deep introspective or meditative states toward alert executive processing.';
      } else {
        correlationSummary =
          'Theta power remained consistent across both recordings.';
      }
    } else if (w === 'Delta') {
      if (diff > 3) {
        correlationSummary =
          'Delta power increased in Session B. When isolated to frontal channels (AF7/AF8), this may reflect ocular movements; when spread evenly, it suggests deeper somatic rest or recovery.';
      } else {
        correlationSummary =
          'Delta power showed steady, low baseline values across both sessions, confirming clean signal conditions without significant slow-wave intrusion.';
      }
    } else {
      // Gamma
      if (diff > 1) {
        correlationSummary =
          'Gamma activity increased in Session B, pointing to brief bursts of high-level cognitive synthesis, intense focus, or multi-sensory binding.';
      } else {
        correlationSummary =
          'Gamma activity remained within quiet baseline limits in both sessions.';
      }
    }

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

  // Regional Power Distribution (Frontal vs Temporal & Left vs Right)
  const frontalPowerA = chA.AF7.total + chA.AF8.total;
  const frontalPowerB = chB.AF7.total + chB.AF8.total;
  const temporalPowerA = chA.TP9.total + chA.TP10.total;
  const temporalPowerB = chB.TP9.total + chB.TP10.total;

  const frontalTemporalRatioA = +(frontalPowerA / (temporalPowerA || 0.001)).toFixed(2);
  const frontalTemporalRatioB = +(frontalPowerB / (temporalPowerB || 0.001)).toFixed(2);

  const leftPowerA = chA.AF7.total + chA.TP9.total;
  const leftPowerB = chB.AF7.total + chB.TP9.total;
  const rightPowerA = chA.AF8.total + chA.TP10.total;
  const rightPowerB = chB.AF8.total + chB.TP10.total;

  const hemisphericRatioA = +(leftPowerA / (rightPowerA || 0.001)).toFixed(2);
  const hemisphericRatioB = +(leftPowerB / (rightPowerB || 0.001)).toFixed(2);

  let regionalShiftInterpretation = '';
  if (frontalTemporalRatioB > frontalTemporalRatioA + 0.1) {
    regionalShiftInterpretation =
      'Session B shifted power frontally relative to temporal channels. This indicates heightened executive involvement, frontal alpha/beta mobilization, and active goal-directed awareness.';
  } else if (frontalTemporalRatioB < frontalTemporalRatioA - 0.1) {
    regionalShiftInterpretation =
      'Session B shifted power temporally relative to frontal channels, reflecting deeper sensory grounding, reduced active frontal control, and enhanced temporal tranquility.';
  } else {
    regionalShiftInterpretation =
      'The spatial ratio between frontal and temporal regions remained remarkably balanced between Session A and Session B.';
  }

  const regional: RegionalPowerDistribution = {
    frontalPowerA,
    frontalPowerB,
    temporalPowerA,
    temporalPowerB,
    frontalTemporalRatioA,
    frontalTemporalRatioB,
    leftPowerA,
    leftPowerB,
    rightPowerA,
    rightPowerB,
    hemisphericRatioA,
    hemisphericRatioB,
    regionalShiftInterpretation,
  };

  // Cross-Frequency Ratios
  const ratios: CrossFrequencyRatio[] = [
    {
      name: 'Focus Engagement Ratio',
      description: 'Beta / ((Alpha + Theta) / 2) - Measures active task orientation vs relaxation',
      sessionAVal: +((chA.AF7.beta + chA.AF8.beta) / ((chA.AF7.alpha + chA.AF8.alpha + chA.AF7.theta + chA.AF8.theta) / 2 || 0.001)).toFixed(2),
      sessionBVal: +((chB.AF7.beta + chB.AF8.beta) / ((chB.AF7.alpha + chB.AF8.alpha + chB.AF7.theta + chB.AF8.theta) / 2 || 0.001)).toFixed(2),
      deltaVal: 0,
      percentChange: 0,
      clinicalSignificance: 'Higher values indicate intense problem solving or high analytical focus; lower values signal relaxed idle states.',
    },
    {
      name: 'Theta-Alpha Synergy Index (TASI)',
      description: '(Theta * Alpha) / Beta - Quantifies deep meditative mindfulness without sleepiness',
      sessionAVal: +(((bandsA.theta * bandsA.alpha) / (bandsA.beta || 1))).toFixed(2),
      sessionBVal: +(((bandsB.theta * bandsB.alpha) / (bandsB.beta || 1))).toFixed(2),
      deltaVal: 0,
      percentChange: 0,
      clinicalSignificance: 'Elevated TASI indicates optimal alpha-theta state synchronization ideal for deep biofeedback and contemplative focus.',
    },
    {
      name: 'Frontal-Temporal Workload Index',
      description: 'Frontal Beta (AF7+AF8) / Temporal Alpha (TP9+TP10) - Measures executive stress vs somatic ease',
      sessionAVal: +((chA.AF7.beta + chA.AF8.beta) / (chA.TP9.alpha + chA.TP10.alpha || 0.001)).toFixed(2),
      sessionBVal: +((chB.AF8.beta + chB.AF8.beta) / (chB.TP9.alpha + chB.TP10.alpha || 0.001)).toFixed(2),
      deltaVal: 0,
      percentChange: 0,
      clinicalSignificance: 'Higher ratios point to active mental workload or cognitive friction; lower ratios reflect serene sensory states.',
    },
    {
      name: 'Mental Calm Stability Index',
      description: 'Alpha / Beta Overall Ratio - Tranquil alertness versus mental chatter',
      sessionAVal: +(bandsA.alpha / (bandsA.beta || 0.001)).toFixed(2),
      sessionBVal: +(bandsB.alpha / (bandsB.beta || 0.001)).toFixed(2),
      deltaVal: 0,
      percentChange: 0,
      clinicalSignificance: 'Values > 1.5 indicate high stress resilience and serene cognitive focus.',
    },
  ];

  ratios.forEach((r) => {
    r.deltaVal = +(r.sessionBVal - r.sessionAVal).toFixed(2);
    r.percentChange = r.sessionAVal > 0 ? +(((r.sessionBVal - r.sessionAVal) / r.sessionAVal) * 100).toFixed(1) : 0;
  });

  // Executive Summary Narrative
  const executiveSummary: string[] = [];

  executiveSummary.push(
    `Session Comparison Overview: Session A spanned **${sA.totalDurationFormatted}** (${sA.dataQualityPercent}% clean fit) while Session B spanned **${sB.totalDurationFormatted}** (${sB.dataQualityPercent}% clean fit).`
  );

  const focusDiff = sB.avgFocus - sA.avgFocus;
  const calmDiff = sB.avgCalm - sA.avgCalm;

  if (focusDiff > 5 && calmDiff > 5) {
    executiveSummary.push(
      `Dual Cognitive Surge: Session B demonstrated simultaneous improvements in both Focus Score (+${focusDiff} pts to **${sB.avgFocus}/100**) and Relaxation Score (+${calmDiff} pts to **${sB.avgCalm}/100**). This indicates an idealized "flow state" where heightened analytical concentration coexists with emotional tranquility.`
    );
  } else if (focusDiff > 5) {
    executiveSummary.push(
      `Executive Focus Shift: Focus Score increased by **+${focusDiff} points** in Session B (reaching **${sB.avgFocus}/100** vs **${sA.avgFocus}/100** in Session A), driven by elevated frontal Beta power across AF7 and AF8.`
    );
  } else if (calmDiff > 5) {
    executiveSummary.push(
      `Relaxation & Calm Enhancement: Relaxation Score expanded by **+${calmDiff} points** in Session B (**${sB.avgCalm}/100** vs **${sA.avgCalm}/100** in Session A), accompanied by a **${bandsB.alpha.toFixed(1)}%** Alpha wave dominance.`
    );
  } else {
    executiveSummary.push(
      `Balanced State Dynamics: Cognitive scores between Session A and Session B remained closely aligned (Focus $\\Delta$: ${focusDiff >= 0 ? '+' : ''}${focusDiff}, Calm $\\Delta$: ${calmDiff >= 0 ? '+' : ''}${calmDiff}), indicating steady cognitive state reproduction.`
    );
  }

  // FAA Hemispheric Shift Summary
  const faaDiff = sB.avgFrontalAsymmetry - sA.avgFrontalAsymmetry;
  if (faaDiff > 0.05) {
    executiveSummary.push(
      `Positive Valence & Approach Shift: Frontal Alpha Asymmetry (FAA) shifted positively by **+${faaDiff.toFixed(3)} Bels** in Session B. This left-frontal dominance shift correlates with increased confidence, positive approach motivation, and reduced emotional caution.`
    );
  } else if (faaDiff < -0.05) {
    executiveSummary.push(
      `Analytical / Reflective Shift: Frontal Alpha Asymmetry (FAA) shifted by **${faaDiff.toFixed(3)} Bels** in Session B toward right-frontal dominance. This reflects heightened analytical evaluation, internal caution, or focused risk monitoring.`
    );
  } else {
    executiveSummary.push(
      `Stable Hemispheric Balance: Frontal Alpha Asymmetry remained stable ($\Delta$ FAA: ${faaDiff.toFixed(3)} Bels), reflecting consistent left/right emotional valence.`
    );
  }

  // Detailed Sensor Correlation Text
  const sensorCorrelationsText: string[] = [
    sensorStats.AF7.interpretation,
    sensorStats.AF8.interpretation,
    sensorStats.TP9.interpretation,
    sensorStats.TP10.interpretation,
    regionalShiftInterpretation,
  ];

  // Detailed Waveband Correlation Text
  const wavebandCorrelationsText: string[] = [
    `Alpha Wave (8-13 Hz): ${wavebandStats.Alpha.correlationSummary}`,
    `Beta Wave (13-30 Hz): ${wavebandStats.Beta.correlationSummary}`,
    `Theta Wave (4-8 Hz): ${wavebandStats.Theta.correlationSummary}`,
    `Delta Wave (0.5-4 Hz): ${wavebandStats.Delta.correlationSummary}`,
    `Gamma Wave (30-44 Hz): ${wavebandStats.Gamma.correlationSummary}`,
  ];

  // Recommendations based on comparison
  const recommendations: string[] = [];
  if (calmDiff < -5) {
    recommendations.push(
      'Session B showed reduced relaxation scores. Consider re-integrating 3–5 minutes of slow abdominal breathing before recording to re-establish Alpha rhythm dominance.'
    );
  } else if (calmDiff > 5) {
    recommendations.push(
      'Session B successfully boosted Alpha relaxation! Note the conditions or pre-session routine used in Session B and adopt them as your standard baseline.'
    );
  }

  if (sB.avgCognitiveLoad > sA.avgCognitiveLoad + 10) {
    recommendations.push(
      'Elevated cognitive load detected in Session B. Schedule short 2-minute visual pause breaks every 20 minutes to prevent mental fatigue accumulation.'
    );
  }

  if (sB.dataQualityPercent < 85) {
    recommendations.push(
      `Data quality in Session B dropped to ${sB.dataQualityPercent}%. Clean headband sensor electrodes with a damp cloth to maintain lower HSI contact impedance.`
    );
  }

  // Time-Series Overlaid Alignment
  // Align time series on relative seconds
  const maxLen = Math.max(fA.length, fB.length);
  const timeSeriesData: SessionComparisonResult['timeSeriesData'] = [];

  // Step size for downsampling chart overlay points to ~100 points max
  const step = Math.max(1, Math.floor(maxLen / 100));

  for (let i = 0; i < maxLen; i += step) {
    const frameA = fA[Math.min(i, fA.length - 1)];
    const frameB = fB[Math.min(i, fB.length - 1)];

    const curSec = frameA?.timeSec ?? frameB?.timeSec ?? i;
    const mins = Math.floor(curSec / 60).toString().padStart(2, '0');
    const secs = Math.floor(curSec % 60).toString().padStart(2, '0');
    const timeFormatted = `+${mins}:${secs}`;

    timeSeriesData.push({
      timeFormatted,
      timeSec: curSec,
      focusA: frameA ? Math.round(frameA.focusScore) : undefined,
      focusB: frameB ? Math.round(frameB.focusScore) : undefined,
      calmA: frameA ? Math.round(frameA.calmScore) : undefined,
      calmB: frameB ? Math.round(frameB.calmScore) : undefined,
      faaA: frameA ? +frameA.frontalAsymmetry.toFixed(3) : undefined,
      faaB: frameB ? +frameB.frontalAsymmetry.toFixed(3) : undefined,
      alphaA: frameA ? +frameA.relAlpha.toFixed(1) : undefined,
      alphaB: frameB ? +frameB.relAlpha.toFixed(1) : undefined,
    });
  }

  return {
    sessionAInfo,
    sessionBInfo,
    overviewDeltas,
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
