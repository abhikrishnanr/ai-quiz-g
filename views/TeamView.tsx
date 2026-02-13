
import React, { useState, useEffect } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus, SubmissionType } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { Card, Button, Badge } from '../components/SharedUI';
import { 
  CheckCircle2, AlertCircle, Clock, Zap, LogOut, 
  Sparkles, MessageSquare, BrainCircuit, Waves, 
  Lock as LockIcon, Activity 
} from 'lucide-react';
import { AIHostAvatar } from '../components/AIHostAvatar';

const TeamView: React.FC = () => {
  const { session, loading, refresh } = useQuizSync();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(localStorage.getItem('duk_team_id'));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const currentQuestion = MOCK_QUESTIONS.find(q => q.id === session?.currentQuestionId);
  const mySubmission = session?.submissions.find(s => s.teamId === selectedTeam);
  const myTeam = session?.teams.find(t => t.id === selectedTeam);
  const isMyTurn = session?.activeTeamId === selectedTeam;

  useEffect(() => {
    if (session?.status === QuizStatus.PREVIEW) {
      setSelectedAnswer(null);
      setShowHint(false);
    }
  }, [session?.currentQuestionId, session?.status]);

  if (loading || !session) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
       <div className="w-16 h-16 rounded-full border-[3px] border-slate-900 border-t-indigo-500 animate-spin shadow-[0_0_30px_rgba(79,70,229,0.3)]" />
       <p className="mt-6 text-indigo-400 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Syncing Connection...</p>
    </div>
  );

  if (!selectedTeam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute inset-0 pointer-events-none">
           <div className="absolute top-[-10%] left-[-20%] w-[100%] h-[100%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
           <div className="absolute bottom-[-10%] right-[-20%] w-[100%] h-[100%] bg-cyan-600/10 blur-[120px] rounded-full animate-pulse" />
           <div className="absolute inset-0 bg-[radial-gradient(transparent_0%,#020617_100%)]" />
        </div>

        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
            <div className="bg-white/5 p-10 rounded-[3rem] mb-12 border border-white/10 ring-1 ring-white/10 shadow-[0_0_60px_rgba(79,70,229,0.2)]">
               <BrainCircuit className="w-20 h-20 text-indigo-400" />
            </div>
            <h1 className="text-5xl font-black text-white uppercase tracking-tighter text-center mb-3">Uplink</h1>
            <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] mb-16 text-center">Node Sequence Initialization</p>
            
            <div className="w-full space-y-5">
              {session.teams.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => { setSelectedTeam(t.id); localStorage.setItem('duk_team_id', t.id); }} 
                  className="group w-full p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-white font-black uppercase text-2xl hover:bg-white/10 hover:border-indigo-500/50 transition-all duration-500 relative overflow-hidden active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 tracking-tight">{t.name}</span>
                </button>
              ))}
            </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (type: SubmissionType = 'ANSWER') => {
    if (type === 'ANSWER' && selectedAnswer === null) return;
    setIsSubmitting(true);
    try {
      await API.submitTeamAnswer(selectedTeam, session.currentQuestionId!, selectedAnswer ?? undefined, type);
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (!session.currentQuestionId || session.status === QuizStatus.PREVIEW) {
      return (
        <div className="flex flex-col items-center justify-center h-[65vh] text-center space-y-12 animate-in fade-in zoom-in duration-1000">
          <div className="relative">
             <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full animate-ping" />
             <div className="relative p-12 bg-slate-900/60 border border-indigo-500/40 rounded-full shadow-[0_0_60px_rgba(79,70,229,0.3)]">
               <Clock className="w-24 h-24 text-indigo-400" />
             </div>
          </div>
          <div className="space-y-4">
             <h2 className="text-4xl font-black text-white uppercase tracking-tighter">STAND BY</h2>
             <p className="text-indigo-500 font-black uppercase tracking-[0.5em] text-[10px]">Awaiting Uplink Stream</p>
          </div>
        </div>
      );
    }

    if (session.status === QuizStatus.LIVE || session.status === QuizStatus.LOCKED) {
      const isBuzzer = currentQuestion?.roundType === 'BUZZER';
      const canPlay = isBuzzer || isMyTurn;
      const isLocked = session.status === QuizStatus.LOCKED;

      return (
        <div className="space-y-8 pb-32 animate-in slide-in-from-bottom-8 duration-700">
           
           {/* Header Status */}
           <div className={`p-8 rounded-[3rem] border-2 transition-all duration-700 flex justify-between items-center shadow-2xl relative overflow-hidden ${
             isBuzzer 
             ? 'bg-amber-600/10 border-amber-600 shadow-amber-600/20' 
             : 'bg-indigo-600/10 border-indigo-600 shadow-indigo-600/20'
           }`}>
              <div className="relative z-10">
                 <span className="block text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-2">Interface Protocol</span>
                 <span className="font-black text-white uppercase tracking-tighter text-3xl">
                    {isBuzzer ? 'Fastest Finger' : isMyTurn ? 'Primary Link' : 'Secondary Link'}
                 </span>
              </div>
              <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center relative z-10 ${isBuzzer ? 'bg-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)]' : 'bg-indigo-600 shadow-[0_0_30px_rgba(79,70,229,0.6)]'}`}>
                 {isBuzzer ? <Zap className="w-8 h-8 text-white" /> : <Waves className="w-8 h-8 text-white" />}
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-full animate-shimmer" />
           </div>

           {/* Question Payload */}
           <Card className="bg-slate-900/80 border-white/10 ring-1 ring-white/10">
              <h2 className="text-3xl md:text-4xl font-black text-white leading-[1.1] tracking-tighter drop-shadow-lg">{currentQuestion?.text}</h2>
           </Card>

           {/* Hint Module */}
           <div className="relative">
              {showHint ? (
                 <div className="bg-indigo-600/20 border-2 border-indigo-500/40 p-8 rounded-[2.5rem] animate-in zoom-in duration-500 backdrop-blur-3xl shadow-2xl">
                    <div className="flex items-center gap-3 mb-4 text-indigo-400">
                       <Sparkles className="w-5 h-5" />
                       <span className="text-[10px] font-black uppercase tracking-[0.4em]">Decrypted Hint</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-100 italic leading-snug tracking-tight">"{currentQuestion?.hint}"</p>
                 </div>
              ) : (
                <button 
                  onClick={() => setShowHint(true)}
                  className="w-full p-6 border-2 border-dashed border-white/10 rounded-[2.5rem] flex items-center justify-center gap-4 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/40 transition-all duration-300 group hover:bg-white/[0.02]"
                >
                  <Sparkles className="w-5 h-5 group-hover:animate-spin" /> 
                  <span className="text-xs font-black uppercase tracking-[0.3em]">Request Tactical Intel</span>
                </button>
              )}
           </div>

           {/* Option Matrix */}
           <div className="grid gap-4 relative">
             {isLocked && !mySubmission && (
                 <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-30 flex items-center justify-center rounded-[2.5rem] border border-white/5 animate-in fade-in">
                    <div className="bg-slate-900 border border-rose-500/50 px-10 py-4 rounded-full flex items-center gap-4 shadow-2xl">
                       <LockIcon className="w-5 h-5 text-rose-500" />
                       <span className="text-xs font-black uppercase tracking-[0.4em] text-rose-500">System Lock Active</span>
                    </div>
                 </div>
             )}

             {currentQuestion?.options.map((opt, i) => (
               <button 
                 key={i} 
                 disabled={!!mySubmission || !canPlay || isLocked} 
                 onClick={() => setSelectedAnswer(i)} 
                 className={`group w-full p-8 rounded-[2.5rem] border-2 text-left flex items-center transition-all duration-500 active:scale-[0.98] ${
                   selectedAnswer === i 
                   ? 'bg-white border-white text-slate-950 shadow-[0_0_50px_rgba(255,255,255,0.3)] scale-[1.02]' 
                   : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/20'
                 } ${!!mySubmission ? 'opacity-40' : ''}`}
               >
                 <span className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-6 font-black text-2xl transition-all duration-500 ${
                   selectedAnswer === i ? 'bg-slate-900 text-white shadow-inner' : 'bg-white/10 text-slate-500 group-hover:text-slate-300'
                 }`}>
                   {String.fromCharCode(65+i)}
                 </span>
                 <span className="text-2xl font-black tracking-tighter">{opt}</span>
               </button>
             ))}
           </div>

           {/* Primary Uplink Trigger */}
           {!mySubmission && canPlay && !isLocked && (
             <button 
               disabled={selectedAnswer === null || isSubmitting} 
               onClick={() => handleSubmit('ANSWER')} 
               className={`w-full py-10 text-white rounded-[3rem] text-4xl font-black uppercase tracking-tighter shadow-2xl active:scale-95 transition-all duration-700 relative overflow-hidden group ${
                 selectedAnswer === null ? 'bg-slate-900/50 opacity-40 grayscale' : isBuzzer ? 'bg-amber-600 shadow-amber-600/40 hover:bg-amber-500' : 'bg-indigo-600 shadow-indigo-600/40 hover:bg-indigo-500'
               }`}
             >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <span className="relative z-10 group-active:scale-90 transition-transform">{isBuzzer ? 'BUZZ NOW' : 'SEND UPLINK'}</span>
                {selectedAnswer !== null && (
                   <div className="absolute top-0 left-0 w-full h-1.5 bg-white/20 animate-pulse" />
                )}
             </button>
           )}

           {mySubmission && (
              <div className="bg-white/5 p-12 rounded-[3rem] border border-white/10 text-center space-y-4 shadow-inner">
                 <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 animate-pulse border border-emerald-500/30">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                 </div>
                 <h3 className="text-2xl font-black text-white uppercase italic tracking-widest">TRANSMISSION VALID</h3>
                 <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px]">Verifying with host processor...</p>
              </div>
           )}
        </div>
      );
    }

    if (session.status === QuizStatus.REVEALED) {
       const isCorrect = mySubmission?.isCorrect;
       return (
         <div className="flex flex-col items-center justify-center h-[70vh] space-y-16 animate-in zoom-in duration-1000">
            <div className="relative">
               <div className={`absolute -inset-16 blur-[80px] rounded-full opacity-60 ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`} />
               <div className={`w-40 h-40 rounded-full flex items-center justify-center relative z-10 border-4 ${isCorrect ? 'bg-emerald-600 border-emerald-400 shadow-[0_0_80px_rgba(16,185,129,0.8)]' : 'bg-rose-700 border-rose-500 shadow-[0_0_80px_rgba(225,29,72,0.8)]'}`}>
                  {isCorrect ? <CheckCircle2 className="w-20 h-20 text-white" /> : <AlertCircle className="w-20 h-20 text-white" />}
               </div>
            </div>
            <div className="text-center space-y-3">
               <h2 className={`text-7xl font-black uppercase italic tracking-tighter ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isCorrect ? 'SUCCESS' : 'FAILURE'}
               </h2>
               <p className="text-slate-600 font-black uppercase tracking-[0.5em] text-xs">Fragment Processed</p>
            </div>
            <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] w-full flex justify-between items-center shadow-2xl border border-white/10">
               <div>
                  <span className="text-slate-600 font-black uppercase tracking-[0.4em] text-[9px] block mb-2">Accumulated Data</span>
                  <span className="text-5xl font-black text-white italic tracking-tighter tabular-nums">{myTeam?.score} <span className="text-lg font-normal text-slate-700 not-italic">CR</span></span>
               </div>
               <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                  <Activity className="w-10 h-10 text-indigo-400" />
               </div>
            </div>
         </div>
       );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans max-w-md mx-auto relative flex flex-col shadow-[0_0_150px_rgba(0,0,0,1)] overflow-hidden">
      
      {/* Universal Background Globs */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-20%] w-[100%] h-[100%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-20%] w-[100%] h-[100%] bg-cyan-600/10 blur-[120px] rounded-full animate-pulse" />
         <div className="absolute inset-0 bg-[radial-gradient(transparent_0%,#020617_100%)]" />
      </div>

      {/* Futuristic Header */}
      <header className="bg-slate-900/60 backdrop-blur-3xl p-8 flex justify-between items-center border-b border-white/10 sticky top-0 z-50">
         <div className="flex items-center gap-5">
            <div className="relative group">
               <div className="absolute inset-0 bg-indigo-500/40 blur-xl rounded-full animate-pulse" />
               <div className="scale-75 origin-center relative z-10 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]"><AIHostAvatar size="sm" /></div>
            </div>
            <div>
               <p className="text-[9px] font-black uppercase text-indigo-500 leading-none mb-2 tracking-[0.3em]">Neural Active</p>
               <p className="text-2xl font-black uppercase text-white tracking-tighter leading-none">{myTeam?.name}</p>
            </div>
         </div>
         <button 
           onClick={() => { localStorage.removeItem('duk_team_id'); setSelectedTeam(null); }} 
           className="p-4 bg-white/5 rounded-[1.5rem] text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-500 border border-white/5 active:scale-90"
         >
            <LogOut className="w-6 h-6" />
         </button>
      </header>

      {/* Content Hub */}
      <main className="flex-grow p-8 overflow-y-auto custom-scrollbar relative">
         {renderContent()}
      </main>

      {/* Neural Status Bar */}
      <div className="bg-slate-900/80 backdrop-blur-3xl border-t border-white/10 p-6 flex items-center gap-5">
         <div className="w-14 h-14 bg-white/5 rounded-[1.5rem] flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
            <MessageSquare className="w-7 h-7 text-indigo-400" />
         </div>
         <p className="text-xs text-slate-500 italic font-medium leading-relaxed">
            "Maintaining secure neural uplink. Do not disconnect during active sequences."
         </p>
      </div>

      {/* Top Accent Strip */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-40 z-[60]" />
    </div>
  );
};

export default TeamView;
