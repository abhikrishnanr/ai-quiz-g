
import React, { useState, useEffect } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus, SubmissionType } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { Card, Button, Badge } from '../components/SharedUI';
import { 
  CheckCircle2, AlertCircle, Clock, Zap, LogOut, 
  Sparkles, MessageSquare, BrainCircuit, Waves, 
  Lock as LockIcon, Activity, HandMetal
} from 'lucide-react';
import { AIHostAvatar } from '../components/AIHostAvatar';

const TeamView: React.FC = () => {
  const { session, loading, refresh } = useQuizSync();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(localStorage.getItem('duk_team_id'));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = MOCK_QUESTIONS.find(q => q.id === session?.currentQuestionId);
  const mySubmission = session?.submissions.find(s => s.teamId === selectedTeam);
  const myTeam = session?.teams.find(t => t.id === selectedTeam);
  const isMyTurn = session?.activeTeamId === selectedTeam;
  const isStandard = currentQuestion?.roundType === 'STANDARD';

  useEffect(() => {
    if (session?.status === QuizStatus.PREVIEW) {
      setSelectedAnswer(null);
    }
  }, [session?.currentQuestionId, session?.status]);

  if (loading || !session) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
       <div className="w-16 h-16 rounded-full border-[3px] border-slate-900 border-t-indigo-500 animate-spin" />
    </div>
  );

  if (!selectedTeam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
            <div className="bg-white/5 p-10 rounded-[3rem] mb-12 border border-white/10 shadow-2xl">
               <BrainCircuit className="w-20 h-20 text-indigo-400" />
            </div>
            <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-12">Select Node</h1>
            <div className="w-full space-y-5">
              {session.teams.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => { setSelectedTeam(t.id); localStorage.setItem('duk_team_id', t.id); }} 
                  className="w-full p-8 bg-white/5 border border-white/10 rounded-[2.5rem] text-white font-black uppercase text-2xl hover:bg-white/10 active:scale-95 transition-all"
                >
                  {t.name}
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

  const handleRequestHint = async () => {
    if (session.requestedHint) return;
    setIsSubmitting(true);
    try {
      await API.requestHint(selectedTeam);
      await refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (!session.currentQuestionId || session.status === QuizStatus.PREVIEW) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-12">
          <div className="relative p-12 bg-slate-900/60 border border-indigo-500/40 rounded-full shadow-2xl animate-pulse">
            <Clock className="w-24 h-24 text-indigo-400" />
          </div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Stand By...</h2>
        </div>
      );
    }

    if (session.status === QuizStatus.LIVE || session.status === QuizStatus.LOCKED) {
      const isBuzzer = currentQuestion?.roundType === 'BUZZER';
      const canPlay = isBuzzer || isMyTurn;
      const isLocked = session.status === QuizStatus.LOCKED;

      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in slide-in-from-bottom-8 duration-700">
           
           {/* Left Sidebar: Status & Info */}
           <div className="lg:col-span-4 space-y-6">
              <div className={`p-8 rounded-[3rem] border-2 transition-all duration-700 flex flex-col gap-4 shadow-2xl ${
                isBuzzer ? 'bg-amber-600/10 border-amber-600' : 'bg-indigo-600/10 border-indigo-600'
              }`}>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Interface Mode</span>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white uppercase tracking-tighter text-3xl">
                        {isBuzzer ? 'Buzzer' : isMyTurn ? 'Your Turn' : 'Listening'}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isBuzzer ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                      {isBuzzer ? <Zap className="w-6 h-6 text-white" /> : <Waves className="w-6 h-6 text-white" />}
                    </div>
                  </div>
              </div>

              {isStandard && isMyTurn && !mySubmission && (
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-6">
                  <div className="flex items-center gap-3">
                    <HandMetal className="w-6 h-6 text-indigo-400" />
                    <span className="text-xs font-black uppercase text-white tracking-widest">Tactical Options</span>
                  </div>
                  
                  <div className="space-y-3">
                    <Button 
                      variant="primary" 
                      className="w-full h-16 rounded-2xl" 
                      disabled={session.requestedHint || session.hintVisible || isSubmitting}
                      onClick={handleRequestHint}
                    >
                      {session.hintVisible ? 'Hint Decrypted' : session.requestedHint ? 'Request Pending...' : 'Request Hint'}
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="w-full h-16 rounded-2xl" 
                      onClick={() => handleSubmit('PASS')}
                      disabled={isSubmitting}
                    >
                      Pass Turn
                    </Button>
                  </div>
                </div>
              )}

              {session.hintVisible && (
                <div className="bg-indigo-600/10 border border-indigo-500/50 p-8 rounded-[2.5rem] animate-in zoom-in backdrop-blur-3xl">
                    <div className="flex items-center gap-3 mb-4 text-indigo-400">
                       <Sparkles className="w-5 h-5" />
                       <span className="text-[10px] font-black uppercase tracking-[0.4em]">Tactical Feed</span>
                    </div>
                    <p className="text-xl font-bold text-slate-100 italic">"{currentQuestion?.hint}"</p>
                </div>
              )}
           </div>

           {/* Right Panel: Question & Interaction */}
           <div className="lg:col-span-8 space-y-6">
              <Card className="bg-slate-900/80 border-white/10">
                 <h2 className="text-3xl font-black text-white leading-tight tracking-tighter">{currentQuestion?.text}</h2>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
                {isLocked && !mySubmission && (
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm z-30 flex items-center justify-center rounded-[2.5rem] border border-white/5">
                        <div className="bg-slate-900 border border-rose-500/50 px-10 py-4 rounded-full flex items-center gap-4">
                          <LockIcon className="w-5 h-5 text-rose-500" />
                          <span className="text-xs font-black uppercase text-rose-500 tracking-[0.4em]">System Lock</span>
                        </div>
                    </div>
                )}

                {currentQuestion?.options.map((opt, i) => (
                  <button 
                    key={i} 
                    disabled={!!mySubmission || !canPlay || isLocked} 
                    onClick={() => setSelectedAnswer(i)} 
                    className={`group p-8 rounded-[2.5rem] border-2 text-left flex items-center transition-all duration-500 ${
                      selectedAnswer === i 
                      ? 'bg-white border-white text-slate-950 shadow-[0_0_50px_rgba(255,255,255,0.3)]' 
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                    } ${!!mySubmission ? 'opacity-40' : ''}`}
                  >
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-6 font-black text-xl ${
                      selectedAnswer === i ? 'bg-slate-900 text-white' : 'bg-white/10 text-slate-500'
                    }`}>
                      {String.fromCharCode(65+i)}
                    </span>
                    <span className="text-xl font-bold tracking-tight">{opt}</span>
                  </button>
                ))}
              </div>

              {!mySubmission && canPlay && !isLocked && (
                <button 
                  disabled={selectedAnswer === null || isSubmitting} 
                  onClick={() => handleSubmit('ANSWER')} 
                  className={`w-full py-10 text-white rounded-[3rem] text-4xl font-black uppercase tracking-tighter shadow-2xl transition-all duration-700 ${
                    selectedAnswer === null ? 'bg-slate-900/50 opacity-40 grayscale' : isBuzzer ? 'bg-amber-600 hover:bg-amber-500' : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                   {isBuzzer ? 'BUZZ NOW' : 'SUBMIT UPLINK'}
                </button>
              )}

              {mySubmission && (
                 <div className="bg-white/5 p-12 rounded-[3rem] border border-white/10 text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                       <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase italic tracking-widest">TRANSMISSION VALID</h3>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px]">Processing...</p>
                 </div>
              )}
           </div>
        </div>
      );
    }

    if (session.status === QuizStatus.REVEALED) {
       const isCorrect = mySubmission?.isCorrect;
       return (
         <div className="flex flex-col items-center justify-center h-[70vh] space-y-16 animate-in zoom-in">
            <div className={`w-40 h-40 rounded-full flex items-center justify-center border-4 ${isCorrect ? 'bg-emerald-600 border-emerald-400 shadow-[0_0_80px_rgba(16,185,129,0.8)]' : 'bg-rose-700 border-rose-500 shadow-[0_0_80px_rgba(225,29,72,0.8)]'}`}>
               {isCorrect ? <CheckCircle2 className="w-20 h-20 text-white" /> : <AlertCircle className="w-20 h-20 text-white" />}
            </div>
            <h2 className={`text-7xl font-black uppercase italic tracking-tighter ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
               {isCorrect ? 'SUCCESS' : 'FAILURE'}
            </h2>
            <div className="bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] w-full max-w-lg flex justify-between items-center border border-white/10">
               <div>
                  <span className="text-slate-600 font-black uppercase tracking-[0.4em] text-[9px] block mb-2">Node Credits</span>
                  <span className="text-5xl font-black text-white italic tracking-tighter tabular-nums">{myTeam?.score} <span className="text-lg font-normal text-slate-700 not-italic">CR</span></span>
               </div>
               <Activity className="w-16 h-16 text-indigo-400" />
            </div>
         </div>
       );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans w-full max-w-7xl mx-auto relative flex flex-col shadow-2xl overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/5 blur-[120px] rounded-full" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyan-600/5 blur-[120px] rounded-full" />
      </div>

      <header className="bg-slate-900/60 backdrop-blur-3xl p-8 flex justify-between items-center border-b border-white/10 sticky top-0 z-50">
         <div className="flex items-center gap-5">
            <div className="relative">
               <div className="absolute inset-0 bg-indigo-500/40 blur-xl rounded-full" />
               <div className="scale-75 origin-center relative z-10"><AIHostAvatar size="sm" /></div>
            </div>
            <div>
               <p className="text-[9px] font-black uppercase text-indigo-500 leading-none mb-2 tracking-[0.3em]">Identity Node</p>
               <p className="text-2xl font-black uppercase text-white tracking-tighter leading-none">{myTeam?.name}</p>
            </div>
         </div>
         <button onClick={() => { localStorage.removeItem('duk_team_id'); setSelectedTeam(null); }} className="p-4 bg-white/5 rounded-[1.5rem] text-slate-500 hover:text-rose-500 transition-all border border-white/5">
            <LogOut className="w-6 h-6" />
         </button>
      </header>

      <main className="flex-grow p-8 overflow-y-auto custom-scrollbar relative z-10">
         {renderContent()}
      </main>

      <div className="bg-slate-900/80 backdrop-blur-3xl border-t border-white/10 p-6 flex items-center gap-5">
         <div className="w-14 h-14 bg-white/5 rounded-[1.5rem] flex items-center justify-center shrink-0 border border-white/5">
            <MessageSquare className="w-7 h-7 text-indigo-400" />
         </div>
         <p className="text-xs text-slate-500 italic font-medium">"Sync stable. Maintaining active connection to Core Architect."</p>
      </div>
    </div>
  );
};

export default TeamView;
