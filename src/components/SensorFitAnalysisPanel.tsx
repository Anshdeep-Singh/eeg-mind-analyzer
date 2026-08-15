import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { ProcessedEEGFrame, SessionSummary, RawMindMonitorRow } from '../types/eeg';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  ShieldAlert,
  Zap,
  Info,
  ShieldCheck,
  Scissors,
  Download,
  Sparkles,
  Sliders,
} from 'lucide-react';

interface Props {
  frames: ProcessedEEGFrame[];
  summary: SessionSummary;
  rawRows?: RawMindMonitorRow[];
  filename?: string;
}

interface SensorFitDetail {
  key: 'AF7' | 'AF8' | 'TP9' | 'TP10';
  name: string;
  location: string;
  role: string;
  goodCount: number;
  medCount: number;
  badCount: number;
  goodSec: number;
  medSec: number;
  badSec: number;
  badPercent: number;
  goodPercent: number;
  impactDescription: string;
}

export const SensorFitAnalysisPanel: React.FC<Props> = ({ frames, summary, rawRows = [], filename = '' }) => {
  const totalFrames = frames?.length || 0;

  // Calculate absolute recording start, end, and duration baseline
  const rawStartMs = useMemo(() => {
    if (rawRows && rawRows.length > 0) {
      for (let i = 0; i < Math.min(10, rawRows.length); i++) {
        if (rawRows[i]?.TimeStamp) {
          const t = new Date(rawRows[i].TimeStamp.replace(' ', 'T')).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
      }
    }
    return 0;
  }, [rawRows]);

  const rawEndMs = useMemo(() => {
    if (rawRows && rawRows.length > 0) {
      for (let i = rawRows.length - 1; i >= Math.max(0, rawRows.length - 10); i--) {
        if (rawRows[i]?.TimeStamp) {
          const t = new Date(rawRows[i].TimeStamp.replace(' ', 'T')).getTime();
          if (!isNaN(t) && t > 0) return t;
        }
      }
    }
    return 0;
  }, [rawRows]);

  const recordingTotalSec = useMemo(() => {
    if (rawStartMs > 0 && rawEndMs > rawStartMs) {
      return Math.max(1, Math.round((rawEndMs - rawStartMs) / 1000));
    }
    if (frames && frames.length > 0) {
      const maxTime = frames[frames.length - 1].timeSec;
      return Math.max(1, Math.round(maxTime));
    }
    return 1;
  }, [rawStartMs, rawEndMs, frames]);

  const frameIntervalSec = recordingTotalSec / totalFrames;

  // Custom Duration Trim State
  const [trimStartSec, setTrimStartSec] = useState<number>(0);
  const [trimEndSec, setTrimEndSec] = useState<number>(0);

  const formatSec = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatMMSS = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to test if a raw row has clean contact across all 4 channels
  const isRawRowClean = (r: RawMindMonitorRow): boolean => {
    // Ignore non-EEG event rows or missing HSI fields
    if (
      typeof r.HSI_TP9 !== 'number' &&
      typeof r.HSI_AF7 !== 'number' &&
      typeof r.HSI_AF8 !== 'number' &&
      typeof r.HSI_TP10 !== 'number'
    ) {
      return false;
    }

    const hsiTP9 = typeof r.HSI_TP9 === 'number' ? r.HSI_TP9 : 4;
    const hsiAF7 = typeof r.HSI_AF7 === 'number' ? r.HSI_AF7 : 4;
    const hsiAF8 = typeof r.HSI_AF8 === 'number' ? r.HSI_AF8 : 4;
    const hsiTP10 = typeof r.HSI_TP10 === 'number' ? r.HSI_TP10 : 4;
    const headBandOn = r.HeadBandOn !== 0;

    return headBandOn && hsiTP9 <= 2.5 && hsiAF7 <= 2.5 && hsiAF8 <= 2.5 && hsiTP10 <= 2.5;
  };

  // Analyze each sensor
  const sensorConfigs: Array<{
    key: 'AF7' | 'AF8' | 'TP9' | 'TP10';
    name: string;
    location: string;
    role: string;
    badImpact: string;
  }> = [
    {
      key: 'AF7',
      name: 'AF7',
      location: 'Left Forehead',
      role: 'Executive self-talk, verbal framing & Frontal Asymmetry (Left)',
      badImpact: 'Distorts left frontal Alpha/Beta power, artificially shifting Frontal Alpha Asymmetry (FAA) and skewing Focus/Engagement scores.',
    },
    {
      key: 'AF8',
      name: 'AF8',
      location: 'Right Forehead',
      role: 'Vigilance, spatial monitoring & Frontal Asymmetry (Right)',
      badImpact: 'Causes high-power noise spikes in right frontal channels, corrupting FAA valence and executive cognitive load measurements.',
    },
    {
      key: 'TP9',
      name: 'TP9',
      location: 'Left Ear (Temporal)',
      role: 'Auditory processing, internal monologue & sensory grounding',
      badImpact: 'Injects low-frequency movement or skin-contact artifact into temporal baseline, inflating Delta/Theta power ratios.',
    },
    {
      key: 'TP10',
      name: 'TP10',
      location: 'Right Ear (Temporal)',
      role: 'Non-verbal emotional tone, somatic relaxation & calm tracking',
      badImpact: 'Degrades right temporal signal purity, producing false power dips in Alpha/Beta spectral balance and skewing Calm scores.',
    },
  ];

  const sensorAnalysis: SensorFitDetail[] = sensorConfigs.map((cfg) => {
    let goodCount = 0;
    let medCount = 0;
    let badCount = 0;

    frames.forEach((f) => {
      const hsi = f.channels[cfg.key]?.hsi ?? 1;
      if (hsi === 1) goodCount++;
      else if (hsi === 2) medCount++;
      else badCount++;
    });

    const badSec = Math.round(badCount * frameIntervalSec);
    const goodSec = Math.round(goodCount * frameIntervalSec);
    const medSec = Math.round(medCount * frameIntervalSec);

    const badPercent = Math.round((badCount / totalFrames) * 100);
    const goodPercent = Math.round((goodCount / totalFrames) * 100);

    return {
      key: cfg.key,
      name: cfg.name,
      location: cfg.location,
      role: cfg.role,
      goodCount,
      medCount,
      badCount,
      goodSec,
      medSec,
      badSec,
      badPercent,
      goodPercent,
      impactDescription: cfg.badImpact,
    };
  });

  // Identify worst sensor
  const sortedByBad = [...sensorAnalysis].sort((a, b) => b.badPercent - a.badPercent);
  const worstSensor = sortedByBad[0];
  const hasBadContact = worstSensor.badPercent > 0;

  // Clean effective duration
  const totalCleanSamples = frames.filter((f) => f.isGoodFit).length;
  const totalCleanSec = Math.round(totalCleanSamples * frameIntervalSec);

  // Active trim bounds in absolute time (seconds)
  const activeStartSec = trimStartSec;
  const activeEndSec = Math.max(activeStartSec + 10, recordingTotalSec - trimEndSec);
  const trimmedDurationSec = Math.max(1, activeEndSec - activeStartSec);

  // Auto-Detect Edges with bad fit
  const autoDetectEdges = useMemo(() => {
    // Filter raw rows to valid EEG rows containing HSI metrics
    const eegRows = rawRows.filter(
      (r) =>
        typeof r.HSI_TP9 === 'number' ||
        typeof r.HSI_AF7 === 'number' ||
        typeof r.HSI_AF8 === 'number' ||
        typeof r.HSI_TP10 === 'number'
    );

    if (eegRows.length > 10 && rawStartMs > 0 && rawEndMs > rawStartMs) {
      const windowSize = Math.min(20, Math.max(3, Math.floor(eegRows.length / 100)));

      // Find first clean window from the start
      let firstCleanRowIdx = -1;
      for (let i = 0; i <= eegRows.length - windowSize; i++) {
        let cleanInWin = 0;
        for (let j = 0; j < windowSize; j++) {
          if (isRawRowClean(eegRows[i + j])) cleanInWin++;
        }
        if (cleanInWin >= Math.ceil(windowSize * 0.7)) {
          firstCleanRowIdx = i;
          break;
        }
      }

      // Find last clean window from the end
      let lastCleanRowIdx = -1;
      for (let i = eegRows.length - 1; i >= windowSize - 1; i--) {
        let cleanInWin = 0;
        for (let j = 0; j < windowSize; j++) {
          if (isRawRowClean(eegRows[i - j])) cleanInWin++;
        }
        if (cleanInWin >= Math.ceil(windowSize * 0.7)) {
          lastCleanRowIdx = i;
          break;
        }
      }

      if (firstCleanRowIdx >= 0 && lastCleanRowIdx >= firstCleanRowIdx) {
        const firstCleanMs = new Date(eegRows[firstCleanRowIdx].TimeStamp.replace(' ', 'T')).getTime();
        const lastCleanMs = new Date(eegRows[lastCleanRowIdx].TimeStamp.replace(' ', 'T')).getTime();

        const startTrim = Math.max(0, Math.round((firstCleanMs - rawStartMs) / 1000));
        const endTrim = Math.max(0, Math.round((rawEndMs - lastCleanMs) / 1000));

        return { startTrimSec: startTrim, endTrimSec: endTrim };
      }
    }

    // Fallback using downsampled frames if raw rows are missing or eegRows empty
    if (frames && frames.length > 0) {
      const firstGoodFrame = frames.find((f) => f.isGoodFit);
      const lastGoodFrame = [...frames].reverse().find((f) => f.isGoodFit);

      if (firstGoodFrame && lastGoodFrame) {
        const startTrim = Math.max(0, Math.round(firstGoodFrame.timeSec));
        const endTrim = Math.max(0, Math.round(recordingTotalSec - lastGoodFrame.timeSec));

        return { startTrimSec: startTrim, endTrimSec: endTrim };
      }
    }

    return { startTrimSec: 0, endTrimSec: 0 };
  }, [rawRows, rawStartMs, rawEndMs, frames, recordingTotalSec]);

  // Trimmed Data Stats Calculation (Real-Time Feedback)
  const trimmedStats = useMemo(() => {
    // If rawRows are provided, filter raw CSV rows
    if (rawRows && rawRows.length > 0 && rawStartMs > 0) {
      const filteredRaw = rawRows.filter((r, idx) => {
        if (!r.TimeStamp) return false;
        const rowMs = new Date(r.TimeStamp.replace(' ', 'T')).getTime();
        const elapsed = isNaN(rowMs - rawStartMs) ? idx / 256 : (rowMs - rawStartMs) / 1000;
        return elapsed >= activeStartSec && elapsed <= activeEndSec;
      });

      const totalTrimmedRows = filteredRaw.length || 1;
      const cleanTrimmedRows = filteredRaw.filter((r) => isRawRowClean(r)).length;
      const cleanlinessPct = Math.round((cleanTrimmedRows / totalTrimmedRows) * 100);

      return {
        rowCount: filteredRaw.length,
        cleanlinessPct,
        rawSubset: filteredRaw,
      };
    }

    // Fallback using downsampled frames
    const filteredFrames = frames.filter((f) => f.timeSec >= activeStartSec && f.timeSec <= activeEndSec);
    const totalCount = filteredFrames.length || 1;
    const cleanCount = filteredFrames.filter((f) => f.isGoodFit).length;
    const cleanlinessPct = Math.round((cleanCount / totalCount) * 100);

    return {
      rowCount: filteredFrames.length,
      cleanlinessPct,
      rawSubset: null,
    };
  }, [rawRows, rawStartMs, frames, activeStartSec, activeEndSec]);

  // Export Trimmed CSV Handler
  const handleExportTrimmedCSV = () => {
    let csvData: any[] = [];

    if (trimmedStats.rawSubset && trimmedStats.rawSubset.length > 0) {
      csvData = trimmedStats.rawSubset;
    } else {
      // Reconstruct CSV format from processed frames if raw rows are missing
      const trimmedFrames = frames.filter((f) => f.timeSec >= activeStartSec && f.timeSec <= activeEndSec);
      csvData = trimmedFrames.map((f) => ({
        TimeStamp: f.timeStamp,
        Delta_TP9: f.channels.TP9.delta,
        Delta_AF7: f.channels.AF7.delta,
        Delta_AF8: f.channels.AF8.delta,
        Delta_TP10: f.channels.TP10.delta,
        Theta_TP9: f.channels.TP9.theta,
        Theta_AF7: f.channels.AF7.theta,
        Theta_AF8: f.channels.AF8.theta,
        Theta_TP10: f.channels.TP10.theta,
        Alpha_TP9: f.channels.TP9.alpha,
        Alpha_AF7: f.channels.AF7.alpha,
        Alpha_AF8: f.channels.AF8.alpha,
        Alpha_TP10: f.channels.TP10.alpha,
        Beta_TP9: f.channels.TP9.beta,
        Beta_AF7: f.channels.AF7.beta,
        Beta_AF8: f.channels.AF8.beta,
        Beta_TP10: f.channels.TP10.beta,
        Gamma_TP9: f.channels.TP9.gamma,
        Gamma_AF7: f.channels.AF7.gamma,
        Gamma_AF8: f.channels.AF8.gamma,
        Gamma_TP10: f.channels.TP10.gamma,
        HeadBandOn: f.headBandOn ? 1 : 0,
        HSI_TP9: f.channels.TP9.hsi,
        HSI_AF7: f.channels.AF7.hsi,
        HSI_AF8: f.channels.AF8.hsi,
        HSI_TP10: f.channels.TP10.hsi,
      }));
    }

    if (csvData.length === 0) return;

    const unparsedCsv = Papa.unparse(csvData);
    const blob = new Blob([unparsedCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const startFormattedStr = formatMMSS(activeStartSec).replace(':', 'm') + 's';
    const endFormattedStr = formatMMSS(activeEndSec).replace(':', 'm') + 's';
    const baseName = filename ? filename.replace(/\.csv$/i, '') : 'mindMonitor_session';
    const downloadFilename = `${baseName}_trimmed_${startFormattedStr}_to_${endFormattedStr}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', downloadFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!frames || frames.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 my-6 shadow-md space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-amber-950/60 border border-amber-800/80 rounded-xl text-amber-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Sensor Fit & Bad Contact Impact Analysis</h2>
            <p className="text-xs text-slate-400">
              Channel-by-channel breakdown of electrode impedance, bad contact durations, and session impact
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-mono px-3 py-1 bg-slate-950 border border-slate-800 text-slate-300 rounded-full">
            Fit Cleanliness:{' '}
            <strong className={summary.dataQualityPercent >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
              {summary.dataQualityPercent}%
            </strong>
          </span>
        </div>
      </div>

      {/* Overview Metric Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Effective Clean Duration */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-300">Clean Signal Duration</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-cyan-300">
              {formatSec(totalCleanSec)}{' '}
              <span className="text-xs font-normal text-slate-400">/ {summary.totalDurationFormatted}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Effective time with all 4 electrodes recording clean signals (HSI ≤ 2 / Good Fit).
            </p>
          </div>
        </div>

        {/* Worst Contact Sensor */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-300">Primary Noise Source</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            {hasBadContact ? (
              <>
                <div className="text-2xl font-bold text-amber-300">
                  {worstSensor.name} <span className="text-sm font-normal text-slate-400">({worstSensor.location})</span>
                </div>
                <p className="text-[11px] text-amber-400/90 mt-1 font-medium">
                  Bad fit for {formatSec(worstSensor.badSec)} ({worstSensor.badPercent}% of recording)
                </p>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" /> All Sensors Clean
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  No sensors experienced prolonged bad contact (HSI ≥ 3 / Poor Contact).
                </p>
              </>
            )}
          </div>
        </div>

        {/* Filtering Impact Summary */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-semibold text-slate-300">Filtered Out Data</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold text-rose-300">{100 - summary.dataQualityPercent}%</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Sample points discarded from metrics to prevent corrupting brainwave scores.
            </p>
          </div>
        </div>
      </div>

      {/* 4-Sensor Detailed Breakdown Table / Cards */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
          <Zap className="w-3.5 h-3.5 text-cyan-400" /> Individual Electrode Contact & Session Impact
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {sensorAnalysis.map((s) => (
            <div
              key={s.key}
              className={`p-3.5 rounded-xl border text-xs space-y-2.5 transition-all ${
                s.badPercent > 20
                  ? 'bg-amber-950/20 border-amber-800/50'
                  : s.badPercent > 0
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-slate-900/60 border-slate-800/80'
              }`}
            >
              {/* Card Title Header */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-sm text-white">{s.name}</span>
                  <span className="text-slate-400 text-xs ml-2">({s.location})</span>
                </div>
                {s.badPercent > 0 ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80">
                    ⚠ Bad: {formatSec(s.badSec)} ({s.badPercent}%)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 100% Good
                  </span>
                )}
              </div>

              {/* Progress Bar Visualizer */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span className="text-emerald-400">
                    Good: {s.goodPercent}% ({formatSec(s.goodSec)})
                  </span>
                  {s.medCount > 0 && <span className="text-amber-400">Med: {formatSec(s.medSec)}</span>}
                  {s.badCount > 0 && <span className="text-rose-400">Bad: {s.badPercent}%</span>}
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${s.goodPercent}%` }} />
                  <div
                    className="bg-amber-400 h-full"
                    style={{ width: `${Math.round((s.medCount / totalFrames) * 100)}%` }}
                  />
                  <div className="bg-rose-500 h-full" style={{ width: `${s.badPercent}%` }} />
                </div>
              </div>

              {/* Functional Role & Session Impact */}
              <div className="pt-1 border-t border-slate-800/80 space-y-1 text-[11px]">
                <p className="text-slate-300">
                  <strong className="text-slate-200">Role:</strong> {s.role}
                </p>
                <p className="text-slate-400 leading-relaxed">
                  <strong className={s.badPercent > 0 ? 'text-amber-400' : 'text-cyan-400'}>
                    {s.badPercent > 0 ? 'Session Impact:' : 'Signal Status:'}
                  </strong>{' '}
                  {s.badPercent > 0
                    ? s.impactDescription
                    : 'Pristine contact throughout session. No artifact distortion.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NEW FEATURE: Custom Duration Trim & Clean Data CSV Exporter */}
      <div className="bg-slate-950 border border-cyan-900/50 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-950 border border-cyan-800/80 rounded-xl text-cyan-400">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Export Custom Trimmed Clean Data CSV
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  Tool
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Trim off noisy initial setup or ending headband removal minutes to export a high-fidelity CSV file
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => {
                setTrimStartSec(0);
                setTrimEndSec(0);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                trimStartSec === 0 && trimEndSec === 0
                  ? 'bg-cyan-900/60 border-cyan-500 text-cyan-200 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Session
            </button>
            <button
              onClick={() => {
                setTrimStartSec(120); // First 2 min
                setTrimEndSec(240); // Last 4 min
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                trimStartSec === 120 && trimEndSec === 240
                  ? 'bg-cyan-900/60 border-cyan-500 text-cyan-200 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" /> Trim 2m & 4m
            </button>
            <button
              onClick={() => {
                setTrimStartSec(autoDetectEdges.startTrimSec);
                setTrimEndSec(autoDetectEdges.endTrimSec);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                trimStartSec === autoDetectEdges.startTrimSec &&
                trimEndSec === autoDetectEdges.endTrimSec &&
                (autoDetectEdges.startTrimSec > 0 || autoDetectEdges.endTrimSec > 0)
                  ? 'bg-cyan-900/60 border-cyan-500 text-cyan-200 font-bold'
                  : 'bg-slate-900 border-slate-800 text-cyan-400 hover:border-cyan-700'
              }`}
            >
              <Sliders className="w-3 h-3 text-cyan-400" /> Auto-Trim Bad Edges
              {autoDetectEdges.startTrimSec > 0 || autoDetectEdges.endTrimSec > 0 ? (
                <span className="text-[10px] font-mono text-cyan-300 font-bold ml-1 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                  +{formatMMSS(autoDetectEdges.startTrimSec)} / -{formatMMSS(autoDetectEdges.endTrimSec)}
                </span>
              ) : (
                <span className="text-[10px] font-mono text-slate-500 ml-1">(Clean Edges)</span>
              )}
            </button>
          </div>
        </div>

        {/* Sliders & Duration Selector Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Trim Slider */}
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Trim From Start (Initial Noise)</span>
              <span className="font-mono text-cyan-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                +{formatMMSS(trimStartSec)} ({formatSec(trimStartSec)})
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, recordingTotalSec - trimEndSec - 30)}
              step={10}
              value={trimStartSec}
              onChange={(e) => setTrimStartSec(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-800 rounded-lg h-2 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Skips initial headband adjustments or signal stabilization delay.
            </p>
          </div>

          {/* End Trim Slider */}
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">Trim From End (Final Removal)</span>
              <span className="font-mono text-amber-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                -{formatMMSS(trimEndSec)} ({formatSec(trimEndSec)})
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, recordingTotalSec - trimStartSec - 30)}
              step={10}
              value={trimEndSec}
              onChange={(e) => setTrimEndSec(Number(e.target.value))}
              className="w-full accent-amber-400 bg-slate-800 rounded-lg h-2 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Cuts off session tail end when headband was taken off early.
            </p>
          </div>
        </div>

        {/* Real-time Resulting Cleanliness Preview Bar */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            {/* Range Window */}
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Selected Window</span>
              <span className="text-sm font-mono font-bold text-white">
                {formatMMSS(activeStartSec)} ➔ {formatMMSS(activeEndSec)}
              </span>
            </div>

            {/* New Duration */}
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">New Duration</span>
              <span className="text-sm font-mono font-bold text-cyan-300">{formatSec(trimmedDurationSec)}</span>
            </div>

            {/* Estimated Cleanliness */}
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Trimmed Quality</span>
              <span
                className={`text-sm font-mono font-bold ${
                  trimmedStats.cleanlinessPct >= 80
                    ? 'text-emerald-400'
                    : trimmedStats.cleanlinessPct >= 60
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {trimmedStats.cleanlinessPct}% Clean
              </span>
            </div>

            {/* Row Count */}
            <div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Export Rows</span>
              <span className="text-sm font-mono font-bold text-slate-300">
                {trimmedStats.rowCount.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExportTrimmedCSV}
            className="w-full md:w-auto shrink-0 px-4 py-2.5 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-white" /> Export Trimmed Clean CSV
          </button>
        </div>
      </div>

      {/* Explanatory Footer / Methodology Callout */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-2 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-300">Why session timeline length remains unchanged:</strong> Filtering bad fit samples removes dirty data points from metrics calculations without shrinking the wall-clock recording timeline. For example, in a 15-minute recording with 55% Fit & Filter, bad samples are distributed throughout the session, leaving 8m 15s of clean data across the full 15:00 timeframe. Use the <strong className="text-cyan-300">Custom Trim tool above</strong> to slice out noisy setup or teardown periods and save a clean CSV file.
        </div>
      </div>
    </div>
  );
};
