export interface SRData {
  interval: number; // Days until next review
  repetition: number; // Number of consecutive correct answers
  efactor: number; // Easiness factor (SM-2 algorithm)
  dueDate: number; // Timestamp
}

export interface OcclusionRect {
  id: string;
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width: number; // Percentage 0-100
  height: number; // Percentage 0-100
}

export interface Folder {
  id: string;
  name: string;
}

export interface Flashcard {
  id: string;
  deckId: string;
  type: 'basic' | 'image_occlusion' | 'cloze';
  front: string; // Question, Image URL, or Raw Text for Cloze
  back: string; // Answer, extra notes, or context
  image?: string; // Base64 string for basic cards (visual context)
  occlusions?: OcclusionRect[]; // Only for image_occlusion
  clozeDeletionIndex?: number; // Only for cloze, identifies which {{c#::}} to hide
  srs: SRData;
  createdAt: number;
}

export interface Deck {
  id: string;
  name: string;
  color: string;
  folderId?: string;
}

export interface GenerationStatus {
  totalChunks: number;
  processedChunks: number;
  isProcessing: boolean;
  error?: string;
  currentAction?: string;
}

export interface ReviewProgress {
  cardIds: string[];
  currentIndex: number;
  isShuffled: boolean;
}