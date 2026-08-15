import React from 'react';
import { SessionSummary } from '../types/eeg';
import { Zap, Heart, Brain, Smile } from 'lucide-react';

interface Props {
  summary: SessionSummary;
}

export const CognitiveGauges: React.FC<Props> = ({ summary }) => {
  const getGaugeColor = (val: number, type: 'focus' | 'calm' | 'meditation' | 'load') => {
    if (type === 'focus') return val > 65 ? 'bg-blue-500' : val > 40 ? 'bg-sky-500' : 'bg-slate-600';
    if (type === 'calm') return val > 65 ? 'bg-emerald-500' : val > 40 ? 'bg-teal-500' : 'bg-slate-600';
    if (type === 'meditation') return val > 60 ? 'bg-indigo-500' : val > 35 ? 'bg-violet-500' : 'bg-slate-600';
    return val > 60 ? 'bg-rose-500' : 'bg-amber-500';
  };

  const faa = summary.avgFrontalAsymmetry;
  const faaText = faa > 0.05 ? 'Left Frontal Dominant (Positive / Approach)' : faa < -0.05 ? 'Right Frontal Dominant (Analytical / Cautious)' : 'Balanced Frontal Balance';
  const faaPercent = Math.min(100, Math.max(0, 50 + faa * 100));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 my-6 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-cyan-400 shrink-0" />
          <h2 className="text-base font-bold text-white">Cognitive Scores</h2>
        </div>
        <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700 self-start sm:self-auto shrink-0">
          Derived from PSD Ratios
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Focus Progress Bar */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-blue-400" /> Focus / Concentration
            </span>
            <span className="text-sm font-bold text-blue-400">{summary.avgFocus}/100</span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getGaugeColor(summary.avgFocus, 'focus')}`}
              style={{ width: `${summary.avgFocus}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Beta / (Alpha + Theta) ratio. Indicates active problem solving and attention.
          </p>
        </div>

        {/* Calm Progress Bar */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-emerald-400" /> Tranquility / Calm
            </span>
            <span className="text-sm font-bold text-emerald-400">{summary.avgCalm}/100</span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getGaugeColor(summary.avgCalm, 'calm')}`}
              style={{ width: `${summary.avgCalm}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Alpha band predominance. Indicates relaxed mental clarity without anxiety.
          </p>
        </div>

        {/* Meditation Depth */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-indigo-400" /> Meditative Depth
            </span>
            <span className="text-sm font-bold text-indigo-400">{summary.avgMeditationDepth}/100</span>
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${getGaugeColor(summary.avgMeditationDepth, 'meditation')}`}
              style={{ width: `${summary.avgMeditationDepth}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Theta & Alpha synergy. Represents deep inner awareness and still mind.
          </p>
        </div>

        {/* Frontal Asymmetry Meter */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Smile className="w-4 h-4 text-amber-400" /> Frontal Mood Balance
            </span>
            <span className="text-xs font-mono text-amber-300 font-bold">
              {faa >= 0 ? `+${faa.toFixed(2)}` : faa.toFixed(2)} Bels
            </span>
          </div>
          
          {/* Bi-directional slider */}
          <div className="relative w-full bg-slate-800 h-2.5 rounded-full overflow-hidden my-1.5">
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-500 z-10" />
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
              style={{
                left: faa >= 0 ? '50%' : `${faaPercent}%`,
                width: `${Math.abs(faaPercent - 50)}%`
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 font-medium">
            <span>◄ Right Dominant (Cautious)</span>
            <span>Left Dominant (Positive) ►</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 truncate" title={faaText}>
            {faaText}
          </p>
        </div>
      </div>
    </div>
  );
};
