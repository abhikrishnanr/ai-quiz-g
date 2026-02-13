
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
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
    // Logic-based template system to simulate "talkative" LLM behavior
    const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    if (status === QuizStatus.REVEALED && context) {
      if (context.includes("Correct")) {
        const shouts = ["YES!", "ABSOLUTELY RIGHT!", "SPOT ON!", "BOOM! CORRECT!", "PERFECT EXECUTION!"];
        const compliments = [
          "Your neural pathways are firing with incredible precision.",
          "That was an exceptional display of cognitive speed.",
          "Truly a masterclass in AI knowledge.",
          "I am impressed by your systematic approach to this challenge.",
          "A stellar performance from a high-functioning cluster."
        ];
        const facts = [
          "Did you know that the term AI was actually coined back in 1956?",
          "It's fascinating how far we've come since the early days of symbolic logic.",
          "A correct answer here brings you closer to digital transcendence.",
          "Knowledge is the fuel that powers our neural architectures."
        ];
        
        const shout = random(shouts);
        const compliment = random(compliments);
        const fact = random(facts);

        return `<speak>
          <prosody volume="x-loud" pitch="+15%">${shout}</prosody> 
          <break time="500ms"/>
          ${compliment} <break time="300ms"/> ${fact}
        </speak>`;
      } else {
        const sympathy = ["I am afraid that is incorrect.", "Neural mismatch detected.", "Not quite the answer we needed.", "A temporary logic failure.", "Incorrect sequence."];
        const followUp = ["Stay focused, the next transmission could be yours.", "Calibration is key in competitive intelligence.", "Even the best models require fine-tuning."];
        return `<speak>${random(sympathy)} <break time="400ms"/> ${random(followUp)}</speak>`;
      }
    }

    if (status === QuizStatus.PREVIEW) {
      return `<speak>Prepare yourselves. A new challenge is materializing in the digital workspace. Stay sharp.</speak>`;
    }

    return "<speak>Monitoring session telemetry. Systems active.</speak>";
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
    const opts = question.options.map((opt, i) => `Option ${String.fromCharCode(65+i)}. <break time="200ms"/> ${opt}`).join('. <break time="500ms"/> ');
    let intro = "";
    if (question.roundType === 'BUZZER') {
      intro = `Attention. This is a Buzzer Round. Difficulty level: ${question.difficulty}. Points on the line: ${question.points}. Hands on buttons.`;
    } else {
      intro = activeTeamName 
        ? `Team ${activeTeamName}, this ${question.difficulty} question is your responsibility. Value: ${question.points} credits.` 
        : `Standard Round. ${question.difficulty} level.`;
    }
    return `<speak>${intro} <break time="800ms"/> ${question.text} <break time="1200ms"/> ${opts}</speak>`;
  }
};
