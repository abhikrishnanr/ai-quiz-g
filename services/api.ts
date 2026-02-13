
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { GoogleGenAI } from "@google/genai";
import { Question, QuizSession, QuizStatus, Submission, SubmissionType } from '../types';
import { QuizService } from './mockBackend';

// --- Configuration ---
const AWS_CONFIG = {
  REGION: "us-east-1",
  ACCESS_KEY: "AKIAWFBMM4PZB6RFGBFR", 
  SECRET_KEY: "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" 
};

const QUEUE_DELAY_MS = 500; 
const STORAGE_KEY_TTS = 'DUK_TTS_CACHE_AWS_POLLY';

// --- Clients ---
const pollyClient = new PollyClient({
  region: AWS_CONFIG.REGION,
  credentials: {
    accessKeyId: AWS_CONFIG.ACCESS_KEY,
    secretAccessKey: AWS_CONFIG.SECRET_KEY
  }
});

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Queue System ---
type QueueItem = {
  text: string;
  isSSML: boolean;
  resolve: (value: string | undefined) => void;
};

const requestQueue: QueueItem[] = [];
let isProcessingQueue = false;

// --- Helper Functions ---

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
    if (JSON.stringify(cache).length > 5 * 1024 * 1024) {
      localStorage.removeItem(STORAGE_KEY_TTS);
      return; 
    }
    cache[key] = base64;
    localStorage.setItem(STORAGE_KEY_TTS, JSON.stringify(cache));
  } catch (e) {
    console.warn("LocalStorage full or error", e);
  }
};

const uint8ArrayToBase64 = (u8Arr: Uint8Array): string => {
  let chunk = "";
  const len = u8Arr.byteLength;
  for (let i = 0; i < len; i++) {
    chunk += String.fromCharCode(u8Arr[i]);
  }
  return btoa(chunk);
};

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;

  const { text, isSSML, resolve } = requestQueue.shift()!;

  try {
    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: "mp3",
      VoiceId: "Kajal", 
      Engine: "neural",
      TextType: isSSML ? "ssml" : "text"
    });

    const response = await pollyClient.send(command);

    if (response.AudioStream) {
      const byteArray = await response.AudioStream.transformToByteArray();
      const base64Audio = uint8ArrayToBase64(byteArray);
      
      const cacheKey = text.trim().toLowerCase();
      saveToPersistentCache(cacheKey, base64Audio);
      resolve(base64Audio);
    } else {
      resolve(undefined);
    }

  } catch (error: any) {
    console.error("AWS Polly Error:", error);
    resolve(undefined);
  } finally {
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
    localStorage.removeItem(STORAGE_KEY_TTS);
    return QuizService.resetSession();
  },

  forcePass: async (): Promise<QuizSession> => {
    return QuizService.forcePass();
  },

  completeReading: async (): Promise<QuizSession> => {
    return QuizService.completeReading();
  },

  // Dynamic Host Commentary using Gemini
  getAIHostInsight: async (status: QuizStatus, questionText?: string, context?: string): Promise<string> => {
    try {
      const prompt = `
        You are "Bodhini", a sophisticated and enthusiastic AI Quiz Master for a competitive event at Digital University Kerala.
        Your personality is professional, slightly futuristic, intelligent, and encouraging.
        
        Current Quiz State: ${status}
        ${questionText ? `Question Being Asked: "${questionText}"` : ""}
        ${context ? `Event Context: ${context}` : ""}
        
        TASK:
        Generate a short, snappy, and contextual comment (maximum 2 sentences).
        - If the team was correct, start with an enthusiastic "shout" (e.g., "YES!", "ABSOLUTELY!", "SPOT ON!").
        - If incorrect, be professional but empathetic.
        - If previewing a question, build anticipation.
        
        Return ONLY the spoken text, formatted for high-quality TTS.
        If the response is for a correct answer, wrap the "shout" part in <prosody volume="x-loud" pitch="+10%">...</prosody> and use a <break time="500ms"/> after it.
        The entire response MUST be wrapped in <speak> tags for SSML processing.
      `;

      const result = await genAI.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      let text = result.text || "";
      
      // Safety: Ensure it's wrapped in speak tags if Gemini forgot
      if (!text.includes('<speak>')) {
        text = `<speak>${text}</speak>`;
      }

      return text;
    } catch (err) {
      console.error("Gemini Error:", err);
      // Fallback
      return `<speak>Processing sequence complete. Ready for next input.</speak>`;
    }
  },

  getTTSAudio: async (text: string): Promise<string | undefined> => {
    const cacheKey = text.trim().toLowerCase();
    const persistentCache = getPersistentCache();
    if (persistentCache[cacheKey]) {
      return persistentCache[cacheKey];
    }

    const isSSML = text.includes('<speak>') || text.includes('<break');

    return new Promise((resolve) => {
      requestQueue.push({ text, isSSML, resolve });
      processQueue();
    });
  },

  generateBodhiniAudio: async (text: string): Promise<string | undefined> => {
    return API.getTTSAudio(text);
  },

  formatQuestionForSpeech: (question: Question, activeTeamName?: string): string => {
    const opts = question.options.map((opt, i) => `Option ${String.fromCharCode(65+i)} <break time="200ms"/> ${opt}`).join('. <break time="600ms"/> ');
    
    let intro = "";
    if (question.roundType === 'BUZZER') {
        intro = `Buzzer Round. ${question.difficulty} level for ${question.points} credits. Hands on buttons. <break time="500ms"/> Here is the question.`;
    } else {
        intro = activeTeamName 
            ? `Standard Round. ${question.difficulty} question for ${activeTeamName}.` 
            : `Standard Round. ${question.difficulty} difficulty.`;
    }

    return `<speak>${intro} <break time="500ms"/> ${question.text} <break time="800ms"/> ${opts}</speak>`;
  }
};
