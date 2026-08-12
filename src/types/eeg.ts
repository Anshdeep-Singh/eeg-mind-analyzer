export interface RawMindMonitorRow {
  TimeStamp: string;
  Delta_TP9?: number;
  Delta_AF7?: number;
  Delta_AF8?: number;
  Delta_TP10?: number;
  Theta_TP9?: number;
  Theta_AF7?: number;
  Theta_AF8?: number;
  Theta_TP10?: number;
  Alpha_TP9?: number;
  Alpha_AF7?: number;
  Alpha_AF8?: number;
  Alpha_TP10?: number;
  Beta_TP9?: number;
  Beta_AF7?: number;
  Beta_AF8?: number;
  Beta_TP10?: number;
  Gamma_TP9?: number;
  Gamma_AF7?: number;
  Gamma_AF8?: number;
  Gamma_TP10?: number;
  RAW_TP9?: number;
  RAW_AF7?: number;
  RAW_AF8?: number;
  RAW_TP10?: number;
  AUX_RIGHT?: number;
  Accelerometer_X?: number;
  Accelerometer_Y?: number;
  Accelerometer_Z?: number;
  Gyro_X?: number;
  Gyro_Y?: number;
  Gyro_Z?: number;
  PPG_Ambient?: number;
  PPG_IR?: number;
  PPG_Red?: number;
  Heart_Rate?: number;
  HeadBandOn?: number;
  HSI_TP9?: number;
  HSI_AF7?: number;
  HSI_AF8?: number;
  HSI_TP10?: number;
  Battery?: number;
  Elements?: string;
  [key: string]: any;
}

export interface ProcessedEEGFrame {
  id: number;
  timeStamp: string;
  timeSec: number;
  timeFormatted: string;
  
  // Absolute Band Powers in Bels (Averages)
  deltaBels: number;
  thetaBels: number;
  alphaBels: number;
  betaBels: number;
  gammaBels: number;

  // Linear Powers (uV^2)
  deltaPower: number;
  thetaPower: number;
  alphaPower: number;
  betaPower: number;
  gammaPower: number;
  totalPower: number;

  // Relative Band Power Percentages (%)
  relDelta: number;
  relTheta: number;
  relAlpha: number;
  relBeta: number;
  relGamma: number;

  // Channel Specific Powers
  channels: {
    TP9: { alpha: number; beta: number; theta: number; delta: number; gamma: number; hsi: number };
    AF7: { alpha: number; beta: number; theta: number; delta: number; gamma: number; hsi: number };
    AF8: { alpha: number; beta: number; theta: number; delta: number; gamma: number; hsi: number };
    TP10: { alpha: number; beta: number; theta: number; delta: number; gamma: number; hsi: number };
  };

  // Frontal Asymmetry (AF8 Alpha - AF7 Alpha in bels)
  frontalAsymmetry: number;

  // Cognitive Scores (0 - 100)
  focusScore: number;
  calmScore: number;
  meditationDepth: number;
  cognitiveLoad: number;

  // Noise & Data Quality Status
  isGoodFit: boolean;
  isBlink: boolean;
  isJawClench: boolean;
  isMotionArtifact: boolean;
  hsiAverage: number;
  headBandOn: boolean;

  // Auxiliary Metrics
  heartRate?: number;
  battery?: number;
  elements?: string;
}

export interface SessionPhase {
  name: string;
  startTime: string;
  endTime: string;
  durationSec: number;
  dominantState: 'Focus' | 'Calm' | 'Meditation' | 'Drowsy' | 'High Cognitive Load';
  description: string;
  avgFocus: number;
  avgCalm: number;
}

export interface SessionSummary {
  sessionStartDate?: string;
  sessionStartTime?: string;
  sessionDayOfWeek?: string;
  sessionDateFormatted?: string;
  sessionTimeFormatted?: string;
  sessionDateTimeFormatted?: string;

  totalDurationFormatted: string;
  totalSamples: number;
  validSamplesCount: number;
  dataQualityPercent: number;
  blinkCount: number;
  
  // Overall Averages
  avgFocus: number;
  avgCalm: number;
  avgMeditationDepth: number;
  avgCognitiveLoad: number;
  avgFrontalAsymmetry: number;

  // Dominant Brainwave
  dominantWave: 'Delta' | 'Theta' | 'Alpha' | 'Beta' | 'Gamma';
  
  // Percentages of Session spent in states
  timeInFocusPercent: number;
  timeInCalmPercent: number;
  timeInMeditationPercent: number;

  // Key Highlights
  peakFocusWindow: { time: string; score: number };
  peakCalmWindow: { time: string; score: number };

  // Phases
  phases: SessionPhase[];

  // Plain English Insights
  keyInsights: string[];
  recommendations: string[];
}

export interface ProcessingOptions {
  smoothWindow: number; // 0, 3, 5, 10 seconds
  filterBadFit: boolean;
  filterBlinks: boolean;
  filterMotion?: boolean;
  filterJawClenches?: boolean;
  suppressOutliers?: boolean;
  strictSensorFit?: boolean;
  hsiQualityThreshold?: 'all' | 'acceptable' | 'strict_good';
}
