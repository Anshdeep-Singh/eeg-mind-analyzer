'use client';

import React, { useState, useMemo } from 'react';
import Papa from 'papaparse';
import { ProcessedEEGFrame, SessionSummary, RawMindMonitorRow, ProcessingOptions } from '../types/eeg';
import { processMindMonitorCSV } from '../utils/eegProcessor';
import { compareEEGSessions, SessionComparisonResult } from '../utils/sessionComparator';
import { runDualSessionMultiStepAudit, MultiStepAuditOutput, ProviderType } from '../utils/llmClient';
import { MultiStepAuditDisplay } from './MultiStepAuditDisplay';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  GitCompare,
  UploadCloud,
  FileSpreadsheet,
  Brain,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Activity,
  Layers,
  Cpu,
  ShieldCheck,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Info,
  Compass,
  Scale,
  Award,
  ChevronRight,
} from 'lucide-react';

interface SessionComparisonPanelProps {
  sessionA: {
    summary: SessionSummary;
    frames: ProcessedEEGFrame[];
    filename: string;
  };
  options: ProcessingOptions;
}

const COMPARISON_TABS = [
  { id: 'overview', label: '1. Overview & Deltas', shortLabel: '1. Overview', icon: Scale },
  { id: 'sensors', label: '2. 4-Sensor Spatial Correlation', shortLabel: '2. 4-Sensors', icon: Compass },
  { id: 'wavebands', label: '3. 5-Waveband Matrix', shortLabel: '3. Wavebands', icon: Layers },
  { id: 'timeseries', label: '4. Overlaid Time-Series', shortLabel: '4. Time-Series', icon: Activity },
  { id: 'clinical', label: '5. Deep Clinical Takeaways', shortLabel: '5. Clinical', icon: Award },
] as const;

