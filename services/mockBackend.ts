
import { QuizSession, QuizStatus, Team, Submission, Question } from '../types';
import { MOCK_QUESTIONS } from '../constants';

let session: QuizSession = {
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
  passCount: 0
};

const passTurnInternal = () => {
  if (!session.activeTeamId) return;
  
  // Award 10 points for passing (as requested)
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

  // If we've circled back to everyone and no one answered, we might want to lock
  if (session.passCount >= session.teams.length) {
    // Optionally auto-lock if everyone passes? For now, just keep circling.
  }
};

export const QuizService = {
  getSession: async (): Promise<QuizSession> => {
    // Check for Auto-Pass in Standard rounds
    const currentQuestion = MOCK_QUESTIONS.find(q => q.id === session.currentQuestionId);
    if (
      session.status === QuizStatus.LIVE && 
      currentQuestion?.roundType === 'STANDARD' && 
      session.turnStartTime > 0
    ) {
      const elapsed = (Date.now() - session.turnStartTime) / 1000;
      if (elapsed >= 30) {
        passTurnInternal();
      }
    }
    return { ...session };
  },

  updateStatus: async (status: QuizStatus): Promise<QuizSession> => {
    session.status = status;
    if (status === QuizStatus.LIVE) {
      session.startTime = Date.now();
      session.turnStartTime = Date.now();
    }
    return { ...session };
  },

  setQuestion: async (questionId: string): Promise<QuizSession> => {
    const question = MOCK_QUESTIONS.find(q => q.id === questionId);
    session.currentQuestionId = questionId;
    session.status = QuizStatus.PREVIEW;
    session.submissions = [];
    session.passCount = 0;
    
    if (question) {
      session.scoringMode = question.roundType === 'BUZZER' ? 'FIRST_RESPONSE' : 'STANDARD';
      // In Standard, first team in list starts
      session.activeTeamId = question.roundType === 'STANDARD' ? session.teams[0].id : null;
    }
    
    return { ...session };
  },

  submitAnswer: async (teamId: string, questionId: string, answer?: number, type: 'ANSWER' | 'PASS' = 'ANSWER'): Promise<Submission> => {
    const question = MOCK_QUESTIONS.find(q => q.id === questionId);
    
    if (type === 'PASS') {
      if (session.activeTeamId === teamId) {
        passTurnInternal();
      }
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
          
          // In standard, if they answer (correct or wrong), the turn usually ends or moves.
          // For this specific logic: if correct, they get points on reveal.
          // If they answer, we automatically LOCK to prevent others from sniping in their turn.
          if (question?.roundType === 'STANDARD' && teamId === session.activeTeamId) {
            session.status = QuizStatus.LOCKED;
          }
       }
    }
    
    return submission;
  },

  revealAndScore: async (): Promise<QuizSession> => {
    session.status = QuizStatus.REVEALED;
    const currentQuestion = MOCK_QUESTIONS.find(q => q.id === session.currentQuestionId);
    if (!currentQuestion) return session;

    if (currentQuestion.roundType === 'BUZZER') {
      const sortedSubmissions = [...session.submissions].sort((a, b) => a.timestamp - b.timestamp);
      
      for (const sub of sortedSubmissions) {
        const team = session.teams.find(t => t.id === sub.teamId);
        if (!team) continue;

        if (sub.isCorrect) {
          team.score += currentQuestion.points;
          break; // Found winner
        } else {
          // Sequential penalty logic: reduce 50 from this team and move to next in buffer
          team.score -= 50;
        }
      }
    } else {
      // Standard scoring
      session.submissions.forEach(sub => {
        const team = session.teams.find(t => t.id === sub.teamId);
        if (!team && sub.type !== 'ANSWER') return;
        if (team && sub.isCorrect) {
          team.score += currentQuestion.points;
        }
      });
    }

    return { ...session };
  },

  resetSession: async (): Promise<QuizSession> => {
    session = {
      ...session,
      currentQuestionId: null,
      status: QuizStatus.PREVIEW,
      submissions: [],
      activeTeamId: null,
      turnStartTime: 0,
      passCount: 0,
      teams: session.teams.map(t => ({ ...t, score: 0 }))
    };
    return { ...session };
  },

  forcePass: async (): Promise<QuizSession> => {
    passTurnInternal();
    return { ...session };
  }
};
