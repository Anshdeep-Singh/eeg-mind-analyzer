'use client';

import React, { useState } from 'react';
import { MultiStepAuditOutput, AuditStepResult } from '../utils/llmClient';
import {
  Activity,
  Brain,
  CheckCircle2,
  Clock,
  Download,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Sparkles,
  ShieldCheck,
  Layers,
  FileText,
  ChevronRight,
  Award,
  AlertTriangle,
  Compass,
} from 'lucide-react';

interface MultiStepAuditDisplayProps {
  auditOutput: MultiStepAuditOutput;
  isAnalyzing: boolean;
  currentStepIndex: number;
  onReRun?: () => void;
  title?: string;
  subtitle?: string;
}

export const MultiStepAuditDisplay: React.FC<MultiStepAuditDisplayProps> = ({
  auditOutput,
  isAnalyzing,
  currentStepIndex,
  onReRun,
  title = 'Board-Certified Multi-Step AI Neural Audit',
  subtitle = 'Progressive 5-step clinical AI evaluation of signal cleanliness, spectral topography, trajectories, synthesis, and protocols.',
}) => {
  const [selectedStepTab, setSelectedStepTab] = useState<number | 'master'>(4); // Default to Step 4 (Overall Conclusion) or 'master'
  const [copied, setCopied] = useState<boolean>(false);

  const copyReport = () => {
    navigator.clipboard.writeText(auditOutput.consolidatedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    const blob = new Blob([auditOutput.consolidatedMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EEG_AI_Neural_Audit_${auditOutput.reportId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stepIcons = [ShieldCheck, Layers, Activity, Brain, Compass];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-6 shadow-2xl">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-lg shadow-indigo-950">
            <Brain className="w-6 h-6 animate-pulse text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">{title}</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" /> 5-Step Progressive AI
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {onReRun && (
            <button
              onClick={onReRun}
              disabled={isAnalyzing}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-indigo-400' : ''}`} />
              Re-Run Audit
            </button>
          )}

          <button
            onClick={copyReport}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            {copied ? 'Copied' : 'Copy Report'}
          </button>

          <button
            onClick={downloadMarkdown}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" /> Export MD
          </button>
        </div>
      </div>

      {/* 5-Step Stepper Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {auditOutput.steps.map((st, idx) => {
          const StepIcon = stepIcons[idx] || Brain;
          const isDone = st.status === 'completed';
          const isCurr = isAnalyzing && currentStepIndex === idx + 1;
          const isSelected = selectedStepTab === idx + 1;

          return (
            <button
              key={st.stepNumber}
              onClick={() => setSelectedStepTab(idx + 1)}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-indigo-950/80 border-indigo-400 text-white shadow-xl ring-2 ring-indigo-500/30'
                  : isDone
                  ? 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  : isCurr
                  ? 'bg-indigo-950/40 border-indigo-500/60 text-indigo-200 animate-pulse'
                  : 'bg-slate-950/40 border-slate-800 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400">
                  Step {st.stepNumber}
                </span>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isCurr ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 opacity-50 shrink-0" />
                )}
              </div>

              <div className="flex items-center gap-2">
                <StepIcon className="w-4 h-4 text-indigo-300 shrink-0" />
                <h4 className="text-xs font-bold truncate">{st.stepTitle}</h4>
              </div>

              <p className="text-[10px] text-slate-400 line-clamp-1 mt-1 opacity-80">{st.summary}</p>
            </button>
          );
        })}
      </div>

      {/* Step View Selector Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          {auditOutput.steps.map((st, idx) => (
            <button
              key={st.stepNumber}
              onClick={() => setSelectedStepTab(idx + 1)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                selectedStepTab === idx + 1
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Step {st.stepNumber}: {st.stepTitle.split(' ')[0]}
            </button>
          ))}
          <button
            onClick={() => setSelectedStepTab('master')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              selectedStepTab === 'master'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            📋 Master Consolidated Report
          </button>
        </div>

        <span className="text-[10px] font-mono text-slate-400 shrink-0 hidden sm:inline">
          Report ID: {auditOutput.reportId}
        </span>
      </div>

      {/* Selected Step Content Display */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-inner">
        {selectedStepTab === 'master' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono uppercase font-bold text-purple-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" /> Full Consolidated Clinical AI Audit
              </span>
              <span className="text-xs text-slate-400 font-mono">{auditOutput.generatedAt}</span>
            </div>

            <div className="text-xs text-slate-200 leading-relaxed space-y-3 whitespace-pre-wrap font-sans max-h-[800px] min-h-[300px] overflow-y-auto pr-2">
              {auditOutput.consolidatedMarkdown}
            </div>
          </div>
        ) : (
          (() => {
            const stepObj = auditOutput.steps.find((s) => s.stepNumber === selectedStepTab);
            if (!stepObj) return null;

            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold">
                      AUDIT STEP {stepObj.stepNumber} OF 5
                    </span>
                    <h4 className="text-sm font-bold text-white">{stepObj.stepTitle}</h4>
                  </div>

                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Clinical Audit Verified
                  </span>
                </div>

                {/* Key Metric Badges */}
                {stepObj.keyMetrics && stepObj.keyMetrics.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {stepObj.keyMetrics.map((m, mIdx) => (
                      <div key={mIdx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-[10px] uppercase font-mono text-slate-400">{m.label}</span>
                        <p className="text-sm font-bold text-white font-mono">{m.value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Audit Step Markdown Content */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed space-y-3 whitespace-pre-wrap font-sans max-h-[500px] overflow-y-auto pr-2">
                  {stepObj.detailsMarkdown}
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
};
