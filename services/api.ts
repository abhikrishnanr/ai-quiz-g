
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuizSession, QuizStatus, Submission, SubmissionType, RoundType, Difficulty } from '../types';
import { QuizService } from './mockBackend';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const QUEUE_DELAY_MS = 100; 
const STORAGE_KEY_TTS = 'DUK_TTS_CACHE_GEMINI_V1';

type QueueItem = {
  text: string;
  resolve: (value: string | undefined) => void;
};

const requestQueue: QueueItem[] = [];
let isProcessingQueue = false;

// Track difficulty for cycling
let difficultyIndex = 0;
const DIFFICULTY_LEVELS: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];

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
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  const { text, resolve } = requestQueue.shift()!;
  
  try {
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
  resetSession: async (): Promise<QuizSession> => QuizService.resetSession(),
  completeReading: async (): Promise<QuizSession> => QuizService.completeReading(),
  requestHint: async (teamId: string): Promise<QuizSession> => QuizService.requestHint(teamId),
  toggleHint: async (visible: boolean): Promise<QuizSession> => QuizService.toggleHintVisibility(visible),
  submitTeamAnswer: async (teamId: string, qId: string, ans?: number, type: SubmissionType = 'ANSWER'): Promise<Submission> => QuizService.submitAnswer(teamId, qId, ans, type),

  generateQuestion: async (): Promise<QuizSession> => {
    const session = await QuizService.getSession();
    const nextRound = session.nextRoundType;
    
    // Cycle through difficulty levels for progressive challenge
    const difficulty = DIFFICULTY_LEVELS[difficultyIndex % DIFFICULTY_LEVELS.length];
    difficultyIndex++;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a multiple-choice quiz question about Artificial Intelligence. 
        Difficulty: ${difficulty}.
        Return a JSON object with: question (string), options (object with A, B, C, D as strings), correct_answer (one of "A", "B", "C", "D"), explanation (string), and hint (string).`,
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
      
      const mappedOptions = [
        data.options.A,
        data.options.B,
        data.options.C,
        data.options.D
      ];
      const correctIdx = ['A', 'B', 'C', 'D'].indexOf(data.correct_answer);

      const question: Question = {
        id: `gemini_${Date.now()}`,
        text: data.question,
        options: mappedOptions,
        correctAnswer: correctIdx,
        explanation: data.explanation,
        points: nextRound === 'BUZZER' ? 150 : 100,
        timeLimit: 30,
        roundType: nextRound,
        difficulty: difficulty,
        hint: data.hint || 'Analyze the context clues.'
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
    const opts = question.options.map((opt, i) => `Option ${String.fromCharCode(65+i)}. ${opt}`).join('. ');
    let intro = question.roundType === 'BUZZER' 
      ? `Buzzer Round. Hands ready.` 
      : `Team ${activeTeamName}, this is your node.`;
    
    return `${intro} ${question.text} Options are: ${opts}`;
  },

  formatExplanationForSpeech: (explanation: string, isCorrect?: boolean): string => {
    const resultPhrase = isCorrect === undefined ? "" : (isCorrect ? "That is correct." : "That is incorrect.");
    return `${resultPhrase} Synthesis complete. Here is the context: ${explanation}`;
  }
};
