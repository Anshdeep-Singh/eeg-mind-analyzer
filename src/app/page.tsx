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
import { BrainwaveGuide } from '../components/BrainwaveGuide';

import { Brain, FileSpreadsheet, Sparkles, AlertCircle } from 'lucide-react';

export default function Home() {
  const [rawRows, setRawRows] = useState<RawMindMonitorRow[]>([]);
  const [filename, setFilename] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [options, setOptions] = useState<ProcessingOptions>({
    smoothWindow: 3,
    filterBadFit: true,
    filterBlinks: false
  });

  const [processedData, setProcessedData] = useState<{
    frames: ProcessedEEGFrame[];
    summary: SessionSummary;
  } | null>(null);

  // Parse CSV text content
  const processCSVText = useCallback((csvText: string, name: string) => {
    setIsProcessing(true);
    setError(null);

    Papa.parse<RawMindMonitorRow>(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setRawRows(results.data);
          setFilename(name);
          try {
            const res = processMindMonitorCSV(results.data, options);
            setProcessedData(res);
          } catch (err: any) {
            setError(err.message || 'Failed to process EEG CSV data.');
          }
        } else {
          setError('CSV file appears empty or unparseable.');
        }
        setIsProcessing(false);
      },
      error: (err: any) => {
        setError(`CSV Parsing Error: ${err?.message || 'Failed to parse'}`);
        setIsProcessing(false);
      }
    });
  }, [options]);

  // Re-process when options change
  useEffect(() => {
    if (rawRows.length > 0) {
      try {
        const res = processMindMonitorCSV(rawRows, options);
        setProcessedData(res);
      } catch (err: any) {
        setError(err.message || 'Processing error');
      }
    }
  }, [options, rawRows]);

  // Load sample session automatically on first load
  const loadSampleSession = useCallback(async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await fetch('/sample_session.csv');
      if (!res.ok) {
        throw new Error('Sample CSV file not found.');
      }
      const text = await res.text();
      processCSVText(text, 'mindMonitor_sample.csv');
    } catch (err: any) {
      setError(`Failed to load sample CSV: ${err.message}`);
      setIsProcessing(false);
    }
  }, [processCSVText]);

  useEffect(() => {
    loadSampleSession();
  }, [loadSampleSession]);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        processCSVText(text, file.name);
      }
    };
    reader.readAsText(file);
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

        {/* Loading Overlay */}
        {isProcessing && (
          <div className="bg-slate-900/80 border border-slate-800 p-12 rounded-2xl my-8 text-center flex flex-col items-center justify-center space-y-4">
            <Brain className="w-12 h-12 text-cyan-400 animate-bounce" />
            <div>
              <h3 className="text-lg font-bold text-white">Filtering & Analyzing Brainwave Data...</h3>
              <p className="text-xs text-slate-400 mt-1">Calculating Power Spectral Densities, Artifact Filtering, and Cognitive Indices</p>
            </div>
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
              onOptionsChange={setOptions}
              frames={processedData.frames}
              totalRawRows={rawRows.length}
            />

            {/* Plain English Insights & AI Narrative */}
            <PlainEnglishInsights summary={processedData.summary} />

            {/* Bring-Your-Own-Key Custom AI Neural Agent Analysis Panel */}
            <AiAnalysisPanel summary={processedData.summary} frames={processedData.frames} />

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
