
import { Question } from './types';

export const COLORS = {
  primary: '#020617',
  secondary: '#0f172a',
  accent: '#92400e',
  success: '#064e3b',
  danger: '#7f1d1d',
  info: '#1e3a8a',
  background: '#f8fafc',
};

export const HOST_SCRIPTS = {
  WARNING_10S: "Ten seconds remaining.",
  TIME_UP: "Time is up.",
  GENERIC_CORRECT: "Correct!",
  GENERIC_WRONG: "Incorrect.",
};

export const MOCK_QUESTIONS: Question[] = [
  {
    id: 'ai_1',
    text: 'What does the "A" in AI stand for?',
    options: ['Artificial', 'Automated', 'Advanced', 'Analytical'],
    correctAnswer: 0,
    points: 50,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'EASY',
    hint: 'Opposite of natural intelligence.'
  },
  {
    id: 'ai_2',
    text: 'Who developed the "Test" to determine if a machine can think like a human?',
    options: ['Isaac Newton', 'Alan Turing', 'Ada Lovelace', 'Bill Gates'],
    correctAnswer: 1,
    points: 100,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'EASY',
    hint: 'An Enigma codebreaker during WWII.'
  },
  {
    id: 'ai_3',
    text: 'What is the core technology behind ChatGPT?',
    options: ['SQL Databases', 'LLM (Large Language Model)', 'Blockchain', 'Hardcoded rules'],
    correctAnswer: 1,
    points: 150,
    timeLimit: 30,
    roundType: 'BUZZER',
    difficulty: 'MEDIUM',
    hint: 'It is a model trained on massive amounts of text.'
  },
  {
    id: 'ai_4',
    text: 'Which term describes an AI finding patterns similarly to the human brain?',
    options: ['Cloud Computing', 'Neural Network', 'Binary Logic', 'Data Mining'],
    correctAnswer: 1,
    points: 150,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'MEDIUM',
    hint: 'Biological inspiration from neurons.'
  },
  {
    id: 'ai_5',
    text: 'What is it called when an AI makes up false facts confidently?',
    options: ['Bugging', 'Glitching', 'Hallucination', 'Dreaming'],
    correctAnswer: 2,
    points: 200,
    timeLimit: 30,
    roundType: 'BUZZER',
    difficulty: 'MEDIUM',
    hint: 'Like a human seeing things that aren\'t there.'
  },
  {
    id: 'ai_6',
    text: 'Who famously said "The Three Laws of Robotics"?',
    options: ['Elon Musk', 'Isaac Asimov', 'Philip K. Dick', 'Steve Jobs'],
    correctAnswer: 1,
    points: 150,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'MEDIUM',
    hint: 'A legendary sci-fi author of the 20th century.'
  },
  {
    id: 'ai_7',
    text: 'In ML, what is the term for a model that performs well on training data but poorly on new data?',
    options: ['Underfitting', 'Overfitting', 'Cross-fitting', 'Mismatching'],
    correctAnswer: 1,
    points: 300,
    timeLimit: 30,
    roundType: 'BUZZER',
    difficulty: 'HARD',
    hint: 'The model has memorized the noise instead of the pattern.'
  },
  {
    id: 'ai_8',
    text: 'Which architecture introduced in 2017 is the "T" in GPT?',
    options: ['Transfer', 'Transformer', 'Transition', 'Translator'],
    correctAnswer: 1,
    points: 400,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'HARD',
    hint: 'From the paper "Attention is All You Need".'
  },
  {
    id: 'ai_9',
    text: 'What does "RLHF" stand for in model training?',
    options: ['Random Logic High Frequency', 'Reinforcement Learning from Human Feedback', 'Real Language Hub Filter', 'Recurrent Logic Hub Frame'],
    correctAnswer: 1,
    points: 350,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'HARD',
    hint: 'Uses humans to rank model outputs.'
  },
  {
    id: 'ai_10',
    text: 'What name is given to AI that can perform any intellectual task a human can?',
    options: ['ANI', 'ASI', 'AGI', 'ALI'],
    correctAnswer: 2,
    points: 500,
    timeLimit: 30,
    roundType: 'BUZZER',
    difficulty: 'HARD',
    hint: 'The "G" stands for General.'
  }
];

export const APP_CONFIG = {
  POLL_INTERVAL: 2000,
  BUZZER_COOLDOWN: 1000,
};
