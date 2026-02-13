
import React, { useState, useEffect } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus, SubmissionType } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { Card, Button, Badge } from '../components/SharedUI';
// Added missing Lock as LockIcon and Activity imports to resolve "Cannot find name" errors
import { CheckCircle2, AlertCircle, Clock, Zap, Forward, LogOut, Sparkles, MessageSquare, BrainCircuit, Waves, Lock as LockIcon, Activity } from 'lucide-react';
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
       <div className="w-12 h-12 rounded-full border-2 border-slate-800 border-t-indigo-500 animate-spin" />
       <p className="mt-4 text-slate-500 font-black uppercase tracking-[0.3em] text-[10px]">Syncing with Node...</p>
    </div>
  );

  if (!selectedTeam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* BG Glow */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(79,70,229,0.3)_0%,transparent_70%)]" />
        </div>

        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
            <div className="bg-white/5 p-6 rounded-[2.5rem] mb-12 border border-white/10 ring-1 ring-white/10">
               <BrainCircuit className="w-16 h-16 text-indigo-400" />
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter text-center mb-2">Neural Uplink</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-12">Select your cluster for initialization</p>
            
            <div className="w-full space-y-4">
              {session.teams.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => { setSelectedTeam(t.id); localStorage.setItem('duk_team_id', t.id); }} 
                  className="group w-full p-6 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase text-xl hover:bg-white/10 hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/0 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10">{t.name}</span>
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
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-8 animate-in fade-in zoom-in">
          <div className="relative">
             <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full" />
             <Clock className="w-20 h-20 text-indigo-400 relative z-10 animate-pulse" />
          </div>
          <div className="space-y-2">
             <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Stand By...</h2>
             <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Awaiting Host Transmission</p>
          </div>
        </div>
      );
    }

    if (session.status === QuizStatus.LIVE || session.status === QuizStatus.LOCKED) {
      const isBuzzer = currentQuestion?.roundType === 'BUZZER';
      const canPlay = isBuzzer || isMyTurn;
      const isLocked = session.status === QuizStatus.LOCKED;

      return (
        <div className="space-y-6 pb-24 animate-in slide-in-from-bottom-6 duration-500">
           {/* Header Context */}
           <div className={`p-5 rounded-[2rem] border transition-all duration-500 flex justify-between items-center shadow-2xl ${
             isBuzzer 
             ? 'bg-amber-600/10 border-amber-600/50 shadow-amber-600/10' 
             : 'bg-indigo-600/10 border-indigo-600/50 shadow-indigo-600/10'
           }`}>
              <div>
                 <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-1">Transmission Mode</span>
                 <span className="font-black text-white uppercase tracking-tight text-xl">
                    {isBuzzer ? 'Fastest Finger' : isMyTurn ? 'Primary Uplink' : 'Listening Node'}
                 </span>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isBuzzer ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                 {isBuzzer ? <Zap className="w-5 h-5 text-white" /> : <Waves className="w-5 h-5 text-white" />}
              </div>
           </div>

           {/* Question Text */}
           <Card className="bg-slate-900/60 border-white/5">
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">{currentQuestion?.text}</h2>
           </Card>

           {/* Hint System */}
           <div className="relative">
              {showHint ? (
                 <div className="bg-indigo-600/10 border border-indigo-500/30 p-5 rounded-2xl animate-in zoom-in duration-300 backdrop-blur-md">
                    <div className="flex items-center gap-2 mb-2 text-indigo-400">
                       <Sparkles className="w-3 h-3" />
                       <span className="text-[10px] font-black uppercase tracking-[0.4em]">Tactical Feed</span>
                    </div>
                    <p className="text-lg font-bold text-slate-100 italic leading-snug">"{currentQuestion?.hint}"</p>
                 </div>
              ) : (
                <button 
                  onClick={() => setShowHint(true)}
                  className="w-full p-4 border-2 border-dashed border-white/10 rounded-2xl flex items-center justify-center gap-3 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all group"
                >
                  <Sparkles className="w-4 h-4 group-hover:animate-spin" /> 
                  <span className="text-xs font-black uppercase tracking-[0.2em]">Access Tactical Hint</span>
                </button>
              )}
           </div>

           {/* Answer Options */}
           <div className="grid gap-3 relative">
             {isLocked && !mySubmission && (
                 <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-2xl">
                    <div className="bg-white/10 border border-white/10 px-6 py-2 rounded-full flex items-center gap-2">
                       <LockIcon className="w-3 h-3 text-slate-400" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">Processing Lock</span>
                    </div>
                 </div>
             )}

             {currentQuestion?.options.map((opt, i) => (
               <button 
                 key={i} 
                 disabled={!!mySubmission || !canPlay || isLocked} 
                 onClick={() => setSelectedAnswer(i)} 
                 className={`group w-full p-6 rounded-[2rem] border-2 text-left flex items-center transition-all duration-300 ${
                   selectedAnswer === i 
                   ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_30px_rgba(79,70,229,0.4)]' 
                   : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                 } ${!!mySubmission ? 'opacity-50 grayscale-[0.5]' : ''}`}
               >
                 <span className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-5 font-black text-xl transition-all ${
                   selectedAnswer === i ? 'bg-white text-indigo-600' : 'bg-white/10 text-slate-500 group-hover:text-slate-300'
                 }`}>
                   {String.fromCharCode(65+i)}
                 </span>
                 <span className="text-xl font-bold tracking-tight">{opt}</span>
               </button>
             ))}
           </div>

           {/* Main Submit Button */}
           {!mySubmission && canPlay && !isLocked && (
             <button 
               disabled={selectedAnswer === null || isSubmitting} 
               onClick={() => handleSubmit('ANSWER')} 
               className={`w-full py-8 text-white rounded-[2.5rem] text-3xl font-black uppercase tracking-tighter shadow-2xl active:scale-95 transition-all duration-500 relative overflow-hidden ${
                 selectedAnswer === null ? 'bg-slate-800 opacity-50' : isBuzzer ? 'bg-amber-600 shadow-amber-600/30' : 'bg-indigo-600 shadow-indigo-600/30'
               }`}
             >
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <span className="relative z-10">{isBuzzer ? 'TRANSMIT BUZZ' : 'CONFIRM UPLINK'}</span>
             </button>
           )}

           {mySubmission && (
              <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 text-center space-y-2">
                 <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                 </div>
                 <h3 className="text-xl font-black text-white uppercase italic">DATA SENT</h3>
                 <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Awaiting system verification...</p>
              </div>
           )}
        </div>
      );
    }

    if (session.status === QuizStatus.REVEALED) {
       const isCorrect = mySubmission?.isCorrect;
       return (
         <div className="flex flex-col items-center justify-center h-[65vh] space-y-12 animate-in zoom-in duration-700">
            <div className="relative">
               <div className={`absolute -inset-12 blur-[60px] rounded-full opacity-50 ${isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`} />
               <div className={`w-32 h-32 rounded-full flex items-center justify-center relative z-10 border-4 ${isCorrect ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.8)]' : 'bg-rose-600 border-rose-500 shadow-[0_0_50px_rgba(225,29,72,0.8)]'}`}>
                  {isCorrect ? <CheckCircle2 className="w-16 h-16 text-white" /> : <AlertCircle className="w-16 h-16 text-white" />}
               </div>
            </div>
            <div className="text-center space-y-2">
               <h2 className={`text-6xl font-black uppercase italic tracking-tighter ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isCorrect ? 'SUCCESS' : 'FAILURE'}
               </h2>
               <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-xs">Node Processing Complete</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[2.5rem] w-full flex justify-between items-center shadow-2xl border border-white/10">
               <div>
                  <span className="text-slate-500 font-black uppercase tracking-widest text-[9px] block mb-1">Total Credits</span>
                  <span className="text-4xl font-black text-white italic tracking-tighter tabular-nums">{myTeam?.score} <span className="text-sm font-normal text-slate-600 not-italic">CR</span></span>
               </div>
               <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center border border-white/5">
                  <Activity className="w-8 h-8 text-indigo-400" />
               </div>
            </div>
         </div>
       );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans max-w-md mx-auto relative flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden">
      {/* Immersive Header */}
      <header className="bg-slate-900/60 backdrop-blur-2xl p-6 flex justify-between items-center border-b border-white/5 sticky top-0 z-50">
         <div className="flex items-center gap-4">
            <div className="relative group">
               <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full" />
               <div className="scale-75 origin-center relative z-10"><AIHostAvatar size="sm" /></div>
            </div>
            <div>
               <p className="text-[10px] font-black uppercase text-indigo-500 leading-none mb-1 tracking-[0.2em]">Node active</p>
               <p className="text-lg font-black uppercase text-white tracking-tight leading-none">{myTeam?.name}</p>
            </div>
         </div>
         <button 
           onClick={() => { localStorage.removeItem('duk_team_id'); setSelectedTeam(null); }} 
           className="p-3 bg-white/5 rounded-2xl text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-300"
         >
            <LogOut className="w-5 h-5" />
         </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-6 overflow-y-auto custom-scrollbar relative">
         {renderContent()}
      </main>

      {/* Bottom Status Bar */}
      <div className="bg-slate-900/80 backdrop-blur-2xl border-t border-white/5 p-5 flex items-center gap-4">
         <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
            <MessageSquare className="w-6 h-6 text-indigo-400" />
         </div>
         <p className="text-[11px] text-slate-400 italic font-medium leading-relaxed">
            "Maintaining secure neural link. Do not disconnect during active transmission sequences."
         </p>
      </div>

      {/* Aesthetic Overlays */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-20" />
      <div className="absolute bottom-0 left-0 w-full h-[30vh] bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
    </div>
  );
};

export default TeamView;
