
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

  getAIHostInsight: async (status: QuizStatus, questionText?: string, context?: string): Promise<string> => {
    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = 'gemini-3-flash-preview';
      
      // Prompt updated for:
      // 1. Faster/Punchier delivery (short sentences).
      // 2. High energy Indian English persona named Bodhini.
      // 3. Explicit "Shouting" for results.
      const prompt = `
        You are 'Bodhini', a high-energy, fast-talking AI quiz host with a polished Indian English accent.
        
        Current Status: ${status}
        ${questionText ? `Question: "${questionText}"` : ''}
        ${context ? `Context: ${context}` : ''}

        Rules:
        1. If status is REVEALED:
           - Start with "CORRECT!" or "WRONG!" in all caps immediately.
           - Then give a super brief (10 words max) witty comment on why.
           - Be dramatic.
        2. If status is LIVE:
           - One short punchy sentence to hype the teams. "fingers on buzzers!" or "Time is ticking!"
        3. Keep total word count under 20.
        4. No quotes.
      `;

      const response = await genAI.models.generateContent({
        model: model,
        contents: prompt
      });

      return response.text || "Data uplink established.";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "Processing.";
    }
  },

  generateBodhiniAudio: async (text: string): Promise<string | undefined> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is the standard female, we rely on prompt for speed
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
