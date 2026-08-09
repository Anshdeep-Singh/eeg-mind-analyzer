import React from 'react';
import { SessionSummary } from '../types/eeg';
import { Sparkles, Compass, Lightbulb, ShieldCheck, ArrowRight } from 'lucide-react';

interface Props {
  summary: SessionSummary;
}

export const PlainEnglishInsights: React.FC<Props> = ({ summary }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 my-6 shadow-md space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">AI Session Insights & Brain Narrative</h2>
            <p className="text-xs text-slate-400">Plain English interpretation of your Mind Monitor recording</p>
          </div>
        </div>
      </div>

      {/* Main Observations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {summary.keyInsights.map((insight, idx) => (
          <div key={idx} className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
            <div className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-md mt-0.5 shrink-0">
              <Lightbulb className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {insight.split('**').map((part, i) =>
                i % 2 === 1 ? <strong key={i} className="text-cyan-300 font-semibold">{part}</strong> : part
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Session Phase Timeline */}
      <div>
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Compass className="w-4 h-4 text-indigo-400" /> Chronological Session Phases
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {summary.phases.map((phase, idx) => (
            <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-indigo-300">{phase.name}</span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {phase.startTime} - {phase.endTime}
                </span>
              </div>

              <div className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800 mb-2">
                State: {phase.dominantState}
              </div>

              <p className="text-xs text-slate-400 leading-relaxed mb-3">
                {phase.description}
              </p>

              <div className="flex justify-between text-[11px] font-mono border-t border-slate-900 pt-2 text-slate-400">
                <span>Focus: <strong className="text-blue-400">{phase.avgFocus}/100</strong></span>
                <span>Calm: <strong className="text-emerald-400">{phase.avgCalm}/100</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Recommendations */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Next Steps & Neurofeedback Recommendations
        </h3>
        <ul className="space-y-2">
          {summary.recommendations.map((rec, idx) => (
            <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
