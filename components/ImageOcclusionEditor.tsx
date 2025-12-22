import React, { useState, useRef, useEffect } from 'react';
import { OcclusionRect, Flashcard } from '../types';
import { initialSRS } from '../services/srsService';
import { analyzeImageContext } from '../services/geminiService';
import { v4 as uuidv4 } from 'uuid';
import { Save, X, Image as ImageIcon, Eraser, ChevronLeft, ChevronRight, Sparkles, Loader2, Plus, GripHorizontal, Wand2 } from 'lucide-react';

interface ImageOcclusionEditorProps {
  deckId: string;
  onSave: (cards: Flashcard[]) => void; // Updated to accept multiple cards
  onClose: () => void;
}

interface EditorImage {
    id: string;
    src: string; // Base64 Data URL
    rawBase64: string; // For API
    rects: OcclusionRect[];
    context: string;
}

const ImageOcclusionEditor: React.FC<ImageOcclusionEditorProps> = ({ deckId, onSave, onClose }) => {
  const [images, setImages] = useState<EditorImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentRect, setCurrentRect] = useState<Partial<OcclusionRect> | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isBulkAnalyzing, setIsBulkAnalyzing] = useState(false);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    const newImages: EditorImage[] = [];

    for (const file of files) {
        const reader = new FileReader();
        const promise = new Promise<EditorImage>((resolve) => {
            reader.onload = (ev) => {
                const src = ev.target?.result as string;
                resolve({
                    id: uuidv4(),
                    src: src,
                    rawBase64: src.split(',')[1],
                    rects: [],
                    context: ''
                });
            };
        });
        reader.readAsDataURL(file);
        newImages.push(await promise);
    }

    setImages(prev => [...prev, ...newImages]);
  };

  const getRelativeCoords = (e: React.PointerEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    
    // Ensure we are calculating relative to the image container
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Clamp values 0-100
    return {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y))
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (images.length === 0) return;
    // Prevent scrolling on touch
    e.preventDefault(); 
    
    setIsDrawing(true);
    const pos = getRelativeCoords(e);
    setStartPos(pos);
    setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
    
    // Capture pointer to track outside container if needed
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const pos = getRelativeCoords(e);
    
    const x = Math.min(pos.x, startPos.x);
    const y = Math.min(pos.y, startPos.y);
    const width = Math.abs(pos.x - startPos.x);
    const height = Math.abs(pos.y - startPos.y);

    setCurrentRect({ x, y, width, height });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing || !currentRect) return;
    e.preventDefault();
    setIsDrawing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    
    // Only add if it's big enough (avoid accidental clicks)
    if (currentRect.width && currentRect.width > 2 && currentRect.height && currentRect.height > 2) {
      const newRect: OcclusionRect = { 
        id: uuidv4(), 
        x: currentRect.x!, 
        y: currentRect.y!, 
        width: currentRect.width!, 
        height: currentRect.height! 
      };

      setImages(prev => prev.map((img, idx) => 
          idx === currentIndex ? { ...img, rects: [...img.rects, newRect] } : img
      ));
    }
    setCurrentRect(null);
  };

  const removeRect = (rectId: string) => {
     setImages(prev => prev.map((img, idx) => 
          idx === currentIndex ? { ...img, rects: img.rects.filter(r => r.id !== rectId) } : img
      ));
  };

  const updateContext = (text: string) => {
      setImages(prev => prev.map((img, idx) => 
          idx === currentIndex ? { ...img, context: text } : img
      ));
  };

  const handleAnalyzeContext = async () => {
      const currentImg = images[currentIndex];
      if (!currentImg) return;

      setIsAnalyzing(true);
      try {
          const context = await analyzeImageContext(currentImg.rawBase64);
          updateContext(context);
      } catch (e) {
          console.error(e);
      } finally {
          setIsAnalyzing(false);
      }
  };

  const handleBulkAnalyze = async () => {
      if (isBulkAnalyzing) return;
      setIsBulkAnalyzing(true);
      
      const promises = images.map(async (img) => {
          // Skip if already has substantial context
          if (img.context && img.context.length > 10) return img;
          
          try {
              const context = await analyzeImageContext(img.rawBase64);
              return { ...img, context };
          } catch (error) {
              console.error("Context analysis failed for image", img.id, error);
              return img;
          }
      });

      const results = await Promise.all(promises);
      setImages(results);
      setIsBulkAnalyzing(false);
  };

  const handleSaveAll = () => {
    const cardsToSave: Flashcard[] = [];
    
    images.forEach(img => {
        if (img.rects.length > 0) {
            cardsToSave.push({
                id: uuidv4(),
                deckId,
                type: 'image_occlusion',
                front: img.src,
                back: img.context || 'Image Occlusion Card',
                occlusions: img.rects,
                srs: { ...initialSRS },
                createdAt: Date.now()
            });
        }
    });

    if (cardsToSave.length > 0) {
        onSave(cardsToSave); // Updated to pass array
        onClose();
    }
  };

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-6xl h-[95vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
            <ImageIcon className="text-emerald-500" /> Image Occlusion Editor
          </h2>
          <div className="flex gap-2">
             {images.length > 0 && (
                 <span className="px-3 py-1 bg-zinc-800 rounded-full text-xs font-mono text-zinc-400 flex items-center">
                    {currentIndex + 1} / {images.length}
                 </span>
             )}
            <button onClick={onClose} className="p-2 rounded-full transition-all hover:scale-105 active:scale-95">
                <X size={20} />
            </button>
          </div>
        </div>

        {/* Workspace */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* Main Canvas Area */}
            <div className="flex-1 bg-zinc-950 relative overflow-hidden flex flex-col">
                <div className="flex-1 flex items-center justify-center p-4 overflow-auto relative touch-none select-none">
                    {!currentImage ? (
                        <div className="text-center">
                        <label className="cursor-pointer flex flex-col items-center gap-4 p-12 border-2 border-dashed border-zinc-700 rounded-2xl hover:border-emerald-500 hover:bg-zinc-900 transition-all group hover:scale-105 active:scale-95">
                            <div className="bg-zinc-800 p-4 rounded-full group-hover:scale-110 transition-transform">
                                <Plus size={32} className="text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-200">Upload Images</h3>
                                <p className="text-zinc-500 text-sm mt-1">Select one or more images (JPG, PNG)</p>
                            </div>
                            <input 
                                ref={fileInputRef}
                                type="file" 
                                className="hidden" 
                                multiple 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                            />
                        </label>
                        </div>
                    ) : (
                        <div 
                            ref={containerRef}
                            className="relative inline-block cursor-crosshair shadow-2xl touch-none"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            // Prevent native drag behaviors
                            onDragStart={(e) => e.preventDefault()}
                            style={{ touchAction: 'none' }} 
                        >
                            <img 
                                ref={imgRef}
                                src={currentImage.src} 
                                alt="Occlusion Target" 
                                className="max-h-[60vh] lg:max-h-[70vh] w-auto select-none pointer-events-none rounded-lg"
                                draggable={false}
                            />
                            
                            {/* Existing Rects */}
                            {currentImage.rects.map(r => (
                                <div
                                key={r.id}
                                className="absolute bg-emerald-500/40 border-2 border-emerald-400 group hover:bg-red-500/40 hover:border-red-500 transition-colors"
                                style={{
                                    left: `${r.x}%`,
                                    top: `${r.y}%`,
                                    width: `${r.width}%`,
                                    height: `${r.height}%`
                                }}
                                onPointerDown={(e) => {
                                    e.stopPropagation(); // Prevent creation on delete
                                    removeRect(r.id);
                                }}
                                >
                                    <div className="hidden group-hover:flex absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-0.5 shadow-sm">
                                        <X size={12} />
                                    </div>
                                </div>
                            ))}

                            {/* Drawing Rect */}
                            {currentRect && (
                                <div
                                className="absolute bg-emerald-500/20 border-2 border-emerald-400 border-dashed"
                                style={{
                                    left: `${currentRect.x}%`,
                                    top: `${currentRect.y}%`,
                                    width: `${currentRect.width}%`,
                                    height: `${currentRect.height}%`
                                }}
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Mobile/Tablet Controls Bar */}
                 {images.length > 0 && (
                     <div className="lg:hidden p-4 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center">
                         <button 
                             onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                             disabled={currentIndex === 0}
                             className="p-2 rounded-full bg-zinc-800 disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                         >
                             <ChevronLeft />
                         </button>
                         <span className="text-xs text-zinc-400">
                             {currentImage.rects.length} occlusions
                         </span>
                         <button 
                             onClick={() => setCurrentIndex(prev => Math.min(images.length - 1, prev + 1))}
                             disabled={currentIndex === images.length - 1}
                             className="p-2 rounded-full bg-zinc-800 disabled:opacity-30 transition-all hover:scale-105 active:scale-95"
                         >
                             <ChevronRight />
                         </button>
                     </div>
                 )}
            </div>

            {/* Sidebar / Context Panel */}
            {images.length > 0 && (
                <div className="w-full lg:w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-[30vh] lg:h-auto border-t lg:border-t-0">
                    <div className="p-4 border-b border-zinc-800">
                        <h3 className="font-semibold text-zinc-200 mb-1">Back of Card</h3>
                        <p className="text-xs text-zinc-500">Etymology & Usage Context</p>
                    </div>
                    
                    <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden">
                        <textarea 
                            value={currentImage.context}
                            onChange={(e) => updateContext(e.target.value)}
                            placeholder="Enter context, definitions, or etymology here..."
                            className="flex-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 resize-none focus:outline-none focus:border-emerald-500"
                        />
                        
                        <button
                            onClick={handleAnalyzeContext}
                            disabled={isAnalyzing}
                            className="flex items-center justify-center gap-2 bg-emerald-600/10 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-105 active:scale-95"
                        >
                            {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                            {isAnalyzing ? "Analyzing..." : "AI Generate Context"}
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-between items-center">
            <div className="flex gap-2">
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl transition-all border border-zinc-700 text-sm font-medium hover:scale-105 active:scale-95"
                >
                    <Plus size={16} /> <span className="hidden sm:inline">Add Images</span>
                </button>
                {images.length > 0 && (
                    <>
                        <button 
                            onClick={handleBulkAnalyze}
                            disabled={isBulkAnalyzing || images.every(i => i.context.length > 10)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-900/30 text-indigo-300 border border-indigo-500/30 rounded-xl transition-all disabled:opacity-50 text-sm font-medium hover:scale-105 active:scale-95"
                            title="Auto-fill missing context for all images"
                        >
                            {isBulkAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                            <span className="hidden sm:inline">Auto-Fill All</span>
                        </button>

                        <button 
                            onClick={() => {
                                setImages(prev => prev.map((img, idx) => idx === currentIndex ? { ...img, rects: [] } : img));
                            }}
                            className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-white rounded-xl transition-all disabled:opacity-50 text-sm font-medium hover:scale-105 active:scale-95"
                            disabled={!currentImage || currentImage.rects.length === 0}
                        >
                            <Eraser size={16} /> <span className="hidden sm:inline">Clear Current</span>
                        </button>
                    </>
                )}
            </div>

            <div className="flex gap-3">
                 {/* Desktop Navigation */}
                 {images.length > 1 && (
                     <div className="hidden lg:flex items-center gap-2 mr-4 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                         <button 
                             onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                             disabled={currentIndex === 0}
                             className="p-1.5 rounded-md disabled:opacity-30 text-zinc-400 transition-all hover:scale-105 active:scale-95"
                         >
                             <ChevronLeft size={20} />
                         </button>
                         <span className="text-xs font-mono text-zinc-500 w-12 text-center">
                            {currentIndex + 1} / {images.length}
                         </span>
                         <button 
                             onClick={() => setCurrentIndex(prev => Math.min(images.length - 1, prev + 1))}
                             disabled={currentIndex === images.length - 1}
                             className="p-1.5 rounded-md disabled:opacity-30 text-zinc-400 transition-all hover:scale-105 active:scale-95"
                         >
                             <ChevronRight size={20} />
                         </button>
                     </div>
                 )}

                <button
                    onClick={handleSaveAll}
                    disabled={images.every(i => i.rects.length === 0)}
                    className="flex items-center gap-2 bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 hover:scale-105 active:scale-95"
                >
                    <Save size={18} /> Save {images.filter(i => i.rects.length > 0).length} Cards
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ImageOcclusionEditor;