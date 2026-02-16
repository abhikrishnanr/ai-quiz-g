
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { SFX } from '../services/sfx';
import { QuizStatus } from '../types';
import { Badge } from '../components/SharedUI';
import { Lock as LockIcon, Power, Sparkles, Brain, Clock, Zap, Waves, ShieldCheck } from 'lucide-react';
import { AIHostAvatar } from '../components/AIHostAvatar';

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const DisplayView: React.FC = () => {
  const { session, loading } = useQuizSync();
  const [turnTimeLeft, setTurnTimeLeft] = useState(30);
  const [commentary, setCommentary] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  const lastQuestionIdRef = useRef<string | null>(null);
  const lastStatusRef = useRef<QuizStatus | null>(null);
  const lastSubmissionCountRef = useRef<number>(0);
  const explanationPlayedRef = useRef<boolean>(false);
  const sfxPlayedRef = useRef<boolean>(false);
  const introPlayedRef = useRef<boolean>(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioCacheRef = useRef<Record<string, string>>({});

  const currentQuestion = session?.currentQuestion;
  const activeTeam = session?.teams.find(t => t.id === session.activeTeamId);

  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
    SFX.init();
    SFX.playIntro();
    setAudioInitialized(true);
    
    if (!introPlayedRef.current) {
        introPlayedRef.current = true;
        const introText = "Identity verified. Bodhini Core Online. Welcome to the Digital University AI Quiz Platform.";
        setTimeout(() => {
            API.getTTSAudio(introText).then(audio => {
                if (audio) playAudio(audio, "Bodhini Core Online");
            });
        }, 1000); 
    }
  };

  const playAudio = async (base64Data: string, text?: string, onEnd?: () => void) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (activeSourceRef.current) try { activeSourceRef.current.stop(); } catch(e) {}
    
    if (text) setCommentary(text.replace(/<[^>]*>/g, '').trim());
    setIsSpeaking(true);

    try {
        const audioBuffer = await decodeAudioData(decodeBase64(base64Data), ctx, 24000, 1);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        activeSourceRef.current = source;
        source.onended = () => {
            setIsSpeaking(false);
            if (onEnd) onEnd();
        };
        source.start();
    } catch (e) {
        console.error("Audio Playback Error", e);
        setIsSpeaking(false);
        if (onEnd) onEnd();
    }
  };

  useEffect(() => {
    if (!session || !currentQuestion) return;

    // 1. New Question LIVE
    if (session.status === QuizStatus.LIVE && lastStatusRef.current !== QuizStatus.LIVE) {
       SFX.playIntro();
       const audioKey = `read_${currentQuestion.id}`;
       if (audioCacheRef.current[audioKey]) {
          playAudio(audioCacheRef.current[audioKey], undefined, () => {
            if (session.isReading) API.completeReading();
          });
       } else {
          API.getTTSAudio(API.formatQuestionForSpeech(currentQuestion, activeTeam?.name)).then(audio => {
            if (audio) {
              audioCacheRef.current[audioKey] = audio;
              playAudio(audio, undefined, () => API.completeReading());
            } else API.completeReading();
          });
       }
    }

    // 2. Lock Answer
    if (session.submissions.length > lastSubmissionCountRef.current) {
       const newSub = session.submissions[session.submissions.length - 1];
       const team = session.teams.find(t => t.id === newSub.teamId);
       if (team && audioInitialized) { 
           SFX.playLock();
           const lockText = `Answer locked by ${team.name}.`;
           API.getTTSAudio(lockText).then(audio => {
                if (audio) playAudio(audio, `Locked by ${team.name}`);
           });
       }
    }

    // 3. Reveal Answer (SFX only)
    if (session.status === QuizStatus.REVEALED && !sfxPlayedRef.current) {
       sfxPlayedRef.current = true;
       const submission = session.submissions[session.submissions.length-1];
       const isCorrect = submission?.isCorrect;
       if (isCorrect) SFX.playCorrect(); else SFX.playWrong();
    }

    // 4. Reveal Explanation (TTS) - Triggered by separate button
    if (session.explanationVisible && !explanationPlayedRef.current) {
       explanationPlayedRef.current = true;
       const submission = session.submissions[session.submissions.length-1];
       const isCorrect = submission?.isCorrect;
       
       API.getTTSAudio(API.formatExplanationForSpeech(currentQuestion.explanation, isCorrect)).then(audio => {
         if (audio) playAudio(audio, "Synthesis Complete");
       });
    }

    // Reset Refs on new question
    if (session.currentQuestion?.id !== lastQuestionIdRef.current) {
        lastQuestionIdRef.current = session.currentQuestion?.id || null;
        explanationPlayedRef.current = false;
        sfxPlayedRef.current = false;
        lastSubmissionCountRef.current = 0; 
    }
    
    lastStatusRef.current = session.status;
    lastSubmissionCountRef.current = session.submissions.length;
  }, [session?.status, session?.currentQuestion?.id, session?.submissions.length, session?.explanationVisible]);

  useEffect(() => {
    if (session?.status === QuizStatus.LIVE && currentQuestion?.roundType === 'STANDARD' && !session.isReading) {
      const interval = setInterval(() => {
        const startTime = session.turnStartTime || Date.now();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, 30 - elapsed);
        setTurnTimeLeft(remaining);
        if (remaining <= 5 && remaining > 0) SFX.playTimerTick();
      }, 200);
      return () => clearInterval(interval);
    }
  }, [session?.status, currentQuestion, session?.isReading, session?.turnStartTime]);

  if (loading || !session) return null;

  if (!audioInitialized) {
      return (
          <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center cursor-pointer group" onClick={initAudio}>
              <div className="absolute inset-0 opacity-20 bg-grid-perspective" />
              <div className="relative z-10 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full border-4 border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 mb-8 shadow-[0_0_50px_rgba(99,102,241,0.4)]">
                    <Power className="w-10 h-10 text-indigo-400 animate-pulse" />
                  </div>
                  <h1 className="text-4xl font-display font-black text-white uppercase tracking-[0.2em] neon-text">Initialize Main Screen</h1>
                  <p className="mt-4 text-indigo-400 font-mono text-xs tracking-widest">AWAITING NEURAL UPLINK</p>
              </div>
          </div>
      );
  }

  const isQuestionVisible = !!currentQuestion && session.status !== QuizStatus.PREVIEW;
  const lockingTeam = session.submissions.length > 0 
    ? session.teams.find(t => t.id === session.submissions[session.submissions.length - 1].teamId) 
    : null;

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden relative selection:bg-indigo-500/30 font-sans">
      
      {/* --- STARDUST NEBULA BACKGROUND --- */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-[#020617]">
          {/* Deep Space Base */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(2,6,23,1)_100%)]" />
          
          {/* Moving Nebula Layers */}
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-30 animate-[nebula-drift_60s_infinite_ease-in-out]"
               style={{ background: 'radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.4), transparent 50%)' }} />
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-20 animate-[nebula-drift_45s_infinite_ease-in-out_reverse]"
               style={{ background: 'radial-gradient(circle at 70% 30%, rgba(236, 72, 153, 0.3), transparent 40%)' }} />
          
          {/* Stars */}
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '100px 100px', opacity: 0.1 }} />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 0.15, animation: 'twinkle 4s infinite' }} />

          {/* Perspective Grid Overlay */}
          <div className="absolute inset-0 opacity-10 bg-grid-perspective origin-top h-[200vh] -mt-[50vh] w-full" />
          
          {/* Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_90%)]" />
      </div>

      {/* --- MAIN CONTENT LAYER (Z-10) --- */}
      <div className="relative z-10 h-screen flex flex-col p-6 md:p-10 gap-6">
          
          {/* HEADER BAR */}
          <header className="flex justify-between items-start">
             <div className="flex items-center gap-6 glass-card px-8 py-4 rounded-full">
                <div className="flex items-center gap-3">
                   <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                   </span>
                   <span className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400">Live Broadcast</span>
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <h1 className="text-lg font-display font-black uppercase tracking-wider text-slate-200">
                    Bodhini Core <span className="text-indigo-500">V3</span>
                </h1>
             </div>

             {/* Dynamic Round Info */}
             {isQuestionVisible && (
                 <div className="glass-card px-8 py-4 rounded-full flex items-center gap-8 animate-in slide-in-from-right">
                     <div className="flex items-center gap-3">
                        {currentQuestion.roundType === 'BUZZER' ? <Zap className="w-5 h-5 text-amber-400" /> : <Waves className="w-5 h-5 text-indigo-400" />}
                        <span className="text-xl font-display font-black uppercase tracking-tight">{currentQuestion.roundType} ROUND</span>
                     </div>
                     <div className="h-6 w-[1px] bg-white/10" />
                     <div className="flex items-center gap-2">
                        <span className="text-2xl font-display font-black text-white">{currentQuestion.points}</span>
                        <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Credits</span>
                     </div>
                 </div>
             )}
          </header>

          {/* MAIN STAGE */}
          <main className="flex-grow grid grid-cols-12 gap-8 items-stretch">
             
             {/* LEFT COMMAND COLUMN (Avatar & Status) */}
             <div className="col-span-3 flex flex-col gap-8 justify-center">
                {/* Avatar Container - Removed card styling */}
                <div className="flex flex-col items-center justify-center flex-grow relative z-10">
                   <AIHostAvatar size="xl" isSpeaking={isSpeaking} />
                   
                   {/* Subtitles (Text below Avatar) */}
                   <div className="mt-8 w-full min-h-[100px] flex items-center justify-center">
                      {commentary ? (
                        <div className="bg-slate-950/70 backdrop-blur-md border border-white/10 px-6 py-4 rounded-2xl animate-in fade-in slide-in-from-bottom-2 text-center shadow-xl max-w-sm">
                           <p className="text-indigo-200 text-lg font-medium leading-relaxed font-sans italic">"{commentary}"</p>
                        </div>
                      ) : (
                         <div className="flex gap-2 opacity-30">
                           <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                           <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.1s]" />
                           <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                         </div>
                      )}
                   </div>
                </div>

                {/* Team Status / Timer */}
                {isQuestionVisible && currentQuestion.roundType === 'STANDARD' && (
                  <div className="glass-card rounded-[2rem] p-6 flex items-center justify-between border-t-4 border-t-indigo-500">
                      <div>
                        <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] block mb-1">Time Remaining</span>
                        <span className="text-4xl font-display font-black text-white tabular-nums">{turnTimeLeft}s</span>
                      </div>
                      <Clock className={`w-10 h-10 ${turnTimeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-500'}`} />
                  </div>
                )}
             </div>

             {/* RIGHT DATA SLATE (Question & Options) */}
             <div className="col-span-9 relative">
                {!isQuestionVisible ? (
                   <div className="h-full glass-card rounded-[3rem] flex flex-col items-center justify-center text-center p-12 border border-white/5 relative overflow-hidden">
                       <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
                       <div className="relative z-10 max-w-2xl">
                          <Brain className="w-32 h-32 text-indigo-500/50 mx-auto mb-12 animate-pulse" />
                          <h2 className="text-5xl font-display font-black text-white uppercase tracking-tight mb-6">System Standby</h2>
                          <p className="text-xl text-slate-400 font-light tracking-wide">Waiting for Neural Fragment...</p>
                       </div>
                   </div>
                ) : (
                   <div className="h-full flex flex-col gap-6 animate-in zoom-in duration-500">
                      {/* Question Card */}
                      <div className="glass-card p-12 rounded-[3rem] border-l-[8px] border-l-indigo-500 shadow-[0_0_100px_rgba(79,70,229,0.1)] relative overflow-hidden flex-grow flex items-center">
                          <div className="absolute top-0 right-0 p-8 opacity-10">
                             <Brain className="w-48 h-48 text-white rotate-12" />
                          </div>
                          {/* UPDATED: Uses font-sans and leading-relaxed for better readability */}
                          <h2 className="relative z-10 text-4xl md:text-5xl lg:text-6xl font-sans font-bold text-white leading-relaxed tracking-wide drop-shadow-lg">
                             {currentQuestion.text}
                          </h2>
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-2 gap-5 h-[40%]">
                         {currentQuestion.options.map((opt, i) => {
                            const isRevealed = session.status === QuizStatus.REVEALED;
                            const isCorrect = isRevealed && i === currentQuestion.correctAnswer;
                            const isDimmed = isRevealed && !isCorrect;
                            
                            return (
                              <div key={i} className={`
                                relative overflow-hidden rounded-[2rem] p-8 flex items-center gap-6 border transition-all duration-700
                                ${isCorrect 
                                   ? 'bg-emerald-600 border-emerald-400 shadow-[0_0_60px_rgba(16,185,129,0.4)] scale-[1.02] z-20' 
                                   : isDimmed 
                                     ? 'bg-slate-900/40 border-white/5 opacity-30 grayscale' 
                                     : 'glass-card border-white/10 hover:bg-white/5'
                                }
                              `}>
                                 <div className={`
                                    w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-display font-black shrink-0
                                    ${isCorrect ? 'bg-white text-emerald-600' : 'bg-white/10 text-indigo-300'}
                                 `}>
                                    {String.fromCharCode(65+i)}
                                 </div>
                                 {/* UPDATED: Uses font-sans and leading-normal */}
                                 <span className={`text-2xl md:text-3xl font-sans font-semibold leading-normal tracking-wide ${isCorrect ? 'text-white' : 'text-slate-200'}`}>
                                    {opt}
                                 </span>
                                 {isCorrect && (
                                     <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                        <ShieldCheck className="w-10 h-10 text-white animate-bounce" />
                                     </div>
                                 )}
                              </div>
                            );
                         })}
                      </div>
                   </div>
                )}

                {/* --- OVERLAYS --- */}

                {/* Locked State Overlay */}
                {(session.status === QuizStatus.LOCKED || lockingTeam) && !session.submissions.find(s => s.teamId === activeTeam?.id)?.isCorrect && (
                   <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-in zoom-in duration-300">
                      <div className="bg-slate-950/90 backdrop-blur-xl border border-indigo-500/50 p-16 rounded-[4rem] text-center shadow-[0_0_150px_rgba(79,70,229,0.5)] max-w-2xl transform scale-110">
                         <div className="w-24 h-24 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(99,102,241,0.6)]">
                            <LockIcon className="w-10 h-10 text-white" />
                         </div>
                         <p className="text-indigo-300 text-sm font-black uppercase tracking-[0.5em] mb-4">Transmission Received</p>
                         <h3 className="text-6xl font-display font-black text-white uppercase neon-text tracking-tighter">
                            {lockingTeam?.name || "LOCKED"}
                         </h3>
                      </div>
                   </div>
                )}

                {/* Explanation / Success Overlay (Bottom Slide) - ONLY SHOW IF EXPLANATION VISIBLE */}
                {session.explanationVisible && (
                   <div className="absolute bottom-6 left-6 right-6 z-40 bg-[#0f172a] border-t-4 border-emerald-500 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom duration-700 flex items-start gap-6">
                      <div className="bg-emerald-500/10 p-4 rounded-2xl">
                         <Sparkles className="w-8 h-8 text-emerald-400" />
                      </div>
                      <div>
                         <h4 className="text-xs font-black uppercase text-emerald-500 tracking-[0.3em] mb-2">Neural Analysis Complete</h4>
                         <p className="text-xl font-medium text-slate-200 leading-relaxed font-sans">"{currentQuestion.explanation}"</p>
                      </div>
                   </div>
                )}
             </div>
          </main>
      </div>
    </div>
  );
};

export default DisplayView;
