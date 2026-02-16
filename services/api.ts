import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly";
import { Question, QuizSession, QuizStatus, Submission, SubmissionType, RoundType, Difficulty } from '../types';
import { QuizService } from './mockBackend';

const AWS_CONFIG = {
  REGION: "us-east-1",
  ACCESS_KEY: "AKIAWFBMM4PZB6RFGBFR", 
  SECRET_KEY: "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" 
};

const QUEUE_DELAY_MS = 300; 
const STORAGE_KEY_TTS = 'DUK_TTS_CACHE_AWS_POLLY_V2';

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

const uint8ArrayToBase64 = (u8Arr: Uint8Array): string => {
  let chunk = "";
  for (let i = 0; i < u8Arr.byteLength; i++) {
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
  } catch (error) {
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
      const response = await fetch('https://yzkb3thuf4.execute-api.us-east-1.amazonaws.com/prod/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: "question",
          difficulty: difficulty.toLowerCase()
        })
      });
      const data = await response.json();
      
      const mappedOptions = [
        data.options.A,
        data.options.B,
        data.options.C,
        data.options.D
      ];
      const correctIdx = ['A', 'B', 'C', 'D'].indexOf(data.correct_answer);

      const question: Question = {
        id: `aws_${Date.now()}`,
        text: data.question,
        options: mappedOptions,
        correctAnswer: correctIdx,
        explanation: data.explanation,
        points: nextRound === 'BUZZER' ? 150 : 100,
        timeLimit: 30,
        roundType: nextRound,
        difficulty: difficulty,
        hint: data.hint || 'Analyze the query carefully.'
      };

      return QuizService.injectDynamicQuestion(question);
    } catch (e) {
      console.error("AWS Generation Failed", e);
      throw e;
    }
  },

  getTTSAudio: async (text: string): Promise<string | undefined> => {
    const cacheKey = text.trim().toLowerCase();
    const persistentCache = getPersistentCache();
    if (persistentCache[cacheKey]) return persistentCache[cacheKey];
    
    // Slower prosody rate for clearer neural synthesis
    const ssmlText = text.includes('<speak>') ? text : `<speak><prosody rate="0.9">${text}</prosody></speak>`;
    
    return new Promise((resolve) => {
      requestQueue.push({ text: ssmlText, isSSML: true, resolve });
      processQueue();
    });
  },

  formatQuestionForSpeech: (question: Question, activeTeamName?: string): string => {
    const opts = question.options.map((opt, i) => `Option ${String.fromCharCode(65+i)}. <break time="200ms"/> ${opt}`).join('. <break time="400ms"/> ');
    let intro = question.roundType === 'BUZZER' 
      ? `Buzzer Round. Hands ready.` 
      : `Team ${activeTeamName}, this is your node.`;
    
    return `<speak><prosody rate="0.9">${intro} <break time="500ms"/> ${question.text} <break time="800ms"/> Options are: <break time="300ms"/> ${opts}</prosody></speak>`;
  },

  formatExplanationForSpeech: (explanation: string, isCorrect?: boolean): string => {
    const resultPhrase = isCorrect === undefined ? "" : (isCorrect ? "That is correct." : "That is incorrect.");
    return `<speak><prosody rate="0.9">${resultPhrase} <break time="400ms"/> Synthesis complete. Here is the context: <break time="400ms"/> ${explanation}</prosody></speak>`;
  }
};