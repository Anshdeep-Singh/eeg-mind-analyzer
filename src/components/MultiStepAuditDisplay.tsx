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
  FileCheck2,
  CheckSquare,
  BarChart2,
  Sliders,
  ListFilter,
} from 'lucide-react';

interface MultiStepAuditDisplayProps {
  auditOutput: MultiStepAuditOutput | null;
  isAnalyzing: boolean;
  currentStepIndex: number;
  onReRun?: () => void;
  onExportPdf?: () => void;
  title?: string;
  subtitle?: string;
}

export const MultiStepAuditDisplay: React.FC<MultiStepAuditDisplayProps> = ({
  auditOutput,
  isAnalyzing,
  currentStepIndex,
  onReRun,
  onExportPdf,
  title = 'Multi-Step Neural Audit',
  subtitle = 'Progressive 5-step clinical evaluation of signal cleanliness, spectral topography, trajectories, synthesis, and protocols.',
}) => {
  // View mode state: 'executive' (Visual Dashboard), 'steps' (5 Step Reader), 'master' (Full MD)
  const [viewMode, setViewMode] = useState<'executive' | 'steps' | 'master'>('executive');
  const [selectedStepTab, setSelectedStepTab] = useState<number>(4); // Default to Step 4
  const [copied, setCopied] = useState<boolean>(false);

  const copyReport = () => {
    if (!auditOutput) return;
    navigator.clipboard.writeText(auditOutput.consolidatedMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadMarkdown = () => {
    if (!auditOutput) return;
    const blob = new Blob([auditOutput.consolidatedMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EEG_Neural_Audit_${auditOutput.reportId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stepIcons = [ShieldCheck, Layers, Activity, Brain, Compass];

  if (!auditOutput) {
    return (
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/30 space-y-5 shadow-2xl text-center">
        <div className="flex items-center justify-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
          <div className="text-left">
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
            <p className="text-xs text-slate-400">{subtitle}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-indigo-300 space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Executing Step {currentStepIndex || 1} of 5 in progress...</span>
          </div>
          <p className="text-[11px] text-slate-400">Please wait while the neural engine analyzes and correlates session signals.</p>
        </div>
      </div>
    );
  }

  const execSum = auditOutput.executiveSummary;

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
              {auditOutput.isAiGenerated ? (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-mono font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> Live Model
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-mono font-semibold flex items-center gap-1" title={auditOutput.fallbackReason}>
                  <AlertTriangle className="w-3 h-3 text-amber-400" /> Rule-Based Engine
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {onReRun && (
            <button
              onClick={onReRun}
              disabled={isAnalyzing}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-indigo-400' : ''}`} />
              Re-Run Audit
            </button>
          )}

          {onExportPdf && (
            <button
              onClick={onExportPdf}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg transition flex items-center gap-1.5"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-cyan-200" /> Export PDF Report
            </button>
          )}

          <button
            onClick={copyReport}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            {copied ? 'Copied' : 'Copy MD'}
          </button>

          <button
            onClick={downloadMarkdown}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-amber-300" /> Export MD
          </button>
        </div>
      </div>

      {/* View Mode Switcher Tabs */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3 flex-wrap">
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('executive')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'executive'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-amber-300" /> Visual Executive Dashboard
          </button>

          <button
            onClick={() => setViewMode('steps')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'steps'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-300" /> 5-Step Detailed Audit
          </button>

          <button
            onClick={() => setViewMode('master')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              viewMode === 'master'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-indigo-300" /> Full Narrative Text
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold border ${
            auditOutput.isAiGenerated
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
              : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
          }`}>
            {auditOutput.isAiGenerated
              ? `AI Model: ${auditOutput.providerUsed.toUpperCase()} (${auditOutput.modelUsed})`
              : `Evaluation Engine: Rule-Based Deterministic Engine (${auditOutput.fallbackReason || 'No API key provided'})`}
          </span>
          <span className="text-[10px] font-mono text-slate-400">
            Report ID: {auditOutput.reportId}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODE 1: VISUAL EXECUTIVE DASHBOARD (DEFAULT) */}
      {/* ========================================================= */}
      {viewMode === 'executive' && (
        <div className="space-y-5">
          {/* Executive State Headline Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/40 shadow-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3 h-3 text-amber-300" /> Clinical Assessment Verdict
              </span>
              {execSum?.overallScore && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                  State Index: {execSum.overallScore}/100
                </span>
              )}
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
              {execSum?.executiveHeadline || 'Balanced Cortical Readiness & Neural Stability'}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              {execSum?.primaryState ? `Primary Neural Orientation: ${execSum.primaryState}` : auditOutput.overallConclusion.slice(0, 220)}
            </p>
          </div>

          {/* Metrics Grid */}
          {execSum?.metricsGrid && execSum.metricsGrid.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {execSum.metricsGrid.map((m, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400">{m.label}</span>
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm sm:text-base font-bold text-white font-mono">{m.value}</p>
                    {m.change && <span className="text-[10px] font-mono text-cyan-400">{m.change}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Plain Simple Language Brain State Cards (Above Executive Takeaways) */}
          {execSum?.plainEnglishCards && execSum.plainEnglishCards.length > 0 && (
            <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 border border-cyan-500/40 shadow-xl">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Brain className="w-4 h-4 text-cyan-400 animate-pulse" /> Plain-Language Brain State Summary
                </h4>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-cyan-300" /> Calculated Metric • Honest & Accurate
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {execSum.plainEnglishCards.map((card, idx) => (
                  <div
                    key={card.id || idx}
                    className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5 shadow-md hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                        {card.category}
                      </span>
                      {card.metricBadge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          {card.metricBadge}
                        </span>
                      )}
                    </div>

                    <h5 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                      {card.title}
                    </h5>

                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {card.insight}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Insights & Takeaways Cards */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Executive Neural Takeaways
            </h4>

            {execSum?.takeawayCards && execSum.takeawayCards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {execSum.takeawayCards.map((card, idx) => {
                  const colorMap: Record<string, { bg: string; border: string; text: string; badgeBg: string }> = {
                    emerald: {
                      bg: 'from-emerald-950/40 via-slate-950 to-slate-950',
                      border: 'border-emerald-500/30',
                      text: 'text-emerald-400',
                      badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                    },
                    indigo: {
                      bg: 'from-indigo-950/40 via-slate-950 to-slate-950',
                      border: 'border-indigo-500/30',
                      text: 'text-indigo-400',
                      badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
                    },
                    purple: {
                      bg: 'from-purple-950/40 via-slate-950 to-slate-950',
                      border: 'border-purple-500/30',
                      text: 'text-purple-400',
                      badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
                    },
                    cyan: {
                      bg: 'from-cyan-950/40 via-slate-950 to-slate-950',
                      border: 'border-cyan-500/30',
                      text: 'text-cyan-400',
                      badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
                    },
                    amber: {
                      bg: 'from-amber-950/40 via-slate-950 to-slate-950',
                      border: 'border-amber-500/30',
                      text: 'text-amber-400',
                      badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                    },
                    rose: {
                      bg: 'from-rose-950/40 via-slate-950 to-slate-950',
                      border: 'border-rose-500/30',
                      text: 'text-rose-400',
                      badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                    },
                  };

                  const style = colorMap[card.impactColor] || colorMap.indigo;

                  return (
                    <div
                      key={card.id || idx}
                      className={`p-3.5 bg-gradient-to-br ${style.bg} border ${style.border} rounded-xl space-y-1.5 shadow-md hover:border-slate-700 transition-all`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                            {card.category}
                          </span>
                          {card.isAiGenerated ? (
                            <span className="text-[9px] font-mono font-semibold text-purple-300 bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-1">
                              ✨ AI Synthesized
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-semibold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                              Calculated Metric
                            </span>
                          )}
                        </div>
                        {card.metricBadge && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${style.badgeBg}`}>
                            {card.metricBadge}
                          </span>
                        )}
                      </div>

                      <h5 className={`text-xs font-bold ${style.text} tracking-tight`}>
                        {card.title}
                      </h5>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {card.insight}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(execSum?.keyTakeaways || auditOutput.steps.map(s => s.summary)).map((takeaway, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">Insight #{idx + 1}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{takeaway}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actionable Biofeedback Protocol Cards */}
          {execSum?.topRecommendations && execSum.topRecommendations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Prescribed Actionable Protocols
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {execSum.topRecommendations.map((rec, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <Zap className="w-3.5 h-3.5 text-amber-300" />
                      <span className="text-xs font-bold text-white">Action Protocol #{idx + 1}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk / Warning Alerts */}
          {execSum?.riskFlags && execSum.riskFlags.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" /> Diagnostic Vigilance Badges
              </h4>
              <ul className="space-y-1">
                {execSum.riskFlags.map((flag, idx) => (
                  <li key={idx} className="text-xs text-amber-200/90 flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 2: 5-STEP DETAILED CLINICAL AUDIT READER */}
      {/* ========================================================= */}
      {viewMode === 'steps' && (
        <div className="space-y-5">
          {/* 5 Stepper Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {auditOutput.steps.map((st, idx) => {
              const StepIcon = stepIcons[idx] || Brain;
              const isSelected = selectedStepTab === idx + 1;

              return (
                <button
                  key={st.stepNumber}
                  onClick={() => setSelectedStepTab(idx + 1)}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-indigo-950/80 border-indigo-400 text-white shadow-xl ring-2 ring-indigo-500/30'
                      : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase text-indigo-400">
                      Step {st.stepNumber}
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <StepIcon className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                    <h4 className="text-xs font-bold truncate">{st.stepTitle}</h4>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected Step Detail Panel */}
          {(() => {
            const stepObj = auditOutput.steps.find((s) => s.stepNumber === selectedStepTab);
            if (!stepObj) return null;

            return (
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold">
                      AUDIT STEP {stepObj.stepNumber} OF 5
                    </span>
                    <h4 className="text-sm font-bold text-white">{stepObj.stepTitle}</h4>
                  </div>

                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Step Audit Completed
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
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-3 whitespace-pre-wrap font-sans break-words max-w-full overflow-x-hidden max-h-[500px] overflow-y-auto pr-2">
                  {stepObj.detailsMarkdown}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================= */}
      {/* MODE 3: FULL MASTER NARRATIVE TEXT */}
      {/* ========================================================= */}
      {viewMode === 'master' && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-mono uppercase font-bold text-purple-400 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" /> Full Consolidated Clinical Narrative Report
            </span>
            <span className="text-xs text-slate-400 font-mono">{auditOutput.generatedAt}</span>
          </div>

          <div className="text-xs sm:text-sm text-slate-200 leading-relaxed space-y-3 whitespace-pre-wrap font-sans break-words max-w-full overflow-x-hidden max-h-[700px] min-h-[300px] overflow-y-auto pr-2">
            {auditOutput.consolidatedMarkdown}
          </div>
        </div>
      )}
    </div>
  );
};
