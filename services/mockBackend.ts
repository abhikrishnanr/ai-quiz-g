
import { QuizSession, QuizStatus, Team, Submission, Question } from '../types';
import { MOCK_QUESTIONS } from '../constants';

const STORAGE_KEY = 'DUK_QUIZ_SESSION_V1';

const DEFAULT_SESSION: QuizSession = {
  id: 'session-123',
  currentQuestionId: null,
  status: QuizStatus.PREVIEW,
  teams: [
    { id: 't1', name: 'Cloud Rangers', score: 0 },
    { id: 't2', name: 'Logic Lions', score: 0 },
    { id: 't3', name: 'Data Divas', score: 0 }
  ],
  submissions: [],
  scoringMode: 'FIRST_RESPONSE',
  activeTeamId: null,
  turnStartTime: 0,
  passCount: 0,
  isReading: false
};

// Helper to load/save from localStorage
const loadSession = (): QuizSession => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load session", e);
  }
  return DEFAULT_SESSION;
};

const saveSession = (session: QuizSession) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.error("Failed to save session", e);
  }
};

const passTurnInternal = (session: QuizSession) => {
  if (!session.activeTeamId) return;
  
  // Award 10 points for passing
  const passingTeam = session.teams.find(t => t.id === session.activeTeamId);
  if (passingTeam) {
    passingTeam.score += 10;
  }

  // Move to next team
  const currentIndex = session.teams.findIndex(t => t.id === session.activeTeamId);
  const nextIndex = (currentIndex + 1) % session.teams.length;
  session.activeTeamId = session.teams[nextIndex].id;
  session.turnStartTime = Date.now();
  session.passCount++;
  // Reset reading status for the new team if we wanted re-reading, but usually pass just continues.
};

export const QuizService = {
  getSession: async (): Promise<QuizSession> => {
    let session = loadSession();

    // Check for Auto-Pass in Standard rounds (Simulated time-based logic)
    const currentQuestion = MOCK_QUESTIONS.find(q => q.id === session.currentQuestionId);
    if (
      session.status === QuizStatus.LIVE && 
      currentQuestion?.roundType === 'STANDARD' && 
      session.turnStartTime > 0
    ) {
      const elapsed = (Date.now() - session.turnStartTime) / 1000;
      // INCREASED TIMEOUT: 60s (30s reading + 30s thinking)
      if (elapsed >= 60) {
        passTurnInternal(session);
        saveSession(session);
      }
    }
    return session;
  },

  updateStatus: async (status: QuizStatus): Promise<QuizSession> => {
    let session = loadSession();
    session.status = status;
    if (status === QuizStatus.LIVE) {
      session.startTime = Date.now();
      session.turnStartTime = Date.now();
      session.isReading = true; // Start reading phase
    } else {
      session.isReading = false;
    }
    saveSession(session);
    return session;
  },

  setQuestion: async (questionId: string): Promise<QuizSession> => {
    let session = loadSession();
    const question = MOCK_QUESTIONS.find(q => q.id === questionId);
    session.currentQuestionId = questionId;
    session.status = QuizStatus.PREVIEW;
    session.submissions = [];
    session.passCount = 0;
    session.isReading = false;
    
    if (question) {
      session.scoringMode = question.roundType === 'BUZZER' ? 'FIRST_RESPONSE' : 'STANDARD';
      session.activeTeamId = question.roundType === 'STANDARD' ? session.teams[0].id : null;
    }
    
    saveSession(session);
    return session;
  },

  submitAnswer: async (teamId: string, questionId: string, answer?: number, type: 'ANSWER' | 'PASS' = 'ANSWER'): Promise<Submission> => {
    let session = loadSession();
    const question = MOCK_QUESTIONS.find(q => q.id === questionId);
    
    if (type === 'PASS') {
      if (session.activeTeamId === teamId) {
        passTurnInternal(session);
      }
      saveSession(session);
      return { teamId, questionId, type, timestamp: Date.now() };
    }

    const isCorrect = question?.correctAnswer === answer;
    const submission: Submission = {
      teamId,
      questionId,
      answer,
      type,
      timestamp: Date.now(),
      isCorrect
    };

    if (session.status === QuizStatus.LIVE) {
       const exists = session.submissions.find(s => s.teamId === teamId);
       if (!exists) {
          session.submissions.push(submission);
          
          if (question?.roundType === 'STANDARD' && teamId === session.activeTeamId) {
            session.status = QuizStatus.LOCKED;
            session.isReading = false;
          }
       }
    }
    
    saveSession(session);
    return submission;
  },

  revealAndScore: async (): Promise<QuizSession> => {
    let session = loadSession();
    session.status = QuizStatus.REVEALED;
    session.isReading = false;
    const currentQuestion = MOCK_QUESTIONS.find(q => q.id === session.currentQuestionId);
    if (!currentQuestion) {
        saveSession(session);
        return session;
    }

    if (currentQuestion.roundType === 'BUZZER') {
      const sortedSubmissions = [...session.submissions].sort((a, b) => a.timestamp - b.timestamp);
      let winnerFound = false;

      for (const sub of sortedSubmissions) {
        const team = session.teams.find(t => t.id === sub.teamId);
        if (!team) continue;

        if (sub.isCorrect && !winnerFound) {
          team.score += currentQuestion.points;
          winnerFound = true;
        } else if (!sub.isCorrect) {
          team.score -= 50;
        }
      }
    } else {
      session.submissions.forEach(sub => {
        const team = session.teams.find(t => t.id === sub.teamId);
        if (!team || sub.type === 'PASS') return;
        if (sub.isCorrect) {
          team.score += currentQuestion.points;
        }
      });
    }

    saveSession(session);
    return session;
  },

  resetSession: async (): Promise<QuizSession> => {
    let session = loadSession();
    session = {
      ...DEFAULT_SESSION,
      teams: session.teams.map(t => ({ ...t, score: 0 }))
    };
    saveSession(session);
    return session;
  },

  forcePass: async (): Promise<QuizSession> => {
    let session = loadSession();
    passTurnInternal(session);
    saveSession(session);
    return session;
  },

  completeReading: async (): Promise<QuizSession> => {
    let session = loadSession();
    if (session.status === QuizStatus.LIVE) {
      session.isReading = false;
      // Reset turn start time to now so the 30s timer is accurate for the thinking phase
      session.turnStartTime = Date.now();
    }
    saveSession(session);
    return session;
  }
};
