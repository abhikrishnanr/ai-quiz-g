
import React, { useState, useEffect } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus, SubmissionType } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { Badge } from '../components/SharedUI';
import { CheckCircle2, AlertCircle, Clock, Zap, Forward, Lock as LockIcon, MessageSquare, User } from 'lucide-react';
import { AIHostAvatar } from '../components/AIHostAvatar';

const TeamView: React.FC = () => {
  const { session, loading, refresh } = useQuizSync();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(localStorage.getItem('duk_team_id'));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [auraInsight, setAuraInsight] = useState<string>("");

  const currentQuestion = MOCK_QUESTIONS.find(q => q.id === session?.currentQuestionId);
  const mySubmission = session?.submissions.find(s => s.teamId === selectedTeam);
  const myTeam = session?.teams.find(t => t.id === selectedTeam);
  const isMyTurn = session?.activeTeamId === selectedTeam;

  useEffect(() => {
    if (session?.status === QuizStatus.LIVE || session?.status === QuizStatus.PREVIEW) {
      const updateAura = async () => {
        const insight = await API.getAIHostInsight(session.status, currentQuestion?.text);
        setAuraInsight(insight);
      };
      updateAura();
    }
    if (session?.status === QuizStatus.PREVIEW) {
      setSelectedAnswer(null);
    }
  }, [session?.currentQuestionId, session?.status]);

  if (loading || !session) return null;

  if (!selectedTeam) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-8">
        <div className="bg-white/5 p-6 rounded-full mb-12">
          <User className="w-16 h-16 text-indigo-400" />
        </div>
        <h1 className="text-4xl font-black text-white text-center mb-4 uppercase tracking-tighter italic">Identify Unit</h1>
        <p className="text-slate-400 mb-12 text-center uppercase tracking-widest text-xs font-bold">Select your team to join the cluster</p>
        <div className="w-full max-w-md space-y-4">
          {session.teams.map(t => (
            <button 
              key={t.id} 
              onClick={() => { setSelectedTeam(t.id); localStorage.setItem('duk_team_id', t.id); }} 
              className="w-full p-8 text-left bg-white text-slate-950 border-4 border-slate-700 rounded-[2rem] text-2xl font-black active:scale-95 hover:bg-indigo-50 hover:border-indigo-400 transition-all shadow-xl"
            >
              {t.name}
            </button>
          ))}
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

  const renderContent = () => {
    if (!session.currentQuestionId) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in duration-700">
          <div className="w-32 h-32 bg-slate-100 rounded-[2.5rem] flex items-center justify-center animate-pulse">
            <Clock className="w-16 h-16 text-slate-300" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Standby for Uplink</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aura is calibrating the next question set</p>
        </div>
      );
    }

    if (session.status === QuizStatus.PREVIEW) {
      const isBuzzer = currentQuestion?.roundType === 'BUZZER';
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-12">
          {isBuzzer ? (
            <div className="space-y-6">
              <div className="w-32 h-32 bg-amber-500 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl animate-bounce">
                <Zap className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-5xl font-black text-slate-950 tracking-tighter italic">BUZZER MODE</h2>
              <p className="text-slate-500 font-black uppercase tracking-widest text-sm">Priority Input Protocol Active</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-32 h-32 bg-indigo-700 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl">
                <Clock className="w-16 h-16 text-white" />
              </div>
              <h2 className="text-5xl font-black text-slate-950 tracking-tighter italic uppercase">Standard Turn</h2>
              <p className="text-slate-500 font-black uppercase tracking-widest text-sm">30s Analysis Window</p>
            </div>
          )}
        </div>
      );
    }

    if (session.status === QuizStatus.LIVE) {
      const isBuzzer = currentQuestion?.roundType === 'BUZZER';
      const canInteract = isBuzzer || isMyTurn;

      return (
        <div className="space-y-10 animate-in slide-in-from-bottom duration-500">
           <div className={`p-6 rounded-[2rem] flex justify-between items-center shadow-lg border-b-8 ${isBuzzer ? 'bg-amber-500 border-amber-700' : 'bg-indigo-700 border-indigo-900'}`}>
              <div className="flex items-center gap-4 text-white">
                 {isBuzzer ? <Zap className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                 <span className="text-xl font-black uppercase tracking-tight">
                   {isBuzzer ? 'Buzzer Live' : isMyTurn ? 'Your Turn' : 'Waiting...'}
                 </span>
              </div>
              {!isBuzzer && isMyTurn && <Badge color="amber">SHOT CLOCK ACTIVE</Badge>}
           </div>

           {!isBuzzer && !isMyTurn && !mySubmission ? (
             <div className="py-24 px-10 bg-white rounded-[3rem] text-center space-y-8 border-4 border-slate-200 shadow-2xl">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                   <LockIcon className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-4xl font-black text-slate-950 uppercase tracking-tighter italic">Locked Out</h3>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs leading-relaxed">
                   Turn Possession: <br/>
                   <span className="text-indigo-700 text-lg font-black">{session.teams.find(t => t.id === session.activeTeamId)?.name}</span>
                </p>
             </div>
           ) : (
             <div className="space-y-8">
               <h2 className="text-4xl font-black text-slate-950 leading-[1.15] tracking-tight">{currentQuestion?.text}</h2>

               <div className="grid grid-cols-1 gap-6">
                 {currentQuestion?.options.map((opt, i) => {
                   const isSelected = selectedAnswer === i;
                   const isDisabled = !!mySubmission || !canInteract;
                   
                   return (
                     <button
                       key={i}
                       disabled={isDisabled}
                       onClick={() => setSelectedAnswer(i)}
                       className={`w-full p-8 rounded-[2.5rem] border-4 text-left flex items-center transition-all group ${
                         isSelected 
                          ? 'bg-slate-950 text-white border-slate-950 shadow-2xl scale-[1.03] ring-8 ring-indigo-500/20' 
                          : isDisabled 
                            ? 'bg-slate-100 text-slate-400 border-slate-200' 
                            : 'bg-white text-slate-950 border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 shadow-md active:scale-95'
                       }`}
                     >
                       <span className={`w-16 h-16 rounded-2xl flex items-center justify-center mr-8 text-3xl font-black font-display shrink-0 ${
                         isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-900 group-hover:bg-indigo-100'
                       }`}>
                         {String.fromCharCode(65 + i)}
                       </span>
                       <span className={`text-2xl font-black leading-tight ${isSelected ? 'text-white' : 'text-slate-950'} ${isDisabled && !isSelected ? 'text-slate-400' : ''}`}>
                         {opt}
                       </span>
                     </button>
                   );
                 })}
               </div>

               {!mySubmission ? (
                 <div className="grid grid-cols-1 gap-6 pt-10">
                   <button 
                     disabled={selectedAnswer === null || isSubmitting || !canInteract}
                     onClick={() => handleSubmit('ANSWER')}
                     className={`w-full py-10 rounded-[3.5rem] text-4xl font-black shadow-2xl active:scale-95 transition-all uppercase italic tracking-tighter ${
                       isBuzzer ? 'bg-amber-500 text-white border-b-8 border-amber-700' : 'bg-indigo-700 text-white border-b-8 border-indigo-900'
                     } ${(!canInteract || selectedAnswer === null) ? 'opacity-20 grayscale' : 'animate-in slide-in-from-bottom'}`}
                   >
                     {isSubmitting ? 'Transmitting...' : (isBuzzer ? 'SMASH BUZZER' : 'COMMIT RESPONSE')}
                   </button>
                   {!isBuzzer && isMyTurn && (
                     <button 
                       disabled={isSubmitting}
                       onClick={() => handleSubmit('PASS')}
                       className="w-full py-6 rounded-[2.5rem] bg-white text-slate-950 font-black text-xl flex items-center justify-center gap-4 active:scale-95 transition-all border-4 border-slate-950 shadow-xl"
                     >
                       <Forward className="w-6 h-6" /> TACTICAL PASS (+10)
                     </button>
                   )}
                 </div>
               ) : (
                 <div className="p-16 bg-white rounded-[4rem] border-8 border-emerald-500/20 text-center shadow-2xl animate-in zoom-in">
                    <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8">
                       <CheckCircle2 className="w-12 h-12 text-emerald-600" />
                    </div>
                    <h3 className="text-4xl font-black text-slate-950 uppercase tracking-tighter italic">LOGGED</h3>
                    <p className="text-slate-500 font-black uppercase tracking-[0.2em] text-xs mt-4">Telemetry confirmed by Aura</p>
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
         <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-12">
            {session.status === QuizStatus.REVEALED ? (
              <div className="animate-in zoom-in space-y-10 w-full">
                {mySubmission?.type === 'PASS' ? (
                  <div className="bg-indigo-50 p-12 rounded-[4rem] border-4 border-indigo-600">
                    <Forward className="w-20 h-20 text-indigo-600 mx-auto mb-6" />
                    <h2 className="text-6xl font-black text-indigo-700 uppercase italic tracking-tighter">SUCCESSFUL PASS</h2>
                    <p className="text-2xl text-slate-600 font-bold mt-4">+10 Strategy Reward Applied</p>
                  </div>
                ) : (
                  <div className={`p-12 rounded-[4rem] border-b-[12px] shadow-2xl ${isCorrect ? 'bg-emerald-50 border-emerald-600' : 'bg-red-50 border-red-600'}`}>
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ${isCorrect ? 'bg-emerald-600' : 'bg-red-600'}`}>
                      {isCorrect ? <CheckCircle2 className="w-12 h-12 text-white" /> : <AlertCircle className="w-12 h-12 text-white" />}
                    </div>
                    <h2 className={`text-7xl font-black uppercase italic tracking-tighter ${isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>
                      {isCorrect ? 'VALIDATED' : 'ERRONEOUS'}
                    </h2>
                    <div className="mt-8 flex justify-center items-center gap-6">
                       <div className="text-slate-500 text-xl font-bold uppercase tracking-widest">DELTA</div>
                       <div className={`text-5xl font-black ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                          {isCorrect ? `+${currentQuestion?.points}` : '-50'}
                       </div>
                    </div>
                  </div>
                )}
                <div className="bg-slate-950 text-white p-10 rounded-[3rem] shadow-2xl flex items-center justify-between">
                  <span className="text-slate-400 font-black uppercase tracking-widest">Team Net Worth</span>
                  <span className="text-6xl font-black text-amber-400 italic tabular-nums">{myTeam?.score}</span>
                </div>
              </div>
            ) : (
              <div className="animate-pulse space-y-12">
                <div className="w-40 h-40 bg-slate-950 rounded-[3rem] flex items-center justify-center mx-auto shadow-2xl">
                   <LockIcon className="w-20 h-20 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-6xl font-black text-slate-950 uppercase italic tracking-tighter">BUFFER LOCKED</h2>
                  <p className="text-slate-500 font-bold uppercase tracking-widest mt-4">Host is evaluating priority timestamps...</p>
                </div>
              </div>
            )}
         </div>
       );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-slate-950 text-white p-6 md:p-8 flex justify-between items-center shadow-2xl rounded-b-[3rem] border-b-8 border-indigo-600 sticky top-0 z-50">
        <div className="flex items-center gap-4">
           <AIHostAvatar size="sm" />
           <div className="flex flex-col">
              <span className="font-black text-[10px] tracking-[0.4em] text-indigo-400 uppercase">UNIT ID</span>
              <span className="font-black text-xl md:text-2xl tracking-tighter uppercase italic truncate max-w-[120px] md:max-w-[200px]">{myTeam?.name}</span>
           </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-black text-[10px] tracking-[0.5em] text-slate-500 uppercase">NET CREDITS</span>
          <span className="font-black text-3xl md:text-5xl text-amber-400 tracking-tighter italic tabular-nums">{myTeam?.score}</span>
        </div>
      </header>
      
      <main className="flex-grow max-w-xl mx-auto w-full p-8 pb-32">
        {renderContent()}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t-4 border-slate-200 p-6 flex items-center gap-6 z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <div className="w-12 h-12 bg-slate-950 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border border-white/10">
           <MessageSquare className="w-6 h-6 text-indigo-400" />
        </div>
        <div className="flex-grow overflow-hidden">
           <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] mb-1 italic">Live Aura Commentary</p>
           <p className="text-slate-950 font-bold truncate italic leading-none text-base">
             "{auraInsight || "Awaiting signal from neural core..."}"
           </p>
        </div>
      </footer>
    </div>
  );
};

export default TeamView;
