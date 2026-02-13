
import { GoogleGenAI, Modality } from "@google/genai";
import { Question, QuizSession, QuizStatus, Submission, SubmissionType } from '../types';
import { QuizService } from './mockBackend';

export const API = {
  // Simple in-memory cache for TTS audio to avoid 429s on repeated phrases
  ttsCache: new Map<string, string>(),

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
    return QuizService.resetSession();
  },

  forcePass: async (): Promise<QuizSession> => {
    return QuizService.forcePass();
  },

  completeReading: async (): Promise<QuizSession> => {
    return QuizService.completeReading();
  },

  // Generates dynamic commentary (Higher Latency: ~2-3s)
  getAIHostInsight: async (status: QuizStatus, questionText?: string, context?: string): Promise<string> => {
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-3-flash-preview';
      
      const prompt = `
        You are 'Bodhini', an AI quiz host with a sweet, warm, and melodic voice, speaking in polite Indian English.
        
        Current Status: ${status}
        ${questionText ? `Question: "${questionText}"` : ''}
        ${context ? `Context: ${context}` : ''}

        Rules:
        1. If status is REVEALED:
           - START IMMEDIATELY with "That is Correct!" or "Incorrect!" or "Correct answer!" with enthusiasm.
           - Then give a very brief 1-sentence explanation or encouragement.
           - Keep it under 15 words total.
        2. Keep it concise.
        3. No quotes.
      `;

      const response = await genAI.models.generateContent({
        model: model,
        contents: prompt
      });

      return response.text || "Proceeding.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Processing.";
    }
  },

  // Generates audio from text directly (Lower Latency: ~500ms - 1s)
  getTTSAudio: async (text: string): Promise<string | undefined> => {
    // 1. Check Cache First
    const cacheKey = text.trim().toLowerCase();
    if (API.ttsCache.has(cacheKey)) {
      return API.ttsCache.get(cacheKey);
    }

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
      
      // 2. Save to Cache if successful
      if (audioData) {
        API.ttsCache.set(cacheKey, audioData);
      }
      
      return audioData;
    } catch (error: any) {
      if (error.message?.includes('429')) {
         console.warn("TTS Rate Limit Reached - Using text fallback");
      } else {
         console.error("TTS Error:", error);
      }
      return undefined;
    }
  },

  // Alias for backward compatibility
  generateBodhiniAudio: async (text: string): Promise<string | undefined> => {
    return API.getTTSAudio(text);
  },

  formatQuestionForSpeech: (question: Question, activeTeamName?: string): string => {
    // Updated format for better TTS separation of options
    const opts = question.options.map((opt, i) => `Option ${String.fromCharCode(65+i)}: ${opt}`).join('. ');
    
    if (question.roundType === 'BUZZER') {
      return `Buzzer Round for ${question.points} credits! Hands on buttons. Here is the question: ${question.text}. ${opts}.`;
    } else {
      // Standard Round
      const intro = activeTeamName 
        ? `Standard Round. Question for ${activeTeamName}.` 
        : "Standard Round.";
      return `${intro} ${question.text}. ${opts}.`;
    }
  }
};
