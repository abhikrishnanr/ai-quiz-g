
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { GoogleGenAI } from "@google/genai";
import { Question, QuizSession, QuizStatus, Submission, SubmissionType } from '../types';
import { QuizService } from './mockBackend';

const AWS_CONFIG = {
  REGION: "us-east-1",
  ACCESS_KEY: "AKIAWFBMM4PZB6RFGBFR", 
  SECRET_KEY: "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" 
};

const QUEUE_DELAY_MS = 500; 
const STORAGE_KEY_TTS = 'DUK_TTS_CACHE_AWS_POLLY';

const pollyClient = new PollyClient({
  region: AWS_CONFIG.REGION,
  credentials: {
    accessKeyId: AWS_CONFIG.ACCESS_KEY,
    secretAccessKey: AWS_CONFIG.SECRET_KEY
  }
});

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type QueueItem = {
  text: string;
  isSSML: boolean;
  resolve: (value: string | undefined) => void;
};

const requestQueue: QueueItem[] = [];
let isProcessingQueue = false;

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
  fetchSession: async (id: string): Promise<QuizSession> => QuizService.getSession(),
  updateSessionStatus: async (status: QuizStatus): Promise<QuizSession> => QuizService.updateStatus(status),
  setCurrentQuestion: async (questionId: string): Promise<QuizSession> => QuizService.setQuestion(questionId),
  submitTeamAnswer: async (teamId: string, questionId: string, answer?: number, type: SubmissionType = 'ANSWER'): Promise<Submission> => QuizService.submitAnswer(teamId, questionId, answer, type),
  revealAnswerAndProcessScores: async (): Promise<QuizSession> => QuizService.revealAndScore(),
  resetSession: async (): Promise<QuizSession> => {
    localStorage.removeItem(STORAGE_KEY_TTS);
    return QuizService.resetSession();
  },
  forcePass: async (): Promise<QuizSession> => QuizService.forcePass(),
  completeReading: async (): Promise<QuizSession> => QuizService.completeReading(),

  getAIHostInsight: async (status: QuizStatus, questionText?: string, context?: string): Promise<string> => {
    try {
      const prompt = `
        You are "Bodhini", an intelligent, talkative, and witty AI Quiz Master at Digital University Kerala.
        Current Quiz Phase: ${status}
        Question: ${questionText || "None"}
        Context: ${context || "Awaiting results"}

        Your Goal: 
        1. If someone is correct, start with an enthusiastic shout like "YES!" or "SPOT ON!" (use SSML <prosody volume="x-loud" pitch="+10%">...).
        2. Be VERY talkative. Share a brief, fun, or intelligent fact related to the question topic.
        3. If incorrect, be empathetic but professional.
        4. Keep responses between 2-4 sentences.
        5. Use SSML format. Wrap in <speak> tags.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      let text = response.text || "Ready for the next sequence.";
      if (!text.startsWith('<speak>')) text = `<speak>${text}</speak>`;
      return text;
    } catch (e) {
      console.error("Gemini failed", e);
      return "<speak>Processing continues. Stay sharp.</speak>";
    }
  },

  getTTSAudio: async (text: string): Promise<string | undefined> => {
    const cacheKey = text.trim().toLowerCase();
    const persistentCache = getPersistentCache();
    if (persistentCache[cacheKey]) return persistentCache[cacheKey];
    const isSSML = text.includes('<speak>');
    return new Promise((resolve) => {
      requestQueue.push({ text, isSSML, resolve });
      processQueue();
    });
  },

  formatQuestionForSpeech: (question: Question, activeTeamName?: string): string => {
    const opts = question.options.map((opt, i) => `Option ${String.fromCharCode(65+i)}. ${opt}`).join('. <break time="400ms"/> ');
    const intro = activeTeamName ? `Team ${activeTeamName}, this ${question.difficulty} question is for you.` : `Buzzer Round. ${question.difficulty} level.`;
    return `<speak>${intro} <break time="500ms"/> ${question.text} <break time="1000ms"/> ${opts}</speak>`;
  }
};
