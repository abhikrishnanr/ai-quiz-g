
import { GoogleGenAI } from "@google/genai";
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
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

// --- AWS Client Initialization ---
const pollyClient = new PollyClient({
  region: AWS_CONFIG.REGION,
  credentials: {
    accessKeyId: AWS_CONFIG.ACCESS_KEY,
    secretAccessKey: AWS_CONFIG.SECRET_KEY
  }
});

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
    // Clear cache if it gets too big (approx 5MB)
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

// Convert AWS Uint8Array to Base64
const uint8ArrayToBase64 = (u8Arr: Uint8Array): string => {
  let chunk = "";
  const len = u8Arr.byteLength;
  for (let i = 0; i < len; i++) {
    chunk += String.fromCharCode(u8Arr[i]);
  }
  return btoa(chunk);
};

// --- Queue Processor ---
const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;

  const { text, isSSML, resolve } = requestQueue.shift()!;

  try {
    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: "mp3",
      VoiceId: "Aditi", // Indian English Female Neural
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
    // Small delay to ensure smooth processing order
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

  // LLM Text Generation
  getAIHostInsight: async (status: QuizStatus, questionText?: string, context?: string): Promise<string> => {
    // Check if API_KEY is present to prevent crashes if environment isn't set up
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("API_KEY not found in environment.");
        return "Bodhini system ready.";
    }

    try {
      const genAI = new GoogleGenAI({ apiKey });
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

  // AWS Polly TTS Wrapper
  getTTSAudio: async (text: string): Promise<string | undefined> => {
    const cacheKey = text.trim().toLowerCase();
    
    // 1. Check Persistent Storage First
    const persistentCache = getPersistentCache();
    if (persistentCache[cacheKey]) {
      return persistentCache[cacheKey];
    }

    // 2. Add to Queue
    // Detect if text uses SSML tags
    const isSSML = text.includes('<speak>') || text.includes('<break');

    return new Promise((resolve) => {
      requestQueue.push({ text, isSSML, resolve });
      processQueue();
    });
  },

  // Alias for backward compatibility
  generateBodhiniAudio: async (text: string): Promise<string | undefined> => {
    return API.getTTSAudio(text);
  },

  formatQuestionForSpeech: (question: Question, activeTeamName?: string): string => {
    // Using SSML for AWS Polly to control pacing and pauses
    const opts = question.options.map((opt, i) => `Option ${String.fromCharCode(65+i)} <break time="200ms"/> ${opt}`).join('. <break time="600ms"/> ');
    
    let intro = "";
    if (question.roundType === 'BUZZER') {
        intro = `Buzzer Round for ${question.points} credits. Hands on buttons. <break time="500ms"/> Here is the question.`;
    } else {
        intro = activeTeamName 
            ? `Standard Round. Question for ${activeTeamName}.` 
            : "Standard Round.";
    }

    // Wrap in <speak> tag for SSML processing
    return `<speak>${intro} <break time="500ms"/> ${question.text} <break time="800ms"/> ${opts}</speak>`;
  }
};
