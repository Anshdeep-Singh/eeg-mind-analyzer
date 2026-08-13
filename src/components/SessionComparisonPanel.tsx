'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Papa from 'papaparse';
import { ProcessedEEGFrame, SessionSummary, RawMindMonitorRow, ProcessingOptions } from '../types/eeg';
import { processMindMonitorCSV } from '../utils/eegProcessor';
import { compareEEGSessions, SessionComparisonResult, ComparisonAlignmentOptions } from '../utils/sessionComparator';
import { runDualSessionMultiStepAudit, MultiStepAuditOutput, ProviderType } from '../utils/llmClient';
import { MultiStepAuditDisplay } from './MultiStepAuditDisplay';
import { generateComparativeReportPDF } from '../utils/pdfGenerator';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
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
  Sliders,
  Filter,
  Tag,
  Eye,
  Scissors,
  Play,
  Pause,
  RotateCcw,
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
  { id: 'visual', label: '4. Visual Wave Analysis', shortLabel: '4. Visual Analysis', icon: Zap },
  { id: 'timeseries', label: '5. Overlaid Time-Series', shortLabel: '5. Time-Series', icon: Activity },
  { id: 'clinical', label: '6. Deep Clinical Takeaways', shortLabel: '6. Clinical', icon: Award },
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

  // Streaming progress state for large CSV comparison files
  const [streamProgressB, setStreamProgressB] = useState<{
    processedRows: number;
    percent: number;
    fileSizeMB: number;
    status: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<
    'overview' | 'sensors' | 'wavebands' | 'visual' | 'timeseries' | 'clinical'
  >('overview');

  // Unequal session length alignment state
  const [alignmentMode, setAlignmentMode] = useState<'trim' | 'window' | 'normalized'>('trim');
  const [windowOffsetSecA, setWindowOffsetSecA] = useState<number>(0);
  const [windowOffsetSecB, setWindowOffsetSecB] = useState<number>(0);
  const [windowDurationSec, setWindowDurationSec] = useState<number>(300);

  // Visual Wave & Sensor Filtering state
  const [selectedVisualSensor, setSelectedVisualSensor] = useState<'ALL' | 'AF7' | 'AF8' | 'TP9' | 'TP10'>('ALL');
  const [selectedVisualWave, setSelectedVisualWave] = useState<'alpha' | 'beta' | 'theta' | 'delta' | 'gamma'>('alpha');

  // Visual Analysis Time-Series Playback & Oscilloscope State
  const [isPlayingVisual, setIsPlayingVisual] = useState<boolean>(false);
  const [visualFrameIdx, setVisualFrameIdx] = useState<number>(0);
  const [visualSpeed, setVisualSpeed] = useState<number>(1);
  const [visualWindowScopeSec, setVisualWindowScopeSec] = useState<number>(30); // 15s, 30s, 60s, 0 (Full)
  const [visualChartType, setVisualChartType] = useState<'lines' | 'area'>('lines');

  // Selected chart metric in general timeseries view
  const [selectedChartMetric, setSelectedChartMetric] = useState<'focus' | 'calm' | 'faa' | 'alpha'>(
    'focus'
  );

  // AI LLM comparative enhancement state
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState<boolean>(false);
  const [dualAuditOutput, setDualAuditOutput] = useState<MultiStepAuditOutput | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  // Handler for uploading Session B CSV file
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
      worker: true,
      chunk: (results, parser) => {
        if (results.data && results.data.length > 0) {
          accumulatedRows.push(...results.data);
          rowCounter += results.data.length;

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

            // Set default window duration to shortest session duration
            const durA = sessionA.frames.length > 0 ? sessionA.frames[sessionA.frames.length - 1].timeSec : 300;
            const durB = processed.frames.length > 0 ? processed.frames[processed.frames.length - 1].timeSec : 300;
            setWindowDurationSec(Math.min(durA, durB));
          } catch (err: any) {
            setErrorB(err.message || 'Error processing comparison CSV file.');
          } font: {
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

  // Handler to load sample Session B
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
            'Frontal Alpha Asymmetry shifted positively (+0.08 Bels), indicating enhanced emotional equilibrium.',
          ],
        };

        setSessionBData({
          summary: summaryB,
          frames: modFrames,
          filename: 'SessionB_PostIntervention_Sample.csv',
        });

        const dur = modFrames.length > 0 ? modFrames[modFrames.length - 1].timeSec : 300;
        setWindowDurationSec(dur);
      } catch (err: any) {
        setErrorB(`Sample generation error: ${err.message}`);
      } finally {
        setIsProcessingB(false);
      }
    }, 100);
  };

  const handleClearSessionB = () => {
    setSessionBData(null);
    setDualAuditOutput(null);
  };

  // Compute comparison result with alignment options
  const comparisonResult: SessionComparisonResult | null = useMemo(() => {
    if (!sessionA || !sessionBData) return null;
    return compareEEGSessions(
      { summary: sessionA.summary, frames: sessionA.frames },
      { summary: sessionBData.summary, frames: sessionBData.frames },
      {
        alignmentMode,
        windowOffsetSecA,
        windowOffsetSecB,
        windowDurationSec,
      }
    );
  }, [
    sessionA,
    sessionBData,
    alignmentMode,
    windowOffsetSecA,
    windowOffsetSecB,
    windowDurationSec,
  ]);

  // Playback timer for Visual Analysis tab time-series player
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlayingVisual && comparisonResult?.timeSeriesData?.length) {
      timer = setInterval(() => {
        setVisualFrameIdx((prev) => {
          if (prev >= (comparisonResult.timeSeriesData.length - 1)) {
            setIsPlayingVisual(false);
            return 0;
          }
          return prev + 1;
        });
      }, 300 / visualSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlayingVisual, visualSpeed, comparisonResult?.timeSeriesData?.length]);

  // Compute sliding window scope for visual oscilloscope view
  const visualSlidingData = useMemo(() => {
    if (!comparisonResult?.timeSeriesData || comparisonResult.timeSeriesData.length === 0) return [];
    if (visualWindowScopeSec === 0) return comparisonResult.timeSeriesData;

    const totalData = comparisonResult.timeSeriesData;
    const totalCount = totalData.length;
    const maxTimeSec = totalData[totalCount - 1]?.timeSec || totalCount;

    const activeFrame = totalData[visualFrameIdx] || totalData[0];
    const currentSec = activeFrame?.timeSec ?? visualFrameIdx;

    const halfScope = visualWindowScopeSec / 2;
    let startSec = currentSec - halfScope;
    let endSec = currentSec + halfScope;

    if (startSec < 0) {
      startSec = 0;
      endSec = Math.min(maxTimeSec, visualWindowScopeSec);
    } else if (endSec > maxTimeSec) {
      endSec = maxTimeSec;
      startSec = Math.max(0, maxTimeSec - visualWindowScopeSec);
    }

    const filtered = totalData.filter(
      (d) => (d.timeSec ?? 0) >= startSec && (d.timeSec ?? 0) <= endSec
    );

    if (filtered.length >= 2) {
      return filtered;
    }

    // Index-proportionate slicing fallback (ensures 15s / 30s / 60s windows ALWAYS zoom properly)
    const ratio = visualWindowScopeSec / Math.max(1, maxTimeSec);
    const targetPoints = Math.max(15, Math.floor(totalCount * ratio));
    const halfPts = Math.floor(targetPoints / 2);

    let startIdx = Math.max(0, visualFrameIdx - halfPts);
    let endIdx = Math.min(totalCount, startIdx + targetPoints);
    if (endIdx - startIdx < targetPoints) {
      startIdx = Math.max(0, endIdx - targetPoints);
    }

    return totalData.slice(startIdx, endIdx);
  }, [comparisonResult?.timeSeriesData, visualFrameIdx, visualWindowScopeSec]);

  // Compute fixed Y-axis upper limit based on max value in full dataset + 5 (prevents Y-axis jumps during scrubbing)
  const visualYAxisMax = useMemo(() => {
    if (!comparisonResult?.timeSeriesData || comparisonResult.timeSeriesData.length === 0) return 60;

    const keyA = selectedVisualSensor === 'ALL' ? `all_${selectedVisualWave}A` : `${selectedVisualSensor}_${selectedVisualWave}A`;
    const keyB = selectedVisualSensor === 'ALL' ? `all_${selectedVisualWave}B` : `${selectedVisualSensor}_${selectedVisualWave}B`;

    let maxVal = 0;
    comparisonResult.timeSeriesData.forEach((row: any) => {
      const valA = row[keyA];
      const valB = row[keyB];
      if (typeof valA === 'number' && !isNaN(valA) && valA > maxVal) maxVal = valA;
      if (typeof valB === 'number' && !isNaN(valB) && valB > maxVal) maxVal = valB;
    });

    if (maxVal === 0) return 60;
    // Max value + 5, rounded up to nearest 5 for clean ticks
    return Math.ceil((maxVal + 5) / 5) * 5;
  }, [comparisonResult?.timeSeriesData, selectedVisualSensor, selectedVisualWave]);

  // Compute fixed Y-axis domain for general timeseries tab
  const timeseriesYAxisDomain = useMemo(() => {
    if (!comparisonResult?.timeSeriesData || comparisonResult.timeSeriesData.length === 0) return [0, 100];
    if (selectedChartMetric === 'focus' || selectedChartMetric === 'calm') return [0, 100];

    const keyA = selectedChartMetric === 'faa' ? 'faaA' : 'all_alphaA';
    const keyB = selectedChartMetric === 'faa' ? 'faaB' : 'all_alphaB';

    let maxVal = -Infinity;
    let minVal = Infinity;
    comparisonResult.timeSeriesData.forEach((row: any) => {
      [row[keyA], row[keyB]].forEach((v) => {
        if (typeof v === 'number' && !isNaN(v)) {
          if (v > maxVal) maxVal = v;
          if (v < minVal) minVal = v;
        }
      });
    });

    if (selectedChartMetric === 'faa') {
      const pad = 0.1;
      return [
        +(Math.floor((minVal - pad) * 10) / 10).toFixed(1),
        +(Math.ceil((maxVal + pad) * 10) / 10).toFixed(1),
      ];
    }

    const ceiling = Math.ceil((maxVal + 5) / 5) * 5;
    return [0, Math.max(10, ceiling)];
  }, [comparisonResult?.timeSeriesData, selectedChartMetric]);

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

  // Export Dual Session Comparative PDF
  const handleExportComparativePdf = () => {
    if (!comparisonResult || !sessionBData) return;
    generateComparativeReportPDF({
      reportId: dualAuditOutput?.reportId || `CMP-${Date.now().toString().slice(-6)}`,
      generatedAt: dualAuditOutput?.generatedAt || new Date().toLocaleString(),
      sessionA,
      sessionB: sessionBData,
      comparisonResult,
      auditOutput: dualAuditOutput,
    });
  };

  // Duration calculations for alignment bar
  const durAOrig = sessionA.frames.length > 0 ? sessionA.frames[sessionA.frames.length - 1].timeSec : 0;
  const durBOrig = sessionBData?.frames && sessionBData.frames.length > 0 ? sessionBData.frames[sessionBData.frames.length - 1].timeSec : 0;
  const isUnequalLength = sessionBData ? Math.abs(durAOrig - durBOrig) > 5 : false;

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
                Session Comparison
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
              <h4 className="text-sm sm:text-base font-bold text-white">Select or Drag Session B CSV File</h4>
              <p className="text-xs text-slate-400 mt-1">
                Upload a second recording (e.g. post-meditation, post-work, or alternate day session) to enable dual-session analytics.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <label className="cursor-pointer px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-950/50 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Browse Comparison CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => e.target.files?.[0] && handleSessionBUpload(e.target.files[0])}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSampleSessionB}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Load Sample Session B</span>
              </button>
            </div>

            {streamProgressB && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-left text-xs">
                <div className="flex justify-between font-mono text-[11px] text-cyan-400 font-bold">
                  <span>{streamProgressB.status}</span>
                  <span>{streamProgressB.percent}%</span>
                </div>
                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full transition-all duration-150"
                    style={{ width: `${streamProgressB.percent}%` }}
                  />
                </div>
              </div>
            )}

            {errorB && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2 text-left">
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
          {/* Active Session Status & Alignment Bar */}
          <div className="space-y-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping mt-1 sm:mt-0 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider block">
                    Session A (Baseline)
                  </span>
                  <span className="text-xs font-semibold text-white truncate block">{sessionA.filename}</span>
                  <div className="text-[11px] text-slate-400 mt-0.5 space-y-0.5">
                    <div>Duration: {sessionA.summary.totalDurationFormatted} ({Math.floor(durAOrig)}s) | Quality: {sessionA.summary.dataQualityPercent}%</div>
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
                    <div>Duration: {sessionBData.summary.totalDurationFormatted} ({Math.floor(durBOrig)}s) | Quality: {sessionBData.summary.dataQualityPercent}%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Session Length & Window Alignment Bar */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-300">Comparison Window Alignment:</span>
                {isUnequalLength && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-mono">
                    Unequal Lengths ({Math.floor(durAOrig / 60)}m vs {Math.floor(durBOrig / 60)}m)
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setAlignmentMode('trim')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                    alignmentMode === 'trim'
                      ? 'bg-cyan-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>✂️ Trim to Shortest ({Math.floor(Math.min(durAOrig, durBOrig))}s)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAlignmentMode('window')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                    alignmentMode === 'window'
                      ? 'bg-indigo-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sliders className="w-3 h-3" />
                  <span>Custom Window Slider</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAlignmentMode('normalized')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                    alignmentMode === 'normalized'
                      ? 'bg-purple-600 text-white font-bold shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>📊 Relative Progress (0-100%)</span>
                </button>
              </div>
            </div>

            {/* Custom Window Controls when 'window' mode is selected */}
            {alignmentMode === 'window' && (
              <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">
                      Session B Start Offset: <span className="text-cyan-400 font-mono font-bold">{Math.floor(windowOffsetSecB)}s</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, durBOrig - 30)}
                      value={windowOffsetSecB}
                      onChange={(e) => setWindowOffsetSecB(Number(e.target.value))}
                      className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-1">
                      Comparison Window Length: <span className="text-cyan-400 font-mono font-bold">{Math.floor(windowDurationSec)}s</span>
                    </label>
                    <input
                      type="range"
                      min={30}
                      max={Math.min(durAOrig, durBOrig)}
                      value={windowDurationSec}
                      onChange={(e) => setWindowDurationSec(Number(e.target.value))}
                      className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  {comparisonResult.alignmentInfo.description}
                </p>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
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
                        <ArrowDownRight className="w-3 h-3" />
                      )}
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
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {comparisonResult.overviewDeltas.calmDelta >= 0 ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {comparisonResult.overviewDeltas.calmDelta >= 0 ? '+' : ''}
                      {comparisonResult.overviewDeltas.calmDelta} pts
                    </span>
                  </div>
                </div>

                {/* FAA Index */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Frontal Asymmetry (FAA)
                  </span>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-500">A: </span>
                      <span className="text-xs font-bold text-slate-300 font-mono">
                        {comparisonResult.sessionAInfo.faa} Bels
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">B: </span>
                      <span className="text-sm font-bold text-purple-400 font-mono">
                        {comparisonResult.sessionBInfo.faa} Bels
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
                    <span className="text-slate-400 font-medium">Valence Shift:</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 ${
                        comparisonResult.overviewDeltas.faaDelta >= 0
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {comparisonResult.overviewDeltas.faaDelta >= 0 ? '+' : ''}
                      {comparisonResult.overviewDeltas.faaDelta} Bels
                    </span>
                  </div>
                </div>

                {/* Cognitive Load */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                    Mental Workload / Fatigue
                  </span>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs text-slate-500">Session A: </span>
                      <span className="text-sm font-bold text-slate-300 font-mono">
                        {comparisonResult.sessionAInfo.avgCognitiveLoad}/100
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Session B: </span>
                      <span className="text-lg font-bold text-amber-400 font-mono">
                        {comparisonResult.sessionBInfo.avgCognitiveLoad}/100
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-900">
                    <span className="text-slate-400 font-medium">Workload Delta:</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 ${
                        comparisonResult.overviewDeltas.loadDelta <= 0
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {comparisonResult.overviewDeltas.loadDelta >= 0 ? '+' : ''}
                      {comparisonResult.overviewDeltas.loadDelta} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: 4-SENSOR SPATIAL CORRELATION */}
          {/* ========================================================= */}
          {activeTab === 'sensors' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['AF7', 'AF8', 'TP9', 'TP10'] as const).map((chKey) => {
                  const sStats = comparisonResult.sensorStats[chKey];
                  return (
                    <div key={chKey} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-cyan-400 font-mono">{sStats.name}</span>
                          <span className="text-xs font-semibold text-white ml-2">{sStats.label}</span>
                          <span className="text-[10px] text-slate-400 block">{sStats.region}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Dominant Wave</span>
                          <span className="text-xs font-mono font-bold text-purple-300">
                            {sStats.dominantWaveA} ➔ {sStats.dominantWaveB}
                          </span>
                        </div>
                      </div>

                      {/* Band Deltas Table */}
                      <div className="grid grid-cols-5 gap-1.5 text-center bg-slate-900 p-2 rounded-lg border border-slate-800/80 text-[11px] font-mono">
                        <div>
                          <span className="text-slate-400 text-[10px] block font-sans">Delta</span>
                          <span className={sStats.deltas.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {sStats.deltas.delta >= 0 ? '+' : ''}{sStats.deltas.delta}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-sans">Theta</span>
                          <span className={sStats.deltas.theta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {sStats.deltas.theta >= 0 ? '+' : ''}{sStats.deltas.theta}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-sans">Alpha</span>
                          <span className={sStats.deltas.alpha >= 0 ? 'text-cyan-400 font-bold' : 'text-rose-400'}>
                            {sStats.deltas.alpha >= 0 ? '+' : ''}{sStats.deltas.alpha}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-sans">Beta</span>
                          <span className={sStats.deltas.beta >= 0 ? 'text-amber-400' : 'text-emerald-400'}>
                            {sStats.deltas.beta >= 0 ? '+' : ''}{sStats.deltas.beta}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] block font-sans">Gamma</span>
                          <span className={sStats.deltas.gamma >= 0 ? 'text-purple-400' : 'text-rose-400'}>
                            {sStats.deltas.gamma >= 0 ? '+' : ''}{sStats.deltas.gamma}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/50">
                        {sStats.interpretation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: 5-WAVEBAND MATRIX */}
          {/* ========================================================= */}
          {activeTab === 'wavebands' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(['Delta', 'Theta', 'Alpha', 'Beta', 'Gamma'] as const).map((wKey) => {
                  const wStats = comparisonResult.wavebandStats[wKey];
                  return (
                    <div key={wKey} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{wStats.wave} Band</span>
                        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-800/50">
                          {wStats.freqRange}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2.5 rounded-lg text-left items-baseline">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Session A Avg:</span>
                          <span className="text-xs font-mono font-bold text-slate-300">
                            {typeof wStats.sessionAAvgRel === 'number' ? wStats.sessionAAvgRel.toFixed(1) : wStats.sessionAAvgRel}%
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-400 block">Session B Avg:</span>
                          <span className="text-xs font-mono font-bold text-cyan-300">
                            {typeof wStats.sessionBAvgRel === 'number' ? wStats.sessionBAvgRel.toFixed(1) : wStats.sessionBAvgRel}%
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-400 block">Shift Delta:</span>
                          <span className={`text-xs font-mono font-bold ${wStats.relDiff >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {wStats.relDiff >= 0 ? '+' : ''}{typeof wStats.relDiff === 'number' ? wStats.relDiff.toFixed(1) : wStats.relDiff}%
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {wStats.spatialShiftDescription}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: VISUAL WAVE ANALYSIS (INTERACTIVE WAVE & SENSOR FILTERING) */}
          {/* ========================================================= */}
          {activeTab === 'visual' && (
            <div className="space-y-5">
              {/* Filter Controls Header */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Interactive Visual Wave & Sensor Filter
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Filter frequency waves and sensor locations to isolate cross-session spectral activity
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Waveband Filter */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      1. Select Frequency Waveband:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'alpha', label: 'Alpha (7.5-13Hz)', color: 'text-cyan-400' },
                        { id: 'beta', label: 'Beta (13-30Hz)', color: 'text-amber-400' },
                        { id: 'theta', label: 'Theta (4-8Hz)', color: 'text-purple-400' },
                        { id: 'delta', label: 'Delta (1-4Hz)', color: 'text-emerald-400' },
                        { id: 'gamma', label: 'Gamma (30-44Hz)', color: 'text-indigo-400' },
                      ].map((wb) => (
                        <button
                          key={wb.id}
                          type="button"
                          onClick={() => setSelectedVisualWave(wb.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            selectedVisualWave === wb.id
                              ? 'bg-cyan-600 text-white font-bold shadow'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          {wb.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sensor Filter */}
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                      2. Select EEG Sensor Node:
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'ALL', label: 'All 4 Sensors (Average)' },
                        { id: 'AF7', label: 'AF7 (Left Forehead)' },
                        { id: 'AF8', label: 'AF8 (Right Forehead)' },
                        { id: 'TP9', label: 'TP9 (Left Ear)' },
                        { id: 'TP10', label: 'TP10 (Right Ear)' },
                      ].map((sn) => (
                        <button
                          key={sn.id}
                          type="button"
                          onClick={() => setSelectedVisualSensor(sn.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                            selectedVisualSensor === sn.id
                              ? 'bg-purple-600 text-white font-bold shadow'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                          }`}
                        >
                          {sn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Frame or Overall Brain Shift Tags */}
              {(() => {
                const activeFrame = comparisonResult.timeSeriesData[visualFrameIdx] || comparisonResult.timeSeriesData[0];
                const keyA = selectedVisualSensor === 'ALL' ? `all_${selectedVisualWave}A` : `${selectedVisualSensor}_${selectedVisualWave}A`;
                const keyB = selectedVisualSensor === 'ALL' ? `all_${selectedVisualWave}B` : `${selectedVisualSensor}_${selectedVisualWave}B`;
                const valA = activeFrame ? (activeFrame[keyA as keyof typeof activeFrame] as number | undefined) : undefined;
                const valB = activeFrame ? (activeFrame[keyB as keyof typeof activeFrame] as number | undefined) : undefined;
                const deltaVal = typeof valA === 'number' && typeof valB === 'number' ? +(valB - valA).toFixed(1) : undefined;

                return (
                  <div className="p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/30 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                        <Tag className={`w-4 h-4 text-cyan-300 ${isPlayingVisual ? 'animate-pulse' : ''}`} />
                        {isPlayingVisual || visualFrameIdx > 0 ? (
                          <span>Live Frame Delta Tag (at {activeFrame?.timeFormatted || '0s'}) — {selectedVisualSensor} / {selectedVisualWave.toUpperCase()}</span>
                        ) : (
                          <span>Filtered Session Brain Shift Tags ({selectedVisualSensor} - {selectedVisualWave.toUpperCase()})</span>
                        )}
                      </div>
                      {(isPlayingVisual || visualFrameIdx > 0) && (
                        <button
                          type="button"
                          onClick={() => { setIsPlayingVisual(false); setVisualFrameIdx(0); }}
                          className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset to Overall View
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isPlayingVisual || visualFrameIdx > 0 ? (
                        <>
                          <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5">
                            🏷️ Session A {selectedVisualWave.toUpperCase()}: {valA !== undefined ? valA : 'N/A'}
                          </span>
                          <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5">
                            🏷️ Session B {selectedVisualWave.toUpperCase()}: {valB !== undefined ? valB : 'N/A'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
                            deltaVal !== undefined && deltaVal >= 0
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}>
                            🏷️ Live Shift Delta: {deltaVal !== undefined ? (deltaVal >= 0 ? '+' : '') + deltaVal : 'N/A'}
                          </span>
                        </>
                      ) : (
                        selectedVisualSensor === 'ALL' ? (
                          <>
                            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5">
                              🏷️ Overall {selectedVisualWave.toUpperCase()} Shift: {comparisonResult.wavebandStats[selectedVisualWave.charAt(0).toUpperCase() + selectedVisualWave.slice(1) as keyof typeof comparisonResult.wavebandStats]?.relDiff >= 0 ? '+' : ''}{comparisonResult.wavebandStats[selectedVisualWave.charAt(0).toUpperCase() + selectedVisualWave.slice(1) as keyof typeof comparisonResult.wavebandStats]?.relDiff}%
                            </span>
                            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5">
                              🏷️ Primary Rhythm: Session A ({comparisonResult.sessionAInfo.dominantWave}) ➔ Session B ({comparisonResult.sessionBInfo.dominantWave})
                            </span>
                            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5">
                              🏷️ FAA Valence Shift: {comparisonResult.overviewDeltas.faaDelta >= 0 ? '+' : ''}{comparisonResult.overviewDeltas.faaDelta} Bels
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5">
                              🏷️ {selectedVisualSensor} {selectedVisualWave.toUpperCase()} Shift: {comparisonResult.sensorStats[selectedVisualSensor].deltas[selectedVisualWave] >= 0 ? '+' : ''}{comparisonResult.sensorStats[selectedVisualSensor].deltas[selectedVisualWave]} Bels
                            </span>
                            <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5">
                              🏷️ Node Rhythm Transition: {comparisonResult.sensorStats[selectedVisualSensor].dominantWaveA} ➔ {comparisonResult.sensorStats[selectedVisualSensor].dominantWaveB}
                            </span>
                          </>
                        )
                      )}
                      <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono">
                        Alignment: {comparisonResult.alignmentInfo.mode.toUpperCase()} ({Math.floor(comparisonResult.alignmentInfo.durAAlignedSec)}s)
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Overlaid Waveband Time-Series Line Chart with ECG Oscilloscope Controls */}
              <div className="bg-slate-950 p-4 sm:p-5 rounded-2xl border border-cyan-500/30 space-y-4 shadow-2xl">
                {/* Header & Mode Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                      EEG Oscilloscope Wave Trajectory: Session A vs Session B
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Real-time rolling signal for {selectedVisualWave.toUpperCase()} wave activity on sensor {selectedVisualSensor}
                    </span>
                  </div>

                  {/* Play, Pause, Reset & Speed */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlayingVisual(!isPlayingVisual)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow ${
                        isPlayingVisual
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      }`}
                    >
                      {isPlayingVisual ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlayingVisual ? 'Pause' : 'Play Live Trajectory'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPlayingVisual(false);
                        setVisualFrameIdx(0);
                      }}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs transition"
                      title="Reset Cursor to Start"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Playback speed selector */}
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      {[1, 2, 5, 10].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setVisualSpeed(spd)}
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                            visualSpeed === spd
                              ? 'bg-cyan-500 text-slate-950'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scope & Trace Options Toolbar */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Window Scope Selector (Sliding Scope Options) */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold text-[11px]">Sliding Scope:</span>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      {[
                        { label: '15s Window', value: 15 },
                        { label: '30s Window', value: 30 },
                        { label: '60s Window', value: 60 },
                        { label: 'Full Session', value: 0 },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setVisualWindowScopeSec(opt.value)}
                          className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition ${
                            visualWindowScopeSec === opt.value
                              ? 'bg-cyan-600 text-white font-bold shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Trace Style Switcher */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold text-[11px]">Trace Style:</span>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setVisualChartType('lines')}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition ${
                          visualChartType === 'lines'
                            ? 'bg-purple-600 text-white font-bold shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Oscilloscope Traces
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisualChartType('area')}
                        className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition ${
                          visualChartType === 'area'
                            ? 'bg-purple-600 text-white font-bold shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Spectral Banding
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scrubber Range Bar */}
                <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1 text-cyan-400 font-bold">
                      <Zap className="w-3 h-3" /> Time Cursor: {comparisonResult.timeSeriesData[visualFrameIdx]?.timeFormatted || '0s'}
                    </span>
                    <span>
                      Scope: {visualWindowScopeSec === 0 ? 'Full Overview' : `${visualWindowScopeSec}s Window`} ({visualSlidingData.length} pts)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, comparisonResult.timeSeriesData.length - 1)}
                    value={visualFrameIdx}
                    onChange={(e) => {
                      setIsPlayingVisual(false);
                      setVisualFrameIdx(Number(e.target.value));
                    }}
                    className="w-full accent-cyan-400 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Oscilloscope Chart Display */}
                <div className="h-64 sm:h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {visualChartType === 'area' ? (
                      <AreaChart data={visualSlidingData}>
                        <defs>
                          <linearGradient id="glowSessionA" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="glowSessionB" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis
                          stroke="#64748b"
                          domain={[0, visualYAxisMax]}
                          tickFormatter={(val) => `${Math.round(val)}%`}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                          itemStyle={{ fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                        {comparisonResult.timeSeriesData[visualFrameIdx] && (
                          <ReferenceLine
                            x={comparisonResult.timeSeriesData[visualFrameIdx].timeFormatted}
                            stroke="#38bdf8"
                            strokeWidth={2.5}
                            label={{ value: '▶ SWEEP', fill: '#38bdf8', fontSize: 10, fontWeight: 'bold' }}
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey={selectedVisualSensor === 'ALL' ? `all_${selectedVisualWave}A` : `${selectedVisualSensor}_${selectedVisualWave}A`}
                          name={`Session A (${selectedVisualWave.toUpperCase()})`}
                          stroke="#06b6d4"
                          fill="url(#glowSessionA)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                        <Area
                          type="monotone"
                          dataKey={selectedVisualSensor === 'ALL' ? `all_${selectedVisualWave}B` : `${selectedVisualSensor}_${selectedVisualWave}B`}
                          name={`Session B (${selectedVisualWave.toUpperCase()})`}
                          stroke="#a855f7"
                          fill="url(#glowSessionB)"
                          strokeWidth={2}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    ) : (
                      <LineChart data={visualSlidingData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 10 }} />
                        <YAxis
                          stroke="#64748b"
                          domain={[0, visualYAxisMax]}
                          tickFormatter={(val) => `${Math.round(val)}%`}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                          itemStyle={{ fontSize: '11px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                        {comparisonResult.timeSeriesData[visualFrameIdx] && (
                          <ReferenceLine
                            x={comparisonResult.timeSeriesData[visualFrameIdx].timeFormatted}
                            stroke="#38bdf8"
                            strokeWidth={2.5}
                            label={{ value: '▶ SWEEP', fill: '#38bdf8', fontSize: 10, fontWeight: 'bold' }}
                          />
                        )}
                        <Line
                          type="monotone"
                          dataKey={selectedVisualSensor === 'ALL' ? `all_${selectedVisualWave}A` : `${selectedVisualSensor}_${selectedVisualWave}A`}
                          name={`Session A (${selectedVisualWave.toUpperCase()})`}
                          stroke="#06b6d4"
                          strokeWidth={2.5}
                          dot={false}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey={selectedVisualSensor === 'ALL' ? `all_${selectedVisualWave}B` : `${selectedVisualSensor}_${selectedVisualWave}B`}
                          name={`Session B (${selectedVisualWave.toUpperCase()})`}
                          stroke="#a855f7"
                          strokeWidth={2.5}
                          strokeDasharray="4 4"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: OVERLAID TIME-SERIES */}
          {/* ========================================================= */}
          {activeTab === 'timeseries' && (
            <div className="space-y-4">
              {/* Metric Overlay & Trajectory Toolbar */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">Select Metric Overlay:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {[
                        { id: 'focus', label: 'Focus Score (0-100)' },
                        { id: 'calm', label: 'Calm Score (0-100)' },
                        { id: 'faa', label: 'FAA Valence Index' },
                        { id: 'alpha', label: 'Alpha Power %' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedChartMetric(m.id as any)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                            selectedChartMetric === m.id
                              ? 'bg-cyan-600 text-white font-bold shadow'
                              : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Play, Pause, Reset & Speed */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlayingVisual(!isPlayingVisual)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow ${
                        isPlayingVisual
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                      }`}
                    >
                      {isPlayingVisual ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlayingVisual ? 'Pause' : 'Play Trajectory'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsPlayingVisual(false);
                        setVisualFrameIdx(0);
                      }}
                      className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs transition"
                      title="Reset Cursor to Start"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    {/* Playback speed selector */}
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                      {[1, 2, 5, 10].map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => setVisualSpeed(spd)}
                          className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                            visualSpeed === spd
                              ? 'bg-cyan-500 text-slate-950'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scope Selection Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-semibold text-[11px]">Sliding Scope:</span>
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                      {[
                        { label: '15s Window', value: 15 },
                        { label: '30s Window', value: 30 },
                        { label: '60s Window', value: 60 },
                        { label: 'Full Session', value: 0 },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setVisualWindowScopeSec(opt.value)}
                          className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition ${
                            visualWindowScopeSec === opt.value
                              ? 'bg-cyan-600 text-white font-bold shadow'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scrubber Range Bar */}
                <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1 text-cyan-400 font-bold">
                      <Zap className="w-3 h-3" /> Time Cursor: {comparisonResult.timeSeriesData[visualFrameIdx]?.timeFormatted || '0s'}
                    </span>
                    <span>
                      Scope: {visualWindowScopeSec === 0 ? 'Full Overview' : `${visualWindowScopeSec}s Window`} ({visualSlidingData.length} pts)
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, comparisonResult.timeSeriesData.length - 1)}
                    value={visualFrameIdx}
                    onChange={(e) => {
                      setIsPlayingVisual(false);
                      setVisualFrameIdx(Number(e.target.value));
                    }}
                    className="w-full accent-cyan-400 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={visualSlidingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="timeFormatted" stroke="#64748b" tick={{ fontSize: 10 }} />
                    <YAxis
                      stroke="#64748b"
                      domain={timeseriesYAxisDomain}
                      tickFormatter={(val) => (selectedChartMetric === 'faa' ? val.toFixed(2) : `${Math.round(val)}%`)}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      itemStyle={{ fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    {comparisonResult.timeSeriesData[visualFrameIdx] && (
                      <ReferenceLine
                        x={comparisonResult.timeSeriesData[visualFrameIdx].timeFormatted}
                        stroke="#38bdf8"
                        strokeWidth={2.5}
                        label={{ value: '▶ SWEEP', fill: '#38bdf8', fontSize: 10, fontWeight: 'bold' }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey={
                        selectedChartMetric === 'focus'
                          ? 'focusA'
                          : selectedChartMetric === 'calm'
                          ? 'calmA'
                          : selectedChartMetric === 'faa'
                          ? 'faaA'
                          : 'all_alphaA'
                      }
                      name="Session A"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey={
                        selectedChartMetric === 'focus'
                          ? 'focusB'
                          : selectedChartMetric === 'calm'
                          ? 'calmB'
                          : selectedChartMetric === 'faa'
                          ? 'faaB'
                          : 'all_alphaB'
                      }
                      name="Session B"
                      stroke="#a855f7"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: DEEP CLINICAL TAKEAWAYS */}
          {/* ========================================================= */}
          {activeTab === 'clinical' && (
            <div className="space-y-5">
              {/* AI Audit Runner Controls */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" /> Multi-Step AI Comparative Audit
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Generate structured 5-step clinical takeaways synthesizing cross-session state transitions.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleRunAiComparison}
                    disabled={isGeneratingAiReport}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-950/50 flex items-center gap-2 disabled:opacity-50"
                  >
                    {isGeneratingAiReport ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Running Audit Step {currentStepIndex}/5...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4" />
                        <span>Run AI Clinical Audit</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleExportComparativePdf}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                    <span>Export Comparative PDF Report</span>
                  </button>
                </div>
              </div>

              {/* Display AI Audit or Fallback Observations */}
              {dualAuditOutput ? (
                <MultiStepAuditDisplay
                  auditOutput={dualAuditOutput}
                  isAnalyzing={isGeneratingAiReport}
                  currentStepIndex={currentStepIndex}
                />
              ) : (
                <div className="p-5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Deterministic Clinical Observations (Offline Mode)
                  </h5>
                  <div className="space-y-2">
                    {comparisonResult.recommendations.map((rec, idx) => (
                      <div key={idx} className="p-3 bg-slate-900 rounded-lg text-xs text-slate-300 border border-slate-800/80 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{rec}</span>
                      </div>
                    ))}
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
