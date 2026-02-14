
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { SFX } from '../services/sfx';
import { QuizStatus } from '../types';
import { HOST_SCRIPTS } from '../constants';
import { Timer, Badge } from '../components/SharedUI';
import { Trophy, CheckCircle2, Lock as LockIcon, Power, Sparkles, Brain, Clock } from 'lucide-react';
import { AIHostAvatar } from '../components/AIHostAvatar';

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  return await ctx.decodeAudioData(arrayBuffer);
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
  };

  const playAudio = async (base64Data: string, text?: string, onEnd?: () => void) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (activeSourceRef.current) try { activeSourceRef.current.stop(); } catch(e) {}
    
    if (text) setCommentary(text.replace(/<[^>]*>/g, '').trim());
    setIsSpeaking(true);

    try {
        const audioBuffer = await decodeAudioData(decodeBase64(base64Data), ctx);
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

    // Detect new submissions for locking announcement
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

    if (session.status === QuizStatus.REVEALED && !explanationPlayedRef.current) {
       explanationPlayedRef.current = true;
       const submission = session.submissions[session.submissions.length-1];
       const isCorrect = submission?.isCorrect;

       if (isCorrect) SFX.playCorrect(); else SFX.playWrong();

       // Sequence: Reveal SFX -> Speak Result & Explanation
       setTimeout(() => {
         API.getTTSAudio(API.formatExplanationForSpeech(currentQuestion.explanation, isCorrect)).then(audio => {
           if (audio) playAudio(audio, "Data Synthesis Active");
         });
       }, 1500);
    }

    if (session.currentQuestion?.id !== lastQuestionIdRef.current) {
        lastQuestionIdRef.current = session.currentQuestion?.id || null;
        explanationPlayedRef.current = false;
        lastSubmissionCountRef.current = 0; // Reset count on new question
    }
    
    lastStatusRef.current = session.status;
    lastSubmissionCountRef.current = session.submissions.length;
  }, [session?.status, session?.currentQuestion?.id, session?.submissions.length]);

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
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center cursor-pointer" onClick={initAudio}>
              <Power className="w-16 h-16 text-indigo-400 mb-8 animate-pulse" />
              <h1 className="text-3xl font-black text-white uppercase tracking-[0.2em]">Activate Display Node</h1>
          </div>
      );
  }

  const isQuestionVisible = !!currentQuestion && session.status !== QuizStatus.PREVIEW;
  const lockingTeam = session.submissions.length > 0 
    ? session.teams.find(t => t.id === session.submissions[session.submissions.length - 1].teamId) 
    : null;

  return (
    <div className="min-h-screen bg-slate-950 flex overflow-hidden relative font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(transparent_0%,#020617_100%)] z-10" />
      
      <div className="relative z-20 w-full h-screen grid grid-cols-12 gap-8 p-12">
        <div className={`flex flex-col items-center justify-center transition-all duration-1000 ${
            !isQuestionVisible ? 'col-span-12 scale-150' : 'col-span-4'
        }`}>
           <AIHostAvatar size="xl" isSpeaking={isSpeaking} commentary={commentary} />
           {!isQuestionVisible && currentQuestion && (
              <div className="mt-12 text-center animate-in fade-in zoom-in">
                 <Badge color="indigo">INCOMING SEQUENCE</Badge>
                 <h2 className="text-5xl font-black text-white mt-4 uppercase tracking-tighter">{currentQuestion.roundType}</h2>
              </div>
           )}
        </div>

        {isQuestionVisible && (
          <div className="col-span-8 flex flex-col justify-center space-y-10 animate-in slide-in-from-right duration-700 relative">
             
             {/* Visual Lock Indicator */}
             {(session.status === QuizStatus.LOCKED || (session.status === QuizStatus.LIVE && lockingTeam)) && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in duration-300 pointer-events-none">
                    <div className="bg-slate-900/90 border-2 border-indigo-500 p-10 rounded-[2.5rem] shadow-[0_0_80px_rgba(99,102,241,0.5)] text-center backdrop-blur-xl">
                        <LockIcon className="w-16 h-16 text-indigo-400 mx-auto mb-6 animate-pulse" />
                        <p className="text-slate-400 text-sm font-black uppercase tracking-[0.4em] mb-4">System Locked</p>
                        <p className="text-4xl font-black text-white uppercase tracking-tight">{lockingTeam?.name}</p>
                    </div>
                </div>
             )}

             <div className="flex justify-between items-center">
                <Badge color={currentQuestion.roundType === 'BUZZER' ? 'amber' : 'blue'}>{currentQuestion.roundType} ROUND</Badge>
                <div className="flex items-center gap-10">
                   {currentQuestion.roundType === 'STANDARD' && (
                     <div className="bg-slate-900 border border-slate-700 px-6 py-3 rounded-2xl flex items-center gap-4">
                        <Clock className="w-5 h-5 text-indigo-400" />
                        <span className="text-2xl font-black text-white tabular-nums">{turnTimeLeft}s</span>
                     </div>
                   )}
                   <p className="text-4xl font-black text-white italic tracking-tighter">{currentQuestion.points} <span className="text-sm text-slate-500">CR</span></p>
                </div>
             </div>

             <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-16 rounded-[4rem] shadow-2xl relative overflow-hidden">
                <h2 className="text-5xl font-black text-white leading-tight mb-12 drop-shadow-2xl">{currentQuestion.text}</h2>

                <div className="grid grid-cols-1 gap-6">
                   {currentQuestion.options.map((opt, i) => (
                      <div key={i} className={`flex items-center gap-8 p-6 rounded-3xl border transition-all duration-500 ${
                          session.status === QuizStatus.REVEALED && i === currentQuestion.correctAnswer 
                          ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.2)] scale-[1.02]' 
                          : session.status === QuizStatus.REVEALED ? 'opacity-20 border-white/5' : 'bg-white/5 border-white/10'
                      }`}>
                         <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black ${
                             session.status === QuizStatus.REVEALED && i === currentQuestion.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white shadow-xl'
                         }`}>
                            {String.fromCharCode(65+i)}
                         </div>
                         <span className="text-3xl font-bold tracking-tight text-white">{opt}</span>
                         {session.status === QuizStatus.REVEALED && i === currentQuestion.correctAnswer && <CheckCircle2 className="w-10 h-10 text-emerald-500 ml-auto" />}
                      </div>
                   ))}
                </div>

                {session.status === QuizStatus.REVEALED && (
                  <div className="mt-12 p-10 bg-indigo-600/10 border-l-8 border-indigo-500 rounded-r-[3rem] animate-in zoom-in duration-700">
                     <div className="flex items-center gap-4 mb-4">
                        <Brain className="w-6 h-6 text-indigo-400" />
                        <span className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.5em]">Neural Explanation</span>
                     </div>
                     <p className="text-2xl font-bold text-slate-200 leading-relaxed italic">"{currentQuestion.explanation}"</p>
                  </div>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisplayView;
