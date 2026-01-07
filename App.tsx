import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Deck, Flashcard, Folder, ReviewProgress } from './types';
import DeckList from './components/DeckList';
import ReviewSession from './components/ReviewSession';
import CardGenerator from './components/CardGenerator';
import ImageOcclusionEditor from './components/ImageOcclusionEditor';
import CreateDeckModal from './components/CreateDeckModal';
import CreateFolderModal from './components/CreateFolderModal';
import ManualCardModal from './components/ManualCardModal';
import MergeDeckModal from './components/MergeDeckModal';
import MoveDeckModal from './components/MoveDeckModal';
import ConfirmModal from './components/ConfirmModal';
import { Sparkles, Plus, Image as ImageIcon, Github, FilePlus, Zap, BookOpen } from 'lucide-react';
import { initialSRS } from './services/srsService';

interface AppData {
  decks: Deck[];
  cards: Flashcard[];
  folders: Folder[];
}

type ConfirmAction = 
  | { type: 'deleteDeck'; id: string }
  | { type: 'resetDeck'; id: string }
  | { type: 'deleteFolder'; id: string }
  | null;

function App() {
  // --- State ---
  const [data, setData] = useState<AppData>({ decks: [], cards: [], folders: [] });
  const [view, setView] = useState<'home' | 'review' | 'generate' | 'occlusion'>('home');
  const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState<'standard' | 'cram'>('standard');
  const [reviewProgress, setReviewProgress] = useState<Record<string, ReviewProgress>>({});
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingDeck, setEditingDeck] = useState<Deck | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | undefined>(undefined);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [deckToMove, setDeckToMove] = useState<Deck | null>(null);
  
  // Card Modal State
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<Flashcard | null>(null);
  
  const [showMergeModal, setShowMergeModal] = useState(false);
  
  // Confirmation State
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  // --- Deck Handlers ---
  const handleCreateDeck = (name: string) => {
    // Random color for the deck (Updated palette to remove purples)
    const colors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const newDeck: Deck = { id: uuidv4(), name, color, folderId: targetFolderId };
    setData(prev => ({ ...prev, decks: [...prev.decks, newDeck] }));
    setShowCreateModal(false);
    setTargetFolderId(undefined);
  };

  const handleEditDeck = (deck: Deck) => {
    setEditingDeck(deck);
    setShowCreateModal(true);
  };

  const handleUpdateDeckName = (name: string) => {
    if (editingDeck) {
        setData(prev => ({
            ...prev,
            decks: prev.decks.map(d => d.id === editingDeck.id ? { ...d, name } : d)
        }));
        setEditingDeck(null);
        setShowCreateModal(false);
    }
  };

  const confirmDeleteDeck = (id: string) => {
    setConfirmAction({ type: 'deleteDeck', id });
  };

  const executeDeleteDeck = (id: string) => {
    setData(prev => ({
      ...prev,
      decks: prev.decks.filter(d => d.id !== id),
      cards: prev.cards.filter(c => c.deckId !== id)
    }));
  };

  const handleSelectDeck = (id: string, mode: 'standard' | 'cram' = 'standard') => {
    setActiveDeckId(id);
    setStudyMode(mode);
    setView('review');
  };

  const confirmResetDeck = (id: string) => {
    setConfirmAction({ type: 'resetDeck', id });
  };

  const executeResetDeck = (id: string) => {
    setData(prev => ({
        ...prev,
        cards: prev.cards.map(c => {
            if (c.deckId === id) {
                return { ...c, srs: { ...initialSRS } };
            }
            return c;
        })
    }));
  };

  // --- Folder Handlers ---
  const handleCreateFolder = (name: string) => {
      const newFolder: Folder = { id: uuidv4(), name };
      setData(prev => ({ ...prev, folders: [...prev.folders, newFolder] }));
      setShowFolderModal(false);
  };

  const handleEditFolder = (folder: Folder) => {
      setEditingFolder(folder);
      setShowFolderModal(true);
  };

  const handleUpdateFolderName = (name: string) => {
      if (editingFolder) {
          setData(prev => ({
              ...prev,
              folders: prev.folders.map(f => f.id === editingFolder.id ? { ...f, name } : f)
          }));
          setEditingFolder(null);
          setShowFolderModal(false);
      }
  };

  const confirmDeleteFolder = (id: string) => {
      setConfirmAction({ type: 'deleteFolder', id });
  };

  const executeDeleteFolder = (id: string) => {
      setData(prev => {
          // Identify decks within the folder
          const decksToDelete = prev.decks.filter(d => d.folderId === id).map(d => d.id);
          
          return {
              ...prev,
              folders: prev.folders.filter(f => f.id !== id),
              decks: prev.decks.filter(d => d.folderId !== id),
              cards: prev.cards.filter(c => !decksToDelete.includes(c.deckId))
          };
      });
  };

  const openMoveDeckModal = (deck: Deck) => {
      setDeckToMove(deck);
      setShowMoveModal(true);
  };

  const handleMoveDeck = (folderId: string | undefined) => {
      if (deckToMove) {
          setData(prev => ({
              ...prev,
              decks: prev.decks.map(d => d.id === deckToMove.id ? { ...d, folderId } : d)
          }));
          setDeckToMove(null);
          setShowMoveModal(false);
      }
  };

  // --- Merge Handlers ---
  const handleMergeDecks = (deckIds: string[], newName: string) => {
    const newDeckId = uuidv4();
    const colors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const newDeck: Deck = {
        id: newDeckId,
        name: newName,
        color
    };

    setData(prev => ({
        ...prev,
        decks: [
            ...prev.decks.filter(d => !deckIds.includes(d.id)),
            newDeck
        ],
        cards: prev.cards.map(c => 
            deckIds.includes(c.deckId) ? { ...c, deckId: newDeckId } : c
        )
    }));
    setShowMergeModal(false);
  };

  // --- Card Handlers ---
  const handleAddCards = (newCards: Flashcard[]) => {
    setData(prev => ({ ...prev, cards: [...prev.cards, ...newCards] }));
  };

  const handleUpdateCard = (updatedCard: Flashcard) => {
    setData(prev => ({
      ...prev,
      cards: prev.cards.map(c => c.id === updatedCard.id ? updatedCard : c)
    }));
  };

  const handleSaveCard = (cards: Flashcard[]) => {
    if (editingCard) {
      // If editing, we typically expect to update one card.
      // However, if the user converted Basic -> Cloze and added multiple deletions,
      // we might need to update the original card AND add new ones.
      
      const primaryCard = cards.find(c => c.id === editingCard.id);
      const newCards = cards.filter(c => c.id !== editingCard.id);

      if (primaryCard) {
        handleUpdateCard(primaryCard);
      }
      if (newCards.length > 0) {
        handleAddCards(newCards);
      }
    } else {
      handleAddCards(cards);
    }
  };

  const handleDeleteCard = (cardId: string) => {
    setData(prev => ({
      ...prev,
      cards: prev.cards.filter(c => c.id !== cardId)
    }));
  };

  const openAddCardModal = () => {
    setEditingCard(null);
    setShowCardModal(true);
  };

  const openEditCardModal = (card: Flashcard) => {
    setEditingCard(card);
    setShowCardModal(true);
  };

  // --- Progress Handler ---
  const handleSaveProgress = (progress: ReviewProgress) => {
      if (!activeDeckId) return;
      setReviewProgress(prev => ({
          ...prev,
          [`${activeDeckId}-${studyMode}`]: progress
      }));
  };

  const handleClearProgress = () => {
    if (!activeDeckId) return;
    setReviewProgress(prev => {
        const newState = { ...prev };
        delete newState[`${activeDeckId}-${studyMode}`];
        return newState;
    });
  };

  // --- Import / Export Handlers ---

  const handleExportData = () => {
    const exportPayload = {
      ...data,
      reviewProgress
    };
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(exportPayload, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `flashcardlm-library-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  const handleExportDeck = (deckId: string) => {
    const deck = data.decks.find(d => d.id === deckId);
    if (!deck) return;
    const deckCards = data.cards.filter(c => c.deckId === deckId);
    
    // Filter progress for this deck
    const deckProgress: Record<string, ReviewProgress> = {};
    Object.keys(reviewProgress).forEach(key => {
        if (key.startsWith(deckId)) {
            deckProgress[key] = reviewProgress[key];
        }
    });

    // Export structure compatible with full import
    const exportData = { 
        decks: [deck], 
        cards: deckCards,
        reviewProgress: deckProgress
    };
    
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `${deck.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  const handleExportFolder = (folderId: string) => {
    const folder = data.folders.find(f => f.id === folderId);
    if (!folder) return;

    const folderDecks = data.decks.filter(d => d.folderId === folderId);
    const folderDeckIds = folderDecks.map(d => d.id);
    const folderCards = data.cards.filter(c => folderDeckIds.includes(c.deckId));

    const folderProgress: Record<string, ReviewProgress> = {};
    Object.keys(reviewProgress).forEach(key => {
        // key format is usually `deckId-mode`. We check if it starts with any of the deck IDs in this folder
        if (folderDeckIds.some(id => key.startsWith(id))) {
             folderProgress[key] = reviewProgress[key];
        }
    });

    const exportData = {
        folders: [folder],
        decks: folderDecks,
        cards: folderCards,
        reviewProgress: folderProgress
    };

    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `${folder.name.replace(/\s+/g, '-').toLowerCase()}-folder-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    const fileReader = new FileReader();

    if (fileExt === 'json') {
        fileReader.readAsText(file, "UTF-8");
        fileReader.onload = (event) => {
            if(event.target?.result) {
                try {
                    const parsed = JSON.parse(event.target.result as string);
                    if (parsed.decks && Array.isArray(parsed.decks) && parsed.cards && Array.isArray(parsed.cards)) {
                        setData(prev => {
                            const newDecks = parsed.decks.filter((d: Deck) => !prev.decks.some(pd => pd.id === d.id));
                            const newCards = parsed.cards.filter((c: Flashcard) => !prev.cards.some(pc => pc.id === c.id));
                            // Import folders if present, safely
                            const newFolders = (parsed.folders || []).filter((f: Folder) => !prev.folders.some(pf => pf.id === f.id));
                            return {
                                decks: [...prev.decks, ...newDecks],
                                cards: [...prev.cards, ...newCards],
                                folders: [...prev.folders, ...newFolders]
                            };
                        });

                        // Import Progress
                        if (parsed.reviewProgress) {
                            setReviewProgress(prev => ({
                                ...prev,
                                ...parsed.reviewProgress
                            }));
                        }

                        alert(`Import successful! Added decks and cards.`);
                        e.target.value = '';
                    } else {
                        alert("Invalid JSON format.");
                    }
                } catch (err) {
                    console.error(err);
                    alert("Failed to parse JSON file.");
                }
            }
        };
    } else if (['txt', 'csv', 'tsv'].includes(fileExt || '')) {
        fileReader.readAsText(file, "UTF-8");
        fileReader.onload = (event) => {
            if (event.target?.result) {
                const text = event.target.result as string;
                const lines = text.split(/\r?\n/);
                const newCards: Flashcard[] = [];
                const deckId = uuidv4();
                
                // Detect separator: Tab is standard Anki
                let separator = '\t'; 
                const validLine = lines.find(l => l.trim() && !l.startsWith('#'));
                if (validLine) {
                    if (validLine.includes('\t')) separator = '\t';
                    else if (validLine.includes(';')) separator = ';';
                    else if (validLine.includes(',') && !validLine.includes('\t')) separator = ',';
                }

                lines.forEach(line => {
                    if (!line.trim() || line.startsWith('#')) return;
                    const parts = line.split(separator);
                    
                    if (parts.length >= 2) {
                        const front = parts[0].trim();
                        const back = parts.slice(1).join(separator).trim();
                        
                        if (front && back) {
                            newCards.push({
                                id: uuidv4(),
                                deckId,
                                type: 'basic',
                                front,
                                back,
                                srs: { ...initialSRS },
                                createdAt: Date.now()
                            });
                        }
                    }
                });

                if (newCards.length > 0) {
                     const colors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500'];
                     const color = colors[Math.floor(Math.random() * colors.length)];
                     
                     const newDeck: Deck = {
                        id: deckId,
                        name: fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' '),
                        color,
                        folderId: targetFolderId // Support folder context on import? Not explicitly requested but good to note. For now defaults to undefined or needs more complex logic.
                     };

                     setData(prev => ({
                        ...prev,
                        decks: [...prev.decks, newDeck],
                        cards: [...prev.cards, ...newCards]
                     }));
                     alert(`Imported deck "${newDeck.name}" with ${newCards.length} cards.`);
                     e.target.value = '';
                } else {
                    alert("No valid cards found.");
                }
            }
        };
    } else {
        alert("Unsupported file type.");
    }
  };

  // --- Render Helpers ---
  const activeDeck = data.decks.find(d => d.id === activeDeckId);

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 overflow-hidden">
      
      {/* Navbar - Fixed Height */}
      <header className="shrink-0 bg-zinc-950/90 backdrop-blur-xl z-40 border-b border-zinc-800/50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setView('home')}
          >
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-300 group-hover:scale-105">
                <BookOpen size={20} className="text-zinc-950 fill-zinc-950" />
            </div>
            <div className="flex flex-col justify-center">
                <span className="text-lg font-bold tracking-tight text-white leading-none group-hover:text-emerald-400 transition-colors">
                    Flashcard<span className="text-emerald-500 group-hover:text-emerald-400">LM</span>
                </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             {activeDeckId && view === 'review' && (
                <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
                    <button 
                        onClick={openAddCardModal}
                        className="flex items-center gap-2 text-sm font-medium hover:bg-zinc-800 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-all"
                        title="Add Manual Card"
                    >
                        <FilePlus size={16} /> 
                    </button>
                    <div className="h-4 w-px bg-zinc-800 mx-1"></div>
                    <button 
                        onClick={() => setView('generate')}
                        className="flex items-center gap-2 text-sm font-medium hover:bg-zinc-800 text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-lg transition-all"
                        title="AI Generation"
                    >
                        <Sparkles size={16} /> <span className="hidden sm:inline">Generate</span>
                    </button>
                    <button 
                        onClick={() => setView('occlusion')}
                        className="flex items-center gap-2 text-sm font-medium hover:bg-zinc-800 text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg transition-all"
                        title="Image Occlusion"
                    >
                        <ImageIcon size={16} /> 
                    </button>
                </div>
             )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden flex flex-col">
        {view === 'home' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <DeckList 
                decks={data.decks}
                folders={data.folders}
                cards={data.cards} 
                onCreateDeck={(folderId) => { setTargetFolderId(folderId); setEditingDeck(null); setShowCreateModal(true); }}
                onCreateFolder={() => { setEditingFolder(null); setShowFolderModal(true); }}
                onSelectDeck={handleSelectDeck}
                onDeleteDeck={confirmDeleteDeck}
                onResetDeck={confirmResetDeck}
                onEditDeck={handleEditDeck}
                onExportData={handleExportData}
                onImportData={handleImportData}
                onExportDeck={handleExportDeck}
                onExportFolder={handleExportFolder}
                onMergeClick={() => setShowMergeModal(true)}
                onDeleteFolder={confirmDeleteFolder}
                onEditFolder={handleEditFolder}
                onMoveDeck={openMoveDeckModal}
            />
          </div>
        )}

        {view === 'review' && activeDeck && (
          <ReviewSession 
            key={`${activeDeckId}-${studyMode}`} // Force remount on mode change
            deckName={activeDeck.name}
            cards={data.cards.filter(c => c.deckId === activeDeckId)}
            studyMode={studyMode}
            onUpdateCard={handleUpdateCard}
            onDeleteCard={handleDeleteCard}
            onEditCard={openEditCardModal}
            onFinish={() => setView('home')}
            onGenerate={() => setView('generate')}
            onOcclusion={() => setView('occlusion')}
            initialProgress={reviewProgress[`${activeDeckId}-${studyMode}`]}
            onSaveProgress={handleSaveProgress}
            onClearProgress={handleClearProgress}
          />
        )}

        {view === 'generate' && activeDeckId && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <CardGenerator 
                    deckId={activeDeckId}
                    onCardsGenerated={handleAddCards}
                    onClose={() => setView('review')}
                />
            </div>
        )}

        {view === 'occlusion' && activeDeckId && (
            <ImageOcclusionEditor 
                deckId={activeDeckId}
                onSave={(cards) => {
                    handleAddCards(cards);
                }}
                onClose={() => setView('review')}
            />
        )}
      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreateDeckModal 
          onClose={() => { setShowCreateModal(false); setEditingDeck(null); }}
          onCreate={editingDeck ? handleUpdateDeckName : handleCreateDeck}
          initialName={editingDeck?.name}
          title={editingDeck ? "Edit Deck Name" : "Create New Deck"}
        />
      )}

      {showFolderModal && (
          <CreateFolderModal
            onClose={() => { setShowFolderModal(false); setEditingFolder(null); }}
            onCreate={editingFolder ? handleUpdateFolderName : handleCreateFolder}
            initialName={editingFolder?.name}
            title={editingFolder ? "Rename Folder" : "Create New Folder"}
          />
      )}

      {showMoveModal && deckToMove && (
          <MoveDeckModal
            deck={deckToMove}
            folders={data.folders}
            onClose={() => { setShowMoveModal(false); setDeckToMove(null); }}
            onMove={handleMoveDeck}
          />
      )}

      {showCardModal && activeDeckId && (
        <ManualCardModal 
            deckId={activeDeckId}
            onClose={() => setShowCardModal(false)}
            onSave={handleSaveCard}
            initialCard={editingCard}
        />
      )}

      {showMergeModal && (
          <MergeDeckModal
            decks={data.decks}
            onClose={() => setShowMergeModal(false)}
            onMerge={handleMergeDecks}
          />
      )}

      {confirmAction && (
          <ConfirmModal 
            isOpen={true}
            title={
                confirmAction.type === 'deleteDeck' ? 'Delete Deck' : 
                confirmAction.type === 'deleteFolder' ? 'Delete Folder' : 'Reset Deck'
            }
            message={
                confirmAction.type === 'deleteDeck' 
                ? "Are you sure you want to delete this deck? All flashcards inside it will be permanently lost."
                : confirmAction.type === 'deleteFolder'
                ? "Are you sure you want to delete this folder? All decks and flashcards inside it will be permanently lost."
                : "Are you sure you want to reset all progress for this deck? All spaced repetition data will be reset to zero."
            }
            confirmLabel={
                confirmAction.type === 'resetDeck' ? 'Reset Progress' : 'Delete Forever'
            }
            isDestructive={true}
            onConfirm={() => {
                if (confirmAction.type === 'deleteDeck') executeDeleteDeck(confirmAction.id);
                if (confirmAction.type === 'resetDeck') executeResetDeck(confirmAction.id);
                if (confirmAction.type === 'deleteFolder') executeDeleteFolder(confirmAction.id);
            }}
            onCancel={() => setConfirmAction(null)}
          />
      )}

    </div>
  );
}

export default App;