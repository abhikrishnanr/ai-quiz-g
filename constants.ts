
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
    id: 'ai_1',
    text: 'What does the acronym "AI" stand for in computer science?',
    options: ['Artificial Intelligence', 'Automated Interface', 'Advanced Integration', 'Analytical Insight'],
    correctAnswer: 0,
    points: 50,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'EASY',
    hint: 'It describes machines mimicking cognitive functions.'
  },
  {
    id: 'ai_2',
    text: 'Which British mathematician is often considered the father of theoretical computer science and AI?',
    options: ['Isaac Newton', 'Alan Turing', 'Ada Lovelace', 'Charles Babbage'],
    correctAnswer: 1,
    points: 100,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'EASY',
    hint: 'He developed a famous "Test" for machine intelligence.'
  },
  {
    id: 'ai_3',
    text: 'What is the primary purpose of a "Neural Network" in Machine Learning?',
    options: ['To manage database connections', 'To mimic the human brain to find patterns', 'To speed up internet connectivity', 'To encrypt user passwords'],
    correctAnswer: 1,
    points: 150,
    timeLimit: 30,
    roundType: 'BUZZER',
    difficulty: 'MEDIUM',
    hint: 'Think about how biological neurons connect and fire.'
  },
  {
    id: 'ai_4',
    text: 'In the context of LLMs, what does "GPT" stand for?',
    options: ['General Program Technology', 'Global Positioning Tool', 'Generative Pre-trained Transformer', 'Graph Processing Template'],
    correctAnswer: 2,
    points: 150,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'MEDIUM',
    hint: 'Three words: It creates, it was taught beforehand, and it uses a specific architecture.'
  },
  {
    id: 'ai_5',
    text: 'Which IBM supercomputer famously defeated world chess champion Garry Kasparov in 1997?',
    options: ['Watson', 'Deep Blue', 'AlphaGo', 'Siri'],
    correctAnswer: 1,
    points: 200,
    timeLimit: 30,
    roundType: 'BUZZER',
    difficulty: 'MEDIUM',
    hint: 'It is a color and a depth.'
  },
  {
    id: 'ai_6',
    text: 'What term describes an AI model making up false information and presenting it as fact?',
    options: ['Debugging', 'Glitching', 'Hallucination', 'Phantom Data'],
    correctAnswer: 2,
    points: 200,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'MEDIUM',
    hint: 'It is a psychological term for seeing things that aren\'t there.'
  },
  {
    id: 'ai_7',
    text: 'Who coined the "Three Laws of Robotics" in his science fiction stories?',
    options: ['Isaac Asimov', 'Arthur C. Clarke', 'Philip K. Dick', 'Elon Musk'],
    correctAnswer: 0,
    points: 150,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'MEDIUM',
    hint: 'A prolific science fiction writer who wrote "I, Robot".'
  },
  {
    id: 'ai_8',
    text: 'In Deep Learning, what is "Overfitting"?',
    options: ['When a model is too large for the GPU', 'When a model performs well on training data but poorly on new data', 'When a model is perfectly balanced', 'When data is too diverse'],
    correctAnswer: 1,
    points: 300,
    timeLimit: 30,
    roundType: 'BUZZER',
    difficulty: 'HARD',
    hint: 'The model has memorized the noise rather than learning the signal.'
  },
  {
    id: 'ai_9',
    text: 'What is the significance of the "Attention Is All You Need" paper published in 2017?',
    options: ['It introduced the Transformer architecture', 'It proved AI is dangerous', 'It solved the Traveling Salesman problem', 'It invented the Internet'],
    correctAnswer: 0,
    points: 400,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'HARD',
    hint: 'This architecture is the foundation of modern LLMs.'
  },
  {
    id: 'ai_10',
    text: 'What is the name of the AI developed by DeepMind that defeated the world champion in Go?',
    options: ['AlphaGo', 'GoMaster', 'StrategyNet', 'DeepMind-1'],
    correctAnswer: 0,
    points: 250,
    timeLimit: 30,
    roundType: 'BUZZER',
    difficulty: 'HARD',
    hint: 'Uses "Alpha" as a prefix, similar to their other projects.'
  }
];

export const APP_CONFIG = {
  POLL_INTERVAL: 2000, // Slowed down to prevent rate limits
  BUZZER_COOLDOWN: 1000,
};
