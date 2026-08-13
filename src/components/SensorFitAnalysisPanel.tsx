import React from 'react';
import { ProcessedEEGFrame, SessionSummary } from '../types/eeg';
import { AlertTriangle, CheckCircle2, Clock, Radio, ShieldAlert, Zap, Info, ShieldCheck } from 'lucide-react';

interface Props {
  frames: ProcessedEEGFrame[];
  summary: SessionSummary;
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

export const SensorFitAnalysisPanel: React.FC<Props> = ({ frames, summary }) => {
  if (!frames || frames.length === 0) return null;

  const totalFrames = frames.length;
  const firstSec = frames[0].timeSec;
  const lastSec = frames[frames.length - 1].timeSec;
  const totalDurationSec = Math.max(1, lastSec - firstSec);
  const frameIntervalSec = totalDurationSec / totalFrames;

  const formatSec = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
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
            Fit Cleanliness: <strong className={summary.dataQualityPercent >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{summary.dataQualityPercent}%</strong>
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
              Effective time with all 4 electrodes recording clean signals ($HSI \le 2$).
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
                  No sensors experienced prolonged bad contact ($HSI \ge 3$).
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
            <div className="text-2xl font-bold text-rose-300">
              {100 - summary.dataQualityPercent}%
            </div>
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
                  <span className="text-emerald-400">Good: {s.goodPercent}% ({formatSec(s.goodSec)})</span>
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
                  {s.badPercent > 0 ? s.impactDescription : 'Pristine contact throughout session. No artifact distortion.'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explanatory Footer / Methodology Callout */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start gap-2 text-xs text-slate-400">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-300">Why session timeline length remains unchanged:</strong> Filtering bad fit samples removes dirty data points from metrics calculations without shrinking the wall-clock recording timeline. For example, in a 15-minute recording with 55% Fit & Filter, bad samples are distributed throughout the session, leaving 8m 15s of clean data across the full 15:00 timeframe.
        </div>
      </div>
    </div>
  );
};
