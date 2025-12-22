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

export interface Flashcard {
  id: string;
  deckId: string;
  type: 'basic' | 'image_occlusion';
  front: string; // Question or Image URL for occlusion
  back: string; // Answer or extra notes for occlusion
  occlusions?: OcclusionRect[]; // Only for image_occlusion
  srs: SRData;
  createdAt: number;
}

export interface Deck {
  id: string;
  name: string;
  color: string;
}

export interface GenerationStatus {
  totalChunks: number;
  processedChunks: number;
  isProcessing: boolean;
  error?: string;
  currentAction?: string;
}