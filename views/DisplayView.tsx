
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { SFX } from '../services/sfx';
import { QuizStatus } from '../types';
import { Badge } from '../components/SharedUI';
import { Lock as LockIcon, Power, Sparkles, Brain, Clock, Zap, Waves, ShieldCheck, Mic, ThumbsUp, ThumbsDown } from 'lucide-react';
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
  
  // Ask AI State Refs
  const lastAskAiStateRef = useRef<string | null>(null);

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
        const introText = "System ready. Bodhini Core Online. I am your neural architect for today's session.";
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

    if (session.submissions.length > lastSubmissionCountRef.current) {
       const newSub = session.submissions[session.submissions.length - 1];
       const team = session.teams.find(t => t.id === newSub.teamId);
       if (team && audioInitialized && currentQuestion.roundType !== 'ASK_AI') { 
           SFX.playLock();
           const lockText = `Transmission received from ${team.name}.`;
           API.getTTSAudio(lockText).then(audio => {
                if (audio) playAudio(audio, `Answer locked by ${team.name}`);
           });
       }
    }

    if (session.status === QuizStatus.REVEALED && !sfxPlayedRef.current) {
       sfxPlayedRef.current = true;
       if (currentQuestion.roundType !== 'ASK_AI') {
            const submission = session.submissions[session.submissions.length-1];
            const isCorrect = submission?.isCorrect;
            if (isCorrect) SFX.playCorrect(); else SFX.playWrong();
       }
    }

    // Ask AI Specific Effect
    if (currentQuestion.roundType === 'ASK_AI' && session.askAiState !== lastAskAiStateRef.current) {
        if (session.askAiState === 'ANSWERING' && session.currentAskAiResponse) {
             API.getTTSAudio(session.currentAskAiResponse).then(audio => {
                 if (audio) playAudio(audio, session.currentAskAiResponse);
             });
        }
        lastAskAiStateRef.current = session.askAiState;
    }

    if (session.explanationVisible && !explanationPlayedRef.current) {
       explanationPlayedRef.current = true;
       const submission = session.submissions[session.submissions.length-1];
       const isCorrect = submission?.isCorrect;
       
       API.getTTSAudio(API.formatExplanationForSpeech(currentQuestion.explanation, isCorrect)).then(audio => {
         if (audio) playAudio(audio, "Neural Synthesis Complete");
       });
    }

    if (session.currentQuestion?.id !== lastQuestionIdRef.current) {
        lastQuestionIdRef.current = session.currentQuestion?.id || null;
        explanationPlayedRef.current = false;
        sfxPlayedRef.current = false;
        lastSubmissionCountRef.current = 0; 
        lastAskAiStateRef.current = 'IDLE';
    }
    
    lastStatusRef.current = session.status;
    lastSubmissionCountRef.current = session.submissions.length;
  }, [session?.status, session?.currentQuestion?.id, session?.submissions.length, session?.explanationVisible, session?.askAiState]);

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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(17,24,39,1)_0%,rgba(2,6,23,1)_100%)]" />
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-20 animate-[nebula-drift_60s_infinite_ease-in-out]"
               style={{ background: 'radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.3), transparent 60%)' }} />
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-15 animate-[nebula-drift_45s_infinite_ease-in-out_reverse]"
               style={{ background: 'radial-gradient(circle at 70% 30%, rgba(236, 72, 153, 0.2), transparent 50%)' }} />
          <div className="absolute inset-0 opacity-10 bg-grid-perspective origin-top h-[200vh] -mt-[50vh] w-full" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_95%)]" />
      </div>

      {/* --- MAIN CONTENT LAYER --- */}
      <div className="relative z-10 h-screen flex flex-col p-6 md:p-10 gap-6">
          
          <header className="flex justify-between items-start">
             <div className="flex items-center gap-6 glass-card px-8 py-4 rounded-full border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                   <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                   </span>
                   <span className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 font-display">Live Link</span>
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <h1 className="text-lg font-display font-black uppercase tracking-wider text-slate-200">
                    Bodhini Core <span className="text-indigo-500">2.5</span>
                </h1>
             </div>

             {isQuestionVisible && (
                 <div className="glass-card px-8 py-4 rounded-full flex items-center gap-8 border-white/5 bg-white/5 animate-in slide-in-from-right">
                     <div className="flex items-center gap-3">
                        {currentQuestion.roundType === 'BUZZER' ? <Zap className="w-5 h-5 text-amber-400" /> : 
                         currentQuestion.roundType === 'ASK_AI' ? <Brain className="w-5 h-5 text-purple-400" /> :
                         <Waves className="w-5 h-5 text-indigo-400" />}
                        <span className="text-xl font-display font-black uppercase tracking-tight">{currentQuestion.roundType.replace('_', ' ')} ROUND</span>
                     </div>
                     <div className="h-6 w-[1px] bg-white/10" />
                     <div className="flex items-center gap-2">
                        <span className="text-2xl font-display font-black text-white">{currentQuestion.points}</span>
                        <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Credits</span>
                     </div>
                 </div>
             )}
          </header>

          <main className="flex-grow grid grid-cols-12 gap-12 items-stretch">
             
             {/* LEFT COLUMN: FLOATING AVATAR */}
             <div className="col-span-4 flex flex-col justify-center items-center">
                <div className="relative z-10 w-full flex flex-col items-center">
                   <AIHostAvatar size="xl" isSpeaking={isSpeaking} />
                   
                   <div className="mt-12 w-full min-h-[120px] flex items-center justify-center">
                      {commentary ? (
                        <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 px-10 py-6 rounded-[2rem] animate-in fade-in slide-in-from-bottom-4 text-center shadow-2xl max-w-md">
                           <p className="text-indigo-100 text-xl font-sans font-medium leading-relaxed italic tracking-wide">"{commentary}"</p>
                        </div>
                      ) : (
                         <div className="flex gap-3 opacity-20">
                           <div className="w-3 h-3 rounded-full bg-white animate-bounce" />
                           <div className="w-3 h-3 rounded-full bg-white animate-bounce [animation-delay:0.15s]" />
                           <div className="w-3 h-3 rounded-full bg-white animate-bounce [animation-delay:0.3s]" />
                         </div>
                      )}
                   </div>
                </div>

                {isQuestionVisible && currentQuestion.roundType === 'STANDARD' && (
                  <div className="mt-auto glass-card rounded-[2.5rem] px-10 py-8 flex items-center justify-between border-white/5 bg-white/5 w-full">
                      <div>
                        <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.4em] block mb-2 font-display">Neural TTL</span>
                        <span className="text-5xl font-display font-black text-white tabular-nums">{turnTimeLeft}s</span>
                      </div>
                      <Clock className={`w-12 h-12 ${turnTimeLeft < 10 ? 'text-rose-500 animate-pulse' : 'text-indigo-400'}`} />
                  </div>
                )}
             </div>

             {/* RIGHT COLUMN: DATA SLATE */}
             <div className="col-span-8 relative">
                {!isQuestionVisible ? (
                   <div className="h-full glass-card rounded-[4rem] border-white/5 bg-white/5 flex flex-col items-center justify-center text-center p-20 relative overflow-hidden">
                       <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                       <Brain className="w-40 h-40 text-indigo-500/20 mb-12 animate-pulse" />
                       <h2 className="text-6xl font-display font-black text-white uppercase tracking-tight mb-8">Ready For Uplink</h2>
                       <p className="text-2xl text-slate-500 font-sans font-light tracking-widest uppercase">Awaiting admin prompt...</p>
                   </div>
                ) : (
                    currentQuestion.roundType === 'ASK_AI' ? (
                        // --- ASK AI DISPLAY LOGIC ---
                        <div className="h-full flex flex-col gap-8 animate-in zoom-in duration-500">
                             {/* Phase 1: Listening / Idle */}
                             {session.askAiState === 'IDLE' || session.askAiState === 'LISTENING' ? (
                                 <div className="glass-card p-16 rounded-[4rem] border-l-[12px] border-purple-600 border-white/5 bg-white/5 shadow-2xl relative overflow-hidden flex-grow flex flex-col items-center justify-center text-center">
                                     <div className="mb-12">
                                         <Badge color="blue">Active Node: {activeTeam?.name}</Badge>
                                     </div>
                                     {session.askAiState === 'LISTENING' ? (
                                        <>
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-purple-500/30 rounded-full animate-ping" />
                                                <div className="w-32 h-32 rounded-full bg-purple-600/20 flex items-center justify-center mb-8 relative z-10 border border-purple-500/50 shadow-[0_0_50px_rgba(168,85,247,0.4)]">
                                                    <Mic className="w-16 h-16 text-purple-400" />
                                                </div>
                                            </div>
                                            <h2 className="text-5xl font-black text-white uppercase animate-pulse">Awaiting Voice Input...</h2>
                                        </>
                                     ) : (
                                         <h2 className="text-4xl font-black text-slate-400 uppercase">Prepare Query...</h2>
                                     )}
                                 </div>
                             ) : (
                                 // Phase 2: Processing / Answering / Verdict
                                 <div className="h-full flex flex-col gap-8">
                                     <div className="glass-card p-12 rounded-[4rem] border-white/5 bg-white/5 text-center">
                                         <p className="text-slate-400 text-sm font-black uppercase tracking-[0.3em] mb-4">Query Received</p>
                                         <h2 className="text-4xl font-black text-white leading-tight">"{session.currentAskAiQuestion}"</h2>
                                     </div>
                                     
                                     {session.askAiState === 'ANSWERING' && (
                                         <div className="flex-grow glass-card p-12 rounded-[4rem] border border-purple-500/30 bg-purple-500/5 relative overflow-hidden flex items-center justify-center">
                                             <div className="absolute inset-0 bg-purple-500/5 animate-pulse" />
                                             <div className="relative z-10 text-center">
                                                 <div className="w-16 h-16 rounded-full border-t-2 border-l-2 border-purple-400 animate-spin mx-auto mb-6" />
                                                 <p className="text-2xl font-light text-slate-300">Formulating Response...</p>
                                             </div>
                                         </div>
                                     )}

                                     {session.askAiVerdict && (
                                         <div className={`p-12 rounded-[4rem] flex flex-col items-center justify-center text-center animate-in zoom-in ${
                                             session.askAiVerdict === 'AI_WRONG' ? 'bg-emerald-600 shadow-[0_0_100px_rgba(16,185,129,0.5)]' : 'bg-rose-600 shadow-[0_0_100px_rgba(225,29,72,0.5)]'
                                         }`}>
                                              {session.askAiVerdict === 'AI_WRONG' ? (
                                                  <>
                                                    <ThumbsDown className="w-24 h-24 text-white mb-6" />
                                                    <h2 className="text-7xl font-black text-white uppercase tracking-tighter">AI Defeated</h2>
                                                    <p className="text-2xl font-black uppercase tracking-[0.5em] mt-4 opacity-80">+200 Credits to {activeTeam?.name}</p>
                                                  </>
                                              ) : (
                                                  <>
                                                    <ThumbsUp className="w-24 h-24 text-white mb-6" />
                                                    <h2 className="text-7xl font-black text-white uppercase tracking-tighter">AI Victorious</h2>
                                                    <p className="text-2xl font-black uppercase tracking-[0.5em] mt-4 opacity-80">Knowledge Validated</p>
                                                  </>
                                              )}
                                         </div>
                                     )}
                                 </div>
                             )}
                        </div>
                    ) : (
                        // --- STANDARD DISPLAY LOGIC ---
                        <div className="h-full flex flex-col gap-8 animate-in zoom-in duration-500">
                            <div className="glass-card p-16 rounded-[4rem] border-l-[12px] border-indigo-600 border-white/5 bg-white/5 shadow-2xl relative overflow-hidden flex-grow flex items-center">
                                <div className="absolute -top-10 -right-10 opacity-5">
                                    <Brain className="w-80 h-80 text-white rotate-12" />
                                </div>
                                <h2 className="relative z-10 text-5xl md:text-6xl lg:text-7xl font-sans font-bold text-white leading-[1.4] tracking-wide drop-shadow-2xl">
                                    {currentQuestion.text}
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-8 h-[40%]">
                                {currentQuestion.options.map((opt, i) => {
                                    const isRevealed = session.status === QuizStatus.REVEALED;
                                    const isCorrect = isRevealed && i === currentQuestion.correctAnswer;
                                    const isDimmed = isRevealed && !isCorrect;
                                    
                                    return (
                                    <div key={i} className={`
                                        relative overflow-hidden rounded-[3rem] p-10 flex items-center gap-10 border transition-all duration-700
                                        ${isCorrect 
                                        ? 'bg-emerald-600 border-emerald-400 shadow-[0_0_80px_rgba(16,185,129,0.5)] scale-[1.03] z-20' 
                                        : isDimmed 
                                            ? 'bg-slate-900/60 border-white/5 opacity-20 grayscale' 
                                            : 'glass-card border-white/10 bg-white/5 hover:bg-white/10'
                                        }
                                    `}>
                                        <div className={`
                                            w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-display font-black shrink-0
                                            ${isCorrect ? 'bg-white text-emerald-600' : 'bg-white/10 text-indigo-300'}
                                        `}>
                                            {String.fromCharCode(65+i)}
                                        </div>
                                        <span className={`text-3xl md:text-4xl font-sans font-semibold leading-relaxed tracking-wide ${isCorrect ? 'text-white' : 'text-slate-200'}`}>
                                            {opt}
                                        </span>
                                        {isCorrect && (
                                            <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                                <ShieldCheck className="w-12 h-12 text-white animate-bounce" />
                                            </div>
                                        )}
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                )}

                {/* --- SYSTEM OVERLAYS --- */}
                {(session.status === QuizStatus.LOCKED || lockingTeam) && !session.submissions.find(s => s.teamId === activeTeam?.id)?.isCorrect && (
                   <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-in zoom-in duration-300">
                      <div className="bg-slate-950/95 backdrop-blur-2xl border border-indigo-500/50 p-20 rounded-[5rem] text-center shadow-[0_0_200px_rgba(79,70,229,0.6)] max-w-3xl transform scale-110">
                         <div className="w-28 h-28 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-10 shadow-[0_0_60px_rgba(99,102,241,0.7)]">
                            <LockIcon className="w-12 h-12 text-white" />
                         </div>
                         <p className="text-indigo-400 text-sm font-black uppercase tracking-[0.6em] mb-6 font-display">System Intercept</p>
                         <h3 className="text-7xl font-display font-black text-white uppercase neon-text tracking-tighter">
                            {lockingTeam?.name || "LOCKED"}
                         </h3>
                      </div>
                   </div>
                )}

                {session.explanationVisible && (
                   <div className="absolute bottom-8 left-8 right-8 z-40 bg-slate-950/90 border-t-[6px] border-emerald-500 rounded-[3rem] p-12 shadow-[0_-20px_100px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom duration-1000 flex items-start gap-10">
                      <div className="bg-emerald-500/10 p-6 rounded-3xl shrink-0">
                         <Sparkles className="w-10 h-10 text-emerald-400" />
                      </div>
                      <div>
                         <h4 className="text-xs font-black uppercase text-emerald-500 tracking-[0.4em] mb-4 font-display">Knowledge Synthesis Complete</h4>
                         <p className="text-2xl font-sans font-medium text-slate-100 leading-[1.8]">"{currentQuestion.explanation}"</p>
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
