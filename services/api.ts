
import { GoogleGenAI, Modality } from "@google/genai";
import { QuizSession, QuizStatus, Submission, SubmissionType } from '../types';
import { QuizService } from './mockBackend';

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
    return QuizService.resetSession();
  },

  forcePass: async (): Promise<QuizSession> => {
    return QuizService.forcePass();
  },

  getAIHostInsight: async (status: QuizStatus, questionText?: string, lastResult?: string): Promise<string> => {
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-3-flash-preview';
      
      const prompt = `
        You are 'Aura', the sophisticated and witty AI host of the DUK AI Quiz platform.
        Current Session Status: ${status}
        ${questionText ? `Active Question: "${questionText}"` : ''}
        ${lastResult ? `Context: ${lastResult}` : ''}

        Rules for response:
        1. Be witty, encouraging, and high-energy.
        2. Keep it under 10 words.
        3. Reference the competitive nature.
        4. Return ONLY the commentary string.
      `;

      const response = await genAI.models.generateContent({
        model: model,
        contents: prompt
      });

      return response.text || "Synchronizing with the neural net...";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Fascinating data patterns emerging.";
    }
  },

  generateAuraAudio: async (text: string): Promise<string | undefined> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say with sophisticated robotic wit: ${text}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' },
            },
          },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (error) {
      console.error("TTS Error:", error);
      return undefined;
    }
  }
};
