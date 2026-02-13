
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
      // Fallback simulation if API key missing or fails
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
        if (!session.currentQuestionId) return; 

        // Don't comment on every single tick, just status changes
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

  // Determine view mode to simplify rendering
  const isIdle = !session.currentQuestionId;
  const isQuestionActive = session.status === QuizStatus.PREVIEW || session.status === QuizStatus.LIVE || session.status === QuizStatus.LOCKED;
  const isResult = session.status === QuizStatus.REVEALED;

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans overflow-hidden selection:bg-indigo-500 selection:text-white relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[150px] rounded-full animate-pulse" />
         <div className="absolute inset-0 bg-[radial-gradient(transparent_0%,#020617_100%)]" />
      </div>

      {/* Main Layout Grid */}
      <div className="relative z-10 w-full h-screen grid grid-cols-12 gap-8 p-8">
        
        {/* Left Column: AI Avatar (Always visible, Hero focus) */}
        <div className={`col-span-5 flex flex-col items-center justify-center transition-all duration-1000 ${isIdle ? 'col-span-12 scale-125' : ''}`}>
           <AIHostAvatar size="xl" isSpeaking={isSpeaking} commentary={commentary} />
        </div>

        {/* Right Column: Content Overlay */}
        {!isIdle && (
          <div className="col-span-7 flex flex-col justify-center h-full animate-in slide-in-from-right duration-700">
             
             {isQuestionActive && (
               <div className="space-y-8">
                  {/* Header Status */}
                  <div className="flex justify-between items-center">
                    <Badge color={currentQuestion?.roundType === 'BUZZER' ? 'amber' : 'blue'}>
                       {currentQuestion?.roundType} ROUND
                    </Badge>
                    <div className="text-right">
                       <p className="text-indigo-400 text-xs font-black uppercase tracking-widest">Potential Value</p>
                       <p className="text-4xl font-black text-white italic tracking-tighter">{currentQuestion?.points} <span className="text-lg text-slate-500">CR</span></p>
                    </div>
                  </div>

                  {/* Question Card */}
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                     {session.status === QuizStatus.LOCKED && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20 animate-in fade-in">
                           <div className="text-center">
                              <LockIcon className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-bounce" />
                              <h3 className="text-4xl font-black text-white uppercase italic tracking-widest">LOCKED</h3>
                           </div>
                        </div>
                     )}
                     
                     <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-8 drop-shadow-lg">
                        {currentQuestion?.text}
                     </h2>

                     <div className="grid grid-cols-1 gap-4">
                        {currentQuestion?.options.map((opt, i) => (
                           <div key={i} className="flex items-center gap-6 p-4 rounded-2xl border border-white/5 bg-white/5">
                              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg">
                                 {String.fromCharCode(65+i)}
                              </div>
                              <span className="text-2xl font-bold text-slate-200">{opt}</span>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Footer Info */}
                  <div className="flex items-center justify-between">
                     {currentQuestion?.roundType === 'STANDARD' && (
                        <div className="flex items-center gap-4">
                           <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                              <Timer seconds={turnTimeLeft} max={30} />
                              <p className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{turnTimeLeft}s REMAINING</p>
                           </div>
                           {activeTeam && (
                              <div className="text-left">
                                 <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Current Turn</p>
                                 <p className="text-2xl font-black text-white uppercase">{activeTeam.name}</p>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               </div>
             )}

             {isResult && (
                <div className="space-y-8 animate-in zoom-in duration-500">
                   <div className="bg-emerald-500/10 border border-emerald-500/30 p-12 rounded-[3rem] text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-20"><CheckCircle2 className="w-32 h-32 text-emerald-500" /></div>
                      <h2 className="text-3xl text-emerald-400 font-black uppercase tracking-widest mb-4">Correct Answer</h2>
                      <p className="text-5xl font-black text-white leading-tight">{currentQuestion?.options[currentQuestion.correctAnswer]}</p>
                   </div>
                   
                   <div className="bg-slate-900/80 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/10">
                      <h3 className="text-slate-400 font-black uppercase tracking-widest mb-6 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Leaderboard Update</h3>
                      <div className="space-y-4">
                         {[...session.teams].sort((a,b) => b.score - a.score).map((t, i) => (
                            <div key={t.id} className={`flex items-center justify-between p-4 rounded-2xl ${i===0 ? 'bg-indigo-600/20 border border-indigo-500/30' : 'bg-white/5'}`}>
                               <div className="flex items-center gap-4">
                                  <span className={`text-xl font-black ${i===0 ? 'text-amber-400' : 'text-slate-500'}`}>0{i+1}</span>
                                  <span className="text-xl font-bold text-white uppercase">{t.name}</span>
                               </div>
                               <span className="text-2xl font-black text-white font-mono">{t.score}</span>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DisplayView;
