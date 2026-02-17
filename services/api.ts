
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuizSession, QuizStatus, Submission, SubmissionType, RoundType, Difficulty, AskAiState } from '../types';
import { QuizService } from './mockBackend';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const QUEUE_DELAY_MS = 250; 
const STORAGE_KEY_TTS = 'DUK_TTS_CACHE_GEMINI_V3';

type QueueItem = {
  text: string;
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
    cache[key] = base64;
    localStorage.setItem(STORAGE_KEY_TTS, JSON.stringify(cache));
  } catch (e) {}
};

const processQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0 || !process.env.API_KEY) return;
  isProcessingQueue = true;
  const { text, resolve } = requestQueue.shift()!;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `In a clear, professional, and helpful tone: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const cacheKey = text.trim().toLowerCase();
      saveToPersistentCache(cacheKey, base64Audio);
      resolve(base64Audio);
    } else {
      resolve(undefined);
    }
  } catch (error) {
    console.error("Gemini TTS Failed", error);
    resolve(undefined);
  } finally {
    setTimeout(() => {
      isProcessingQueue = false;
      processQueue();
    }, QUEUE_DELAY_MS);
  }
};

export const API = {
  fetchSession: async (): Promise<QuizSession> => QuizService.getSession(),
  updateSessionStatus: async (status: QuizStatus): Promise<QuizSession> => QuizService.updateStatus(status),
  revealAnswerAndProcessScores: async (): Promise<QuizSession> => QuizService.revealAndScore(),
  revealExplanation: async (): Promise<QuizSession> => QuizService.revealExplanation(),
  resetSession: async (): Promise<QuizSession> => QuizService.resetSession(),
  completeReading: async (): Promise<QuizSession> => QuizService.completeReading(),
  requestHint: async (teamId: string): Promise<QuizSession> => QuizService.requestHint(teamId),
  toggleHint: async (visible: boolean): Promise<QuizSession> => QuizService.toggleHintVisibility(visible),
  submitTeamAnswer: async (teamId: string, qId: string, ans?: number, type: SubmissionType = 'ANSWER'): Promise<Submission> => QuizService.submitAnswer(teamId, qId, ans, type),

  setRoundMode: async (type: RoundType): Promise<QuizSession> => {
    await QuizService.setNextRoundType(type);
    return API.generateQuestion();
  },

  generateQuestion: async (): Promise<QuizSession> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");
    const session = await QuizService.getSession();
    const nextRound = session.nextRoundType;

    // IF Next round is ASK_AI, we don't generate a question text, we just initialize the round structure
    if (nextRound === 'ASK_AI') {
        const dummyQuestion: Question = {
            id: `ask_ai_${Date.now()}`,
            text: "Ask the AI Round",
            options: [],
            correctAnswer: -1,
            explanation: "",
            points: 200, // Bonus points if AI fails
            timeLimit: 60,
            roundType: 'ASK_AI',
            difficulty: 'HARD',
            hint: ''
        };
        return QuizService.injectDynamicQuestion(dummyQuestion);
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate a multiple-choice quiz question about Artificial Intelligence. Round type: ${nextRound}.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: {
                type: Type.OBJECT,
                properties: {
                  A: { type: Type.STRING },
                  B: { type: Type.STRING },
                  C: { type: Type.STRING },
                  D: { type: Type.STRING },
                },
                required: ['A', 'B', 'C', 'D']
              },
              correct_answer: { type: Type.STRING },
              explanation: { type: Type.STRING },
              hint: { type: Type.STRING },
            },
            required: ['question', 'options', 'correct_answer', 'explanation', 'hint']
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      const question: Question = {
        id: `gemini_${Date.now()}`,
        text: data.question,
        options: [data.options.A, data.options.B, data.options.C, data.options.D],
        correctAnswer: ['A', 'B', 'C', 'D'].indexOf(data.correct_answer),
        explanation: data.explanation,
        points: nextRound === 'BUZZER' ? 150 : 100,
        timeLimit: 30,
        roundType: nextRound,
        difficulty: 'MEDIUM',
        hint: data.hint || 'Analyze the context.'
      };

      return QuizService.injectDynamicQuestion(question);
    } catch (e) {
      console.error("Gemini Question Generation Failed", e);
      throw e;
    }
  },

  getTTSAudio: async (text: string): Promise<string | undefined> => {
    const cacheKey = text.trim().toLowerCase();
    const persistentCache = getPersistentCache();
    if (persistentCache[cacheKey]) return persistentCache[cacheKey];
    
    return new Promise((resolve) => {
      requestQueue.push({ text, resolve });
      processQueue();
    });
  },

  formatQuestionForSpeech: (question: Question, activeTeamName?: string): string => {
    if (question.roundType === 'ASK_AI') {
        return `Ask the AI Round initiated. ${activeTeamName ? activeTeamName + ', please activate your microphone.' : 'Prepare your queries.'}`;
    }
    const opts = question.options.map((opt, i) => `Option ${String.fromCharCode(65+i)}. ${opt}`).join('. ');
    return `${question.text} Options are: ${opts}`;
  },

  formatExplanationForSpeech: (explanation: string, isCorrect?: boolean): string => {
    return `${explanation}`;
  },

  // Ask AI Specifics
  setAskAiState: async (state: AskAiState): Promise<QuizSession> => {
      return QuizService.setAskAiState(state);
  },

  submitAskAiQuestion: async (questionText: string): Promise<QuizSession> => {
      await QuizService.setAskAiState('PROCESSING', { question: questionText });
      return API.generateAskAiResponse(questionText);
  },

  generateAskAiResponse: async (userQuestion: string): Promise<QuizSession> => {
    if (!process.env.API_KEY) throw new Error("API Key missing");

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `
                User Question: "${userQuestion}"
                
                System Instruction:
                You are a participant in a quiz show.
                ALLOWED DOMAINS: AI & ML, Blockchain, Data Science, Cyber Security, Robotics + IoT, Digital India, Tech Innovations.
                
                Rules:
                1. If the User Question is NOT within the ALLOWED DOMAINS, respond EXACTLY with:
                   "Sorry, that question is out of the allowed domain for this round. Please ask within AI/ML, Blockchain, Data Science, Cyber Security, Robotics + IoT, Digital India, or Tech Innovations."
                2. If the question IS within domain, answer it concisely (max 2 sentences).
                3. Do not be conversational, just give the answer.
            `,
        });

        const aiText = response.text || "Unable to generate response.";
        return QuizService.setAskAiState('ANSWERING', { response: aiText });
    } catch (e) {
        console.error("Ask AI Gen Failed", e);
        return QuizService.setAskAiState('ANSWERING', { response: "I am experiencing network interference. Please try again." });
    }
  },

  judgeAskAi: async (verdict: 'AI_CORRECT' | 'AI_WRONG'): Promise<QuizSession> => {
      return QuizService.judgeAskAi(verdict);
  }
};
