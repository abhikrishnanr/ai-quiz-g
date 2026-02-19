
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Question, QuizSession, QuizStatus, Submission, SubmissionType, RoundType, Difficulty, AskAiState } from '../types';
import { QuizService } from './mockBackend';

// Using the specific API Key provided by the user
const API_KEY = "AIzaSyCndFesplBByK7zUeAsbeFWgi_8AVhDZiE";
const ai = new GoogleGenAI({ apiKey: API_KEY });

const STORAGE_KEY_TTS = 'DUK_TTS_CACHE_GEMINI_V3_CHARON';

type QueueItem = {
  text: string;
  resolve: (value: string | undefined) => void;
  isFallback?: boolean;
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
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;
  
  const item = requestQueue.shift()!;
  const { text, resolve, isFallback } = item;
  
  // Adding punctuation to slow down the AI naturally and make it more affectionate/expressive
  const expressiveText = text
    .replace(/\?/g, '... ?')
    .replace(/\!/g, '... !')
    .replace(/\./g, '... .');
    
  const safeText = expressiveText.length > 600 ? expressiveText.substring(0, 597) + "..." : expressiveText;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Please say this in a warm, slow, and affectionate Indian female voice: ${safeText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // Charon is a warm Indian female voice profile
            prebuiltVoiceConfig: { voiceName: 'Charon' },
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
      if (!isFallback) {
         const englishOnly = text.replace(/[^\x00-\x7F]/g, "").trim() || "Processing response.";
         requestQueue.unshift({ text: englishOnly, resolve, isFallback: true });
      } else {
         resolve(undefined);
      }
    }
  } catch (error) {
    console.error("Gemini TTS API Failed:", error);
    resolve(undefined);
  } finally {
    isProcessingQueue = false;
    // Add a slight intentional delay between generations to prevent overlap
    setTimeout(() => {
        if (requestQueue.length > 0) {
            processQueue();
        }
    }, 500);
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
  setActiveTeam: async (teamId: string): Promise<QuizSession> => QuizService.setActiveTeam(teamId),

  setRoundMode: async (type: RoundType): Promise<QuizSession> => {
    await QuizService.setNextRoundType(type);
    return API.generateQuestion();
  },

  generateQuestion: async (): Promise<QuizSession> => {
    const session = await QuizService.getSession();
    const nextRound = session.nextRoundType;

    if (nextRound === 'ASK_AI') {
        const dummyQuestion: Question = {
            id: `ask_ai_${Date.now()}`,
            text: "Ask AI Round: Challenge Bodhini with a live search question.",
            options: [],
            correctAnswer: -1,
            explanation: "",
            points: 200,
            timeLimit: 60,
            roundType: 'ASK_AI',
            difficulty: 'HARD',
            hint: ''
        };
        return QuizService.injectDynamicQuestion(dummyQuestion);
    }

    if (nextRound === 'VISUAL') {
        try {
            const imgPromptResponse = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: "Describe a futuristic piece of technology or a complex AI concept. Provide the name, a multiple choice set, and a very short explanation (max 20 words).",
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            concept: { type: Type.STRING },
                            imagePrompt: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            correctIndex: { type: Type.INTEGER },
                            explanation: { type: Type.STRING }
                        },
                        required: ['concept', 'imagePrompt', 'options', 'correctIndex', 'explanation']
                    }
                }
            });
            const data = JSON.parse(imgPromptResponse.text);
            
            const imageGen = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: [{ text: `A photorealistic close-up of ${data.imagePrompt}. High tech, blueprint style.` }],
                config: { imageConfig: { aspectRatio: "16:9" } }
            });
            
            let visualUri = "";
            for (const part of imageGen.candidates[0].content.parts) {
                if (part.inlineData) visualUri = `data:image/png;base64,${part.inlineData.data}`;
            }

            const question: Question = {
                id: `visual_${Date.now()}`,
                text: `Identify this component:`,
                options: data.options,
                correctAnswer: data.correctIndex,
                explanation: data.explanation,
                points: 250,
                timeLimit: 45,
                roundType: 'VISUAL',
                difficulty: 'HARD',
                hint: 'Look closely at the energy flow patterns.',
                visualUri
            };
            return QuizService.injectDynamicQuestion(question);
        } catch (e) {
            console.error("Visual Round Gen Failed", e);
        }
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Generate a multiple-choice quiz question about Artificial Intelligence. Round type: ${nextRound}. Ensure the explanation is very concise (max 30 words) and conversational.`,
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
      if (!isProcessingQueue) processQueue();
    });
  },

  formatQuestionForSpeech: (question: Question, activeTeamName?: string): string => {
    if (question.roundType === 'ASK_AI') return `Time for the Ask AI Challenge. ${activeTeamName}, I am ready for your question!`;
    if (question.roundType === 'VISUAL') return `Visual Round. Eyes on the screen, everyone! Identify this image for me.`;
    
    let prefix = "Let's move to the next question. ";
    if (question.roundType === 'STANDARD' && activeTeamName) {
        prefix = `Alright, this question is for ${activeTeamName}. `;
    } else if (question.roundType === 'BUZZER') {
        prefix = "Buzzer fingers ready! Everyone, this is for you. ";
    }

    const opts = question.options.map((opt, i) => `Option ${String.fromCharCode(65+i)}... ${opt}`).join('. ');
    return `${prefix}${question.text} ... Your options are: ${opts}`;
  },

  formatExplanationForSpeech: (explanation: string, isCorrect?: boolean): string => explanation,

  setAskAiState: async (state: AskAiState): Promise<QuizSession> => QuizService.setAskAiState(state),

  submitAskAiQuestion: async (questionText: string): Promise<QuizSession> => {
      await QuizService.setAskAiState('PROCESSING', { question: questionText });
      return API.generateAskAiResponse(questionText);
  },

  generateAskAiResponse: async (userQuestion: string): Promise<QuizSession> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `User Question: "${userQuestion}"\nSystem: You are Bodhini, an AI Quiz Host. Answer accurately but be very friendly and professional. Keep it under 30 words.`,
            config: {
                tools: [{ googleSearch: {} }]
            }
        });

        const aiText = response.text || "I'm sorry, my neural links are a bit flickering. Could you try asking me that one more time?";
        const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        const links = grounding
            .filter((chunk: any) => chunk.web)
            .map((chunk: any) => ({ title: chunk.web.title, uri: chunk.web.uri }));

        let session = await QuizService.setAskAiState('ANSWERING', { response: aiText });
        session.groundingUrls = links;
        localStorage.setItem('DUK_QUIZ_SESSION_V2', JSON.stringify(session));
        return session;
    } catch (e) {
        return QuizService.setAskAiState('ANSWERING', { response: "I'm having a little trouble connecting to my central core. Would you mind repeating that question?" });
    }
  },

  judgeAskAi: async (verdict: 'AI_CORRECT' | 'AI_WRONG'): Promise<QuizSession> => QuizService.judgeAskAi(verdict)
};
