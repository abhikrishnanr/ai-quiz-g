
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
  INTRO: "Hello everyone! I am Bodhini, the AI Quiz core of Digital University Kerala. I'm so excited to be your host today! We have an incredible competition ahead with six exciting rounds: Standard, Buzzer, Ask AI, Visual, Rapid Fire, and The Ultimate Challenge. Just a few rules to keep in mind: In the Buzzer round, speed is everything—the first to answer correctly takes the points, but be careful, as this is the only round with negative marking! And in our unique Ask AI round, if you manage to challenge me with a question I cannot answer, your team will earn double marks! I wish you all the very best of luck. Let's start the quiz!",
  WARNING_10S: "Just 10 seconds remaining, better hurry!",
  TIME_UP: "Time is up. Let's see what happens next.",
  ASK_AI_INTRO: "Alright {team}, it is your turn to challenge me. Ask your question now, and remember, if I fail, you get double marks!"
};

export const AI_COMMENTS = {
  CORRECT: [
    "കലക്കി! (Kalakki!) That was brilliant!",
    "പൊളിച്ചു! (Polichu!) You're on fire!",
    "അടി സക്കെ! (Adi Sakke!) Perfect answer!",
    "കിടുവേ! (Kiduve!) What a performance!",
    "സംഭവം കളറായി! (Sambhavam Colour Aayi!) Simply superb!",
    "ഒരു രക്ഷയുമില്ല! (Oru Rakshayumilla!) You're unstoppable!",
    "എടാ മോനേ! (Eda Mone!) That was impressive!",
    "മാസ്സ്! (Mass!) Absolute class!"
  ],
  WRONG: [
    "എന്തോന്നടേ ഇത്? (Enthonnade Ithu?) Better luck next time.",
    "അയ്യേ... മോശം! (Ayye... Mosham!) Not quite what we were looking for.",
    "നീ പോ മോനേ ദിനേശാ. (Nee Po Mone Dinesha.) That wasn't it.",
    "ചതി കുലേ! (Chathi Kule!) Oh, so close yet so far!",
    "ശോകം... വലിയ ശോകം. (Shokam... Valiya Shokam.) Don't lose hope!",
    "വിവരമില്ലായ്മ ഒരു കുറ്റമല്ല. (Vivaramillayma Oru Kuttamalla.) Let's learn from this.",
    "സെൻസ് വേണം, സെൻസിബിലിറ്റി വേണം. (Sense Venam, Sensibility Venam.) Think deeper next time!",
    "അളിയാ... തെറ്റിപ്പോയി. (Aliya... Thettippoyi.) Let's try to get the next one!"
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
