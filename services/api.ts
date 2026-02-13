
import { GoogleGenAI, Modality } from "@google/genai";
import { Question, QuizSession, QuizStatus, Submission, SubmissionType } from '../types';
import { QuizService } from './mockBackend';

// --- Rate Limiter & Queue System ---
const QUEUE_DELAY_MS = 1500; // 1.5s delay between TTS calls to satisfy rate limits
const STORAGE_KEY_TTS = 'DUK_TTS_CACHE_V2';

type QueueItem = {
  text: string;
  resolve: (value: string | undefined) => void;
};

const requestQueue: QueueItem[] = [];
let isProcessingQueue = false;

// Helper to load/save persistent audio cache
const getPersistentCache = (): Record<string, string> => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_TTS);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

const saveToPersistentCache = (key: string, base64: string) => {
  try {
    const cache = getPersistentCache();
    // Simple LRU-ish protection: if cache > 5MB, clear it to be safe (browser limits are usually 5-10MB)
    if (JSON.stringify(cache).length > 4 * 1024 * 1024) {
      localStorage.removeItem(STORAGE_KEY_TTS);
      return; 
    }
    cache[key] = base64;
    localStorage.setItem(STORAGE_KEY_TTS, JSON.stringify(cache));
  } catch (e) {
    console.warn("LocalStorage full, skipping cache save");
  }
};

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;

  const { text, resolve } = requestQueue.shift()!;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (audioData) {
      // Save to persistent cache
      const cacheKey = text.trim().toLowerCase();
      saveToPersistentCache(cacheKey, audioData);
    }
    resolve(audioData);

  } catch (error: any) {
    console.error("TTS Queue Error:", error);
    // If rate limited, we resolve undefined but we DON'T stop the queue.
    // We just wait longer.
    resolve(undefined);
  } finally {
    // Wait before processing the next item
    setTimeout(() => {
      isProcessingQueue = false;
      processQueue();
    }, QUEUE_DELAY_MS);
  }
};

export const API = {
  
  fetchSession: async (id: string): Promise<QuizSession> => {
    return QuizService.getSession();
  },

  updateSessionStatus: async (status: QuizStatus): Promise<QuizSession> => {
    return QuizService.updateStatus(status);
  },

  setCurrentQuestion: async (questionId: string): Promise<QuizSession> => {
    return QuizService.setQuestion(questionId);
  },

  submitTeamAnswer: async (teamId: string, questionId: string, answer?: number, type: SubmissionType = 'ANSWER'): Promise<Submission> => {
    return QuizService.submitAnswer(teamId, questionId, answer, type);
  },

  revealAnswerAndProcessScores: async (): Promise<QuizSession> => {
    return QuizService.revealAndScore();
  },

  resetSession: async (): Promise<QuizSession> => {
    localStorage.removeItem(STORAGE_KEY_TTS); // Optional: Clear audio cache on reset
    return QuizService.resetSession();
  },

  forcePass: async (): Promise<QuizSession> => {
    return QuizService.forcePass();
  },

  completeReading: async (): Promise<QuizSession> => {
    return QuizService.completeReading();
  },

  getAIHostInsight: async (status: QuizStatus, questionText?: string, context?: string): Promise<string> => {
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-3-flash-preview';
      
      const prompt = `
        You are 'Bodhini', an AI quiz host with a sweet, warm, and melodic voice, speaking in polite Indian English.
        Current Status: ${status}
        ${questionText ? `Question: "${questionText}"` : ''}
        ${context ? `Context: ${context}` : ''}
        Rules: Keep it under 15 words. Enthusiastic but professional. No quotes.
      `;

      const response = await genAI.models.generateContent({
        model: model,
        contents: prompt
      });

      return response.text || "Proceeding.";
    } catch (error) {
      console.error("Gemini Insight Error:", error);
      return "Processing.";
    }
  },

  // Optimized TTS with Throttling and Persistence
  getTTSAudio: async (text: string): Promise<string | undefined> => {
    const cacheKey = text.trim().toLowerCase();
    
    // 1. Check Persistent Storage First (Instant)
    const persistentCache = getPersistentCache();
    if (persistentCache[cacheKey]) {
      return persistentCache[cacheKey];
    }

    // 2. Add to Rate-Limited Queue
    return new Promise((resolve) => {
      requestQueue.push({ text, resolve });
      processQueue();
    });
  },

  generateBodhiniAudio: async (text: string): Promise<string | undefined> => {
    return API.getTTSAudio(text);
  },

  formatQuestionForSpeech: (question: Question, activeTeamName?: string): string => {
    const opts = question.options.map((opt, i) => `Option ${String.fromCharCode(65+i)}: ${opt}`).join('. ');
    
    if (question.roundType === 'BUZZER') {
      return `Buzzer Round for ${question.points} credits! Hands on buttons. Here is the question: ${question.text}. ${opts}.`;
    } else {
      const intro = activeTeamName 
        ? `Standard Round. Question for ${activeTeamName}.` 
        : "Standard Round.";
      return `${intro} ${question.text}. ${opts}.`;
    }
  }
};
