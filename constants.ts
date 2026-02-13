
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

export const MOCK_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'What is the primary architectural component in AWS for serverless compute?',
    options: ['EC2', 'Lambda', 'Fargate', 'S3'],
    correctAnswer: 1,
    points: 100,
    timeLimit: 30,
    roundType: 'BUZZER'
  },
  {
    id: 'q2',
    text: 'Which DynamoDB feature provides in-memory caching for faster performance?',
    options: ['Global Tables', 'DAX', 'Secondary Indexes', 'Streams'],
    correctAnswer: 1,
    points: 150,
    timeLimit: 30,
    roundType: 'STANDARD'
  },
  {
    id: 'q3',
    text: 'What does "DUK" stand for in our platform context?',
    options: ['Digital University Kerala', 'Data Unit Kernal', 'Digital Unified Knowledge', 'Distributed User Key'],
    correctAnswer: 0,
    points: 200,
    timeLimit: 30,
    roundType: 'BUZZER'
  }
];

export const APP_CONFIG = {
  POLL_INTERVAL: 500, // Faster polling for better sync
  BUZZER_COOLDOWN: 500,
};
