
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { SFX } from '../services/sfx';
import { QuizStatus } from '../types';
import { Badge } from '../components/SharedUI';
import { Lock as LockIcon, Power, Sparkles, Brain, Clock, Zap, Waves, ShieldCheck, Mic, ThumbsUp, ThumbsDown, BrainCircuit, Search, ExternalLink, Eye } from 'lucide-react';
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
        const introText = "Neural connection established. Bodhini Core Online. Prepare for knowledge synthesis.";
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
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch(e) {}
    }
    
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
            activeSourceRef.current = null;
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

    if (session.explanationVisible && !explanationPlayedRef.current) {
       explanationPlayedRef.current = true;
       API.getTTSAudio(API.formatExplanationForSpeech(currentQuestion.explanation)).then(audio => {
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
  }, [session?.status, session?.currentQuestion?.id, session?.submissions.length, session?.explanationVisible]);

  useEffect(() => {
    if (!session || !currentQuestion || currentQuestion.roundType !== 'ASK_AI') return;

    if (session.askAiState !== lastAskAiStateRef.current) {
        if (session.askAiState === 'PROCESSING' && session.currentAskAiQuestion) {
             const teamName = session.teams.find(t => t.id === session.activeTeamId)?.name || 'Team';
             const textToRead = `Question from ${teamName}: ${session.currentAskAiQuestion}`;
             API.getTTSAudio(textToRead).then(audio => {
                 if (audio) playAudio(audio, `Neural Processing: "${session.currentAskAiQuestion}"`);
             });
        }
        if (session.askAiState === 'ANSWERING' && session.currentAskAiResponse) {
             API.getTTSAudio(session.currentAskAiResponse).then(audio => {
                 if (audio) playAudio(audio, session.currentAskAiResponse);
             });
        }
        if (session.askAiState === 'COMPLETED' && session.askAiVerdict) {
             const isWrong = session.askAiVerdict === 'AI_WRONG';
             const teamName = session.teams.find(t => t.id === session.activeTeamId)?.name || 'the team';
             const verdictText = isWrong 
                ? `The admin has rejected my answer. 200 credits awarded to ${teamName}.` 
                : "The admin confirms my analysis. No credits awarded.";
             if (isWrong) SFX.playWrong(); else SFX.playCorrect();
             setTimeout(() => {
                API.getTTSAudio(verdictText).then(a => a && playAudio(a, isWrong ? "AI Overridden" : "AI Validated"));
             }, 500);
        }
        lastAskAiStateRef.current = session.askAiState;
    }
  }, [session?.askAiState, session?.currentAskAiQuestion, session?.currentAskAiResponse, session?.askAiVerdict, currentQuestion?.roundType]);

  useEffect(() => {
    if (session?.status === QuizStatus.LIVE && (currentQuestion?.roundType === 'STANDARD' || currentQuestion?.roundType === 'VISUAL') && !session.isReading) {
      const interval = setInterval(() => {
        const startTime = session.turnStartTime || Date.now();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const limit = currentQuestion.timeLimit || 30;
        const remaining = Math.max(0, limit - elapsed);
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
                  <div className="w-24 h-24 rounded-full border-4 border-indigo-500/30 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(99,102,241,0.4)] transition-all group-hover:scale-110">
                    <Power className="w-10 h-10 text-indigo-400 animate-pulse" />
                  </div>
                  <h1 className="text-4xl font-display font-black text-white uppercase tracking-[0.2em] neon-text">Initialize Neural Link</h1>
              </div>
          </div>
      );
  }

  const isQuestionVisible = !!currentQuestion && session.status !== QuizStatus.PREVIEW;
  const lockingTeam = session.submissions.length > 0 ? session.teams.find(t => t.id === session.submissions[session.submissions.length - 1].teamId) : null;

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden relative font-sans">
      <div className="absolute inset-0 z-0 bg-[#020617]">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-20 animate-[nebula-drift_60s_infinite_ease-in-out]"
               style={{ background: 'radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.3), transparent 60%)' }} />
          <div className="absolute inset-0 opacity-10 bg-grid-perspective" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_95%)]" />
      </div>

      <div className="relative z-10 h-screen flex flex-col p-6 md:p-10 gap-6">
          <header className="flex justify-between items-start">
             <div className="flex items-center gap-6 glass-card px-8 py-4 rounded-full border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_#10b981]" />
                   <span className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 font-display">System Intercept Active</span>
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <h1 className="text-lg font-display font-black uppercase tracking-wider text-slate-200">Bodhini <span className="text-indigo-500">3.1</span></h1>
             </div>

             {isQuestionVisible && (
                 <div className="glass-card px-8 py-4 rounded-full flex items-center gap-8 border-white/5 bg-white/5 animate-in slide-in-from-right">
                     <div className="flex items-center gap-3">
                        {currentQuestion.roundType === 'BUZZER' ? <Zap className="w-5 h-5 text-amber-400" /> : 
                         currentQuestion.roundType === 'ASK_AI' ? <Search className="w-5 h-5 text-purple-400" /> :
                         currentQuestion.roundType === 'VISUAL' ? <Eye className="w-5 h-5 text-cyan-400" /> :
                         <Waves className="w-5 h-5 text-indigo-400" />}
                        <span className="text-xl font-display font-black uppercase tracking-tight">{currentQuestion.roundType} ROUND</span>
                     </div>
                 </div>
             )}
          </header>

          <main className="flex-grow grid grid-cols-12 gap-12 items-stretch">
             <div className="col-span-4 flex flex-col justify-center items-center">
                <AIHostAvatar size="xl" isSpeaking={isSpeaking} />
                <div className="mt-12 w-full min-h-[140px] flex items-center justify-center">
                   {commentary && (
                     <div className="bg-slate-950/60 backdrop-blur-3xl border border-indigo-500/20 px-10 py-6 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4 text-center shadow-2xl max-w-lg">
                        <p className="text-indigo-100 text-xl font-sans font-medium italic leading-relaxed">"{commentary}"</p>
                     </div>
                   )}
                </div>
             </div>

             <div className="col-span-8 relative">
                {!isQuestionVisible ? (
                   <div className="h-full glass-card rounded-[4rem] border-white/5 bg-white/5 flex flex-col items-center justify-center text-center p-20 relative overflow-hidden">
                       <div className="absolute inset-0 bg-grid-perspective opacity-5" />
                       <BrainCircuit className="w-40 h-40 text-indigo-500/30 mb-12 animate-pulse" />
                       <h2 className="text-6xl font-display font-black text-white uppercase tracking-tight mb-8">Ready For Neural Uplink</h2>
                       <p className="text-xl text-slate-500 font-mono tracking-widest uppercase">SCANNING FOR ADMIN BROADCAST...</p>
                   </div>
                ) : (
                    currentQuestion.roundType === 'ASK_AI' ? (
                        <div className="h-full flex flex-col gap-8 animate-in zoom-in duration-500">
                             {session.askAiState === 'IDLE' || session.askAiState === 'LISTENING' ? (
                                 <div className="glass-card p-16 rounded-[4rem] border-l-[12px] border-purple-600 bg-white/5 shadow-2xl flex-grow flex flex-col items-center justify-center text-center">
                                     <Badge color="blue">Primary challenge node: {activeTeam?.name}</Badge>
                                     <div className="mt-12 relative">
                                         <div className="absolute inset-0 bg-purple-500/30 rounded-full animate-ping" />
                                         <div className="w-32 h-32 rounded-full bg-purple-600/20 flex items-center justify-center relative z-10 border border-purple-500/50 shadow-[0_0_60px_rgba(168,85,247,0.4)]">
                                             <Mic className="w-16 h-16 text-purple-400" />
                                         </div>
                                     </div>
                                     <h2 className="text-5xl font-black text-white uppercase mt-10 animate-pulse tracking-tighter">Awaiting Vocal Uplink...</h2>
                                 </div>
                             ) : (
                                 <div className="h-full flex flex-col gap-8">
                                     <div className="glass-card p-12 rounded-[4rem] bg-white/5 text-center border-white/10 shadow-xl">
                                         <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em] mb-4">Challenge Intercepted</p>
                                         <h2 className="text-4xl font-black text-white leading-tight italic">"{session.currentAskAiQuestion}"</h2>
                                     </div>
                                     
                                     {session.askAiState === 'PROCESSING' && (
                                         <div className="flex-grow glass-card p-12 rounded-[4rem] border border-indigo-500/30 bg-indigo-500/5 flex items-center justify-center relative overflow-hidden">
                                             <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10" />
                                             <div className="text-center space-y-8 relative z-10">
                                                 <div className="flex justify-center gap-4">
                                                     <div className="w-4 h-4 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay:'0s'}} />
                                                     <div className="w-4 h-4 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay:'0.1s'}} />
                                                     <div className="w-4 h-4 rounded-full bg-indigo-400 animate-bounce" style={{animationDelay:'0.2s'}} />
                                                 </div>
                                                 <Search className="w-24 h-24 text-indigo-400 animate-pulse mx-auto" />
                                                 <h3 className="text-4xl font-black text-white uppercase tracking-[0.2em] animate-pulse">Scanning Neural Repository...</h3>
                                                 <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Searching Google Grounding Service...</div>
                                             </div>
                                         </div>
                                     )}
                                     
                                     {session.askAiState === 'ANSWERING' && (
                                         <div className="flex-grow glass-card p-16 rounded-[4rem] border border-purple-500/30 bg-purple-500/5 flex flex-col items-center justify-center animate-in slide-in-from-bottom shadow-2xl">
                                             <div className="text-center space-y-10">
                                                 <Badge color="blue">Uplink Response Generated</Badge>
                                                 <h2 className="text-4xl font-medium text-white leading-[1.6] max-w-4xl tracking-wide">"{session.currentAskAiResponse}"</h2>
                                                 
                                                 {session.groundingUrls && session.groundingUrls.length > 0 && (
                                                     <div className="pt-10 border-t border-white/10 w-full">
                                                         <p className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.4em] mb-6">Factual Grounding Sources</p>
                                                         <div className="flex flex-wrap justify-center gap-5">
                                                             {session.groundingUrls.slice(0, 3).map((link, idx) => (
                                                                 <div key={idx} className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-[2rem] text-xs text-indigo-300 border border-white/5 hover:bg-white/10 transition-all cursor-default">
                                                                     <ExternalLink className="w-4 h-4" />
                                                                     {link.title.substring(0, 40)}...
                                                                 </div>
                                                             ))}
                                                         </div>
                                                     </div>
                                                 )}
                                             </div>
                                         </div>
                                     )}

                                     {session.askAiVerdict && (
                                         <div className={`p-16 rounded-[4rem] flex flex-col items-center justify-center text-center flex-grow shadow-[0_0_150px_rgba(0,0,0,0.5)] border-4 transition-all duration-1000 ${
                                             session.askAiVerdict === 'AI_WRONG' ? 'bg-emerald-600/90 border-emerald-400' : 'bg-rose-600/90 border-rose-400'
                                         }`}>
                                              {session.askAiVerdict === 'AI_WRONG' ? (
                                                  <>
                                                    <div className="p-8 bg-white/10 rounded-full mb-8">
                                                       <ThumbsDown className="w-32 h-32 text-white animate-bounce" />
                                                    </div>
                                                    <h2 className="text-8xl font-black text-white uppercase tracking-tighter">AI DEFEATED</h2>
                                                    <p className="text-3xl font-black uppercase tracking-[0.5em] mt-6 text-emerald-100">+200 Credits Awarded</p>
                                                  </>
                                              ) : (
                                                  <>
                                                    <div className="p-8 bg-white/10 rounded-full mb-8">
                                                       <ThumbsUp className="w-32 h-32 text-white animate-pulse" />
                                                    </div>
                                                    <h2 className="text-8xl font-black text-white uppercase tracking-tighter">AI VICTORIOUS</h2>
                                                    <p className="text-3xl font-black uppercase tracking-[0.5em] mt-6 text-rose-100">Analysis Validated</p>
                                                  </>
                                              )}
                                         </div>
                                     )}
                                 </div>
                             )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col gap-8 animate-in zoom-in duration-500">
                            <div className="glass-card p-12 rounded-[4rem] border-l-[12px] border-indigo-600 bg-white/5 shadow-2xl flex-grow flex flex-col items-center justify-center gap-8 overflow-hidden relative">
                                {currentQuestion.roundType === 'VISUAL' && currentQuestion.visualUri && (
                                    <div className="w-full h-full absolute inset-0 z-0">
                                        <img src={currentQuestion.visualUri} className="w-full h-full object-cover opacity-70 mix-blend-overlay" alt="Visual Round" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                                        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.1) 3px)] pointer-events-none" />
                                    </div>
                                )}
                                <h2 className="relative z-10 text-5xl md:text-6xl font-sans font-bold text-white text-center leading-[1.3] drop-shadow-[0_0_30px_rgba(0,0,0,1)]">
                                    {currentQuestion.text}
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 gap-8 h-[45%]">
                                {currentQuestion.options.map((opt, i) => {
                                    const isRevealed = session.status === QuizStatus.REVEALED;
                                    const isCorrect = isRevealed && i === currentQuestion.correctAnswer;
                                    return (
                                    <div key={i} className={`
                                        relative overflow-hidden rounded-[3.5rem] p-10 flex items-center gap-10 border transition-all duration-700
                                        ${isCorrect ? 'bg-emerald-600 border-emerald-400 shadow-[0_0_100px_rgba(16,185,129,0.5)] scale-105 z-20' : 
                                          isRevealed ? 'bg-slate-900/60 opacity-20' : 'glass-card border-white/10 bg-white/5'}
                                    `}>
                                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl font-display font-black shrink-0 ${isCorrect ? 'bg-white text-emerald-600' : 'bg-white/10 text-indigo-300'}`}>
                                            {String.fromCharCode(65+i)}
                                        </div>
                                        <span className="text-3xl font-sans font-semibold text-white tracking-tight">{opt}</span>
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                )}

                {(session.status === QuizStatus.LOCKED || lockingTeam) && currentQuestion?.roundType !== 'ASK_AI' && !session.submissions.find(s => s.teamId === activeTeam?.id)?.isCorrect && (
                   <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none animate-in zoom-in duration-300">
                      <div className="bg-slate-950/95 backdrop-blur-3xl border border-indigo-500/50 p-20 rounded-[5rem] text-center shadow-[0_0_250px_rgba(79,70,229,0.7)] transform scale-110">
                         <LockIcon className="w-16 h-16 text-white mx-auto mb-10" />
                         <h3 className="text-8xl font-display font-black text-white uppercase tracking-tighter neon-text">{lockingTeam?.name || "LOCKED"}</h3>
                         <p className="text-indigo-400 font-black tracking-[0.6em] uppercase text-xs mt-6">UPLINK SEALED</p>
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
