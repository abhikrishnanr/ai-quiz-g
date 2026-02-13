
import React, { useState, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus } from '../types';
import { Card, Button, Badge } from '../components/SharedUI';
import { 
  Settings, Zap, CheckCircle, BrainCircuit, 
  MessageSquare, Play, Lock as LockIcon, Eye, Star,
  Sparkles, Activity, AlertTriangle, RefreshCw, Cpu
} from 'lucide-react';

const AdminView: React.FC = () => {
  const { session, loading, refresh } = useQuizSync();
  const [updating, setUpdating] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (loading || !session) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
      <Activity className="w-16 h-16 text-indigo-500 animate-spin" />
      <p className="mt-8 text-indigo-400 font-black uppercase tracking-[0.4em] text-xs">Initializing Architect...</p>
    </div>
  );

  const performAction = async (action: () => Promise<any>) => {
    setUpdating(true);
    try {
      await action();
      await refresh();
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerate = () => performAction(() => API.generateQuestion());

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

  const ControlButton = ({ status, label, icon: Icon, variant, desc }: { status: QuizStatus, label: string, icon: any, variant: 'primary' | 'success' | 'danger', desc: string }) => {
    const isActive = session.status === status;
    const styles = {
      primary: { active: 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_40px_rgba(79,70,229,0.3)]', dot: 'bg-indigo-500' },
      success: { active: 'bg-emerald-600/20 border-emerald-500 shadow-[0_0_40_rgba(16,185,129,0.3)]', dot: 'bg-emerald-500' },
      danger: { active: 'bg-rose-600/20 border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.3)]', dot: 'bg-rose-500' }
    };
    const activeStyle = styles[variant];

    return (
      <button
        onClick={() => performAction(() => API.updateSessionStatus(status))}
        disabled={updating}
        className={`relative flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 transition-all duration-500 h-32 w-full group ${
          isActive ? activeStyle.active : 'bg-white/5 border-white/5 hover:bg-white/10'
        }`}
      >
        <Icon className={`w-7 h-7 mb-3 ${isActive ? 'text-white' : 'text-slate-500'}`} />
        <span className="font-black uppercase text-[10px] tracking-widest">{label}</span>
        <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-slate-600 mt-1">{desc}</span>
        {isActive && <div className={`absolute top-4 right-4 h-2 w-2 rounded-full ${activeStyle.dot} animate-pulse`} />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-200 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(transparent_0%,#020617_100%)]" />
      
      <div className="relative z-10 max-w-[120rem] mx-auto p-6 lg:p-10 space-y-8">
        <header className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/10 flex flex-wrap gap-8 justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="bg-indigo-600 p-4 rounded-3xl shadow-[0_0_30px_rgba(79,70,229,0.5)]">
              <Cpu className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-tighter">BODHINI CORE <span className="text-indigo-400/50 font-light ml-2">V3_GEN</span></h1>
              <div className="flex items-center gap-3 mt-1.5">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Next Round: {session.nextRoundType}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
             {session.requestedHint && (
               <div className="flex items-center gap-3 px-6 py-3 bg-amber-500/20 border border-amber-500/50 rounded-2xl animate-pulse">
                 <AlertTriangle className="w-5 h-5 text-amber-500" />
                 <Button variant="amber" className="h-10 px-4 py-0" onClick={() => performAction(() => API.toggleHint(true))}>
                   Grant Hint
                 </Button>
               </div>
             )}
             <Button variant={confirmReset ? 'danger' : 'secondary'} onClick={handleReset} className="h-14">
               {confirmReset ? 'Confirm Reset?' : 'Full System Reset'}
             </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-6">
            <Card className="flex flex-col gap-6">
               <div className="space-y-2">
                 <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Neural Generation</h3>
                 <p className="text-sm text-slate-400">Request a new knowledge fragment from the cloud infrastructure.</p>
               </div>
               
               <button 
                onClick={handleGenerate}
                disabled={updating}
                className="w-full py-10 rounded-[2.5rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 flex flex-col items-center gap-4"
               >
                 <RefreshCw className={`w-8 h-8 ${updating ? 'animate-spin' : ''}`} />
                 LOAD NEURAL FRAGMENT
               </button>

               <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                     <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Status</span>
                     <span className="text-sm font-black text-white uppercase">{session.status}</span>
                  </div>
                  <div className="p-5 bg-white/5 rounded-2xl border border-white/5">
                     <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Pass Count</span>
                     <span className="text-sm font-black text-white uppercase">{session.passedTeamIds.length}</span>
                  </div>
               </div>
            </Card>

            <Card className="flex-grow overflow-hidden" noPadding>
               <div className="p-7 border-b border-white/5 bg-white/[0.02]">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Neural Rankings</h3>
               </div>
               <div className="p-6 space-y-3">
                  {session.teams.sort((a,b) => b.score - a.score).map((t, i) => (
                      <div key={i} className="flex justify-between items-center p-5 rounded-2xl bg-white/5 border border-white/5 group">
                         <div className="flex items-center gap-4">
                            <span className="text-sm font-black text-white">{t.name}</span>
                         </div>
                         <span className="text-xl font-black text-indigo-400 italic">{t.score}</span>
                      </div>
                  ))}
               </div>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <Card className="border-t-[6px] border-t-indigo-600 overflow-hidden" noPadding>
              <div className="bg-slate-900/60 p-8 grid grid-cols-4 gap-4 border-b border-white/10">
                <ControlButton status={QuizStatus.PREVIEW} label="Preview" icon={Eye} variant="primary" desc="Sync Buffer" />
                <ControlButton status={QuizStatus.LIVE} label="Energize" icon={Play} variant="success" desc="Broadcasting" />
                <ControlButton status={QuizStatus.LOCKED} label="Freeze" icon={LockIcon} variant="danger" desc="Locking Link" />
                <button
                  onClick={() => performAction(API.revealAnswerAndProcessScores)} 
                  className={`flex flex-col items-center justify-center p-6 rounded-[2rem] border-2 h-32 transition-all duration-500 group ${
                    session.status === QuizStatus.REVEALED ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-white/5 border-white/5'
                  }`}
                >
                   <CheckCircle className="w-7 h-7 mb-3" />
                   <span className="font-black uppercase text-[10px] tracking-widest">Reveal</span>
                   <span className="text-[8px] font-bold uppercase mt-1 opacity-40">Synthesize</span>
                </button>
              </div>

              <div className="p-12 min-h-[500px] relative">
                {session.currentQuestion ? (
                  <div className="space-y-12 animate-in slide-in-from-bottom-8">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                         <Badge color={session.currentQuestion.roundType === 'BUZZER' ? 'amber' : 'blue'}>
                           {session.currentQuestion.roundType} ROUND
                         </Badge>
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">ID: {session.currentQuestion.id}</p>
                      </div>
                      {session.hintVisible && (
                        <div className="bg-indigo-600/10 border border-indigo-500/50 p-6 rounded-[2rem] max-w-[300px]">
                           <div className="flex items-center gap-2 mb-2 text-indigo-400">
                             <Sparkles className="w-4 h-4" />
                             <span className="text-[9px] font-black uppercase tracking-widest">Active Hint</span>
                           </div>
                           <p className="text-xs font-bold text-slate-300 italic">"{session.currentQuestion.hint}"</p>
                        </div>
                      )}
                    </div>

                    <h2 className="text-5xl font-black text-white leading-tight tracking-tighter">{session.currentQuestion.text}</h2>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {session.currentQuestion.options.map((opt, i) => (
                         <div key={i} className={`p-6 rounded-[2.5rem] border-2 flex items-center gap-5 ${
                           i === session.currentQuestion?.correctAnswer ? 'bg-emerald-500/10 border-emerald-500' : 'bg-white/5 border-white/5'
                         }`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                              i === session.currentQuestion?.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-500'
                            }`}>
                              {String.fromCharCode(65+i)}
                            </div>
                            <span className="font-bold text-lg">{opt}</span>
                         </div>
                      ))}
                    </div>

                    {session.status === QuizStatus.REVEALED && (
                      <div className="p-8 bg-indigo-600/10 border-l-4 border-indigo-500 rounded-r-3xl animate-in zoom-in">
                        <h4 className="text-[10px] font-black uppercase text-indigo-400 mb-3 tracking-[0.3em]">Knowledge Synthesis</h4>
                        <p className="text-lg font-bold text-slate-200 leading-relaxed italic">"{session.currentQuestion.explanation}"</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-[400px] flex flex-col items-center justify-center text-center opacity-40">
                     <BrainCircuit className="w-24 h-24 text-indigo-500 mb-8" />
                     <h3 className="text-2xl font-black uppercase tracking-[0.4em] text-white">Neural Uplink Ready</h3>
                     <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500">Load a neural fragment to begin sequence</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminView;
