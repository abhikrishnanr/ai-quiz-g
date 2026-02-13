
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus, Difficulty } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { Card, Button, Badge } from '../components/SharedUI';
import { 
  Settings, Zap, Layers, ChevronRight, 
  CheckCircle, BrainCircuit, 
  MessageSquare, Play, Lock as LockIcon, Eye, Star,
  Sparkles, Activity, Power, ShieldAlert
} from 'lucide-react';

const AdminView: React.FC = () => {
  const { session, loading, refresh } = useQuizSync();
  const [updating, setUpdating] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (loading || !session) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
      <div className="relative">
        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl animate-pulse rounded-full" />
        <Activity className="w-16 h-16 text-indigo-500 animate-spin relative z-10" />
      </div>
      <p className="mt-8 text-indigo-400 font-black uppercase tracking-[0.4em] text-xs animate-pulse">Initializing Interface...</p>
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

  const ControlButton = ({ status, label, icon: Icon, variant, desc }: { status: QuizStatus, label: string, icon: any, variant: 'primary' | 'success' | 'danger', desc: string }) => {
    const isActive = session.status === status;
    const styles = {
      primary: { active: 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.3)]', iconActive: 'text-indigo-400', dot: 'bg-indigo-500' },
      success: { active: 'bg-emerald-600/20 border-emerald-500 shadow-[0_0_40_rgba(16,185,129,0.3)]', iconActive: 'text-emerald-400', dot: 'bg-emerald-500' },
      danger: { active: 'bg-rose-600/20 border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.3)]', iconActive: 'text-rose-400', dot: 'bg-rose-500' }
    };
    const variantStyle = styles[variant];

    return (
      <button
        onClick={() => performAction(() => API.updateSessionStatus(status))}
        disabled={updating}
        className={`relative flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-500 h-32 group ${
          isActive ? variantStyle.active : 'bg-white/5 border-white/5 hover:bg-white/10 disabled:opacity-30'
        }`}
      >
        <div className={`p-3 rounded-2xl mb-3 transition-colors ${isActive ? 'bg-white/10 shadow-inner' : 'bg-white/5 group-hover:bg-white/10'}`}>
           <Icon className={`w-6 h-6 ${isActive ? variantStyle.iconActive : 'text-slate-500'}`} />
        </div>
        <span className={`font-black uppercase text-[10px] tracking-widest ${isActive ? 'text-white' : 'text-slate-500'}`}>{label}</span>
        <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-slate-600 mt-1">{desc}</span>
        {isActive && (
          <div className="absolute top-4 right-4">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${variantStyle.dot}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${variantStyle.dot}`}></span>
            </span>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 selection:bg-indigo-500/40 relative overflow-hidden">
      
      {/* Universal Cyber Background */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[150px] rounded-full animate-pulse" />
         <div className="absolute inset-0 bg-[radial-gradient(transparent_0%,#020617_100%)]" />
         <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="relative z-10 max-w-[120rem] mx-auto p-6 lg:p-10 space-y-8">
        
        {/* Header Protocol */}
        <header className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] p-8 shadow-2xl border border-white/10 flex flex-wrap gap-8 justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 p-4 rounded-3xl shadow-[0_0_30px_rgba(79,70,229,0.5)]">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Quiz Architect <span className="text-indigo-400/50 font-light ml-2">CORE_UPLINK</span></h1>
              <div className="flex items-center gap-3 mt-1.5">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,1)]" />
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">System Vitals Operational</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
             <div className="hidden md:flex flex-col items-end">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Master Session ID</span>
                <span className="text-sm font-mono text-indigo-400 uppercase">{session.id.substring(0,14)}</span>
             </div>
             <Button variant={confirmReset ? 'danger' : 'secondary'} onClick={handleReset} disabled={updating} className="h-14">
               {confirmReset ? 'Confirm Reset?' : 'Full System Reset'}
             </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          {/* LEFT: NODES (Questions) */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="max-h-[85vh] flex flex-col overflow-hidden" noPadding>
               <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Data Nodes</h3>
                 <span className="bg-indigo-500/10 px-3 py-1 rounded-full text-[10px] font-black text-indigo-400 border border-indigo-500/20">{MOCK_QUESTIONS.length} TOTAL</span>
               </div>
               <div className="overflow-y-auto p-5 space-y-4 custom-scrollbar flex-grow">
                 {MOCK_QUESTIONS.map((q) => (
                   <button 
                     key={q.id}
                     onClick={() => performAction(() => API.setCurrentQuestion(q.id))}
                     className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all duration-300 relative overflow-hidden group ${
                       session.currentQuestionId === q.id 
                       ? 'bg-indigo-600/10 border-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.2)]' 
                       : 'bg-white/5 border-white/5 hover:border-white/20'
                     }`}
                   >
                     {session.currentQuestionId === q.id && <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />}
                     <div className="flex gap-2.5 mb-3">
                       <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${session.currentQuestionId === q.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{q.roundType}</span>
                       <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border border-white/5 ${session.currentQuestionId === q.id ? 'text-white' : `text-${getDifficultyColor(q.difficulty)}-400`}`}>{q.difficulty}</span>
                     </div>
                     <p className={`text-xs font-bold leading-relaxed line-clamp-2 ${session.currentQuestionId === q.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{q.text}</p>
                   </button>
                 ))}
               </div>
            </Card>
          </div>

          {/* CENTER: COMMAND CENTER */}
          <div className="lg:col-span-6 space-y-8">
            <Card className="border-t-[6px] border-t-indigo-600 overflow-hidden" noPadding>
              <div className="bg-slate-900/60 p-8 grid grid-cols-4 gap-4 border-b border-white/10">
                <ControlButton status={QuizStatus.PREVIEW} label="Preview" icon={Eye} variant="primary" desc="Sync Buffer" />
                <ControlButton status={QuizStatus.LIVE} label="Energize" icon={Play} variant="success" desc="Start Engine" />
                <ControlButton status={QuizStatus.LOCKED} label="Freeze" icon={LockIcon} variant="danger" desc="Lock Uplink" />
                <button
                  onClick={() => performAction(API.revealAnswerAndProcessScores)} 
                  className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 h-32 transition-all duration-500 group ${
                    session.status === QuizStatus.REVEALED 
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-[0_0_50px_rgba(79,70,229,0.5)]' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                   <CheckCircle className={`w-7 h-7 mb-3 ${session.status === QuizStatus.REVEALED ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                   <span className="font-black uppercase text-[10px] tracking-widest">Reveal</span>
                   <span className="text-[8px] font-bold uppercase mt-1 opacity-40">Process Data</span>
                </button>
              </div>

              <div className="p-12 min-h-[500px] relative">
                {currentQuestion ? (
                  <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                         <div className="flex gap-3">
                           <Badge color={getDifficultyColor(currentQuestion.difficulty)}>{currentQuestion.difficulty}</Badge>
                           <Badge color="slate">{currentQuestion.points} CREDITS</Badge>
                         </div>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Node Reference: {currentQuestion.id}</p>
                      </div>
                      <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 max-w-[280px] shadow-inner">
                         <div className="flex items-center gap-2.5 mb-2 text-indigo-400">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Tactical Feed</span>
                         </div>
                         <p className="text-xs font-bold italic text-slate-300 leading-relaxed">"{currentQuestion.hint}"</p>
                      </div>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-black text-white leading-[1.1] tracking-tighter">{currentQuestion.text}</h2>
                    
                    <div className="grid gap-4">
                      {currentQuestion.options.map((opt, i) => (
                         <div key={i} className={`p-6 rounded-[2.5rem] border-2 flex items-center gap-6 transition-all duration-500 ${
                           i === currentQuestion.correctAnswer 
                           ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)]' 
                           : 'bg-white/5 border-white/5'
                         }`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg ${
                              i === currentQuestion.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {String.fromCharCode(65+i)}
                            </div>
                            <span className={`font-black text-2xl tracking-tight ${i === currentQuestion.correctAnswer ? 'text-emerald-300' : 'text-slate-400'}`}>{opt}</span>
                            {i === currentQuestion.correctAnswer && <div className="ml-auto w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,1)]" />}
                         </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center text-center opacity-40">
                     <div className="relative mb-10">
                       <div className="absolute inset-0 bg-indigo-500/20 blur-3xl animate-pulse" />
                       <BrainCircuit className="w-24 h-24 text-indigo-500 relative z-10" />
                     </div>
                     <h3 className="text-2xl font-black uppercase tracking-[0.4em] text-white">Neural Uplink Ready</h3>
                     <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Select a data node to initialize bridge</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* RIGHT: ANALYTICS & RANKING */}
          <div className="lg:col-span-3 space-y-8">
             <Card className="h-[450px] flex flex-col" noPadding>
                <div className="p-7 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Live Logs</h3>
                   <Activity className="w-5 h-5 text-indigo-500 animate-pulse" />
                </div>
                <div className="flex-grow overflow-y-auto p-6 space-y-4 custom-scrollbar">
                   {session.submissions.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 opacity-40">
                         <MessageSquare className="w-10 h-10" />
                         <span className="text-[9px] font-black uppercase tracking-[0.3em]">No Active Telemetry</span>
                      </div>
                   ) : (
                     session.submissions.map((s, i) => {
                        const team = session.teams.find(t => t.id === s.teamId);
                        return (
                          <div key={i} className="flex items-center gap-5 p-5 bg-white/5 rounded-3xl border border-white/5 group hover:bg-white/10 transition-all">
                             <div className="flex-grow">
                                <p className="text-sm font-black text-white uppercase tracking-tight">{team?.name}</p>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{s.type} RECEIVED</p>
                             </div>
                             <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${s.isCorrect ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'}`}>
                                {s.isCorrect ? 'HIT' : 'MISS'}
                             </div>
                          </div>
                        );
                     })
                   )}
                </div>
             </Card>

             <Card noPadding className="flex-grow">
                <div className="p-7 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Neural Ranking</h3>
                   <Star className="w-5 h-5 text-amber-500" />
                </div>
                <div className="p-6 space-y-3">
                   {session.teams.sort((a,b) => b.score - a.score).map((t, i) => (
                      <div key={i} className="flex justify-between items-center p-5 rounded-[2rem] bg-white/5 border border-white/5 hover:border-indigo-500/30 transition-all group">
                         <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-slate-600 group-hover:text-indigo-500">#{i+1}</span>
                            <span className="text-base font-black text-slate-200 uppercase tracking-tight">{t.name}</span>
                         </div>
                         <div className="text-right">
                            <span className="text-xl font-black text-white tabular-nums italic">{t.score}</span>
                            <span className="text-[8px] block text-slate-600 font-bold uppercase tracking-widest">CR</span>
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
