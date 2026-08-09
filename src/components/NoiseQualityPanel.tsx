import React from 'react';
import { ProcessingOptions, ProcessedEEGFrame } from '../types/eeg';
import { ShieldCheck, Sliders, Eye, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface Props {
  options: ProcessingOptions;
  onOptionsChange: (newOptions: ProcessingOptions) => void;
  frames: ProcessedEEGFrame[];
  totalRawRows: number;
}

export const NoiseQualityPanel: React.FC<Props> = ({
  options,
  onOptionsChange,
  frames,
  totalRawRows
}) => {
  // Calculate electrode fit stats across valid frames
  const calcSensorStats = (sensorKey: 'TP9' | 'AF7' | 'AF8' | 'TP10') => {
    if (!frames || frames.length === 0) return { good: 100, med: 0, bad: 0 };
    let good = 0, med = 0, bad = 0;
    frames.forEach(f => {
      const hsi = f.channels[sensorKey]?.hsi ?? 1;
      if (hsi === 1) good++;
      else if (hsi === 2) med++;
      else bad++;
    });
    const total = frames.length || 1;
    return {
      good: Math.round((good / total) * 100),
      med: Math.round((med / total) * 100),
      bad: Math.round((bad / total) * 100),
    };
  };

  const tp9Stats = calcSensorStats('TP9');
  const af7Stats = calcSensorStats('AF7');
  const af8Stats = calcSensorStats('AF8');
  const tp10Stats = calcSensorStats('TP10');

  const filteredOutCount = totalRawRows - frames.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 my-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <h2 className="text-base font-bold text-white">Signal Processing & Artifact Noise Control</h2>
        </div>
        <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700 self-start sm:self-auto shrink-0">
          Honest & Calibrated Filtering
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Filter Controls */}
        <div className="space-y-4 md:col-span-2 bg-slate-950 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" /> Filter Options
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {filteredOutCount > 0 ? `Filtered ${filteredOutCount} noise samples` : 'Showing all samples'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Smoothing Window */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Moving Window Smoothing
              </label>
              <select
                value={options.smoothWindow}
                onChange={(e) => onOptionsChange({ ...options, smoothWindow: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-cyan-500"
              >
                <option value={1}>1s Raw (Unsmoothed)</option>
                <option value={3}>3s Light Smooth (Recommended)</option>
                <option value={5}>5s Balanced Trend</option>
                <option value={10}>10s Heavy Smoothing</option>
              </select>
            </div>

            {/* Bad Fit / HSI Quality Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Sensor Contact Purity (HSI)
              </label>
              <select
                value={options.hsiQualityThreshold || (options.filterBadFit ? 'acceptable' : 'all')}
                onChange={(e) => {
                  const val = e.target.value as 'all' | 'acceptable' | 'strict_good';
                  onOptionsChange({
                    ...options,
                    hsiQualityThreshold: val,
                    filterBadFit: val !== 'all',
                  });
                }}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="acceptable">Exclude Bad Fit (HSI ≤ 2 - Standard)</option>
                <option value="strict_good">Pristine Clean Only (HSI = 1 Strict)</option>
                <option value="all">Allow All (Raw HSI 1–4 Unfiltered)</option>
              </select>
            </div>

            {/* Blink Artifact Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Eye Blink Exclusion
              </label>
              <label className="flex items-center space-x-2 cursor-pointer bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs">
                <input
                  type="checkbox"
                  checked={options.filterBlinks}
                  onChange={(e) => onOptionsChange({ ...options, filterBlinks: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-600 text-cyan-500 focus:ring-0"
                />
                <span className="text-slate-300">Exclude Blink Rows</span>
              </label>
            </div>

            {/* Motion Artifact Filter */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Motion Artifact Exclusion
              </label>
              <label className="flex items-center space-x-2 cursor-pointer bg-slate-900 border border-slate-700 p-2 rounded-lg text-xs">
                <input
                  type="checkbox"
                  checked={options.filterMotion ?? false}
                  onChange={(e) => onOptionsChange({ ...options, filterMotion: e.target.checked })}
                  className="rounded bg-slate-800 border-slate-600 text-cyan-500 focus:ring-0"
                />
                <span className="text-slate-300">Exclude Motion Noise</span>
              </label>
            </div>
          </div>
        </div>

        {/* 4 Sensor Fit Quality Matrix */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <span className="text-xs font-bold text-slate-200 block">
              Sensor Contact Impedance (HSI)
            </span>
            <span className="text-[10px] text-cyan-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Active Filtered Set ({frames.length} frames)
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            {[
              { name: 'AF7 (Left Forehead)', stats: af7Stats },
              { name: 'AF8 (Right Forehead)', stats: af8Stats },
              { name: 'TP9 (Left Ear)', stats: tp9Stats },
              { name: 'TP10 (Right Ear)', stats: tp10Stats },
            ].map((s, idx) => (
              <div key={idx} className="flex items-center justify-between bg-slate-900/80 p-2 rounded-lg">
                <span className="text-slate-300">{s.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">{s.stats.good}% Good</span>
                  {s.stats.med > 0 && <span className="text-amber-400">{s.stats.med}% Med</span>}
                  {s.stats.bad > 0 && <span className="text-rose-400">{s.stats.bad}% Bad</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
