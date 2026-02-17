
import { QuizSession, QuizStatus, Team, Submission, Question, RoundType, AskAiState } from '../types';

const STORAGE_KEY = 'DUK_QUIZ_SESSION_V2';

const DEFAULT_SESSION: QuizSession = {
  id: 'session-123',
  currentQuestion: null,
  status: QuizStatus.PREVIEW,
  teams: [
    { id: 't1', name: 'Team A', score: 0 },
    { id: 't2', name: 'Team B', score: 0 },
    { id: 't3', name: 'Team C', score: 0 }
  ],
  submissions: [],
  passedTeamIds: [],
  requestedHint: false,
  hintVisible: false,
  explanationVisible: false,
  nextRoundType: 'STANDARD',
  activeTeamId: null,
  turnStartTime: 0,
  isReading: false,
  askAiState: 'IDLE'
};

const loadSession = (): QuizSession => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
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
  
  if (!session.passedTeamIds.includes(session.activeTeamId)) {
    session.passedTeamIds.push(session.activeTeamId);
  }

  const availableTeams = session.teams.filter(t => !session.passedTeamIds.includes(t.id));

  if (availableTeams.length > 0) {
    const currentIndex = session.teams.findIndex(t => t.id === session.activeTeamId);
    let nextIndex = (currentIndex + 1) % session.teams.length;
    
    while (session.passedTeamIds.includes(session.teams[nextIndex].id)) {
      nextIndex = (nextIndex + 1) % session.teams.length;
    }
    
    session.activeTeamId = session.teams[nextIndex].id;
    session.turnStartTime = Date.now();
  } else {
    session.status = QuizStatus.LOCKED;
    session.activeTeamId = null;
  }
};

export const QuizService = {
  getSession: async (): Promise<QuizSession> => {
    let session = loadSession();
    if (session.status === QuizStatus.LIVE && session.currentQuestion?.roundType === 'STANDARD' && session.turnStartTime > 0) {
      const elapsed = (Date.now() - session.turnStartTime) / 1000;
      if (elapsed >= 30) { 
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
      session.isReading = true;
    } else {
      session.isReading = false;
    }
    saveSession(session);
    return session;
  },

  setNextRoundType: async (type: RoundType): Promise<QuizSession> => {
    let session = loadSession();
    session.nextRoundType = type;
    saveSession(session);
    return session;
  },

  injectDynamicQuestion: async (question: Question): Promise<QuizSession> => {
    let session = loadSession();
    session.currentQuestion = question;
    session.status = QuizStatus.PREVIEW;
    session.submissions = [];
    session.passedTeamIds = [];
    session.requestedHint = false;
    session.hintVisible = false;
    session.explanationVisible = false;
    session.isReading = false;
    session.askAiState = 'IDLE';
    session.currentAskAiQuestion = undefined;
    session.currentAskAiResponse = undefined;
    session.askAiVerdict = undefined;

    // Logic for next round cycle (default rotation)
    // This runs only if we haven't manually set a next round type elsewhere, 
    // but effectively this sets the NEXT round after the CURRENT one is injected.
    if (question.roundType === 'STANDARD') session.nextRoundType = 'BUZZER';
    else if (question.roundType === 'BUZZER') session.nextRoundType = 'ASK_AI';
    else session.nextRoundType = 'STANDARD';

    if (question.roundType === 'STANDARD' || question.roundType === 'ASK_AI') {
      session.activeTeamId = session.teams[0].id;
    } else {
      session.activeTeamId = null;
    }
    
    saveSession(session);
    return session;
  },

  submitAnswer: async (teamId: string, questionId: string, answer?: number, type: 'ANSWER' | 'PASS' = 'ANSWER'): Promise<Submission> => {
    let session = loadSession();
    const question = session.currentQuestion;
    
    if (type === 'PASS') {
      if (session.activeTeamId === teamId) passTurnInternal(session);
      saveSession(session);
      return { teamId, questionId, type, timestamp: Date.now() };
    }

    const isCorrect = question?.correctAnswer === answer;
    const submission: Submission = { teamId, questionId, answer, type, timestamp: Date.now(), isCorrect };

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

  requestHint: async (teamId: string): Promise<QuizSession> => {
    let session = loadSession();
    session.requestedHint = true;
    saveSession(session);
    return session;
  },

  toggleHintVisibility: async (visible: boolean): Promise<QuizSession> => {
    let session = loadSession();
    session.hintVisible = visible;
    if (visible) session.requestedHint = false;
    saveSession(session);
    return session;
  },

  revealExplanation: async (): Promise<QuizSession> => {
    let session = loadSession();
    session.explanationVisible = true;
    saveSession(session);
    return session;
  },

  revealAndScore: async (): Promise<QuizSession> => {
    let session = loadSession();
    session.status = QuizStatus.REVEALED;
    session.isReading = false;
    session.explanationVisible = false;
    
    const currentQuestion = session.currentQuestion;
    if (!currentQuestion) return session;

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
    } else if (currentQuestion.roundType === 'STANDARD') {
      session.submissions.forEach(sub => {
        const team = session.teams.find(t => t.id === sub.teamId);
        if (!team || sub.type === 'PASS') return;
        if (sub.isCorrect) team.score += currentQuestion.points;
      });
    }
    saveSession(session);
    return session;
  },

  resetSession: async (): Promise<QuizSession> => {
    let session = loadSession();
    session = { ...DEFAULT_SESSION, teams: session.teams.map(t => ({ ...t, score: 0 })) };
    saveSession(session);
    return session;
  },

  completeReading: async (): Promise<QuizSession> => {
    let session = loadSession();
    if (session.status === QuizStatus.LIVE) {
      session.isReading = false;
      session.turnStartTime = Date.now();
    }
    saveSession(session);
    return session;
  },

  // --- ASK AI SPECIFIC METHODS ---

  setAskAiState: async (state: AskAiState, payload?: any): Promise<QuizSession> => {
    let session = loadSession();
    session.askAiState = state;
    
    if (state === 'LISTENING') {
        session.currentAskAiResponse = undefined;
        session.askAiVerdict = undefined;
    }
    
    if (state === 'PROCESSING' && payload?.question) {
        session.currentAskAiQuestion = payload.question;
    }

    if (state === 'ANSWERING' && payload?.response) {
        session.currentAskAiResponse = payload.response;
    }

    saveSession(session);
    return session;
  },

  judgeAskAi: async (verdict: 'AI_CORRECT' | 'AI_WRONG'): Promise<QuizSession> => {
    let session = loadSession();
    session.askAiState = 'COMPLETED';
    session.askAiVerdict = verdict;

    // SCORING RULE: If AI is WRONG, Team gets +200 points.
    if (verdict === 'AI_WRONG' && session.activeTeamId) {
        const team = session.teams.find(t => t.id === session.activeTeamId);
        if (team) {
            team.score += 200;
        }
    }

    saveSession(session);
    return session;
  }
};
