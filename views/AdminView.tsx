
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus, Difficulty } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { Card, Button, Badge } from '../components/SharedUI';
import { 
  Settings, RefreshCcw, Zap, Layers, ChevronRight, 
  Forward, AlertTriangle, CheckCircle, BrainCircuit, 
  MessageSquare, Play, Lock as LockIcon, Eye, Star,
  Info, BarChart3, Sparkles, Activity, ShieldAlert
} from 'lucide-react';

const AdminView: React.FC = () => {
  const { session, loading, refresh } = useQuizSync();
  const [updating, setUpdating] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (loading || !session) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
      <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full shadow-[0_0_30px_rgba(79,70,229,0.5)]"/>
      <p className="mt-6 text-slate-500 font-black uppercase tracking-widest animate-pulse">Initializing Core...</p>
    </div>
  );

  const currentQuestion = MOCK_QUESTIONS.find(q => q.id === session.currentQuestionId);

  const performAction = async (action: () => Promise<any>) => {
    setUpdating(true);
    try {
      await action();
      await refresh();
    } finally {
      setUpdating(false);
    }
  };

  const handleReset = () => {
    if (confirmReset) {
      performAction(API.resetSession);
      setConfirmReset(false);
    } else {
      setConfirmReset(true);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = setTimeout(() => setConfirmReset(false), 3000);
    }
  };

  const getDifficultyColor = (diff?: Difficulty) => {
    switch(diff) {
      case 'EASY': return 'green';
      case 'MEDIUM': return 'blue';
      case 'HARD': return 'red';
      default: return 'slate';
    }
  };

  const ControlButton = ({ status, label, icon: Icon, variant, desc, disabled = false }: { status: QuizStatus, label: string, icon: any, variant: 'primary' | 'success' | 'danger', desc: string, disabled?: boolean }) => {
    const isActive = session.status === status;
    const styles = {
      primary: { active: 'bg-indigo-500/20 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)]', iconActive: 'text-indigo-400', ping: 'bg-indigo-400', dot: 'bg-indigo-500' },
      success: { active: 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]', iconActive: 'text-emerald-400', ping: 'bg-emerald-400', dot: 'bg-emerald-500' },
      danger: { active: 'bg-rose-500/20 border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]', iconActive: 'text-rose-400', ping: 'bg-rose-400', dot: 'bg-rose-500' }
    };
    const variantStyle = styles[variant];

    return (
      <button
        onClick={() => performAction(() => API.updateSessionStatus(status))}
        disabled={disabled || updating}
        className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all h-28 ${
          isActive ? variantStyle.active : 'bg-white/5 border-white/10 hover:bg-white/10 disabled:opacity-30'
        }`}
      >
        <div className={`p-2 rounded-full mb-2 ${isActive ? 'bg-indigo-500/10 shadow-inner' : 'bg-white/5'}`}>
           <Icon className={`w-5 h-5 ${isActive ? variantStyle.iconActive : 'text-slate-500'}`} />
        </div>
        <span className={`font-black uppercase text-xs tracking-tighter ${isActive ? 'text-white' : 'text-slate-400'}`}>{label}</span>
        <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-500 mt-1">{desc}</span>
        {isActive && (
          <div className="absolute top-2 right-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${variantStyle.ping}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${variantStyle.dot}`}></span>
            </span>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 lg:p-8 font-sans text-slate-200 selection:bg-indigo-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-30">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full" />
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-600/10 blur-[150px] rounded-full" />
      </div>

      <div className="max-w-[110rem] mx-auto space-y-6 relative z-10">
        <header className="bg-slate-900/40 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)]">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Quiz Architect <span className="text-indigo-500 font-light opacity-50 ml-2">v2.4.0</span></h1>
              <div className="flex items-center gap-2 mt-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Neural Uplink Stable</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <Button variant={confirmReset ? 'danger' : 'secondary'} onClick={handleReset} disabled={updating}>
               {confirmReset ? 'Confirm Protocol Reset?' : 'Reset Session'}
             </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: SEQUENCE DECK */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="max-h-[800px] flex flex-col" noPadding>
               <div className="p-6 border-b border-white/5 flex justify-between items-center">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Data fragments</h3>
                 <span className="bg-white/5 px-2 py-1 rounded text-[10px] font-bold text-indigo-400">{MOCK_QUESTIONS.length} Nodes</span>
               </div>
               <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                 {MOCK_QUESTIONS.map((q) => (
                   <button 
                     key={q.id}
                     onClick={() => performAction(() => API.setCurrentQuestion(q.id))}
                     className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${
                       session.currentQuestionId === q.id 
                       ? 'bg-indigo-600/10 border-indigo-500/50 shadow-[0_0_30px_rgba(79,70,229,0.15)]' 
                       : 'bg-white/5 border-white/5 hover:border-white/20'
                     }`}
                   >
                     {session.currentQuestionId === q.id && <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />}
                     <div className="flex gap-2 mb-2">
                       <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${session.currentQuestionId === q.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>{q.roundType}</span>
                       <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-white/5 ${session.currentQuestionId === q.id ? 'text-white' : `text-${getDifficultyColor(q.difficulty)}-400`}`}>{q.difficulty}</span>
                     </div>
                     <p className={`text-xs font-bold leading-relaxed line-clamp-2 ${session.currentQuestionId === q.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{q.text}</p>
                   </button>
                 ))}
               </div>
            </Card>
          </div>

          {/* CENTER: PRIMARY CONTROLS */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="border-t-4 border-t-indigo-600 overflow-hidden" noPadding>
              <div className="bg-slate-900/50 p-6 grid grid-cols-4 gap-3 border-b border-white/10">
                <ControlButton status={QuizStatus.PREVIEW} label="Sync" icon={Eye} variant="primary" desc="Preview Mode" />
                <ControlButton status={QuizStatus.LIVE} label="Energize" icon={Play} variant="success" desc="Start Engine" />
                <ControlButton status={QuizStatus.LOCKED} label="Freeze" icon={LockIcon} variant="danger" desc="Lock Buffer" />
                <button
                  onClick={() => performAction(API.revealAnswerAndProcessScores)} 
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 h-28 transition-all group ${
                    session.status === QuizStatus.REVEALED 
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.4)]' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }`}
                >
                   <CheckCircle className={`w-6 h-6 mb-2 ${session.status === QuizStatus.REVEALED ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                   <span className="font-black uppercase text-xs tracking-tighter">Reveal</span>
                   <span className="text-[8px] font-bold uppercase mt-1 opacity-50">Results</span>
                </button>
              </div>

              <div className="p-10 min-h-[450px] relative">
                {currentQuestion ? (
                  <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                         <div className="flex gap-2">
                           <Badge color={getDifficultyColor(currentQuestion.difficulty)}>{currentQuestion.difficulty}</Badge>
                           <Badge color="slate">{currentQuestion.points} Credits</Badge>
                         </div>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Sequence ID: {currentQuestion.id}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-2xl border border-white/10 max-w-[200px]">
                         <div className="flex items-center gap-2 mb-1 text-indigo-400">
                            <Sparkles className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Active Hint</span>
                         </div>
                         <p className="text-[11px] font-bold italic text-slate-300">"{currentQuestion.hint}"</p>
                      </div>
                    </div>

                    <h2 className="text-4xl font-black text-white leading-[1.15] tracking-tight">{currentQuestion.text}</h2>
                    
                    <div className="grid gap-3">
                      {currentQuestion.options.map((opt, i) => (
                         <div key={i} className={`p-5 rounded-2xl border-2 flex items-center gap-5 transition-all duration-300 ${
                           i === currentQuestion.correctAnswer 
                           ? 'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                           : 'bg-white/5 border-white/5'
                         }`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                              i === currentQuestion.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {String.fromCharCode(65+i)}
                            </div>
                            <span className={`font-bold text-xl ${i === currentQuestion.correctAnswer ? 'text-white' : 'text-slate-400'}`}>{opt}</span>
                            {i === currentQuestion.correctAnswer && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" />}
                         </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-center opacity-30">
                     <BrainCircuit className="w-20 h-20 mb-6 text-indigo-500" />
                     <h3 className="text-xl font-black uppercase tracking-[0.3em] text-white">Neural Bridge Ready</h3>
                     <p className="mt-2 text-sm font-bold uppercase text-slate-500">Select a fragment to initialize</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT: TELEMETRY & RANKING */}
          <div className="lg:col-span-3 space-y-6">
             <Card className="h-[400px] flex flex-col" noPadding>
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Live Stream</h3>
                   <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                   {session.submissions.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50">
                         <MessageSquare className="w-8 h-8" />
                         <span className="text-[10px] font-black uppercase tracking-widest">No Active Feedback</span>
                      </div>
                   ) : (
                     session.submissions.map((s, i) => {
                        const team = session.teams.find(t => t.id === s.teamId);
                        return (
                          <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5 group hover:bg-white/10 transition-colors">
                             <div className="flex-grow">
                                <p className="text-xs font-black text-white uppercase">{team?.name}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 tracking-widest">{s.type} LOGGED</p>
                             </div>
                             <div className={`px-2 py-1 rounded text-[9px] font-black uppercase ${s.isCorrect ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'}`}>
                                {s.isCorrect ? 'VALID' : 'INVALID'}
                             </div>
                          </div>
                        );
                     })
                   )}
                </div>
             </Card>

             <Card noPadding>
                <div className="p-5 border-b border-white/5 flex items-center justify-between">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Neural Rankings</h3>
                   <Star className="w-4 h-4 text-amber-500" />
                </div>
                <div className="p-4 space-y-2">
                   {session.teams.sort((a,b) => b.score - a.score).map((t, i) => (
                      <div key={i} className="flex justify-between items-center p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/20 transition-all group">
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-600 group-hover:text-indigo-500">0{i+1}</span>
                            <span className="text-sm font-black text-slate-200 uppercase tracking-tight">{t.name}</span>
                         </div>
                         <div className="text-right">
                            <span className="text-lg font-black text-white tabular-nums">{t.score}</span>
                            <span className="text-[8px] block text-slate-600 font-bold uppercase tracking-widest">Credits</span>
                         </div>
                      </div>
                   ))}
                </div>
             </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminView;
