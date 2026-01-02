import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Flashcard, SRData, ReviewProgress } from '../types';
import { calculateNewSRS } from '../services/srsService';
import ConfirmModal from './ConfirmModal';
import { 
  ArrowLeft, RefreshCw, Plus, Sparkles, Image as ImageIcon, 
  Zap, Shuffle, ListOrdered, Settings2, 
  Check, Trash2, Pencil, FileText
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
  const formatCardContent = (content: string) => {
    if (!content) return '';
    
    let formatted = content;

    // 1. Identify literal \n sequences or other artifacts
    // Replace literal '\n' string with actual newline
    formatted = formatted.replace(/\\n/g, '\n');

    // 2. Handle LaTeX special symbols inside math blocks
    // Specifically escaping symbols like % that KaTeX interprets as a comment start.
    // This looks for $...$ and $$...$$ blocks.
    formatted = formatted.replace(/(\$\$?)([\s\S]+?)\1/g, (match, delimiter, mathContent) => {
      // Inside math mode, %, &, and # must be escaped to be rendered correctly within \text{} or math environments.
      // We escape them only if they are not already preceded by a backslash.
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
        // If restored session is invalid or finished, fall through to new session
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
            if (currentCard.type === 'basic') setIsFlipped(true);
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
    // Check if selecting text
    if (window.getSelection()?.toString()) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;

    if (x < w * 0.2) {
        // Left Edge -> Prev
        if (currentCardIndex > 0) handlePrev();
    } else if (x > w * 0.8) {
        // Right Edge -> Next
        if (currentCardIndex < queue.length - 1) handleNext();
    } else {
        // Center -> Flip
        if (!isFlipped && currentCard) {
            if (currentCard.type === 'basic') setIsFlipped(true);
            else revealAllOcclusions();
        }
    }
  };

  const handleRestart = () => {
      onClearProgress();
      setIsInitialized(false); // Trigger re-init
      setQueue([]);
      setCurrentCardIndex(0);
      // Effectively resets the component state to force a new fetch of due cards
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
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <div className="bg-zinc-900/50 p-8 rounded-full mb-6">
            <Check size={64} className="text-emerald-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">All Caught Up!</h2>
        <p className="text-zinc-400 mb-8 max-w-md">
            {studyMode === 'standard' ? "You've reviewed all cards due for today." : "You've finished reviewing the deck."}
        </p>
        <div className="flex flex-col gap-4 items-center">
            <button 
                onClick={onFinish}
                className="flex items-center gap-2 text-zinc-300 hover:text-white transition-all bg-zinc-800 px-6 py-3 rounded-xl font-medium hover:scale-105 active:scale-95"
            >
                <ArrowLeft size={20} /> Return to Library
            </button>
            {studyMode === 'standard' && (
                <button onClick={handleRestart} className="text-zinc-500 hover:text-zinc-300 text-sm transition-all hover:scale-105 active:scale-95 flex items-center gap-1">
                    <RefreshCw size={14} /> Refresh
                </button>
            )}
        </div>
      </div>
    );
  }

  if (!isInitialized || !currentCard) return <div className="flex flex-col items-center justify-center h-[60vh]"><RefreshCw className="animate-spin text-emerald-500"/></div>;

  return (
    <div className="absolute inset-0 flex flex-col bg-zinc-950 overflow-hidden overscroll-none z-0">
      {/* Redesigned Integrated Header: Back Button + Thick Status Bar */}
      <div className="shrink-0 h-16 flex items-center gap-4 px-4 bg-zinc-950 relative z-10">
        <button 
            onClick={onFinish} 
            className="text-zinc-400 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-zinc-900"
            title="Return to Library"
        >
            <ArrowLeft size={20} />
        </button>
        
        <div 
            ref={progressBarRef}
            onClick={handleProgressClick}
            className="flex-1 h-7 bg-zinc-800/50 rounded-full overflow-hidden cursor-pointer group relative shadow-inner"
            title="Jump to card"
        >
             {/* Progress Fill */}
             <div 
                className={`h-full transition-all duration-500 relative ${studyMode === 'cram' ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`}
                style={{ width: `${((currentCardIndex + 1) / queue.length) * 100}%` }}
             />
            
            {/* Deck Name Inside Bar */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                    {deckName}
                </span>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-4 flex flex-col relative w-full max-w-4xl mx-auto">
        <div 
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl relative flex flex-col overflow-hidden shadow-2xl"
        >
            {/* Card Internal Header (Overlay) */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between z-20 pointer-events-none">
                {/* Left: Card Info */}
                <div className="pointer-events-auto flex items-center gap-3 bg-zinc-950/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-zinc-800/50 shadow-sm">
                    {currentCard.type === 'basic' ? <FileText size={14} className="text-emerald-400"/> : <ImageIcon size={14} className="text-sky-400"/>}
                    <div className="w-px h-3 bg-zinc-700" />
                    
                    <button 
                        onClick={toggleShuffle} 
                        className="text-zinc-400 hover:text-white transition-colors"
                        title={isShuffled ? "Shuffle On" : "Sequential"}
                    >
                         {isShuffled ? <Shuffle size={14} className="text-emerald-400" /> : <ListOrdered size={14} />}
                    </button>
                    <div className="w-px h-3 bg-zinc-700" />
                    
                    <span className="text-xs font-mono text-zinc-300">
                        {currentCardIndex + 1}<span className="text-zinc-600">/</span>{queue.length}
                    </span>
                </div>

                {/* Right: Actions */}
                <div className="pointer-events-auto flex gap-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(); }} 
                        className="p-2 rounded-full bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-sm group"
                        title="Edit Card & Parameters"
                    >
                         <Pencil size={16} />
                    </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} 
                        className="p-2 rounded-full bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-all shadow-sm"
                        title="Delete Card"
                    >
                         <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Card Content - Scrollable */}
            <div 
                className="flex-1 overflow-y-auto custom-scrollbar pt-16 pb-4"
                onClick={handleCardClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {currentCard.type === 'basic' ? (
                    <div className="min-h-full flex flex-col items-center justify-center p-6 md:p-8 text-center">
                        <div className="w-full max-w-2xl pointer-events-none"> 
                            <div className="pointer-events-auto">
                                <h3 className="text-sm uppercase text-zinc-500 font-bold tracking-widest mb-4">Question</h3>
                                <div className="text-xl md:text-2xl font-medium text-zinc-100 leading-relaxed markdown-content">
                                    <ReactMarkdown 
                                        remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} 
                                        rehypePlugins={[[rehypeRaw, { }] as any, [rehypeKatex, { strict: false }]]}
                                    >
                                        {formatCardContent(currentCard.front)}
                                    </ReactMarkdown>
                                </div>
                            </div>
                            
                            {(isFlipped) && (
                                <div className="pt-8 border-t border-zinc-800 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-auto">
                                    <h3 className="text-sm uppercase text-emerald-500 font-bold tracking-widest mb-4">Answer</h3>
                                    <div className="text-lg text-zinc-300 leading-relaxed markdown-content">
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
                                className="max-h-[60vh] w-auto object-contain rounded-lg"
                            />
                            {currentCard.occlusions?.map(occ => {
                                const isRevealed = visibleOcclusions.includes(occ.id);
                                return (
                                    <button
                                        key={occ.id}
                                        onClick={(e) => { e.stopPropagation(); if(currentCard.type === 'image_occlusion' && !visibleOcclusions.includes(occ.id)) { setVisibleOcclusions(prev => [...prev, occ.id]); } }}
                                        className={`absolute border-2 transition-all duration-300 cursor-pointer hover:scale-[1.02] active:scale-95 ${
                                            isRevealed 
                                                ? 'bg-transparent border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                                                : 'bg-sky-600/90 border-sky-400 hover:bg-sky-500'
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

      {/* Footer Area - Fixed Feedback UI - Removed top border */}
      <div className="shrink-0 p-4 pb-8 bg-zinc-950 z-20">
         <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[50px]">
             {!isFlipped ? (
                <p className="text-zinc-500 text-sm animate-pulse flex items-center gap-2">
                    Tap card or <span className="px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700 text-zinc-400 text-[10px] font-mono">SPACE</span> to flip
                </p>
            ) : (
                <div className="grid grid-cols-4 gap-2 md:gap-3 w-full max-w-2xl">
                    <RatingButton rating={1} label="Again" shortcut="1" color="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20" onClick={() => handleRating(1)} />
                    <RatingButton rating={3} label="Hard" shortcut="2" color="bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20" onClick={() => handleRating(3)} />
                    <RatingButton rating={4} label="Good" shortcut="3" color="bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500/20" onClick={() => handleRating(4)} />
                    <RatingButton rating={5} label="Easy" shortcut="4" color="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" onClick={() => handleRating(5)} />
                </div>
            )}
         </div>
      </div>

       {/* Delete Confirmation Modal Local */}
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
        className={`flex flex-col items-center justify-center py-3 rounded-xl border transition-all duration-200 active:scale-95 relative group ${color}`}
    >
        <span className="font-bold text-sm md:text-base">{label}</span>
        <span className="text-[10px] opacity-70 uppercase tracking-wider mt-0.5">
            {rating === 1 ? 'Reset' : rating === 3 ? 'Short' : rating === 4 ? 'Med' : 'Long'}
        </span>
        <span className="absolute -top-2 -right-2 bg-zinc-900 border border-zinc-700 text-zinc-500 text-[9px] w-4 h-4 flex items-center justify-center rounded-sm font-mono opacity-0 group-hover:opacity-100 transition-opacity">
            {shortcut}
        </span>
    </button>
);

export default ReviewSession;