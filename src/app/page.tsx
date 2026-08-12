'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Papa from 'papaparse';
import { RawMindMonitorRow, ProcessingOptions, ProcessedEEGFrame, SessionSummary } from '../types/eeg';
import { processMindMonitorCSV } from '../utils/eegProcessor';

import { Header } from '../components/Header';
import { SessionSummaryCards } from '../components/SessionSummaryCards';
import { CognitiveGauges } from '../components/CognitiveGauges';
import { MainCharts } from '../components/MainCharts';
import { BrainStateReplayer } from '../components/BrainStateReplayer';
import { NoiseQualityPanel } from '../components/NoiseQualityPanel';
import { PlainEnglishInsights } from '../components/PlainEnglishInsights';
import { AiAnalysisPanel } from '../components/AiAnalysisPanel';
import { SessionComparisonPanel } from '../components/SessionComparisonPanel';
import { PeakAlphaTracker } from '../components/PeakAlphaTracker';
import { BrainwaveGuide } from '../components/BrainwaveGuide';

import { Brain, FileSpreadsheet, Sparkles, AlertCircle, Cpu } from 'lucide-react';

export default function Home() {
  const [totalRawRows, setTotalRawRows] = useState<number>(0);
  const [filename, setFilename] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Streaming progress state for large CSV files (e.g. 100MB+) or filter re-application
  const [streamProgress, setStreamProgress] = useState<{
    processedRows: number;
    percent: number;
    fileSizeMB: number;
    status: string;
  } | null>(null);

  const [options, setOptions] = useState<ProcessingOptions>({
    smoothWindow: 3,
    filterBadFit: true,
    filterBlinks: false,
    filterMotion: true,
    filterJawClenches: true,
    suppressOutliers: true,
    hsiQualityThreshold: 'acceptable',
  });

  const [cachedRawRows, setCachedRawRows] = useState<RawMindMonitorRow[]>([]);

  const [processedData, setProcessedData] = useState<{
    frames: ProcessedEEGFrame[];
    summary: SessionSummary;
  } | null>(null);

  // Helper to re-process cached raw rows with updated filter options asynchronously
  const processRowsWithOptions = useCallback((rows: RawMindMonitorRow[], opts: ProcessingOptions) => {
    if (!rows || rows.length === 0) return;

    const rowCount = rows.length;
    const sizeMB = +((rowCount * 120) / (1024 * 1024)).toFixed(1);

    // For larger datasets, present status feedback during downsampling and filtering
    if (rowCount > 10000) {
      setIsProcessing(true);
      setStreamProgress({
        processedRows: rowCount,
        percent: 100,
        fileSizeMB: sizeMB > 0.5 ? sizeMB : 1.0,
        status: `Re-applying artifact filters & downsampling ${rowCount.toLocaleString()} EEG rows...`,
      });
    }

    // Use setTimeout so React can render the processing state overlay before CPU calculations
    setTimeout(() => {
      try {
        const res = processMindMonitorCSV(rows, opts);
        setProcessedData({ frames: res.frames, summary: res.summary });
        setTotalRawRows(res.rawCount);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Processing error');
      } finally {
        setIsProcessing(false);
        setStreamProgress(null);
      }
    }, 30);
  }, []);

  // Handler for option changes in NoiseQualityPanel
  const handleOptionsChange = (newOptions: ProcessingOptions) => {
    setOptions(newOptions);
    if (cachedRawRows.length > 0) {
      processRowsWithOptions(cachedRawRows, newOptions);
    }
  };

  // Load built-in sample session (runs ONLY on initial mount or when user clicks 'Load Sample')
  const loadSampleSession = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    setStreamProgress(null);

    try {
      const res = await fetch('/sample_session.csv');
      if (!res.ok) {
        throw new Error('Sample CSV file not found.');
      }
      const text = await res.text();

      Papa.parse<RawMindMonitorRow>(text, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            setCachedRawRows(results.data);
            setFilename('mindMonitor_sample.csv');
            const processed = processMindMonitorCSV(results.data, options);
            setProcessedData({ frames: processed.frames, summary: processed.summary });
            setTotalRawRows(processed.rawCount);
          }
          setIsProcessing(false);
        },
      });
    } catch (err: any) {
      setError(`Failed to load sample CSV: ${err.message}`);
      setIsProcessing(false);
    }
  }, []); // Empty dependencies ensures options changes do not trigger re-fetching sample CSV

  // Initial load on page mount ONLY
  useEffect(() => {
    loadSampleSession();
  }, []); // Run once on mount

  // Stream-based File Upload Handler (Handles 100MB+ Constant Interval CSV Files seamlessly)
  const handleFileUpload = (file: File) => {
    setIsProcessing(true);
    setError(null);
    setFilename(file.name);

    const fileSizeMB = +(file.size / (1024 * 1024)).toFixed(1);
    const totalFileBytes = file.size;

    setStreamProgress({
      processedRows: 0,
      percent: 0,
      fileSizeMB,
      status: `Initializing streaming parser for ${fileSizeMB} MB file...`,
    });

    let accumulatedRows: RawMindMonitorRow[] = [];
    let rowCounter = 0;

    Papa.parse<RawMindMonitorRow>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      worker: true, // Non-blocking web-worker parsing thread
      chunk: (results, parser) => {
        if (results.data && results.data.length > 0) {
          accumulatedRows.push(...results.data);
          rowCounter += results.data.length;

          // Estimate streaming percentage from cursor
          const cursor = (parser as any)._cursor || results.meta?.cursor || 0;
          const pct = Math.min(99, Math.round((cursor / totalFileBytes) * 100));

          setStreamProgress({
            processedRows: rowCounter,
            percent: isNaN(pct) ? 50 : pct,
            fileSizeMB,
            status: `Streaming chunk: ${rowCounter.toLocaleString()} rows parsed (${pct}%)`,
          });
        }
      },
      complete: () => {
        setStreamProgress({
          processedRows: rowCounter,
          percent: 100,
          fileSizeMB,
          status: `Downsampling ${rowCounter.toLocaleString()} high-frequency rows into 60FPS timeline...`,
        });

        setTimeout(() => {
          try {
            if (accumulatedRows.length === 0) {
              setError('CSV file contains no valid EEG rows.');
              setIsProcessing(false);
              setStreamProgress(null);
              return;
            }

            setCachedRawRows(accumulatedRows);
            const processed = processMindMonitorCSV(accumulatedRows, options);
            setProcessedData({ frames: processed.frames, summary: processed.summary });
            setTotalRawRows(processed.rawCount);
          } catch (err: any) {
            setError(err.message || 'Error processing large CSV file.');
          } finally {
            setIsProcessing(false);
            setStreamProgress(null);
          }
        }, 50);
      },
      error: (err: any) => {
        setError(`CSV Streaming Error: ${err?.message || 'Failed to read file'}`);
        setIsProcessing(false);
        setStreamProgress(null);
      },
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 pb-16">
      {/* Header Bar */}
      <Header
        onFileUpload={handleFileUpload}
        onLoadSample={loadSampleSession}
        isProcessing={isProcessing}
        hasData={!!processedData}
        filename={filename}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-4 rounded-xl flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-sm">Processing Notice</h3>
              <p className="text-xs text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* High-Performance Streaming Loading Overlay */}
        {isProcessing && (
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl my-8 text-center flex flex-col items-center justify-center space-y-4 shadow-2xl max-w-2xl mx-auto">
            <div className="relative">
              <Brain className="w-12 h-12 text-cyan-400 animate-pulse" />
              <Cpu className="w-5 h-5 text-purple-400 absolute -bottom-1 -right-1 animate-spin" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center justify-center gap-2">
                Processing EEG Recording
                {streamProgress && streamProgress.fileSizeMB > 10 && (
                  <span className="px-2.5 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    ⚡ High-Density Stream Mode ({streamProgress.fileSizeMB} MB)
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {streamProgress
                  ? streamProgress.status
                  : 'Calculating Power Spectral Densities, Artifact Filtering, and Cognitive Indices...'}
              </p>
            </div>

            {/* Streaming Progress Bar */}
            {streamProgress && (
              <div className="w-full space-y-2 pt-2">
                <div className="flex justify-between text-xs text-slate-400 font-mono">
                  <span>Parsed {streamProgress.processedRows.toLocaleString()} rows</span>
                  <span className="text-cyan-400 font-bold">{streamProgress.percent}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 transition-all duration-200"
                    style={{ width: `${Math.max(5, streamProgress.percent)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Dashboard Content */}
        {!isProcessing && processedData && (
          <>
            {/* Top Cards */}
            <SessionSummaryCards summary={processedData.summary} />

            {/* Cognitive Score Meters */}
            <CognitiveGauges summary={processedData.summary} />

            {/* Interactive Main Recharts Timeline */}
            <MainCharts frames={processedData.frames} />

            {/* Second-by-second Scrubber & Head Map Replayer */}
            <BrainStateReplayer frames={processedData.frames} />

            {/* Noise & Artifact Quality Control Panel */}
            <NoiseQualityPanel
              options={options}
              onOptionsChange={handleOptionsChange}
              frames={processedData.frames}
              totalRawRows={totalRawRows}
            />

            {/* Plain English Insights & AI Narrative */}
            <PlainEnglishInsights summary={processedData.summary} />

            {/* Bring-Your-Own-Key Custom AI Neural Agent Analysis Panel */}
            <AiAnalysisPanel summary={processedData.summary} frames={processedData.frames} />

            {/* Dual Session Comparative Analytics & Sensor Correlation Section */}
            <SessionComparisonPanel
              sessionA={{
                summary: processedData.summary,
                frames: processedData.frames,
                filename: filename || 'Session_A.csv',
              }}
              options={options}
            />

            {/* Peak Alpha Frequency (APF) & Cognitive Performance Tracker */}
            <PeakAlphaTracker summary={processedData.summary} frames={processedData.frames} />

            {/* Educational Brainwave Reference Guide */}
            <BrainwaveGuide />
          </>
        )}

        {/* Empty State when no file loaded */}
        {!isProcessing && !processedData && !error && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto my-12 space-y-4">
            <div className="p-4 bg-cyan-950/80 text-cyan-400 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center border border-cyan-800">
              <FileSpreadsheet className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-white">Upload Your Mind Monitor CSV</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export your recording from the Mind Monitor app as CSV and upload it here for deep signal filtering, cognitive state metrics, and interactive visualizations.
            </p>
            <button
              onClick={loadSampleSession}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold text-xs rounded-xl shadow-lg hover:from-cyan-500 hover:to-blue-500 transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-300" /> Load Built-in Sample Recording
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
