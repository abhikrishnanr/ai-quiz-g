
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { Timer, Badge } from '../components/SharedUI';
import { Trophy, BrainCircuit, Star, Zap, Layers, UserCheck, CheckCircle2, Lock as LockIcon, TrendingUp } from 'lucide-react';
import { AIHostAvatar } from '../components/AIHostAvatar';

// Audio decoding helpers
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

const DisplayView: React.FC = () => {
  const { session, loading } = useQuizSync();
  const [turnTimeLeft, setTurnTimeLeft] = useState(30);
  const [commentary, setCommentary] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastState = useRef<string>("");
  const audioContextRef = useRef<AudioContext | null>(null);

  const currentQuestion = MOCK_QUESTIONS.find(q => q.id === session?.currentQuestionId);

  useEffect(() => {
    if (session?.status === QuizStatus.LIVE && currentQuestion?.roundType === 'STANDARD' && session.turnStartTime) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - session.turnStartTime!) / 1000);
        const remaining = Math.max(0, 30 - elapsed);
        setTurnTimeLeft(remaining);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [session?.status, session?.turnStartTime, currentQuestion]);

  const playAuraSpeech = async (text: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    
    setCommentary(text);
    const audioBase64 = await API.generateAuraAudio(text);
    
    if (audioBase64) {
      setIsSpeaking(true);
      const audioBuffer = await decodeAudioData(decodeBase64(audioBase64), ctx);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => {
        setIsSpeaking(false);
        setTimeout(() => setCommentary(""), 3000);
      };
      source.start();
    } else {
      setIsSpeaking(true);
      setTimeout(() => {
        setIsSpeaking(false);
        setTimeout(() => setCommentary(""), 5000);
      }, 3000);
    }
  };

  useEffect(() => {
    if (!session) return;
    const currentStateStr = `${session.status}-${session.currentQuestionId}-${session.activeTeamId}`;
    if (currentStateStr !== lastState.current) {
      lastState.current = currentStateStr;
      
      const fetchAndSpeak = async () => {
        const teamName = session.activeTeamId ? session.teams.find(t => t.id === session.activeTeamId)?.name : '';
        const insight = await API.getAIHostInsight(
          session.status, 
          currentQuestion?.text,
          teamName ? `The hot seat belongs to ${teamName}.` : undefined
        );
        playAuraSpeech(insight);
      };

      fetchAndSpeak();
    }
  }, [session?.status, session?.currentQuestionId, session?.activeTeamId]);

  if (loading || !session) return null;

  const activeTeam = session.teams.find(t => t.id === session.activeTeamId);

  const renderContent = () => {
    if (!session.currentQuestionId) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-12 animate-reveal">
          <div className="bg-slate-950 p-16 rounded-[4rem] shadow-2xl ring-8 ring-indigo-500/20 animate-float relative overflow-hidden group">
            <div className="absolute inset-0 animate-shimmer pointer-events-none" />
            <BrainCircuit className="w-48 h-48 text-white relative z-10" />
          </div>
          <h1 className="text-9xl font-display font-black text-slate-950 tracking-tighter drop-shadow-2xl">
            DUK AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">QUIZ</span>
          </h1>
          <p className="text-3xl text-slate-500 font-black uppercase tracking-[0.6em] animate-pulse">Aura v3.1 Node Ready</p>
        </div>
      );
    }

    if (session.status === QuizStatus.PREVIEW) {
      const isBuzzer = currentQuestion?.roundType === 'BUZZER';
      return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-12 animate-reveal">
          <div className={`px-20 py-8 rounded-full font-display text-6xl font-black uppercase tracking-[0.2em] shadow-2xl animate-glow-indigo border-b-8 ${isBuzzer ? 'bg-amber-600 text-white border-amber-800' : 'bg-indigo-700 text-white border-indigo-900'}`}>
             {isBuzzer ? 'BUZZER SEQUENCE' : 'STANDARD TURN'}
          </div>
          <div className="p-24 bg-white rounded-[4rem] shadow-2xl border-8 border-slate-100 max-w-6xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8">
               <TrendingUp className="w-16 h-16 text-slate-100" />
            </div>
            <h3 className="text-9xl font-black text-slate-950 tracking-tighter mb-10 tabular-nums">
              {currentQuestion?.points} <span className="text-4xl text-slate-300 uppercase tracking-[0.4em] ml-4 font-bold">CREDITS</span>
            </h3>
            <div className="mt-12 space-y-8">
               <p className="text-5xl font-black text-slate-800 uppercase tracking-tighter italic">Initializing Analysis...</p>
               <p className="text-2xl text-slate-400 font-bold uppercase tracking-widest animate-pulse">Synchronizing cluster state</p>
            </div>
          </div>
        </div>
      );
    }

    if (session.status === QuizStatus.LIVE || session.status === QuizStatus.LOCKED) {
      const isBuzzer = currentQuestion?.roundType === 'BUZZER';
      return (
        <div className="space-y-12 max-w-[95rem] mx-auto py-8 px-4 animate-reveal">
          <div className={`flex justify-between items-center p-12 rounded-[4rem] border-4 shadow-2xl bg-white transition-colors duration-500 ${isBuzzer ? 'border-amber-300 shadow-amber-100' : 'border-indigo-300 shadow-indigo-100'}`}>
            {!isBuzzer && activeTeam ? (
              <div className="flex items-center gap-8">
                <div className="p-8 rounded-[2rem] bg-indigo-700 text-white shadow-2xl animate-float">
                  <UserCheck className="w-16 h-16" />
                </div>
                <div>
                  <p className="text-slate-400 uppercase font-black tracking-widest text-lg mb-1 italic">ACTIVE NODE</p>
                  <p className="text-7xl font-black text-slate-950 tracking-tight uppercase">{activeTeam.name}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-8">
                <div className={`p-8 rounded-[2rem] shadow-2xl text-white ${isBuzzer ? 'bg-amber-600 animate-pulse' : 'bg-slate-950'}`}>
                  {isBuzzer ? <Zap className="w-16 h-16" /> : <Layers className="w-16 h-16" />}
                </div>
                <p className="text-7xl font-black text-slate-950 uppercase tracking-tighter italic">{isBuzzer ? 'INTERCEPT OPEN' : 'STANDARD'}</p>
              </div>
            )}
            
            {!isBuzzer && (
              <div className="text-center px-16 border-x-4 border-slate-100">
                <p className="text-slate-400 uppercase font-black tracking-widest text-sm mb-4 italic">Shot Clock</p>
                <div className={`text-9xl font-display font-black leading-none tracking-tighter tabular-nums transition-colors duration-300 ${turnTimeLeft < 10 ? 'text-red-600 animate-pulse' : 'text-slate-950'}`}>
                  {turnTimeLeft}s
                </div>
              </div>
            )}

            <div className="text-right">
              <p className="text-slate-400 uppercase font-black tracking-widest text-lg mb-1 italic">Pot Size</p>
              <p className="text-8xl font-display font-black text-slate-950 tracking-tighter">{currentQuestion?.points} <span className="text-2xl text-slate-300">CR</span></p>
            </div>
          </div>

          <div className="relative bg-white rounded-[5rem] p-24 shadow-2xl border-4 border-slate-200 overflow-hidden min-h-[600px] flex flex-col justify-center transition-all duration-700">
             {session.status === QuizStatus.LOCKED && (
               <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center z-50 animate-reveal">
                 <div className="relative">
                    <div className="absolute inset-0 bg-indigo-500 rounded-full blur-[80px] opacity-40 animate-pulse" />
                    <LockIcon className="w-48 h-48 text-white mb-10 animate-bounce relative z-10" />
                 </div>
                 <h2 className="text-white text-[10rem] font-display font-black uppercase tracking-[0.2em] italic">LOCKED</h2>
                 <p className="text-indigo-400 text-4xl font-black uppercase mt-10 tracking-[0.6em] animate-pulse">Verifying Priority Bit</p>
               </div>
             )}
             
             <h2 className="text-[6rem] font-black text-slate-950 leading-[1.05] mb-20 tracking-tight italic drop-shadow-sm">
                {currentQuestion?.text}
             </h2>

             <div className="grid grid-cols-2 gap-12">
               {currentQuestion?.options.map((opt, i) => (
                 <div key={i} className="group flex items-center gap-10 p-10 bg-slate-50 rounded-[3.5rem] border-2 border-slate-200 shadow-sm hover:bg-white hover:border-indigo-300 transition-all duration-300 transform hover:scale-[1.02]">
                   <div className="w-24 h-24 bg-slate-950 text-white rounded-[1.8rem] flex items-center justify-center text-6xl font-black font-display shadow-xl group-hover:bg-indigo-600 transition-colors">
                     {String.fromCharCode(65 + i)}
                   </div>
                   <p className="text-5xl font-black text-slate-900 tracking-tight">{opt}</p>
                 </div>
               ))}
             </div>
          </div>
          
          {!isBuzzer && (
            <div className="px-8">
              <Timer seconds={turnTimeLeft} max={30} />
            </div>
          )}
        </div>
      );
    }

    if (session.status === QuizStatus.REVEALED) {
      const isBuzzer = currentQuestion?.roundType === 'BUZZER';
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 max-w-[95rem] mx-auto py-12 px-8 h-full items-center">
          <div className="space-y-12 animate-reveal flex flex-col justify-center">
             <div className="bg-emerald-700 text-white p-24 rounded-[6rem] shadow-[0_30px_100px_rgba(16,185,129,0.3)] relative overflow-hidden border-b-[20px] border-emerald-900 group">
                <div className="absolute inset-0 animate-shimmer pointer-events-none opacity-30" />
                <h2 className="text-4xl uppercase font-black tracking-[0.4em] text-emerald-300 mb-8 italic">Validated Logic</h2>
                <p className="text-9xl font-black leading-tight tracking-tighter text-white drop-shadow-2xl">
                   {currentQuestion?.options[currentQuestion.correctAnswer]}
                </p>
                <div className="mt-16 inline-flex items-center gap-8 bg-white/20 px-14 py-6 rounded-[2.5rem] font-black text-7xl shadow-xl transform group-hover:scale-110 transition-transform">
                   <Star className="w-16 h-16 text-amber-400 animate-spin-slow" />
                   +{currentQuestion?.points} <span className="text-2xl text-white/60 uppercase tracking-widest ml-4">CREDITS</span>
                </div>
             </div>

             <div className="bg-white p-16 rounded-[5rem] shadow-2xl border-4 border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                   <BrainCircuit className="w-32 h-32" />
                </div>
                <h3 className="text-4xl font-black text-slate-950 mb-10 uppercase italic tracking-tighter">AI Consensus Summary</h3>
                <div className="text-4xl font-bold text-slate-800 leading-relaxed italic border-l-[16px] border-indigo-600 pl-12">
                   {isBuzzer 
                     ? "Temporal priority verified. Submission payload matches standard oracle values. Reward distribution initiated." 
                     : "Turn possession cycle concluded. Tactical pass bonuses distributed to idle nodes. Standby for next set."}
                </div>
             </div>
          </div>

          <div className="bg-slate-950 text-white p-16 rounded-[6rem] shadow-2xl flex flex-col animate-reveal border-b-[20px] border-indigo-900 min-h-[850px] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 animate-shimmer opacity-20" />
            <h2 className="text-7xl font-display font-black mb-16 flex items-center gap-10 border-b-4 border-white/10 pb-12 tracking-tighter italic">
              <Trophy className="w-28 h-28 text-amber-500 animate-float" /> CLUSTER RANK
            </h2>
            <div className="space-y-10 flex-grow">
              {[...session.teams].sort((a,b) => b.score - a.score).map((t, idx) => {
                const isWinner = idx === 0;
                return (
                  <div 
                    key={t.id} 
                    className={`flex justify-between items-center p-14 rounded-[4rem] transition-all duration-700 transform ${
                      isWinner 
                        ? 'bg-indigo-700 shadow-[0_20px_60px_rgba(79,70,229,0.4)] scale-105 border-4 border-indigo-400 ring-8 ring-indigo-500/10' 
                        : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-12">
                      <span className={`text-7xl font-black italic ${isWinner ? 'text-indigo-200' : 'text-white/20'}`}>
                        {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                      <span className="text-7xl font-black tracking-tighter text-white uppercase italic">{t.name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className={`text-sm font-black uppercase tracking-widest mb-2 ${isWinner ? 'text-indigo-300' : 'text-slate-500'}`}>CREDITS</span>
                       <span className={`text-8xl font-display font-black italic tabular-nums ${isWinner ? 'text-amber-400' : 'text-white'}`}>
                         {t.score}
                       </span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-12 text-center">
               <p className="text-slate-500 text-xs font-black uppercase tracking-[0.8em] animate-pulse">Global Sync Frequency: 1.5s</p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden selection:bg-indigo-500 selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full animate-float" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-cyan-500/5 blur-[150px] rounded-full [animation-delay:2s] animate-float" />
      </div>

      <div className="flex-grow relative z-10 flex items-center justify-center p-12 pb-40">
        {renderContent()}
      </div>
      
      <div className="fixed bottom-40 left-16 z-50">
        <AIHostAvatar isSpeaking={isSpeaking} commentary={commentary} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t-8 border-slate-950 p-12 px-28 flex justify-between items-center z-50 shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-10">
          <div className="bg-slate-950 p-6 rounded-[2rem] shadow-2xl ring-8 ring-indigo-500/10 group overflow-hidden relative">
            <div className="absolute inset-0 animate-shimmer opacity-20" />
            <BrainCircuit className="w-14 h-14 text-white relative z-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-1">Neural Core Status</span>
            <span className="font-display font-black text-6xl tracking-tighter text-slate-950 uppercase italic">DUK AI</span>
          </div>
        </div>
        
        <div className="flex items-center gap-16">
           <div className="flex flex-col items-center gap-3">
             <div className="flex items-center gap-6 bg-slate-100 px-10 py-5 rounded-[2rem] border-2 border-slate-200 shadow-sm">
               <div className="w-5 h-5 rounded-full bg-emerald-500 animate-pulse ring-4 ring-emerald-500/20" />
               <span className="font-black text-slate-950 uppercase tracking-[0.3em] text-xl italic">GRID SYNCED</span>
             </div>
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Aura Protocol 3.1.28-Stable</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DisplayView;
