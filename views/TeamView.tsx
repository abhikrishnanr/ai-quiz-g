
import React, { useState, useEffect } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus, SubmissionType } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { Card, Button, Badge } from '../components/SharedUI';
import { CheckCircle2, AlertCircle, Clock, Zap, Forward, LogOut, Sparkles, MessageSquare } from 'lucide-react';
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

  if (loading || !session) return null;

  if (!selectedTeam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <h1 className="text-4xl font-black text-white uppercase mb-12">Neural Uplink</h1>
        <div className="w-full max-w-md space-y-4">
          {session.teams.map(t => (
            <button key={t.id} onClick={() => { setSelectedTeam(t.id); localStorage.setItem('duk_team_id', t.id); }} className="w-full p-6 bg-white/5 border border-white/10 rounded-2xl text-white font-black uppercase text-xl hover:bg-white/10 transition-all">
              {t.name}
            </button>
          ))}
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
        <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6">
          <Clock className="w-16 h-16 text-indigo-400 animate-pulse" />
          <h2 className="text-2xl font-black text-white uppercase tracking-widest">Awaiting Uplink...</h2>
        </div>
      );
    }

    if (session.status === QuizStatus.LIVE) {
      const isBuzzer = currentQuestion?.roundType === 'BUZZER';
      const canPlay = isBuzzer || isMyTurn;

      return (
        <div className="space-y-6 pb-24">
           <div className={`p-4 rounded-2xl text-white flex justify-between items-center ${isBuzzer ? 'bg-amber-600' : 'bg-indigo-600'}`}>
              <span className="font-black uppercase tracking-widest">{isBuzzer ? 'Fastest Finger' : isMyTurn ? 'YOUR TURN' : 'LISTENING'}</span>
              <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-black">{currentQuestion?.difficulty}</span>
           </div>

           <Card className="bg-white">
              <h2 className="text-xl font-bold text-slate-800 leading-snug">{currentQuestion?.text}</h2>
           </Card>

           <div className="relative">
              {showHint ? (
                 <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl animate-in zoom-in">
                    <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Tactical Suggestion</p>
                    <p className="text-sm font-bold text-indigo-800 italic">"{currentQuestion?.hint}"</p>
                 </div>
              ) : (
                <button 
                  onClick={() => setShowHint(true)}
                  className="w-full p-3 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-400 text-xs font-black uppercase"
                >
                  <Sparkles className="w-4 h-4" /> Reveal Hint
                </button>
              )}
           </div>

           <div className="grid gap-3">
             {currentQuestion?.options.map((opt, i) => (
               <button 
                 key={i} 
                 disabled={!!mySubmission || !canPlay} 
                 onClick={() => setSelectedAnswer(i)} 
                 className={`w-full p-5 rounded-2xl border-2 text-left flex items-center transition-all ${selectedAnswer === i ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
               >
                 <span className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 font-black ${selectedAnswer === i ? 'bg-indigo-500' : 'bg-slate-100 text-slate-400'}`}>{String.fromCharCode(65+i)}</span>
                 <span className="text-lg font-bold">{opt}</span>
               </button>
             ))}
           </div>

           {!mySubmission && canPlay && (
             <button disabled={selectedAnswer === null || isSubmitting} onClick={() => handleSubmit('ANSWER')} className="w-full py-6 bg-indigo-600 text-white rounded-2xl text-2xl font-black uppercase shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">
                {isBuzzer ? 'BUZZ!' : 'SUBMIT'}
             </button>
           )}
        </div>
      );
    }

    if (session.status === QuizStatus.REVEALED) {
       const isCorrect = mySubmission?.isCorrect;
       return (
         <div className="flex flex-col items-center justify-center h-[50vh] space-y-8 animate-in zoom-in">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}>
               {isCorrect ? <CheckCircle2 className="w-12 h-12 text-white" /> : <AlertCircle className="w-12 h-12 text-white" />}
            </div>
            <h2 className={`text-5xl font-black uppercase italic ${isCorrect ? 'text-emerald-500' : 'text-red-500'}`}>{isCorrect ? 'SUCCESS' : 'FAILURE'}</h2>
            <div className="bg-white p-6 rounded-2xl w-full flex justify-between items-center shadow-lg border border-slate-100">
               <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accumulated Credits</span>
               <span className="text-3xl font-black text-slate-900">{myTeam?.score}</span>
            </div>
         </div>
       );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans max-w-md mx-auto relative flex flex-col shadow-2xl overflow-hidden">
      <header className="bg-white p-4 flex justify-between items-center sticky top-0 z-50">
         <div className="flex items-center gap-3">
            <div className="scale-50 origin-left"><AIHostAvatar size="sm" /></div>
            <div>
               <p className="text-[10px] font-black uppercase text-slate-400 leading-none mb-1">Node</p>
               <p className="text-sm font-black uppercase leading-none">{myTeam?.name}</p>
            </div>
         </div>
         <button onClick={() => { localStorage.removeItem('duk_team_id'); setSelectedTeam(null); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><LogOut className="w-4 h-4" /></button>
      </header>
      <main className="flex-grow p-4 overflow-y-auto">{renderContent()}</main>
      <div className="bg-white/10 backdrop-blur-lg border-t border-white/10 p-4 flex items-center gap-3">
         <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
         </div>
         <p className="text-xs text-indigo-200 italic font-medium leading-snug">"Monitoring system vitals. Prepare for the next transmission."</p>
      </div>
    </div>
  );
};

export default TeamView;
