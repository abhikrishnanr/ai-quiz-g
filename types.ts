
export enum QuizStatus {
  PREVIEW = 'PREVIEW',
  LIVE = 'LIVE',
  LOCKED = 'LOCKED',
  REVEALED = 'REVEALED'
}

export type RoundType = 'BUZZER' | 'STANDARD';
export type SubmissionType = 'ANSWER' | 'PASS';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  points: number;
  timeLimit: number;
  roundType: RoundType;
  difficulty: Difficulty;
  hint: string;
}

export interface Team {
  id: string;
  name: string;
  score: number;
  lastActive?: number;
}

export interface Submission {
  teamId: string;
  questionId: string;
  answer?: number;
  type: SubmissionType;
  timestamp: number;
  isCorrect?: boolean;
}

export interface QuizSession {
  id: string;
  currentQuestionId: string | null;
  status: QuizStatus;
  startTime?: number;
  turnStartTime?: number; // Start time for the current team's turn
  activeTeamId: string | null; // Currently active team in Standard round
  passCount: number; // Number of times question was passed
  teams: Team[];
  submissions: Submission[];
  scoringMode: 'FIRST_RESPONSE' | 'STANDARD';
  isReading?: boolean; // Indicates if the host is currently reading the question
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  status: number;
}
