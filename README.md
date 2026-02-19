
# Porting Guide: AI Quiz Host Features to Next.js

This guide provides exact prompts for Gemini to migrate the AI Host system into your Next.js project.

## 📦 Required Dependencies
```bash
npm install @google/genai three @react-three/fiber @react-three/drei lucide-react
```

---

## 🎨 AI Avatar Blueprints (from `components/AIHostAvatar.tsx`)
When asking Gemini to build the avatar, use these specs:
- **Core:** Glowing icosahedron using `MeshStandardMaterial` with `emissiveIntensity` pulsed by `isSpeaking`.
- **Visualizer:** 48 bars (`boxGeometry`) in a circle, scale modulated by `Math.sin(time * 25 + index)`.
- **HUD:** Multiple rings using `DashRing` (dashed circles) rotating at different speeds (`0.05` vs `-0.02`).

---

## 🤖 Porting Prompt 1: The AI Voice Engine

> **Prompt:**
> Create a Client Component `services/aiVoice.ts` for a Next.js app to handle Text-to-Speech using `@google/genai`.
> 1. **Model:** `gemini-2.5-flash-preview-tts`.
> 2. **Config:** `responseModalities: ["AUDIO"]` and `voiceName: "Kore"`.
> 3. **Queue Logic:** Must handle `playSequence(texts: string[])`. This is used to play a "Meme" then a "Verdict".
> 4. **Fail-safe:** If TTS fails for a specific string (like complex Malayalam), fallback to a simplified English version.
> 5. **State:** Export `isSpeaking` boolean to drive 3D animations.

---

## 🤖 Porting Prompt 2: Welcome & Intro Logic

> **Prompt:**
> In my Next.js Display view, I need the AI Host to handle the initial Welcome Sequence.
> 1. **Script:** "Welcome teams. This competition consists of six diverse rounds: Standard, Buzzer, Ask AI, Visual, Rapid Fire, and The Ultimate Challenge. Good luck."
> 2. **Trigger:** Initialize the `AudioContext` on a "Start System" button click, then play the Intro script immediately.

---

## 🤖 Porting Prompt 3: Team Naming & Passing Events

> **Prompt:**
> I need my quiz display to trigger specific AI voice lines for game events:
> 1. **Question Intro:** When a question goes LIVE, the AI must say: "Question for [Team Name]. [Question Text]... Options are...". Ensure the team name is mentioned first.
> 2. **Passing Logic:** When a team clicks "PASS", the Display must announce: "[Team Name] has passed the question."
> 3. **Result Commentary:** On reveal, play a random Malayalam meme (e.g., "Kalakki!", "Polichu!") followed by the English verdict.

---

## 🧪 Implementation Note
Use the `Kore` voice in Gemini for the best balance of English clarity and Malayalam phonetic pronunciation.
