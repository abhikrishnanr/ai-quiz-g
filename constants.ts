
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
  INTRO: "Digital University AI Quiz Platform online. Welcome teams. This competition consists of six diverse rounds: Standard, Buzzer, Ask AI, Visual, Rapid Fire, and The Ultimate Challenge. Good luck to all participants. Let's start the quiz!",
  WARNING_10S: "Just 10 seconds remaining.",
  TIME_UP: "Time is up. Let's move forward.",
  ASK_AI_INTRO: "{team}, please ask your question now."
};

export const AI_COMMENTS = {
  CORRECT: [
    "കലക്കി! (Kalakki!)",
    "പൊളിച്ചു! (Polichu!)",
    "അടി സക്കെ! (Adi Sakke!)",
    "കിടുവേ! (Kiduve!)",
    "സംഭവം കളറായി! (Sambhavam Colour Aayi!)",
    "ഒരു രക്ഷയുമില്ല! (Oru Rakshayumilla!)",
    "എടാ മോനേ! (Eda Mone!)",
    "മാസ്സ്! (Mass!)"
  ],
  WRONG: [
    "എന്തോന്നടേ ഇത്? (Enthonnade Ithu?)",
    "അയ്യേ... മോശം! (Ayye... Mosham!)",
    "നീ പോ മോനേ ദിനേശാ. (Nee Po Mone Dinesha.)",
    "ചതി കുലേ! (Chathi Kule!)",
    "ശോകം... വലിയ ശോകം. (Shokam... Valiya Shokam.)",
    "വിവരമില്ലായ്മ ഒരു കുറ്റമല്ല. (Vivaramillayma Oru Kuttamalla.)",
    "സെൻസ് വേണം, സെൻസിബിലിറ്റി വേണം. (Sense Venam, Sensibility Venam.)",
    "അളിയാ... തെറ്റിപ്പോയി. (Aliya... Thettippoyi.)"
  ]
};

export const MOCK_QUESTIONS: Question[] = [
  {
    id: 'ai_1',
    text: 'What does the "A" in AI stand for when discussing computer intelligence?',
    options: ['Artificial', 'Automated', 'Advanced', 'Analytical'],
    correctAnswer: 0,
    explanation: 'AI stands for Artificial Intelligence, which refers to systems or machines that mimic human intelligence to perform tasks.',
    points: 50,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'EASY',
    hint: 'It is the opposite of natural or biological.'
  },
  {
    id: 'ai_2',
    text: 'Which mathematician developed a "Test" to see if a machine could mimic human conversation?',
    options: ['Isaac Newton', 'Alan Turing', 'Ada Lovelace', 'Charles Babbage'],
    correctAnswer: 1,
    explanation: 'Alan Turing proposed the Turing Test in 1950 to evaluate whether a machine could think or behave like a human.',
    points: 100,
    timeLimit: 30,
    roundType: 'STANDARD',
    difficulty: 'EASY',
    hint: 'He is famously known for breaking the Enigma code.'
  }
];

export const APP_CONFIG = {
  POLL_INTERVAL: 2000,
  BUZZER_COOLDOWN: 1000,
};