export const SessionComparisonPanel: React.FC<SessionComparisonPanelProps> = ({ sessionA, options }) => {
  // Session B State
  const [sessionBData, setSessionBData] = useState<{
    summary: SessionSummary;
    frames: ProcessedEEGFrame[];
    filename: string;
  } | null>(null);

  const [isProcessingB, setIsProcessingB] = useState<boolean>(false);
  const [errorB, setErrorB] = useState<string | null>(null);

  // Streaming progress state for large CSV comparison files (e.g. 100MB+)
  const [streamProgressB, setStreamProgressB] = useState<{
    processedRows: number;
    percent: number;
    fileSizeMB: number;
    status: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'sensors' | 'wavebands' | 'timeseries' | 'clinical'
  >('overview');

  // Selected chart metric in timeseries view
  const [selectedChartMetric, setSelectedChartMetric] = useState<'focus' | 'calm' | 'faa' | 'alpha'>(
    'focus'
  );

  // AI LLM comparative enhancement state
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState<boolean>(false);
  const [dualAuditOutput, setDualAuditOutput] = useState<MultiStepAuditOutput | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Handler for uploading Session B CSV file (Handles 100MB+ Constant Interval CSV Files seamlessly)
  const handleSessionBUpload = (file: File) => {
    setIsProcessingB(true);
    setErrorB(null);

    const fileSizeMB = +(file.size / (1024 * 1024)).toFixed(1);
    const totalFileBytes = file.size;

    setStreamProgressB({
      processedRows: 0,
      percent: 0,
      fileSizeMB,
      status: `Initializing streaming parser for ${fileSizeMB} MB comparison file...`,
    });

    let accumulatedRows: RawMindMonitorRow[] = [];
    let rowCounter = 0;

    Papa.parse<RawMindMonitorRow>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      worker: true, // Non-blocking web-worker thread
      chunk: (results, parser) => {
        if (results.data && results.data.length > 0) {
          accumulatedRows.push(...results.data);
          rowCounter += results.data.length;

          // Estimate streaming percentage from cursor
          const cursor = (parser as any)._cursor || results.meta?.cursor || 0;
          const pct = Math.min(99, Math.round((cursor / totalFileBytes) * 100));

          setStreamProgressB({
            processedRows: rowCounter,
            percent: isNaN(pct) ? 50 : pct,
            fileSizeMB,
            status: `Streaming chunk: ${rowCounter.toLocaleString()} rows parsed (${pct}%)`,
          });
        }
      },
      complete: () => {
        setStreamProgressB({
          processedRows: rowCounter,
          percent: 100,
          fileSizeMB,
          status: `Downsampling ${rowCounter.toLocaleString()} rows for Session B comparison...`,
        });

        setTimeout(() => {
          try {
            if (accumulatedRows.length === 0) {
              setErrorB('Comparison CSV file contains no valid rows.');
              setIsProcessingB(false);
              setStreamProgressB(null);
              return;
            }

            const processed = processMindMonitorCSV(accumulatedRows, options);
            setSessionBData({
              summary: processed.summary,
              frames: processed.frames,
              filename: file.name,
            });
          } catch (err: any) {
            setErrorB(err.message || 'Error processing comparison CSV file.');
          } finally {
            setIsProcessingB(false);
            setStreamProgressB(null);
          }
        }, 30);
      },
      error: (err: any) => {
        setErrorB(`Failed to read file: ${err?.message || 'Parse error'}`);
        setIsProcessingB(false);
        setStreamProgressB(null);
      },
    });
  };

  // Handler to load built-in sample session B (synthesizes a second session with distinct task state)
  const handleLoadSampleSessionB = () => {
    setIsProcessingB(true);
    setErrorB(null);

    setTimeout(() => {
      try {
        if (!sessionA.frames || sessionA.frames.length === 0) {
          setErrorB('Session A must be loaded first.');
          setIsProcessingB(false);
          return;
        }

        // Generate Session B with higher Alpha, lower Beta on AF8, higher calm
        const modFrames: ProcessedEEGFrame[] = sessionA.frames.map((f, i) => {
          const calmBoost = Math.min(100, Math.round(f.calmScore * 1.25 + 12));
          const focusMod = Math.max(20, Math.round(f.focusScore * 0.9 + 5));
          const relAlphaMod = Math.min(70, +(f.relAlpha * 1.3).toFixed(1));
          const relBetaMod = Math.max(5, +(f.relBeta * 0.8).toFixed(1));
          const faaMod = +(f.frontalAsymmetry + 0.08).toFixed(3);

          return {
            ...f,
            calmScore: calmBoost,
            focusScore: focusMod,
            relAlpha: relAlphaMod,
            relBeta: relBetaMod,
            frontalAsymmetry: faaMod,
            channels: {
              ...f.channels,
              AF7: { ...f.channels.AF7, alpha: +(f.channels.AF7.alpha + 0.15).toFixed(2) },
              AF8: {
                ...f.channels.AF8,
                alpha: +(f.channels.AF8.alpha + 0.22).toFixed(2),
                beta: +(f.channels.AF8.beta - 0.12).toFixed(2),
              },
              TP9: { ...f.channels.TP9, theta: +(f.channels.TP9.theta + 0.18).toFixed(2) },
              TP10: { ...f.channels.TP10, alpha: +(f.channels.TP10.alpha + 0.20).toFixed(2) },
            },
          };
        });

        // Recalculate summary metrics for Session B
        const avgCalm = Math.round(modFrames.reduce((s, f) => s + f.calmScore, 0) / modFrames.length);
        const avgFocus = Math.round(modFrames.reduce((s, f) => s + f.focusScore, 0) / modFrames.length);
        const avgFAA = modFrames.reduce((s, f) => s + f.frontalAsymmetry, 0) / modFrames.length;

        const summaryB: SessionSummary = {
          ...sessionA.summary,
          avgCalm,
          avgFocus,
          avgFrontalAsymmetry: avgFAA,
          dominantWave: 'Alpha',
          timeInCalmPercent: Math.min(100, sessionA.summary.timeInCalmPercent + 25),
          timeInFocusPercent: Math.max(10, sessionA.summary.timeInFocusPercent - 10),
          keyInsights: [
            'Session B reflects post-biofeedback mental state with elevated Alpha dominance across frontal and temporal nodes.',
            'Frontal Alpha Asymmetry shifted positively (+0.08 Bels), indicating enhanced emotional equilibrium and left-frontal approach motivation.',
          ],
        };

        setSessionBData({
          summary: summaryB,
          frames: modFrames,
          filename: 'SessionB_PostIntervention_Sample.csv',
        });
      } catch (err: any) {
        setErrorB(`Sample generation error: ${err.message}`);
      } finally {
        setIsProcessingB(false);
      }
    }, 100);
  };

  // Clear Session B handler
  const handleClearSessionB = () => {
    setSessionBData(null);
    setDualAuditOutput(null);
  };

  // Compute comprehensive comparison result
  const comparisonResult: SessionComparisonResult | null = useMemo(() => {
    if (!sessionA || !sessionBData) return null;
    return compareEEGSessions(
      { summary: sessionA.summary, frames: sessionA.frames },
      { summary: sessionBData.summary, frames: sessionBData.frames }
    );
  }, [sessionA, sessionBData]);

  // AI LLM Comparative Analysis Trigger
  const handleRunAiComparison = async () => {
    if (!comparisonResult || !sessionBData) return;
    setIsGeneratingAiReport(true);
    setCurrentStepIndex(1);

    try {
      const apiKey = localStorage.getItem('eeg_ai_key') || '';
      const provider = (localStorage.getItem('eeg_ai_provider') as ProviderType) || 'openai';
      const baseUrl = localStorage.getItem('eeg_ai_baseUrl') || 'https://api.openai.com/v1';
      const model = localStorage.getItem('eeg_ai_model') || 'gpt-4o-mini';

      const output = await runDualSessionMultiStepAudit(
        sessionA,
        sessionBData,
        comparisonResult,
        { provider, apiKey, baseUrl, model },
        (_step, stepIdx) => {
          setCurrentStepIndex(stepIdx);
        }
      );

      setDualAuditOutput(output);
    } catch (err: any) {
      console.error('AI comparison failed', err);
    } finally {
      setIsGeneratingAiReport(false);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md transition-all space-y-5 sm:space-y-6">
      {/* Top Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-slate-800">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-gradient-to-tr from-cyan-600/30 via-indigo-600/30 to-purple-600/30 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-950/50 shrink-0 mt-0.5 sm:mt-0">
            <GitCompare className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Dual Session Comparative Analytics & Sensor Correlation
              </h3>
              <span className="px-2.5 py-0.5 text-[10px] sm:text-[11px] rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium flex items-center gap-1 shrink-0">
                <Brain className="w-3 h-3 text-cyan-400" /> 4-Sensor & 5-Waveband
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Upload a second EEG recording to perform deep cross-session sensor, spatial, and cognitive trajectory analysis.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        {sessionBData && (
          <button
            onClick={handleClearSessionB}
            className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition text-center"
          >
            Change / Remove Session B
          </button>
        )}
      </div>

      {/* Session B Upload Dropzone (When Session B is not yet loaded) */}
      {!sessionBData && (
        <div className="bg-slate-950/80 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 sm:p-8 text-center transition-all group">
          <div className="max-w-xl mx-auto space-y-4">
            <div className="p-3.5 sm:p-4 bg-slate-900 text-cyan-400 rounded-2xl w-12 h-12 sm:w-14 sm:h-14 mx-auto flex items-center justify-center border border-slate-800 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-bold text-white">Upload Second EEG Session CSV</h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Compare baseline vs post-meditation, focus interventions, or multi-day progress recordings.
              </p>
            </div>

            {/* Upload Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 pt-2">
              <label className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg cursor-pointer transition flex items-center justify-center gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Choose Second CSV File
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSessionBUpload(f);
                  }}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleLoadSampleSessionB}
                disabled={isProcessingB}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                {isProcessingB ? 'Processing Sample...' : 'Load Built-in Comparison Sample'}
              </button>
            </div>

            {/* Streaming Progress Bar */}
            {streamProgressB && (
              <div className="w-full space-y-2 pt-3 border-t border-slate-900">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span className="truncate max-w-[200px] sm:max-w-none">{streamProgressB.status}</span>
                  <span className="text-cyan-400 font-bold shrink-0">{streamProgressB.percent}%</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-200"
                    style={{ width: `${Math.max(5, streamProgressB.percent)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {errorB && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center justify-center gap-2 mt-3">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                {errorB}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Comparative View when Session B is Loaded */}
      {sessionBData && comparisonResult && (
        <div className="space-y-5 sm:space-y-6">
          {/* Active Session Status Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping mt-1 sm:mt-0 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                  Session A (Baseline)
                </span>
                <span className="text-xs font-semibold text-white truncate block">{sessionA.filename}</span>
                <div className="text-[11px] text-slate-400 mt-0.5 space-y-0.5">
                  <div>Duration: {sessionA.summary.totalDurationFormatted} | Quality: {sessionA.summary.dataQualityPercent}%</div>
                  {sessionA.summary.sessionDateFormatted && (
                    <div className="text-cyan-300 font-mono text-[10px]">
                      Recorded: {sessionA.summary.sessionDayOfWeek ? `${sessionA.summary.sessionDayOfWeek}, ` : ''}{sessionA.summary.sessionDateFormatted} {sessionA.summary.sessionTimeFormatted || ''}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start sm:items-center gap-3 md:border-l md:border-slate-800 md:pl-4 pt-2 md:pt-0 border-t md:border-t-0 border-slate-900">
              <div className="w-3 h-3 rounded-full bg-purple-400 animate-ping mt-1 sm:mt-0 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-mono text-purple-400 font-bold uppercase tracking-wider block">
                  Session B (Comparison)
                </span>
                <span className="text-xs font-semibold text-white truncate block">{sessionBData.filename}</span>
                <div className="text-[11px] text-slate-400 mt-0.5 space-y-0.5">
                  <div>Duration: {sessionBData.summary.totalDurationFormatted} | Quality: {sessionBData.summary.dataQualityPercent}%</div>
                  {sessionBData.summary.sessionDateFormatted && (
                    <div className="text-purple-300 font-mono text-[10px]">
                      Recorded: {sessionBData.summary.sessionDayOfWeek ? `${sessionBData.summary.sessionDayOfWeek}, ` : ''}{sessionBData.summary.sessionDateFormatted} {sessionBData.summary.sessionTimeFormatted || ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs - Touch-scrollable with responsive non-squishing short labels */}
          <div className="flex items-center gap-1.5 sm:gap-2 border-b border-slate-800 overflow-x-auto pb-2 scrollbar-none sm:scrollbar-thin scrollbar-thumb-slate-800">
            {COMPARISON_TABS.map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-950/40'
                      : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="inline sm:hidden">{t.shortLabel}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* ========================================================= */}
          {/* TAB 1: OVERVIEW & DELTAS */}
          {/* ========================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-5 sm:space-y-6">
              {/* Executive Summary Narrative */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" /> Comparative Neuro-State Synthesis
                </div>
                <div className="space-y-2">
                  {comparisonResult.executiveSummary.map((para, idx) => (
                    <p key={idx} className="text-xs text-slate-300 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              </div>

              {/* Side-by-Side Metric Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Focus Score */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Focus / Concentration
                  </span>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-500">Session A: </span>
                      <span className="text-sm font-bold text-slate-300 font-mono">
                        {comparisonResult.sessionAInfo.avgFocus}/100
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Session B: </span>
                      <span className="text-lg font-bold text-cyan-400 font-mono">
                        {comparisonResult.sessionBInfo.avgFocus}/100
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
                    <span className="text-slate-400 font-medium">Focus Delta:</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 ${
                        comparisonResult.overviewDeltas.focusDelta >= 0
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {comparisonResult.overviewDeltas.focusDelta >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />)}
                      {comparisonResult.overviewDeltas.focusDelta >= 0 ? '+' : ''}
                      {comparisonResult.overviewDeltas.focusDelta} pts
                    </span>
                  </div>
                </div>

                {/* Calm Score */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Relaxation / Calm Score
                  </span>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-500">Session A: </span>
                      <span className="text-sm font-bold text-slate-300 font-mono">
                        {comparisonResult.sessionAInfo.avgCalm}/100
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Session B: </span>
                      <span className="text-lg font-bold text-emerald-400 font-mono">
                        {comparisonResult.sessionBInfo.avgCalm}/100
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
                    <span className="text-slate-400 font-medium">Calm Delta:</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 ${
                        comparisonResult.overviewDeltas.calmDelta >= 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {comparisonResult.overviewDeltas.calmDelta >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />)}
                      {comparisonResult.overviewDeltas.calmDelta >= 0 ? '+' : ''}
                      {comparisonResult.overviewDeltas.calmDelta} pts
                    </span>
                  </div>
                </div>

                {/* Frontal Alpha Asymmetry (FAA) */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Frontal Asymmetry (AF8 - AF7)
                  </span>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-500">A: </span>
                      <span className="text-xs font-bold text-slate-300 font-mono">
                        {comparisonResult.sessionAInfo.faa.toFixed(2)} Bels
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">B: </span>
                      <span className="text-sm font-bold text-purple-400 font-mono">
                        {comparisonResult.sessionBInfo.faa.toFixed(2)} Bels
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
                    <span className="text-slate-400 font-medium">Hemispheric Delta:</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] ${
                        comparisonResult.overviewDeltas.faaDelta >= 0
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {comparisonResult.overviewDeltas.faaDelta >= 0 ? '+' : ''}
                      {comparisonResult.overviewDeltas.faaDelta.toFixed(3)} Bels
                    </span>
                  </div>
                </div>

                {/* Dominant Wave */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Dominant Brainwave Shift
                  </span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="px-2 py-1 rounded bg-slate-900 text-slate-300 border border-slate-800 font-bold font-mono">
                      {comparisonResult.sessionAInfo.dominantWave}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                    <span className="px-2.5 py-1 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold font-mono">
                      {comparisonResult.sessionBInfo.dominantWave}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                    {comparisonResult.sessionAInfo.dominantWave ===
                    comparisonResult.sessionBInfo.dominantWave
                      ? 'Preserved primary rhythm spectrum'
                      : 'Shift in fundamental cortical rhythm'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: 4-SENSOR SPATIAL CORRELATION */}
          {/* ========================================================= */}
          {activeTab === 'sensors' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-300 leading-relaxed flex items-start gap-3">
                <Info className="w-5 h-5 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-white mb-0.5">4-Sensor Topographic Correlation Engine</h4>
                  <p className="text-slate-400">
                    Mind Monitor records from 4 primary electrodes: <strong>AF7</strong> (Left Forehead),{' '}
                    <strong>AF8</strong> (Right Forehead), <strong>TP9</strong> (Left Ear/Temporal), and{' '}
                    <strong>TP10</strong> (Right Ear/Temporal). The cards below break down spectral changes and functional neuro-interpretations per channel.
                  </p>
                </div>
              </div>

              {/* 4 Sensor Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['AF7', 'AF8', 'TP9', 'TP10'] as const).map((ch) => {
                  const s = comparisonResult.sensorStats[ch];
                  return (
                    <div
                      key={ch}
                      className="bg-slate-950/90 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3.5 sm:space-y-4 hover:border-slate-700 transition"
                    >
                      {/* Sensor Card Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
                        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-bold shrink-0">
                            {s.name}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-white truncate">{s.label}</h4>
                            <span className="text-[10px] text-slate-400 truncate block">{s.region}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-500 block">Dominant</span>
                          <span className="text-xs font-mono font-bold text-cyan-400">
                            {s.dominantWaveA} → {s.dominantWaveB}
                          </span>
                        </div>
                      </div>

                      {/* Band Power Breakdown Rows (Mobile & Desktop Responsive) */}
                      <div className="space-y-1.5 sm:space-y-2 text-xs">
                        {(['alpha', 'beta', 'theta', 'delta', 'gamma'] as const).map((b) => {
                          const valA = s.sessionA[b];
                          const valB = s.sessionB[b];
                          const deltaVal = s.deltas[b];

                          return (
                            <div
                              key={b}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 font-mono gap-2"
                            >
                              <span className="text-slate-400 uppercase text-[10px] sm:text-[11px] font-semibold shrink-0">
                                {b}
                              </span>
                              <div className="flex items-center gap-1.5 sm:gap-3 text-[10px] sm:text-[11px] shrink-0">
                                <span className="text-slate-500">A: {valA.toFixed(2)}</span>
                                <span className="text-slate-300 font-bold">B: {valB.toFixed(2)}</span>
                                <span
                                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[10px] font-bold ${
                                    deltaVal > 0
                                      ? 'bg-cyan-500/20 text-cyan-300'
                                      : deltaVal < 0
                                      ? 'bg-amber-500/20 text-amber-300'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {deltaVal >= 0 ? '+' : ''}
                                  {deltaVal.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Deep Neuro Interpretation */}
                      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
                        <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider block">
                          Channel Neuro-Interpretation
                        </span>
                        <p className="text-xs text-slate-300 leading-relaxed">{s.interpretation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Regional Shift Card */}
              <div className="p-4 sm:p-5 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Compass className="w-4 h-4 text-purple-400 shrink-0" /> Regional Power Distribution Analysis
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs font-mono">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] sm:text-[11px] block">
                      Frontal vs Temporal Ratio (AF7+AF8 / TP9+TP10)
                    </span>
                    <div className="text-xs sm:text-sm font-bold text-cyan-400">
                      A: {comparisonResult.regional.frontalTemporalRatioA} | B:{' '}
                      {comparisonResult.regional.frontalTemporalRatioB}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <span className="text-slate-400 text-[10px] sm:text-[11px] block">
                      Hemispheric Lateralization (Left / Right Power)
                    </span>
                    <div className="text-xs sm:text-sm font-bold text-purple-400">
                      A: {comparisonResult.regional.hemisphericRatioA} | B:{' '}
                      {comparisonResult.regional.hemisphericRatioB}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {comparisonResult.regional.regionalShiftInterpretation}
                </p>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: 5-WAVEBAND MATRIX */}
          {/* ========================================================= */}
          {activeTab === 'wavebands' && (
            <div className="space-y-5 sm:space-y-6">
              {/* DESKTOP VIEW: Full 6-Column Matrix Table (Hidden on Mobile) */}
              <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/90">
                <table className="w-full text-left text-xs min-w-[680px]">
                  <thead className="bg-slate-900 text-slate-400 font-mono text-[11px] uppercase border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">Frequency Band</th>
                      <th className="p-3.5">Functional Role</th>
                      <th className="p-3.5">Session A %</th>
                      <th className="p-3.5">Session B %</th>
                      <th className="p-3.5">Relative Shift</th>
                      <th className="p-3.5">Spatial Focus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 font-mono">
                    {(['Alpha', 'Beta', 'Theta', 'Delta', 'Gamma'] as const).map((w) => {
                      const wb = comparisonResult.wavebandStats[w];
                      return (
                        <tr key={w} className="hover:bg-slate-900/50 transition">
                          <td className="p-3.5 font-bold text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
                            {wb.wave}
                            <span className="text-[10px] text-slate-500 font-normal">
                              ({wb.freqRange})
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-300 max-w-xs font-sans text-[11px]">
                            {wb.functionalRole}
                          </td>
                          <td className="p-3.5 text-slate-400">{wb.sessionAAvgRel.toFixed(1)}%</td>
                          <td className="p-3.5 font-bold text-cyan-300">{wb.sessionBAvgRel.toFixed(1)}%</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                wb.relDiff > 0
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : wb.relDiff < 0
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {wb.relDiff >= 0 ? '+' : ''}
                              {wb.relDiff}% ({wb.percentChange >= 0 ? '+' : ''}
                              {wb.percentChange}%)
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-300 font-sans text-[11px]">
                            {wb.spatialShiftDescription}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE VIEW: Mobile Card Stack (Hidden on Desktop) */}
              <div className="block md:hidden space-y-3">
                {(['Alpha', 'Beta', 'Theta', 'Delta', 'Gamma'] as const).map((w) => {
                  const wb = comparisonResult.wavebandStats[w];
                  return (
                    <div
                      key={w}
                      className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3 font-sans"
                    >
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shrink-0" />
                          <span className="text-sm font-bold text-white font-mono">{wb.wave}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({wb.freqRange})</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                            wb.relDiff > 0
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : wb.relDiff < 0
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {wb.relDiff >= 0 ? '+' : ''}{wb.relDiff}%
                        </span>
                      </div>

                      {/* Functional Role */}
                      <p className="text-xs text-slate-300 leading-relaxed">{wb.functionalRole}</p>

                      {/* Metrics Comparison Row */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Session A</span>
                          <span className="text-slate-300 font-semibold">{wb.sessionAAvgRel.toFixed(1)}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block uppercase">Session B</span>
                          <span className="text-cyan-300 font-bold">{wb.sessionBAvgRel.toFixed(1)}%</span>
                        </div>
                      </div>

                      {/* Spatial Shift Description */}
                      <div className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-1">
                        <span className="text-cyan-400 font-bold shrink-0">•</span>
                        <span>Spatial: {wb.spatialShiftDescription}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Cross Frequency Indices Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400 shrink-0" /> Cross-Frequency Biomarker Ratios
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {comparisonResult.ratios.map((r, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white truncate">{r.name}</span>
                        <span
                          className={`text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded shrink-0 ${
                            r.deltaVal >= 0 ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {r.deltaVal >= 0 ? '+' : ''}
                          {r.deltaVal} ({r.percentChange >= 0 ? '+' : ''}
                          {r.percentChange}%)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{r.description}</p>
                      <div className="flex justify-between items-center text-xs font-mono pt-2 border-t border-slate-900">
                        <span className="text-slate-500">Session A: {r.sessionAVal}</span>
                        <span className="text-cyan-400 font-bold">Session B: {r.sessionBVal}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: OVERLAID TIME-SERIES */}
          {/* ========================================================= */}
          {activeTab === 'timeseries' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-300">
                  Select Metric Overlay to Compare Across Time:
                </span>
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-2 font-mono text-xs w-full sm:w-auto">
                  {[
                    { id: 'focus', label: 'Focus Trajectory', shortLabel: 'Focus' },
                    { id: 'calm', label: 'Calm Trajectory', shortLabel: 'Calm' },
                    { id: 'faa', label: 'Frontal Asymmetry', shortLabel: 'FAA' },
                    { id: 'alpha', label: 'Alpha Power %', shortLabel: 'Alpha %' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSelectedChartMetric(m.id as any)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg border transition text-center ${
                        selectedChartMetric === m.id
                          ? 'bg-cyan-600 border-cyan-500 text-white font-bold'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="inline sm:hidden">{m.shortLabel}</span>
                      <span className="hidden sm:inline">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chart Container */}
              <div className="h-60 sm:h-72 w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-2 sm:p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comparisonResult.timeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="timeFormatted"
                      stroke="#64748b"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                    {selectedChartMetric === 'focus' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="focusA"
                          name={`Session A Focus (${sessionA.filename})`}
                          stroke="#38bdf8"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="focusB"
                          name={`Session B Focus (${sessionBData.filename})`}
                          stroke="#c084fc"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      </>
                    )}

                    {selectedChartMetric === 'calm' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="calmA"
                          name={`Session A Calm (${sessionA.filename})`}
                          stroke="#34d399"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="calmB"
                          name={`Session B Calm (${sessionBData.filename})`}
                          stroke="#f472b6"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      </>
                    )}

                    {selectedChartMetric === 'faa' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="faaA"
                          name={`Session A FAA (${sessionA.filename})`}
                          stroke="#a78bfa"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="faaB"
                          name={`Session B FAA (${sessionBData.filename})`}
                          stroke="#facc15"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      </>
                    )}

                    {selectedChartMetric === 'alpha' && (
                      <>
                        <Line
                          type="monotone"
                          dataKey="alphaA"
                          name={`Session A Alpha % (${sessionA.filename})`}
                          stroke="#22d3ee"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="alphaB"
                          name={`Session B Alpha % (${sessionBData.filename})`}
                          stroke="#fb923c"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: CLINICAL TAKEAWAYS */}
          {/* ========================================================= */}
          {activeTab === 'clinical' && (
            <div className="space-y-5 sm:space-y-6">
              {/* Recommendations Box */}
              <div className="p-4 sm:p-5 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Actionable Biofeedback Protocol Takeaways
                </h4>
                <ul className="space-y-2">
                  {comparisonResult.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI Deep Comparative Report Generator */}
              {dualAuditOutput || isGeneratingAiReport ? (
                <MultiStepAuditDisplay
                  auditOutput={dualAuditOutput!}
                  isAnalyzing={isGeneratingAiReport}
                  currentStepIndex={currentStepIndex}
                  onReRun={handleRunAiComparison}
                  title="Dual Session Progressive Multi-Step AI Neural Audit"
                  subtitle="5-Step clinical comparative evaluation of signal baselines, 4-sensor spatial deltas, hemispheric valence, overall shift, and protocol adaptation."
                />
              ) : (
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400 fill-current shrink-0" /> AI Comparative Neural Assessment
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Initiate a 5-step progressive AI neural audit comparing Session A and Session B.
                      </p>
                    </div>

                    <button
                      onClick={handleRunAiComparison}
                      disabled={isGeneratingAiReport}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Run AI Comparative Audit
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
