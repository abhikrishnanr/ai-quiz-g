
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
  turnStartTime?: number;
  activeTeamId: string | null;
  passedTeamIds: string[]; // Track who passed to prevent looping
  requestedHint: boolean;   // Team requested a hint
  hintVisible: boolean;     // Admin enabled the hint
  passCount: number;
  teams: Team[];
  submissions: Submission[];
  scoringMode: 'FIRST_RESPONSE' | 'STANDARD';
  isReading?: boolean;
}

export interface APIResponse<T> {
  data?: T;
  error?: string;
  status: number;
}
