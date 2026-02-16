
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
  explanation: string;
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
  currentQuestion: Question | null;
  status: QuizStatus;
  startTime?: number;
  turnStartTime?: number;
  activeTeamId: string | null;
  passedTeamIds: string[];
  requestedHint: boolean;
  hintVisible: boolean;
  explanationVisible: boolean; // New flag for separate explanation reveal
  nextRoundType: RoundType;
  teams: Team[];
  submissions: Submission[];
  isReading?: boolean;
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  status: number;
}
