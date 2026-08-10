import React from 'react';
import { SessionSummary } from '../types/eeg';
import { Zap, HeartHandshake, Eye, CheckCircle2, Clock, Waves, ShieldAlert, Calendar } from 'lucide-react';

interface Props {
  summary: SessionSummary;
}

export const SessionSummaryCards: React.FC<Props> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 my-6">
      {/* Duration & Quality */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Session Time & Date</span>
          <Clock className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-white font-mono">{summary.totalDurationFormatted}</span>
            {summary.sessionDayOfWeek && (
              <span className="text-[10px] text-cyan-300 font-semibold px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800">
                {summary.sessionDayOfWeek}
              </span>
            )}
          </div>
          {summary.sessionDateFormatted && (
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>{summary.sessionDateFormatted}</span>
            </div>
          )}
          {summary.sessionTimeFormatted && (
            <div className="text-[11px] text-slate-300 font-mono">
              Time: <span className="text-cyan-300 font-bold">{summary.sessionTimeFormatted}</span>
            </div>
          )}
          <div className="text-[10px] text-slate-400 pt-0.5">
            {summary.validSamplesCount.toLocaleString()} valid samples
          </div>
        </div>
      </div>

      {/* Focus Score */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Avg Focus</span>
          <Zap className="w-4 h-4 text-blue-400" />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-blue-400">{summary.avgFocus}<span className="text-xs text-slate-500 font-normal">/100</span></div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Peak: <span className="text-blue-300 font-semibold">{summary.peakFocusWindow.score}</span> at {summary.peakFocusWindow.time}
          </div>
        </div>
      </div>

      {/* Calm Score */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Avg Calm</span>
          <HeartHandshake className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-emerald-400">{summary.avgCalm}<span className="text-xs text-slate-500 font-normal">/100</span></div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {summary.timeInCalmPercent}% time in Alpha state
          </div>
        </div>
      </div>

      {/* Meditation Depth */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Meditation</span>
          <Waves className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-indigo-400">{summary.avgMeditationDepth}<span className="text-xs text-slate-500 font-normal">/100</span></div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Alpha/Theta synergy
          </div>
        </div>
      </div>

      {/* Dominant Wave */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Primary Band</span>
          <Waves className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2">
          <div className="text-xl font-bold text-amber-300">{summary.dominantWave}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Dominant Spectrum
          </div>
        </div>
      </div>

      {/* Fit & Noise Quality */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-xs font-medium">Fit & Filter</span>
          {summary.dataQualityPercent >= 80 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          )}
        </div>
        <div className="mt-2">
          <div className="text-2xl font-bold text-emerald-300">{summary.dataQualityPercent}%</div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <Eye className="w-3 h-3 text-cyan-400" /> {summary.blinkCount} blinks filtered
          </div>
        </div>
      </div>
    </div>
  );
};
