import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Flashcard, SRData, ReviewProgress } from '../types';
import { calculateNewSRS } from '../services/srsService';
import ConfirmModal from './ConfirmModal';
import { 
  ArrowLeft, RefreshCw, Plus, Sparkles, Image as ImageIcon, 
  Zap, Shuffle, ListOrdered, Settings2, 
  Check, Trash2, Pencil, FileText,
  Eye, EyeOff, RotateCcw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import remarkBreaks from 'remark-breaks';

interface ReviewSessionProps {
  deckName: string;
  cards: Flashcard[];
  studyMode: 'standard' | 'cram';
  onUpdateCard: (card: Flashcard) => void;
  onDeleteCard: (cardId: string) => void;
  onEditCard: (card: Flashcard) => void;
  onFinish: () => void;
  onGenerate: () => void;
  onOcclusion: () => void;
  initialProgress?: ReviewProgress;
  onSaveProgress: (progress: ReviewProgress) => void;
  onClearProgress: () => void;
}

const ReviewSession: React.FC<ReviewSessionProps> = ({ 
    deckName,
    cards, 
    studyMode, 
    onUpdateCard, 
    onDeleteCard, 
    onEditCard, 
    onFinish, 
    onGenerate, 
    onOcclusion,
    initialProgress,
    onSaveProgress,
    onClearProgress
}) => {
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [visibleOcclusions, setVisibleOcclusions] = useState<string[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Swipe state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const currentCard = queue[currentCardIndex];

  // Helper to pre-process card content for better rendering
  const formatCardContent = (content: string, type: 'basic' | 'cloze' = 'basic', clozeIndex?: number, isRevealed: boolean = false) => {
    if (!content) return '';
    
    let formatted = content;

    // 0. Handle Cloze Deletions
    if (type === 'cloze' && clozeIndex !== undefined) {
        // Regex to match {{cN::Content::Hint}} or {{cN::Content}}
        const clozeRegex = /{{c(\d+)::(.*?)(?:::(.*?))?}}/g;
        
        formatted = formatted.replace(clozeRegex, (match, index, text, hint) => {
            if (parseInt(index) === clozeIndex) {
                if (isRevealed) {
                    return `<span class="cloze-revealed">${text}</span>`;
                } else {
                    const hintText = hint ? `[${hint}]` : '[...]';
                    return `<span class="cloze-hidden" title="Show Answer">${hintText}</span>`;
                }
            } else {
                return text;
            }
        });
    }

    // 1. Identify literal \n sequences or other artifacts
    formatted = formatted.replace(/\\n/g, '\n');

    // 2. Handle LaTeX special symbols inside math blocks
    formatted = formatted.replace(/(\$\$?)([\s\S]+?)\1/g, (match, delimiter, mathContent) => {
      const escapedMath = mathContent
        .replace(/(?<!\\)%/g, '\\%')
        .replace(/(?<!\\)&/g, '\\&')
        .replace(/(?<!\\)#/g, '\\#');
      return `${delimiter}${escapedMath}${delimiter}`;
    });

    return formatted;
  };

  // Keep queue objects updated when cards prop changes (SR updates)
  useEffect(() => {
    if (queue.length > 0) {
      setQueue(prevQueue => prevQueue.map(q => {
        const found = cards.find(c => c.id === q.id);
        return found ? found : q;
      }));
    }
  }, [cards]);

  // Initialization Logic
  useEffect(() => {
    if (isInitialized) return;

    if (initialProgress) {
        // Attempt to restore session
        const restoredQueue = initialProgress.cardIds
            .map(id => cards.find(c => c.id === id))
            .filter((c): c is Flashcard => !!c); // Filter out deleted cards
        
        // Only restore if valid cards remain and we aren't past the end
        if (restoredQueue.length > 0 && initialProgress.currentIndex < restoredQueue.length) {
            setQueue(restoredQueue);
            setCurrentCardIndex(initialProgress.currentIndex);
            setIsShuffled(initialProgress.isShuffled);
            setIsInitialized(true);
            return;
        }
    }

    if (cards.length > 0) {
        let cardsToReview: Flashcard[] = [];

        if (studyMode === 'cram') {
            cardsToReview = [...cards];
        } else {
            cardsToReview = cards.filter(c => c.srs.dueDate <= Date.now());
        }

        if (cardsToReview.length > 0) {
            // Default sort by creation
            cardsToReview.sort((a, b) => a.createdAt - b.createdAt);
            setQueue(cardsToReview);
        }
    }
    setIsInitialized(true);
  }, [cards, isInitialized, studyMode, initialProgress]);

  // Auto-Save Progress
  useEffect(() => {
    if (isInitialized && queue.length > 0) {
        onSaveProgress({
            cardIds: queue.map(c => c.id),
            currentIndex: currentCardIndex,
            isShuffled: isShuffled
        });
    }
  }, [queue, currentCardIndex, isShuffled, isInitialized, onSaveProgress]);

  const toggleShuffle = () => {
    if (queue.length === 0) return;
    const currentCard = queue[currentCardIndex];
    const newIsShuffled = !isShuffled;
    let newQueue = [...queue];

    if (newIsShuffled) {
        for (let i = newQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newQueue[i], newQueue[j]] = [newQueue[j], newQueue[i]];
        }
    } else {
        newQueue.sort((a, b) => a.createdAt - b.createdAt);
    }

    setQueue(newQueue);
    setIsShuffled(newIsShuffled);
    const newIndex = newQueue.findIndex(c => c.id === currentCard?.id);
    if (newIndex !== -1) setCurrentCardIndex(newIndex);
    else setCurrentCardIndex(0);
  };

  const handleNext = () => {
    if (currentCardIndex < queue.length - 1) {
        setIsFlipped(false);
        setVisibleOcclusions([]);
        setCurrentCardIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentCardIndex > 0) {
        setIsFlipped(false);
        setVisibleOcclusions([]);
        setCurrentCardIndex(prev => prev - 1);
    }
  };

  const handleRating = (rating: number) => {
    if (!currentCard) return;
    const updatedSrs = calculateNewSRS(currentCard.srs, rating);
    onUpdateCard({ ...currentCard, srs: updatedSrs });
    if (currentCardIndex === queue.length - 1) {
        // Clear progress when finishing naturally so next session starts fresh
        onClearProgress(); 
        onFinish();
    } else {
        handleNext();
    }
  };

  const revealAllOcclusions = () => {
    if (currentCard?.occlusions) setVisibleOcclusions(currentCard.occlusions.map(o => o.id));
    setIsFlipped(true);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement || 
        activeElement instanceof HTMLTextAreaElement || 
        activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'Enter':
          e.preventDefault();
          if (!isFlipped && currentCard) {
            if (currentCard.type === 'basic' || currentCard.type === 'cloze') setIsFlipped(true);
            else revealAllOcclusions();
          }
          break;
        case 'ArrowRight':
        case 'KeyD':
          if (currentCardIndex < queue.length - 1) handleNext();
          break;
        case 'ArrowLeft':
        case 'KeyA':
          if (currentCardIndex > 0) handlePrev();
          break;
        case 'Digit1':
        case 'Numpad1':
          if (isFlipped) handleRating(1);
          break;
        case 'Digit2':
        case 'Numpad2':
          if (isFlipped) handleRating(3);
          break;
        case 'Digit3':
        case 'Numpad3':
          if (isFlipped) handleRating(4);
          break;
        case 'Digit4':
        case 'Numpad4':
          if (isFlipped) handleRating(5);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentCardIndex, queue.length, currentCard, handleRating, handleNext, handlePrev]);

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newIndex = Math.floor(percentage * (queue.length - 1));
    
    if (newIndex !== currentCardIndex) {
        setIsFlipped(false);
        setVisibleOcclusions([]);
        setCurrentCardIndex(newIndex);
    }
  };

  const executeDelete = () => {
    if (!currentCard) return;
    const cardId = currentCard.id;
    onDeleteCard(cardId);
    const newQueue = queue.filter(c => c.id !== cardId);
    setQueue(newQueue);
    setIsFlipped(false);
    setVisibleOcclusions([]);
    if (currentCardIndex >= newQueue.length) {
        setCurrentCardIndex(Math.max(0, newQueue.length - 1));
    }
  };

  const handleEdit = () => {
      if (currentCard) onEditCard(currentCard);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
        // Swipe Left -> Next
        if (currentCardIndex < queue.length - 1) handleNext();
    } else if (distance < -minSwipeDistance) {
        // Swipe Right -> Prev
        if (currentCardIndex > 0) handlePrev();
    }
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.getSelection()?.toString()) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    if (x < w * 0.2) {
        if (currentCardIndex > 0) handlePrev();
    } else if (x > w * 0.8) {
        if (currentCardIndex < queue.length - 1) handleNext();
    } else {
        if (!isFlipped && currentCard) {
            if (currentCard.type === 'basic' || currentCard.type === 'cloze') setIsFlipped(true);
            else revealAllOcclusions();
        }
    }
  };

  const handleRestart = () => {
      onClearProgress();
      setIsInitialized(false);
      setQueue([]);
      setCurrentCardIndex(0);
  };

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
         <div className="bg-zinc-900/80 p-6 rounded-full mb-6 border border-zinc-800 shadow-xl">
            <Plus size={48} className="text-emerald-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-3">This deck is empty</h2>
        <p className="text-zinc-400 mb-8 max-w-md">
            Get started by generating cards from your notes or creating visual flashcards.
        </p>
        <div className="grid gap-4 w-full max-w-sm">
            <button 
                onClick={onGenerate}
                className="flex items-center justify-center gap-3 bg-emerald-600 text-white px-6 py-4 rounded-xl font-medium transition-all shadow-lg shadow-emerald-900/20 group hover:scale-105 active:scale-95"
            >
                <Sparkles size={20} className="group-hover:scale-110 transition-transform" />
                <div className="text-left">
                    <div className="font-semibold">AI Generate</div>
                    <div className="text-xs text-emerald-200">From PDF, Text, Notes</div>
                </div>
            </button>
            <button 
                onClick={onOcclusion}
                className="flex items-center justify-center gap-3 bg-zinc-900 text-white px-6 py-4 rounded-xl font-medium transition-all border border-zinc-800 shadow-lg shadow-zinc-900/10 group hover:scale-105 active:scale-95"
            >
                <ImageIcon size={20} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                 <div className="text-left">
                    <div className="font-semibold">Image Occlusion</div>
                    <div className="text-xs text-zinc-400 group-hover:text-zinc-300">For diagrams & charts</div>
                </div>
            </button>
            <button 
                onClick={onFinish}
                className="mt-4 text-zinc-500 hover:text-zinc-300 text-sm font-medium transition-all hover:scale-105 active:scale-95"
            >
                Return to Library
            </button>
        </div>
      </div>
    );
  }

  if (queue.length === 0 && isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-in fade-in duration-500">
        <div className="bg-emerald-500/10 p-8 rounded-full mb-6 border border-emerald-500/20 shadow-lg shadow-emerald-900/20">
            <Check size={64} className="text-emerald-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">All Caught Up!</h2>
        <p className="text-zinc-400 mb-8 max-w-md">
            {studyMode === 'standard' ? "You've reviewed all cards due for today." : "You've finished reviewing the deck."}
        </p>
        <div className="flex flex-col gap-4 items-center">
            <button 
                onClick={onFinish}
                className="flex items-center gap-2 text-white bg-zinc-800 hover:bg-zinc-700 px-6 py-3 rounded-xl font-medium hover:scale-105 active:scale-95 transition-all"
            >
                <ArrowLeft size={20} /> Return to Library
            </button>
            {studyMode === 'standard' && (
                <button onClick={handleRestart} className="text-zinc-500 hover:text-zinc-300 text-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1">
                    <RefreshCw size={14} /> Review All Anyway
                </button>
            )}
        </div>
      </div>
    );
  }

  if (!isInitialized || !currentCard) return <div className="flex flex-col items-center justify-center h-[60vh]"><div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-950 overflow-hidden overscroll-none z-0">
      
      {/* Top Controls Bar */}
      <div className="shrink-0 h-16 flex items-center gap-4 px-6 bg-zinc-950 z-20">
        <button 
            onClick={onFinish} 
            className="text-zinc-500 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-zinc-900"
            title="Return to Library"
        >
            <ArrowLeft size={20} />
        </button>
        
        {/* Progress Bar */}
        <div className="flex-1 flex flex-col justify-center max-w-md mx-auto relative group">
             <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5">
                <span>{currentCardIndex + 1} / {queue.length}</span>
                <span className="truncate max-w-[150px]">{deckName}</span>
             </div>
             <div 
                ref={progressBarRef}
                onClick={handleProgressClick}
                className="h-1.5 bg-zinc-800 rounded-full overflow-hidden cursor-pointer"
             >
                <div 
                    className={`h-full transition-all duration-300 ease-out ${studyMode === 'cram' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${((currentCardIndex + 1) / queue.length) * 100}%` }}
                />
             </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={toggleShuffle} 
                className={`p-2 rounded-lg transition-colors ${isShuffled ? 'text-emerald-400 bg-emerald-900/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                title={isShuffled ? "Shuffle On" : "Sequential"}
            >
                    {isShuffled ? <Shuffle size={18} /> : <ListOrdered size={18} />}
            </button>
             <button 
                onClick={(e) => { e.stopPropagation(); handleEdit(); }} 
                className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors"
                title="Edit Card"
            >
                    <Pencil size={18} />
            </button>
                <button 
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} 
                className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
                title="Delete Card"
            >
                    <Trash2 size={18} />
            </button>
        </div>
      </div>

      {/* Main Card Area */}
      <div className="flex-1 overflow-hidden p-4 md:p-6 flex flex-col relative w-full max-w-5xl mx-auto">
        <div 
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl relative flex flex-col overflow-hidden shadow-2xl shadow-black/50"
        >
            {/* Card Type Indicator */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none opacity-50">
               {currentCard.type === 'basic' ? <FileText size={16} className="text-zinc-500"/> : 
                currentCard.type === 'cloze' ? <Eye size={16} className="text-amber-500"/> :
                <ImageIcon size={16} className="text-sky-500"/>}
            </div>

            <div 
                className="flex-1 overflow-y-auto custom-scrollbar pt-12 pb-12 px-6"
                onClick={handleCardClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {currentCard.type === 'basic' || currentCard.type === 'cloze' ? (
                    <div className="min-h-full flex flex-col items-center justify-center text-center py-4">
                        <div className="w-full max-w-3xl pointer-events-none"> 
                            <div className="pointer-events-auto flex flex-col items-center">
                                {/* Optional Image */}
                                {currentCard.image && (
                                    <div className="mb-8 w-full max-h-[350px] flex justify-center">
                                        <img 
                                            src={currentCard.image} 
                                            alt="Visual Context" 
                                            className="max-h-full rounded-xl border border-zinc-700 shadow-xl object-contain bg-black/20"
                                        />
                                    </div>
                                )}

                                <h3 className="text-xs uppercase text-zinc-500 font-bold tracking-[0.2em] mb-6">
                                    {currentCard.type === 'cloze' ? 'Complete' : 'Question'}
                                </h3>
                                
                                <div className="text-xl md:text-3xl font-medium text-zinc-100 leading-normal markdown-content selection:bg-emerald-500/30">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} 
                                        rehypePlugins={[[rehypeRaw, { }] as any, [rehypeKatex, { strict: false }]]}
                                    >
                                        {formatCardContent(currentCard.front, currentCard.type, currentCard.clozeDeletionIndex, isFlipped)}
                                    </ReactMarkdown>
                                </div>
                            </div>
                            
                            {(isFlipped) && (
                                <div className="pt-10 border-t border-zinc-800 mt-10 animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto">
                                    <h3 className="text-xs uppercase text-emerald-500 font-bold tracking-[0.2em] mb-6">
                                        {currentCard.type === 'cloze' ? 'Context' : 'Answer'}
                                    </h3>
                                    <div className="text-lg md:text-xl text-zinc-300 leading-relaxed markdown-content">
                                        <ReactMarkdown 
                                            remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} 
                                            rehypePlugins={[[rehypeRaw, { }] as any, [rehypeKatex, { strict: false }]]}
                                        >
                                            {formatCardContent(currentCard.back)}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 min-h-full flex items-center justify-center p-4">
                        <div className="relative inline-block max-w-full">
                            <img 
                                src={currentCard.front} 
                                alt="Question" 
                                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-2xl"
                            />
                            {currentCard.occlusions?.map(occ => {
                                const isRevealed = visibleOcclusions.includes(occ.id);
                                return (
                                    <button
                                        key={occ.id}
                                        onClick={(e) => { e.stopPropagation(); if(currentCard.type === 'image_occlusion' && !visibleOcclusions.includes(occ.id)) { setVisibleOcclusions(prev => [...prev, occ.id]); } }}
                                        className={`absolute border-2 transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-95 ${
                                            isRevealed 
                                                ? 'bg-transparent border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' 
                                                : 'bg-zinc-900/90 border-zinc-700 hover:bg-zinc-800'
                                        }`}
                                        style={{
                                            left: `${occ.x}%`,
                                            top: `${occ.y}%`,
                                            width: `${occ.width}%`,
                                            height: `${occ.height}%`
                                        }}
                                    >
                                        {isRevealed && <div className="w-full h-full bg-emerald-500/10 backdrop-blur-[1px]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Bottom Actions Area */}
      <div className="shrink-0 pb-8 pt-2 px-6 bg-zinc-950 z-20">
         <div className="max-w-3xl mx-auto flex items-center justify-center min-h-[64px]">
             {!isFlipped ? (
                <div 
                    onClick={() => {
                        if (currentCard) {
                            if (currentCard.type === 'basic' || currentCard.type === 'cloze') setIsFlipped(true);
                            else revealAllOcclusions();
                        }
                    }}
                    className="cursor-pointer text-zinc-500 text-sm animate-pulse flex items-center gap-3 px-6 py-3 rounded-xl hover:bg-zinc-900 transition-colors"
                >
                    Tap card or <span className="px-2 py-1 bg-zinc-800 rounded-md border border-zinc-700 text-zinc-400 text-xs font-mono">SPACE</span> to flip
                </div>
            ) : (
                <div className="grid grid-cols-4 gap-3 w-full">
                    <RatingButton rating={1} label="Again" shortcut="1" color="border-red-500/20 text-red-400 hover:bg-red-500/10" onClick={() => handleRating(1)} />
                    <RatingButton rating={3} label="Hard" shortcut="2" color="border-amber-500/20 text-amber-400 hover:bg-amber-500/10" onClick={() => handleRating(3)} />
                    <RatingButton rating={4} label="Good" shortcut="3" color="border-blue-500/20 text-blue-400 hover:bg-blue-500/10" onClick={() => handleRating(4)} />
                    <RatingButton rating={5} label="Easy" shortcut="4" color="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleRating(5)} />
                </div>
            )}
         </div>
      </div>

       <ConfirmModal 
        isOpen={showDeleteConfirm}
        title="Delete Flashcard"
        message="Are you sure you want to delete this card? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={executeDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

const RatingButton: React.FC<{ rating: number, label: string, shortcut: string, color: string, onClick: () => void }> = ({ rating, label, shortcut, color, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center py-3 rounded-xl border bg-zinc-900 transition-all duration-200 active:scale-95 hover:-translate-y-1 ${color}`}
    >
        <span className="font-bold text-sm">{label}</span>
        <span className="text-[10px] opacity-60 uppercase tracking-wider mt-1 font-mono">
            {rating === 1 ? '<1m' : rating === 3 ? '2d' : rating === 4 ? '5d' : '8d'}
        </span>
    </button>
);

export default ReviewSession;