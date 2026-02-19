
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { SFX } from '../services/sfx';
import { QuizStatus } from '../types';
import { Badge } from '../components/SharedUI';
import { Lock as LockIcon, Power, Sparkles, Brain, Clock, Zap, Waves, ShieldCheck, Mic, ThumbsUp, ThumbsDown, BrainCircuit, Search, ExternalLink, Eye, ChevronRight, Volume2, ShieldAlert } from 'lucide-react';
import { AIHostAvatar } from '../components/AIHostAvatar';
import { HOST_SCRIPTS, AI_COMMENTS } from '../constants';

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
  
  const [askAiAnnounced, setAskAiAnnounced] = useState(false);
  
  const lastStatusRef = useRef<QuizStatus | null>(null);
  const lastSubmissionCountRef = useRef<number>(0);
  const lastPassedCountRef = useRef<number>(0);
  const sfxPlayedRef = useRef<boolean>(false);
  const introPlayedRef = useRef<boolean>(false);
  const lastActiveTeamRef = useRef<string | null>(null);
  const lastAskAiStateRef = useRef<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

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
        const introText = HOST_SCRIPTS.INTRO;
        setTimeout(() => {
            API.getTTSAudio(introText).then(audio => {
                if (audio) playAudio(audio, "System Ready");
            });
        }, 1200); 
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
    if (!session || !currentQuestion || !audioInitialized) return;

    // 1. Reading Question & Naming Team
    const activeTeamChanged = session.activeTeamId !== lastActiveTeamRef.current;
    const isStandardLive = session.status === QuizStatus.LIVE && currentQuestion.roundType === 'STANDARD';

    if ((session.status === QuizStatus.LIVE && lastStatusRef.current !== QuizStatus.LIVE && currentQuestion.roundType !== 'ASK_AI') || (isStandardLive && activeTeamChanged && session.activeTeamId)) {
       SFX.playIntro();
       const teamName = activeTeam?.name || "Team";
       const speechText = API.formatQuestionForSpeech(currentQuestion, teamName);

       API.getTTSAudio(speechText).then(audio => {
         if (audio) {
           playAudio(audio, `Question for ${teamName}`, () => API.completeReading());
         } else API.completeReading();
       });
    }

    // Ask AI Intro
    if (session.status === QuizStatus.LIVE && currentQuestion.roundType === 'ASK_AI' && !askAiAnnounced) {
        setAskAiAnnounced(true);
        const teamName = activeTeam ? activeTeam.name : "Team";
        const text = HOST_SCRIPTS.ASK_AI_INTRO.replace('{team}', teamName);
        API.getTTSAudio(text).then(audio => {
            if (audio) playAudio(audio, `Ready for ${teamName}`, () => SFX.startAmbient());
            else SFX.startAmbient();
        });
    }

    // 2. Announce Team Passing
    if (session.passedTeamIds.length > lastPassedCountRef.current) {
        const justPassedId = session.passedTeamIds[session.passedTeamIds.length - 1];
        const passedTeam = session.teams.find(t => t.id === justPassedId);
        if (passedTeam) {
            const passMsg = `${passedTeam.name} has passed the question.`;
            API.getTTSAudio(passMsg).then(audio => {
                if (audio) playAudio(audio, passMsg);
            });
        }
    }

    // 3. Announce Answer Lock
    if (session.submissions.length > lastSubmissionCountRef.current) {
       const newSub = session.submissions[session.submissions.length - 1];
       const team = session.teams.find(t => t.id === newSub.teamId);
       if (team && currentQuestion.roundType !== 'ASK_AI' && session.status !== QuizStatus.REVEALED) { 
           SFX.playLock();
           const lockText = `Answer locked by ${team.name}.`;
           API.getTTSAudio(lockText).then(audio => {
                if (audio) playAudio(audio, lockText);
           });
       }
    }

    // 4. Results Reveal
    if (session.status === QuizStatus.REVEALED && !sfxPlayedRef.current) {
       sfxPlayedRef.current = true;
       if (currentQuestion.roundType !== 'ASK_AI') {
            const submission = session.submissions[session.submissions.length-1];
            if (submission) {
                const isCorrect = submission.isCorrect;
                if (isCorrect) SFX.playCorrect(); else SFX.playWrong();

                const team = session.teams.find(t => t.id === submission.teamId);
                const teamName = team ? team.name : "Team";

                const templates = isCorrect ? AI_COMMENTS.CORRECT : AI_COMMENTS.WRONG;
                const memeText = templates[Math.floor(Math.random() * templates.length)].replace('{team}', teamName);

                const correctChar = String.fromCharCode(65 + currentQuestion.correctAnswer);
                const technicalFeedback = isCorrect 
                    ? `Option ${correctChar} is correct.` 
                    : `Incorrect. The correct answer was Option ${correctChar}.`;

                setTimeout(async () => {
                    const memeAudio = await API.getTTSAudio(memeText);
                    const verdictAudio = await API.getTTSAudio(technicalFeedback);
                    if (memeAudio) {
                        playAudio(memeAudio, memeText, () => {
                            if (verdictAudio) setTimeout(() => playAudio(verdictAudio, technicalFeedback), 400);
                        });
                    } else if (verdictAudio) {
                        playAudio(verdictAudio, technicalFeedback);
                    }
                }, 600);
            }
       }
    }

    lastStatusRef.current = session.status;
    lastSubmissionCountRef.current = session.submissions.length;
    lastPassedCountRef.current = session.passedTeamIds.length;
    lastActiveTeamRef.current = session.activeTeamId;
  }, [session?.status, session?.submissions.length, session?.passedTeamIds.length, session?.activeTeamId, audioInitialized]);

  // Ask AI Logic: Question then Answer
  useEffect(() => {
    if (!session || !currentQuestion || currentQuestion.roundType !== 'ASK_AI' || !audioInitialized) return;
    if (session.askAiState !== lastAskAiStateRef.current) {
        if (session.askAiState === 'PROCESSING') {
             SFX.stopAmbient();
             const teamName = activeTeam?.name || 'the team';
             API.getTTSAudio(`Thinking about the answer for ${teamName}.`).then(audio => audio && playAudio(audio, "Processing..."));
        }
        if (session.askAiState === 'ANSWERING' && session.currentAskAiResponse && session.currentAskAiQuestion) {
             const repeatQuestion = `You asked: ${session.currentAskAiQuestion}`;
             const answer = session.currentAskAiResponse;
             
             (async () => {
                const qAudio = await API.getTTSAudio(repeatQuestion);
                const aAudio = await API.getTTSAudio(answer);
                if (qAudio) {
                    playAudio(qAudio, repeatQuestion, () => {
                        if (aAudio) setTimeout(() => playAudio(aAudio, answer), 500);
                    });
                } else if (aAudio) {
                    playAudio(aAudio, answer);
                }
             })();
        }
        lastAskAiStateRef.current = session.askAiState;
    }
  }, [session?.askAiState, audioInitialized]);

  if (loading || !session) return null;

  if (!audioInitialized) {
      return (
          <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center cursor-pointer group" onClick={initAudio}>
              <div className="absolute inset-0 opacity-20 bg-grid-perspective" />
              <div className="relative z-10 flex flex-col items-center text-center px-10">
                  <div className="w-24 h-24 rounded-full border-4 border-indigo-500/30 flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(99,102,241,0.4)] transition-all group-hover:scale-110">
                    <Power className="w-10 h-10 text-indigo-400 animate-pulse" />
                  </div>
                  <h1 className="text-4xl font-display font-black text-white uppercase tracking-[0.2em] neon-text">Initialize Bodhini</h1>
                  <p className="text-slate-500 mt-4 uppercase tracking-widest text-xs">Tap to begin system check</p>
              </div>
          </div>
      );
  }

  const isQuestionVisible = !!currentQuestion && session.status !== QuizStatus.PREVIEW;
  const lastSubmission = session.submissions[session.submissions.length - 1];
  const lockingTeam = session.status === QuizStatus.LOCKED ? session.teams.find(t => t.id === lastSubmission?.teamId) : null;
  const showLockedOverlay = !!lockingTeam && session.status !== QuizStatus.REVEALED;

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden relative font-sans">
      <div className="absolute inset-0 z-0 bg-[#020617]">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] opacity-20 animate-[nebula-drift_60s_infinite_ease-in-out]"
               style={{ background: 'radial-gradient(circle at 50% 50%, rgba(79, 70, 229, 0.3), transparent 60%)' }} />
          <div className="absolute inset-0 opacity-10 bg-grid-perspective" />
      </div>

      <div className="relative z-10 h-screen flex flex-col p-6 md:p-10 gap-6">
          <header className="flex justify-between items-start">
             <div className="flex items-center gap-6 glass-card px-8 py-4 rounded-full border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_#10b981]" />
                   <span className="text-xs font-black uppercase tracking-[0.3em] text-emerald-400 font-display">System Active</span>
                </div>
                <div className="h-4 w-[1px] bg-white/10" />
                <h1 className="text-lg font-display font-black uppercase tracking-wider text-slate-200">DUK <span className="text-indigo-500">BODHINI</span></h1>
             </div>

             {isQuestionVisible && (
                 <div className="glass-card px-8 py-4 rounded-full flex items-center gap-8 border-white/5 bg-white/5 animate-in slide-in-from-right">
                     <span className="text-xl font-display font-black uppercase tracking-tight">{currentQuestion.roundType} ROUND</span>
                 </div>
             )}
          </header>

          <main className="flex-grow grid grid-cols-12 gap-12 items-stretch max-h-[calc(100vh-140px)]">
             <div className="col-span-4 flex flex-col justify-center items-center">
                <AIHostAvatar size="xl" isSpeaking={isSpeaking} />
                <div className="mt-8 w-full min-h-[100px] flex items-center justify-center">
                   {commentary && (
                     <div className="bg-slate-950/60 backdrop-blur-3xl border border-indigo-500/20 px-8 py-4 rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4 text-center shadow-2xl max-w-lg">
                        <p className="text-indigo-100 text-lg font-sans font-medium italic leading-relaxed">"{commentary}"</p>
                     </div>
                   )}
                </div>
             </div>

             <div className="col-span-8 relative">
                {!isQuestionVisible ? (
                   <div className="h-full glass-card rounded-[4rem] border-white/5 bg-white/5 flex flex-col items-center justify-center text-center p-20 relative overflow-hidden">
                       <BrainCircuit className="w-40 h-40 text-indigo-500/30 mb-12 animate-pulse" />
                       <h2 className="text-6xl font-display font-black text-white uppercase tracking-tight mb-8">System Standby</h2>
                       <p className="text-xl text-slate-500 font-mono tracking-widest uppercase tracking-[0.5em]">Initializing rounds...</p>
                   </div>
                ) : (
                    <div className="h-full flex flex-col gap-8 animate-in zoom-in duration-500">
                        {/* Question Panel */}
                        <div className="glass-card p-12 rounded-[4rem] border-l-[12px] border-indigo-600 bg-white/5 shadow-2xl flex-grow flex flex-col items-center justify-center text-center relative overflow-hidden">
                            {showLockedOverlay && (
                                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl z-40 flex flex-col items-center justify-center animate-in fade-in">
                                    <div className="relative mb-8">
                                        <LockIcon className="w-24 h-24 text-rose-500 animate-pulse" />
                                        <div className="absolute inset-0 w-full h-full border-4 border-rose-500/20 rounded-full animate-ping" />
                                    </div>
                                    <h2 className="text-5xl font-display font-black text-rose-500 uppercase tracking-widest mb-4">LOCKED</h2>
                                    <p className="text-xl text-slate-400 font-mono tracking-widest uppercase">Response captured from {lockingTeam?.name}</p>
                                </div>
                            )}

                            <div className="absolute top-0 right-10 -mt-6 z-20">
                                {activeTeam && (
                                    <div className="bg-indigo-600 shadow-2xl border-2 border-indigo-400 px-10 py-4 rounded-b-[2rem]">
                                        <h2 className="text-3xl font-black text-white uppercase">{activeTeam.name}</h2>
                                    </div>
                                )}
                            </div>
                            <h2 className="text-4xl md:text-5xl font-sans font-bold text-white leading-[1.3] drop-shadow-[0_0_30px_rgba(0,0,0,1)]">
                                {currentQuestion.text}
                            </h2>
                        </div>

                        {/* Options Grid */}
                        <div className="grid grid-cols-2 gap-8 h-[45%]">
                            {currentQuestion.options.map((opt, i) => {
                                const isCorrect = session.status === QuizStatus.REVEALED && i === currentQuestion.correctAnswer;
                                const isSelectedByTeam = session.status === QuizStatus.REVEALED && lastSubmission?.answer === i;
                                const isWrongSelection = isSelectedByTeam && !isCorrect;

                                return (
                                    <div key={i} className={`relative rounded-[3.5rem] p-8 flex items-center gap-6 border transition-all duration-700 glass-card 
                                        ${isCorrect ? 'bg-emerald-600/40 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)] scale-105 z-10' : 
                                          isWrongSelection ? 'bg-rose-600/40 border-rose-400 shadow-[0_0_30px_rgba(225,29,72,0.3)]' : 
                                          'border-white/10 bg-white/5'}`}>
                                        
                                        <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center text-2xl font-black 
                                            ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-white/10 text-indigo-300'}`}>
                                            {String.fromCharCode(65+i)}
                                        </div>
                                        <span className={`text-xl md:text-2xl font-sans font-semibold tracking-tight 
                                            ${isCorrect ? 'text-white' : 'text-slate-200'}`}>
                                            {opt}
                                        </span>

                                        {isCorrect && (
                                            <div className="absolute top-4 right-8 bg-emerald-500 text-white text-[10px] px-4 py-1 rounded-full font-black uppercase tracking-widest animate-bounce">
                                                Correct
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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
