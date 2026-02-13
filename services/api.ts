
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
    const random = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

    if (status === QuizStatus.REVEALED && context) {
      if (context.includes("Correct")) {
        const shouts = ["YES!", "EXCELLENT!", "SPOT ON!", "MAGNIFICENT!", "ABSOLUTELY CORRECT!", "BOOM! THAT IS IT!"];
        const intro = [
          "You handled that question with remarkable efficiency.",
          "An impressive display of domain knowledge!",
          "That was exactly the response my processors were looking for.",
          "You are navigating this challenge with true intellectual grace.",
          "Your neural pathways are clearly well-optimized."
        ];
        const facts = [
          "Did you know that the first AI chess program was written back in 1951? It took several minutes to move!",
          "Fascinatingly, the term 'Machine Learning' was actually coined by Arthur Samuel in 1959.",
          "Neural networks are inspired by the brain, but they use millions of parameters to achieve this level of precision.",
          "In 1997, Deep Blue's victory marked a turning point in how we perceive silicon-based intelligence.",
          "Modern Large Language Models can have billions of parameters, mimicking the complexity of a small biological brain."
        ];
        
        const shout = random(shouts);
        const compliment = random(intro);
        const fact = random(facts);

        return `<speak>
          <prosody volume="x-loud" pitch="+15%">${shout}</prosody> 
          <break time="600ms"/>
          ${compliment} <break time="400ms"/> Here is a quick fact: ${fact}
        </speak>`;
      } else {
        const sympathy = [
          "I am afraid that is incorrect.", 
          "Logic error detected in that response.", 
          "That sequence did not match the expected pattern.", 
          "Unfortunately, that is not the right answer.", 
          "Incorrect. My database shows a different result."
        ];
        const followUp = [
          "Do not let it discourage you; recalibrate and focus on the next node.", 
          "Every error is simply a data point for future success.", 
          "Stay sharp. The digital arena rewards those who persist.",
          "Keep your focus. The leaderboard is still very much in flux."
        ];
        return `<speak>${random(sympathy)} <break time="500ms"/> ${random(followUp)}</speak>`;
      }
    }

    if (status === QuizStatus.PREVIEW) {
      const excitement = [
        "A fresh challenge is manifesting. I hope your processors are ready!",
        "Inbound transmission detected. This next sequence looks particularly interesting.",
        "Initializing the next query. Let us see how you handle this level of complexity.",
        "Prepare yourselves. We are moving deeper into the intelligence cluster."
      ];
      return `<speak>${random(excitement)}</speak>`;
    }

    return "<speak>Monitoring system health. Please stand by for the next instruction.</speak>";
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
    const opts = question.options.map((opt, i) => `Option ${String.fromCharCode(65+i)}. <break time="300ms"/> ${opt}`).join('. <break time="600ms"/> ');
    let intro = "";
    if (question.roundType === 'BUZZER') {
      intro = `Attention participants. This is a Buzzer Round. Difficulty level: ${question.difficulty}. Points at stake: ${question.points}. Hands on your buzzers now.`;
    } else {
      intro = activeTeamName 
        ? `Team ${activeTeamName}, this ${question.difficulty} question is your responsibility. It is worth ${question.points} credits. Good luck.` 
        : `Standard Round. Difficulty is ${question.difficulty}. Prepare for the query.`;
    }
    return `<speak>${intro} <break time="1000ms"/> ${question.text} <break time="1200ms"/> The options are: <break time="400ms"/> ${opts}</speak>`;
  }
};
