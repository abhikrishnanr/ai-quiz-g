
import React, { useState, useEffect } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus, SubmissionType } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { Badge, Card, Button } from '../components/SharedUI';
import { CheckCircle2, AlertCircle, Clock, Zap, Forward, Lock as LockIcon, MessageSquare, User, LogOut, Volume2 } from 'lucide-react';
import { AIHostAvatar } from '../components/AIHostAvatar';

const TeamView: React.FC = () => {
  const { session, loading, refresh } = useQuizSync();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(localStorage.getItem('duk_team_id'));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bodhiniInsight, setBodhiniInsight] = useState<string>("");

  const currentQuestion = MOCK_QUESTIONS.find(q => q.id === session?.currentQuestionId);
  const mySubmission = session?.submissions.find(s => s.teamId === selectedTeam);
  const myTeam = session?.teams.find(t => t.id === selectedTeam);
  const isMyTurn = session?.activeTeamId === selectedTeam;

  useEffect(() => {
    if (session?.status === QuizStatus.LIVE || session?.status === QuizStatus.PREVIEW) {
      const updateBodhini = async () => {
        const insight = await API.getAIHostInsight(session.status, currentQuestion?.text);
        setBodhiniInsight(insight);
      };
      updateBodhini();
    }
    if (session?.status === QuizStatus.PREVIEW) {
      setSelectedAnswer(null);
    }
  }, [session?.currentQuestionId, session?.status]);

  if (loading || !session) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"/></div>;

  // Login Screen
  if (!selectedTeam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#1e1b4b_0%,transparent_50%)]" />
        
        <div className="relative z-10 w-full max-w-md">
          <div className="mb-12 text-center">
             <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl">
                <User className="w-10 h-10 text-indigo-400" />
             </div>
             <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2 font-display">Identity Uplink</h1>
             <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Connect to Neural Cluster</p>
          </div>

          <div className="space-y-4">
            {session.teams.map(t => (
              <button 
                key={t.id} 
                onClick={() => { setSelectedTeam(t.id); localStorage.setItem('duk_team_id', t.id); }} 
                className="w-full p-6 text-left bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-2xl flex items-center justify-between group transition-all active:scale-[0.98]"
              >
                <span className="text-xl font-black tracking-tight">{t.name}</span>
                <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
                  <Forward className="w-4 h-4 text-indigo-400 group-hover:text-white" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (type: SubmissionType = 'ANSWER') => {
    if (type === 'ANSWER' && selectedAnswer === null) return;
    if (isSubmitting || !selectedTeam || !session.currentQuestionId) return;
    
    setIsSubmitting(true);
    try {
      await API.submitTeamAnswer(selectedTeam, session.currentQuestionId, selectedAnswer ?? undefined, type);
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('duk_team_id');
    setSelectedTeam(null);
  };

  const renderContent = () => {
    if (!session.currentQuestionId) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center animate-pulse shadow-inner">
            <Clock className="w-10 h-10 text-slate-300" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Standby for Uplink</h2>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Bodhini is calibrating...</p>
          </div>
        </div>
      );
    }

    if (session.status === QuizStatus.PREVIEW) {
      const isBuzzer = currentQuestion?.roundType === 'BUZZER';
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-8 animate-in fade-in duration-500">
          <div className={`w-28 h-28 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl ${isBuzzer ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
            {isBuzzer ? <Zap className="w-14 h-14" /> : <Clock className="w-14 h-14" />}
          </div>
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase mb-2">{isBuzzer ? 'Buzzer Mode' : 'Standard Turn'}</h2>
            <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Prepare to Engage</p>
          </div>
        </div>
      );
    }

    if (session.status === QuizStatus.LIVE) {
      const isBuzzer = currentQuestion?.roundType === 'BUZZER';
      // Strict locking for buzzer rounds during reading
      const isReadingLocked = isBuzzer && session.isReading;
      const canInteract = (isBuzzer || isMyTurn) && !isReadingLocked;

      if (isReadingLocked) {
         return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-8 animate-in fade-in">
                <div className="w-32 h-32 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto relative">
                    <div className="absolute inset-0 border-2 border-amber-500 rounded-full animate-ping opacity-20" />
                    <Volume2 className="w-12 h-12 text-amber-500 animate-pulse" />
                </div>
                <div>
                   <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">Listen Closely</h2>
                   <p className="text-amber-600 font-bold uppercase tracking-widest text-xs animate-pulse">Bodhini is reading the question...</p>
                </div>
            </div>
         );
      }

      return (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-500 pb-24">
           {/* Status Banner */}
           <div className={`p-5 rounded-3xl flex justify-between items-center shadow-lg text-white ${isBuzzer ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-indigo-600 to-violet-600'}`}>
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-white/20 rounded-xl">
                   {isBuzzer ? <Zap className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                 </div>
                 <span className="text-sm font-black uppercase tracking-wider">
                   {isBuzzer ? 'Fastest Finger' : isMyTurn ? 'Your Turn' : 'Waiting...'}
                 </span>
              </div>
              {!isBuzzer && isMyTurn && <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-lg uppercase">Shot Clock</span>}
           </div>

           {!isBuzzer && !isMyTurn && !mySubmission ? (
             <div className="py-16 px-6 bg-slate-100/50 backdrop-blur-sm rounded-[2.5rem] text-center space-y-6 border border-slate-200">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                   <LockIcon className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Locked Out</h3>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">
                     Possession: <span className="text-indigo-600">{session.teams.find(t => t.id === session.activeTeamId)?.name}</span>
                  </p>
                </div>
             </div>
           ) : (
             <div className="space-y-6">
               <Card className="bg-white shadow-xl border-slate-100">
                 <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-snug">{currentQuestion?.text}</h2>
               </Card>

               <div className="grid grid-cols-1 gap-4">
                 {currentQuestion?.options.map((opt, i) => {
                   const isSelected = selectedAnswer === i;
                   const isDisabled = !!mySubmission || !canInteract;
                   
                   return (
                     <button
                       key={i}
                       disabled={isDisabled}
                       onClick={() => setSelectedAnswer(i)}
                       className={`w-full p-5 rounded-2xl border-2 text-left flex items-center transition-all duration-200 active:scale-[0.98] ${
                         isSelected 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xl' 
                          : isDisabled 
                            ? 'bg-slate-50 text-slate-400 border-slate-100' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300 shadow-sm'
                       }`}
                     >
                       <span className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 text-lg font-black shrink-0 ${
                         isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
                       }`}>
                         {String.fromCharCode(65 + i)}
                       </span>
                       <span className={`text-lg font-bold leading-tight ${isSelected ? 'text-white' : ''}`}>
                         {opt}
                       </span>
                     </button>
                   );
                 })}
               </div>

               {!mySubmission ? (
                 <div className="space-y-4 pt-4">
                   <button 
                     disabled={selectedAnswer === null || isSubmitting || !canInteract}
                     onClick={() => handleSubmit('ANSWER')}
                     className={`w-full py-5 rounded-2xl text-xl font-black shadow-xl active:scale-95 transition-all uppercase tracking-widest ${
                       isBuzzer 
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-amber-500/30' 
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-indigo-500/30'
                     } ${(!canInteract || selectedAnswer === null) ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                   >
                     {isSubmitting ? 'Sending...' : (isBuzzer ? 'BUZZ' : 'SUBMIT')}
                   </button>
                   {!isBuzzer && isMyTurn && (
                     <button 
                       disabled={isSubmitting}
                       onClick={() => handleSubmit('PASS')}
                       className="w-full py-4 rounded-2xl bg-white text-slate-900 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all border border-slate-200 shadow-lg"
                     >
                       <Forward className="w-4 h-4" /> Tactical Pass (+10)
                     </button>
                   )}
                 </div>
               ) : (
                 <div className="p-10 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100 text-center animate-in zoom-in">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                       <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h3 className="text-xl font-black text-emerald-900 uppercase tracking-tight">Response Logged</h3>
                 </div>
               )}
             </div>
           )}
        </div>
      );
    }

    if (session.status === QuizStatus.LOCKED || session.status === QuizStatus.REVEALED) {
       const isCorrect = mySubmission?.isCorrect;
       return (
         <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-8">
            {session.status === QuizStatus.REVEALED ? (
              <div className="animate-in zoom-in space-y-8 w-full">
                {mySubmission?.type === 'PASS' ? (
                  <Card className="bg-indigo-50 border-indigo-100">
                    <Forward className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
                    <h2 className="text-3xl font-black text-indigo-900 uppercase tracking-tighter">Passed</h2>
                    <p className="text-sm font-bold text-indigo-600 mt-2">+10 Credits</p>
                  </Card>
                ) : (
                  <div className={`p-10 rounded-[3rem] shadow-xl border-4 ${isCorrect ? 'bg-emerald-50 border-emerald-500/20' : 'bg-red-50 border-red-500/20'}`}>
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                      {isCorrect ? <CheckCircle2 className="w-10 h-10" /> : <AlertCircle className="w-10 h-10" />}
                    </div>
                    <h2 className={`text-4xl font-black uppercase italic tracking-tighter ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
                      {isCorrect ? 'Correct' : 'Miss'}
                    </h2>
                    <div className={`mt-4 text-3xl font-black ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                       {isCorrect ? `+${currentQuestion?.points}` : '-50'}
                    </div>
                  </div>
                )}
                <div className="bg-slate-900 text-white p-6 rounded-2xl flex items-center justify-between shadow-xl">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Total Score</span>
                  <span className="text-3xl font-black text-amber-400 font-mono">{myTeam?.score}</span>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-6 opacity-70">
                <LockIcon className="w-16 h-16 text-indigo-300 mx-auto" />
                <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Processing...</h2>
              </div>
            )}
         </div>
       );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans max-w-md mx-auto shadow-2xl overflow-hidden relative">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -right-[20%] w-[80%] h-[80%] bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute top-[20%] -left-[20%] w-[60%] h-[60%] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 p-4 sticky top-0 z-40 flex justify-between items-center">
        <div className="flex items-center gap-3">
           <div className="scale-75 origin-left">
             <AIHostAvatar size="sm" />
           </div>
           <div>
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Unit ID</p>
              <h1 className="text-lg font-black text-slate-900 leading-none truncate max-w-[120px]">{myTeam?.name}</h1>
           </div>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right">
              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Credits</p>
              <p className="text-xl font-black text-amber-500 leading-none">{myTeam?.score}</p>
           </div>
           <button onClick={logout} className="p-2 bg-slate-100 rounded-lg text-slate-400 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
           </button>
        </div>
      </header>
      
      <main className="flex-grow p-4 relative z-10">
        {renderContent()}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 p-4 z-50 max-w-md mx-auto">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
           </div>
           <div className="flex-grow">
              <p className="text-[9px] font-black uppercase text-indigo-500 tracking-widest mb-0.5">Bodhini Uplink</p>
              <p className="text-xs font-medium text-slate-700 leading-snug italic line-clamp-2">
                "{bodhiniInsight || "Monitoring session parameters..."}"
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TeamView;
