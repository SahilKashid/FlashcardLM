import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Chunking constraints
const TOKENS_PER_CHUNK_APPROX = 2000;
const CHARS_PER_TOKEN_APPROX = 4;
const CHUNK_SIZE_CHARS = TOKENS_PER_CHUNK_APPROX * CHARS_PER_TOKEN_APPROX;

export const chunkText = (text: string): string[] => {
  const chunks: string[] = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    let end = Math.min(currentIndex + CHUNK_SIZE_CHARS, text.length);
    
    // Try to break at a newline or period to keep context intact
    if (end < text.length) {
        const lastNewLine = text.lastIndexOf('\n', end);
        const lastPeriod = text.lastIndexOf('.', end);
        
        if (lastNewLine > currentIndex + CHUNK_SIZE_CHARS * 0.8) {
            end = lastNewLine + 1;
        } else if (lastPeriod > currentIndex + CHUNK_SIZE_CHARS * 0.8) {
            end = lastPeriod + 1;
        }
    }

    chunks.push(text.slice(currentIndex, end));
    currentIndex = end;
  }
  return chunks;
};

export interface GeneratedCardData {
  front: string;
  back: string;
}

export type ContentInput = 
  | { type: 'text'; content: string }
  | { type: 'image'; content: string[] }; // Array of base64 strings

export const generateCardsFromContent = async (input: ContentInput): Promise<GeneratedCardData[]> => {
  const ai = getClient();
  let contents;

  const formattingInstruction = `
    FORMATTING RULES:
    - Use Markdown for structure (bold for key terms, lists for enumeration, tables for comparisons).
    - Use LaTeX for ALL math equations and scientific formulas.
    - Inline math must be wrapped in single dollar signs.
    - Block math (on its own line) must be wrapped in double dollar signs.
    - Use code blocks for programming code.
  `;

  const dataCompletionInstruction = `
    DATA COMPLETION INSTRUCTIONS:
    - INTELLIGENT GAP FILLING: If you identify a list, category, or pattern in the provided data where some items are missing examples or details (e.g., a list of 3 items where only 2 have examples), you MUST use your own knowledge to fill in these gaps.
    - The goal is to create complete and consistent flashcards, ensuring it matches the context.
  `;

  if (input.type === 'image') {
    // Multimodal Input (Images + Prompt)
    const imageParts = input.content.map(b64 => ({
        inlineData: {
            mimeType: 'image/jpeg',
            data: b64
        }
    }));
    
    contents = {
        parts: [
            ...imageParts,
            { text: `
                Analyze the following visual content (scanned document pages, slides, or diagrams). 
                Extract all key concepts, definitions, diagrams, and important details.
                Pay special attention to text inside images, charts, and handwritten notes.
                
                CRITICAL INSTRUCTION: The data provided is crucial and any crucial data loss in making flashcards is fatal. You must capture every important detail.

                Create high-quality flashcards.
                ${formattingInstruction}
                ${dataCompletionInstruction}

                Return a list of flashcards with 'front' (question) and 'back' (answer).
                Ensure the questions are precise and the answers are comprehensive but concise.
            `}
        ]
    };
  } else {
    // Text Input
    contents = `
        Analyze the following text and create high-quality flashcards. 
        Focus on key concepts, definitions, and important details.
        
        CRITICAL INSTRUCTION: The data provided is crucial and any crucial data loss in making flashcards is fatal. You must capture every important detail.

        Text content:
        """
        ${input.content}
        """
        
        Create high-quality flashcards.
        ${formattingInstruction}
        ${dataCompletionInstruction}

        Return a list of flashcards with 'front' (question) and 'back' (answer).
        Ensure the questions are precise and the answers are comprehensive but concise.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: contents,
      config: {
        thinkingConfig: { thinkingBudget: 1024 },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
            },
            required: ['front', 'back'],
          },
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedCardData[];
    }
    return [];
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const analyzeImageContext = async (base64Image: string): Promise<string> => {
    const ai = getClient();
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Image
                        }
                    },
                    {
                        text: "Identify the main object, diagram, or labels in this image. Provide the etymology and uses of the object and/or labels in a super friendly, easy-to-understand language. Keep it concise and educational."
                    }
                ]
            }
        });

        return response.text || "No context generated.";
    } catch (error) {
        console.error("Context Analysis Error:", error);
        return "Failed to analyze image context.";
    }
};