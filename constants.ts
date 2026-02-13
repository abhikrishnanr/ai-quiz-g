
import { Question } from './types';

export const COLORS = {
  primary: '#020617',    // Slate 950 (Darkest for primary headings)
  secondary: '#0f172a',  // Slate 900 (Dark for body text)
  accent: '#92400e',     // Amber 800 (Deep amber for accessibility)
  success: '#064e3b',    // Emerald 900 (Deep emerald for correct answers)
  danger: '#7f1d1d',     // Red 900 (Deep red for errors)
  info: '#1e3a8a',       // Blue 900 (Deep blue for info)
  background: '#f8fafc', // Slate 50
};

export const HOST_SCRIPTS = {
  WARNING_10S: "Ten seconds remaining.",
  TIME_UP: "Time is up.",
  GENERIC_CORRECT: "That is correct!",
  GENERIC_WRONG: "I am afraid that is incorrect.",
};

export const MOCK_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'What was the former name of Digital University Kerala before its upgrade to a full university?',
    options: ['IIITM-K', 'C-DIT', 'KELTRON', 'Technopark'],
    correctAnswer: 0,
    points: 100,
    timeLimit: 30,
    roundType: 'STANDARD'
  },
  {
    id: 'q2',
    text: 'In which specific innovation hub in Thiruvananthapuram is the main DUK campus located?',
    options: ['Technopark Phase 1', 'Technocity (Pallippuram)', 'Kinfra Park', 'Cyberpark'],
    correctAnswer: 1,
    points: 200,
    timeLimit: 30,
    roundType: 'BUZZER'
  },
  {
    id: 'q3',
    text: 'Digital University Kerala was established by the Government of Kerala in which year?',
    options: ['2018', '2019', '2020', '2021'],
    correctAnswer: 2,
    points: 100,
    timeLimit: 30,
    roundType: 'STANDARD'
  },
  {
    id: 'q4',
    text: 'Who served as the first Vice Chancellor of Digital University Kerala?',
    options: ['Dr. Saji Gopinath', 'Dr. K.M. Abraham', 'Dr. V.K. Ramachandran', 'Shri. P. Rajeeve'],
    correctAnswer: 0,
    points: 200,
    timeLimit: 30,
    roundType: 'BUZZER'
  },
  {
    id: 'q5',
    text: 'Which of the following is NOT one of the primary schools within DUK?',
    options: ['School of Computer Science', 'School of Digital Sciences', 'School of Electronic Systems', 'School of Marine Biology'],
    correctAnswer: 3,
    points: 150,
    timeLimit: 30,
    roundType: 'STANDARD'
  }
];

export const APP_CONFIG = {
  POLL_INTERVAL: 2000, // Slowed down to prevent rate limits
  BUZZER_COOLDOWN: 1000,
};
