import React, { useState, useRef, useEffect } from 'react';
import { chunkText, generateCardsFromContent, GeneratedCardData } from '../services/geminiService';
import { initialSRS } from '../services/srsService';
import { Flashcard, GenerationStatus } from '../types';
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Image as ImageIcon, Sparkles } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import * as pdfjsLib from 'pdfjs-dist';

// Helper to handle ESM default export differences
const getPdfJs = () => {
  // @ts-ignore
  if (pdfjsLib.GlobalWorkerOptions) return pdfjsLib;
  // @ts-ignore
  if (pdfjsLib.default?.GlobalWorkerOptions) return pdfjsLib.default;
  return pdfjsLib;
};

const pdfJs = getPdfJs();

interface CardGeneratorProps {
  deckId: string;
  onCardsGenerated: (cards: Flashcard[]) => void;
  onClose: () => void;
}

const CardGenerator: React.FC<CardGeneratorProps> = ({ deckId, onCardsGenerated, onClose }) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'text' | 'pdf'>('text');
  const [pdfPages, setPdfPages] = useState<string[]>([]); // Base64 images
  
  const [status, setStatus] = useState<GenerationStatus>({
    totalChunks: 0,
    processedChunks: 0,
    isProcessing: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize PDF worker safely
  useEffect(() => {
    const initWorker = async () => {
      if (pdfJs.GlobalWorkerOptions.workerSrc) return;
      const workerUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      try {
        const response = await fetch(workerUrl);
        if (!response.ok) throw new Error("Failed");
        const workerScript = await response.text();
        const blob = new Blob([workerScript], { type: 'text/javascript' });
        pdfJs.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
      } catch (error) {
        pdfJs.GlobalWorkerOptions.workerSrc = workerUrl;
      }
    };
    initWorker();
  }, []);

  const extractPagesFromPDF = async (
    file: File, 
    onStatusUpdate: (msg: string) => void,
    onProgress: (current: number, total: number) => void
  ): Promise<string[]> => {
    const arrayBuffer = await file.arrayBuffer();
    
    // Safety check for worker
    if (!pdfJs.GlobalWorkerOptions.workerSrc) {
       pdfJs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const loadingTask = pdfJs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const extractedPages: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      try {
          onStatusUpdate(`Processing ${file.name}: Page ${i}/${numPages}...`);
          // Report progress at start of processing for better feedback
          onProgress(i - 0.5, numPages); 

          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 }); // 1.5 scale for good balance of quality/token size
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (context) {
              canvas.height = viewport.height;
              canvas.width = viewport.width;
              
              await page.render({ canvasContext: context, viewport }).promise;
              
              // Convert to JPEG base64 (remove prefix for Gemini)
              const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
              extractedPages.push(base64);
          }
          // Report completion of page
          onProgress(i, numPages);
      } catch (pageError) {
          console.error(`Error rendering page ${i}`, pageError);
      }
    }
    return extractedPages;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    // Reset status and set totalChunks to 100 (using percentage mode for upload)
    setStatus(prev => ({ 
        ...prev, 
        error: undefined, 
        isProcessing: true,
        totalChunks: 100,
        processedChunks: 0
    }));

    try {
        // Determine if there are any visual files
        const hasVisuals = files.some(f => f.type === 'application/pdf' || f.type.startsWith('image/'));
        const totalFiles = files.length;
        let fileIndex = 0;

        if (hasVisuals) {
             const allPages: string[] = [];
             let processedCount = 0;
             
             for (const file of files) {
                 const updateFileProgress = (ratio: number) => {
                     // ratio is 0 to 1
                     const globalPercentage = ((fileIndex + ratio) / totalFiles) * 100;
                     setStatus(prev => ({ ...prev, processedChunks: globalPercentage }));
                 };

                 if (file.type === 'application/pdf') {
                     const pages = await extractPagesFromPDF(
                         file, 
                         (msg) => setStatus(prev => ({ ...prev, currentAction: msg })),
                         (current, total) => updateFileProgress(current / total)
                     );
                     allPages.push(...pages);
                     processedCount++;
                 } else if (file.type.startsWith('image/')) {
                     setStatus(prev => ({ ...prev, currentAction: `Processing image: ${file.name}` }));
                     const reader = new FileReader();
                     const p = new Promise<string>(resolve => {
                         reader.onload = (ev) => resolve((ev.target?.result as string).split(',')[1]);
                     });
                     reader.readAsDataURL(file);
                     allPages.push(await p);
                     processedCount++;
                     updateFileProgress(1);
                 }
                 fileIndex++;
             }
             
             setPdfPages(allPages);
             setMode('pdf');
             setText(`Loaded ${processedCount} visual files (${allPages.length} total pages/images).\n\nReady to analyze diagrams, scanned text, and notes.`);
        } else {
             // Text only batch
             setStatus(prev => ({ ...prev, currentAction: 'Reading text files...', processedChunks: 10 }));
             let fullText = '';
             for (const file of files) {
                 const t = await file.text();
                 fullText += `\n\n--- File: ${file.name} ---\n${t}`;
                 
                 // Simple progress update for text files
                 fileIndex++;
                 setStatus(prev => ({ ...prev, processedChunks: (fileIndex / totalFiles) * 100 }));
             }
             setText(prev => (prev.trim() ? prev + '\n' + fullText : fullText.trim()));
             setMode('text');
        }
    } catch (error: any) {
        console.error("File Processing Error:", error);
        setStatus(prev => ({ ...prev, error: error.message || "Failed to process files." }));
    } finally {
        setStatus(prev => ({ ...prev, isProcessing: false, currentAction: '', processedChunks: 0, totalChunks: 0 }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleGenerate = async () => {
    if (!text.trim() && pdfPages.length === 0) return;

    // Determine chunks
    // Text: Chunks by token count
    // PDF: Chunks by page count (multimodal analysis)
    let chunks: any[] = [];
    
    if (mode === 'text') {
        chunks = chunkText(text).map(c => ({ type: 'text', content: c }));
    } else {
        // PDF Mode: Group pages to ensure detailed analysis
        // 4 pages per chunk allows Gemini to focus on details in diagrams/scanned text
        const PAGES_PER_CHUNK = 4; 
        for (let i = 0; i < pdfPages.length; i += PAGES_PER_CHUNK) {
            chunks.push({
                type: 'image',
                content: pdfPages.slice(i, i + PAGES_PER_CHUNK)
            });
        }
    }

    setStatus({
      totalChunks: chunks.length,
      processedChunks: 0,
      isProcessing: true,
      currentAction: 'Initializing Gemini 3 Flash...'
    });

    const allGeneratedCards: Flashcard[] = [];
    // Base timestamp for sequential ordering
    const baseTime = Date.now();

    try {
      for (let i = 0; i < chunks.length; i++) {
        setStatus(prev => ({
          ...prev,
          processedChunks: i + 1,
          currentAction: `Analyzing part ${i + 1} of ${chunks.length} (${mode === 'pdf' ? 'Visual Analysis' : 'Text Analysis'})...`
        }));

        const rawCards = await generateCardsFromContent(chunks[i]);
        
        const newCards: Flashcard[] = [];
        
        rawCards.forEach((rc, idx) => {
            const cardId = uuidv4();
            const createdAt = baseTime + (i * 1000) + idx;

            if (rc.type === 'cloze') {
                // Parse indices
                const matches = [...rc.front.matchAll(/{{c(\d+)::/g)];
                const indices = new Set(matches.map(m => parseInt(m[1])));
                
                if (indices.size > 0) {
                    let offset = 0;
                    indices.forEach(cIndex => {
                        newCards.push({
                            id: uuidv4(), // Unique ID per card variant
                            deckId,
                            type: 'cloze',
                            front: rc.front,
                            back: rc.back,
                            srs: { ...initialSRS },
                            createdAt: createdAt + offset, // slight offset to keep order
                            clozeDeletionIndex: cIndex
                        });
                        offset++;
                    });
                } else {
                    // Fallback to basic if regex fails but model said cloze
                    newCards.push({
                        id: cardId,
                        deckId,
                        type: 'basic',
                        front: rc.front,
                        back: rc.back,
                        srs: { ...initialSRS },
                        createdAt
                    });
                }
            } else {
                // Basic
                newCards.push({
                    id: cardId,
                    deckId,
                    type: 'basic', // Default to basic
                    front: rc.front,
                    back: rc.back,
                    srs: { ...initialSRS },
                    createdAt
                });
            }
        });

        allGeneratedCards.push(...newCards);
      }

      onCardsGenerated(allGeneratedCards);
      setStatus(prev => ({ ...prev, isProcessing: false, currentAction: 'Complete!' }));
      setTimeout(onClose, 1500);

    } catch (error: any) {
      console.error(error);
      let errMsg = 'Generation failed.';
      if (error.message) errMsg += ` ${error.message}`;
      if (error.status) errMsg += ` (Status: ${error.status})`;
      
      setStatus(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: errMsg
      }));
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2 text-white">
        <Sparkles className="text-emerald-400" />
        AI Card Generator
      </h2>
      
      <p className="text-zinc-400 mb-6 text-sm">
        Upload files (PDF, Images, Text) or paste content. <br/>
        <span className="text-emerald-400 text-xs">Now supports Visual Analysis and Cloze (fill-in-the-blank) generation.</span>
      </p>

      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setMode('text'); }}
            readOnly={mode === 'pdf'}
            placeholder="Paste your notes here or upload files..."
            className={`w-full h-48 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors resize-none text-zinc-300 scrollbar-thin ${mode === 'pdf' ? 'opacity-70 cursor-not-allowed pr-36' : ''}`}
          />
          
          {mode === 'pdf' && (
             <div className="absolute top-4 right-4 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-emerald-500/20 shadow-sm z-10">
                <ImageIcon size={12} /> VISUAL MODE
             </div>
          )}

          <div className="absolute bottom-3 right-3">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all border border-zinc-700 hover:scale-105 active:scale-95"
            >
                <Upload size={14} /> Upload Files
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                multiple
                accept=".txt,.md,.json,.csv,.js,.ts,.py,.pdf,.jpg,.png,.jpeg"
                onChange={handleFileUpload}
            />
          </div>
        </div>

        {status.error && (
            <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {status.error}
            </div>
        )}

        {status.isProcessing ? (
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-xl">
            <div className="flex justify-between text-sm mb-2 text-zinc-400">
                <span>{status.currentAction}</span>
                <span>{status.totalChunks > 0 ? Math.round((status.processedChunks / status.totalChunks) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div 
                    className="bg-emerald-500 h-full transition-all duration-300 ease-out"
                    style={{ width: `${status.totalChunks > 0 ? (status.processedChunks / status.totalChunks) * 100 : 0}%` }}
                />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400 text-sm animate-pulse">
                <Loader2 size={16} className="animate-spin" /> Processing...
            </div>
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <button 
                onClick={onClose}
                className="px-4 py-2 text-zinc-400 hover:text-white transition-all text-sm hover:scale-105 active:scale-95"
            >
                Cancel
            </button>
            <button
                onClick={handleGenerate}
                disabled={!text.trim() && pdfPages.length === 0}
                className="bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2 hover:scale-105 active:scale-95"
            >
                {(!text.trim() && pdfPages.length === 0) ? 'Enter Content' : <><FileText size={18} /> Generate Cards</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardGenerator;