
# Porting Guide: AI Quiz Host Features to Next.js (Bodhini Edition)

This guide provides the exact specifications to migrate the **Bodhini AI Host** into your Next.js project.

## 📦 Required Dependencies
```bash
npm install @google/genai three @react-three/fiber @react-three/drei lucide-react
```

---

## 🎭 The Persona: Bodhini
Bodhini is a friendly, professional, and affectionate Quiz Master.
- **Name:** "Bodhini, the AI Quiz core of Digital University Kerala."
- **Tone:** Witty, encouraging, using a mix of English and Malayalam memes.
- **TTS Model:** `gemini-2.5-flash-preview-tts` with voice `Kore`.

---

## 🤖 Porting Prompt 1: The Bodhini Voice Engine

> **Prompt:**
> Create a `services/aiVoice.ts` module for a Next.js app using `@google/genai`.
> 1. **Identity:** The AI identifies as "Bodhini".
> 2. **Model:** `gemini-2.5-flash-preview-tts`.
> 3. **Queue Logic:** Handle `playSequence(texts: string[])` to allow playing a Malayalam reaction before a technical verdict.
> 4. **Caching:** Cache audio in `localStorage` to ensure instant replay of common phrases.
> 5. **Export:** Provide `isSpeaking` state to drive the 3D avatar animations.

---

## 🤖 Porting Prompt 2: Welcome Script & Game Rules

> **Prompt:**
> Implement an Intro Sequence in the Next.js Display view.
> **The Script:**
> "Hello everyone! I am Bodhini, the AI Quiz core of Digital University Kerala. I'm so excited to be your host today! We have an incredible competition ahead with six exciting rounds: Standard, Buzzer, Ask AI, Visual, Rapid Fire, and The Ultimate Challenge. 
> 
> **Important Rules:**
> - In the Buzzer round, the first to answer correctly takes the points. Be careful, as this is the only round with negative marking!
> - In our Ask AI round, if you manage to challenge me with a question I cannot answer, your team will earn double marks!
> 
> I wish you all the very best of luck. Let's start the quiz!"

---

## 🤖 Porting Prompt 3: Dynamic Interaction Triggers

> **Prompt:**
> I need the AI (Bodhini) to interact based on real-time game state:
> 1. **Naming Teams:** Before reading a Standard round question, Bodhini must say: "Alright, this question is for [Team Name]..."
> 2. **Buzzer Mode:** When someone buzzes, announce: "[Team Name] is in! Let's hear their answer."
> 3. **Passing:** If a team passes, Bodhini should announce: "[Team Name] has passed the turn. Who wants to take this one?"
> 4. **Ask AI Result:** If the admin judges Bodhini's answer as "Wrong", play an affectionate apology: "Oh dear, it seems I've met my match! Double marks to you!"

---

## 🧪 Implementation Note
Bodhini sounds most natural when Malayalam phrases are followed by a short pause before the English translation. Use `setTimeout` or a sequential audio queue to manage this.
