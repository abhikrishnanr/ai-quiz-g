
import { GoogleGenAI, Modality } from "@google/genai";
import { Question, QuizSession, QuizStatus, Submission, SubmissionType } from '../types';
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

  completeReading: async (): Promise<QuizSession> => {
    return QuizService.completeReading();
  },

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
           - Announce the result ("Correct!" or "Oh no, that is incorrect") with emotion.
           - Add a very brief, encouraging comment (max 8 words).
        2. If status is LIVE:
           - A quick, sweet encouragement. "Here is your question." or "Time starts now."
        3. Keep it short.
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
  },

  formatQuestionForSpeech: (question: Question, activeTeamName?: string): string => {
    const opts = question.options.map((opt, i) => `Option ${String.fromCharCode(65+i)}: ${opt}`).join('. ');
    
    if (question.roundType === 'BUZZER') {
      return `Buzzer Round! Fastest finger wins. Plus ${question.points} for correct, minus 50 for incorrect. Here is the question: ${question.text}. The options are: ${opts}.`;
    } else {
      // Standard Round
      const intro = activeTeamName ? `Question for team ${activeTeamName}.` : "Question for the active team.";
      return `${intro} ${question.text}. The options are: ${opts}.`;
    }
  }
};
