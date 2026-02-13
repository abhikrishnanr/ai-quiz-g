
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
  Info, BarChart3, Sparkles
} from 'lucide-react';

const AdminView: React.FC = () => {
  const { session, loading, refresh } = useQuizSync();
  const [updating, setUpdating] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (loading || !session) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full"/></div>;

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
      primary: { active: 'bg-slate-100 border-slate-900 shadow-md', iconActive: 'text-slate-900', ping: 'bg-slate-400', dot: 'bg-slate-900' },
      success: { active: 'bg-emerald-50 border-emerald-500 shadow-md', iconActive: 'text-emerald-600', ping: 'bg-emerald-400', dot: 'bg-emerald-500' },
      danger: { active: 'bg-red-50 border-red-500 shadow-md', iconActive: 'text-red-600', ping: 'bg-red-400', dot: 'bg-red-500' }
    };
    const variantStyle = styles[variant];

    return (
      <button
        onClick={() => performAction(() => API.updateSessionStatus(status))}
        disabled={disabled || updating}
        className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all h-28 ${
          isActive ? variantStyle.active : 'bg-white border-slate-200 hover:bg-slate-50 disabled:opacity-50'
        }`}
      >
        <div className={`p-2 rounded-full mb-2 ${isActive ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
           <Icon className={`w-5 h-5 ${isActive ? variantStyle.iconActive : 'text-slate-500'}`} />
        </div>
        <span className={`font-black uppercase text-sm ${isActive ? 'text-slate-900' : 'text-slate-600'}`}>{label}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-1">{desc}</span>
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
    <div className="min-h-screen bg-slate-50 p-4 lg:p-8 font-sans">
      <div className="max-w-[100rem] mx-auto space-y-6">
        <header className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="bg-slate-900 p-3 rounded-2xl">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase">Quiz Architect</h1>
              <Badge color="slate">Session {session.id.substring(0,8)}</Badge>
            </div>
          </div>
          <Button variant={confirmReset ? 'danger' : 'secondary'} onClick={handleReset} disabled={updating}>
            {confirmReset ? 'Confirm?' : 'Reset'}
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Card className="max-h-[700px] flex flex-col" noPadding>
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-xs font-black text-slate-400 uppercase">Sequence Deck</h3>
                 <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold">{MOCK_QUESTIONS.length}</span>
               </div>
               <div className="overflow-y-auto p-4 space-y-3">
                 {MOCK_QUESTIONS.map((q) => (
                   <button 
                     key={q.id}
                     onClick={() => performAction(() => API.setCurrentQuestion(q.id))}
                     className={`w-full text-left p-4 rounded-xl border transition-all ${
                       session.currentQuestionId === q.id ? 'bg-slate-900 border-slate-900 shadow-lg' : 'bg-white border-slate-200 hover:bg-slate-50'
                     }`}
                   >
                     <div className="flex gap-1.5 mb-2">
                       <span className={`text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded ${session.currentQuestionId === q.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{q.roundType}</span>
                       <span className={`text-[8px] font-black uppercase tracking-wider px-1 py-0.5 rounded border ${session.currentQuestionId === q.id ? 'border-white/20 text-white' : `border-${getDifficultyColor(q.difficulty)}-200 text-${getDifficultyColor(q.difficulty)}-600`}`}>{q.difficulty}</span>
                     </div>
                     <p className={`text-sm font-bold line-clamp-2 ${session.currentQuestionId === q.id ? 'text-white' : 'text-slate-700'}`}>{q.text}</p>
                   </button>
                 ))}
               </div>
            </Card>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <Card className="border-t-4 border-t-slate-900" noPadding>
              <div className="bg-slate-50/50 p-6 grid grid-cols-4 gap-3 border-b border-slate-100">
                <ControlButton status={QuizStatus.PREVIEW} label="Preview" icon={Eye} variant="primary" desc="Sync View" />
                <ControlButton status={QuizStatus.LIVE} label="Engage" icon={Play} variant="success" desc="Start Timer" />
                <ControlButton status={QuizStatus.LOCKED} label="Lock" icon={LockIcon} variant="danger" desc="Freeze" />
                <button
                  onClick={() => performAction(API.revealAnswerAndProcessScores)} 
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 h-28 transition-all ${session.status === QuizStatus.REVEALED ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                >
                   <CheckCircle className={`w-6 h-6 mb-2 ${session.status === QuizStatus.REVEALED ? 'text-white' : 'text-slate-400'}`} />
                   <span className="font-black uppercase text-sm">Reveal</span>
                   <span className="text-[9px] font-bold uppercase mt-1">Results</span>
                </button>
              </div>

              <div className="p-8 min-h-[400px]">
                {currentQuestion ? (
                  <div className="space-y-8 animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-3">
                         <Badge color={getDifficultyColor(currentQuestion.difficulty)}>{currentQuestion.difficulty}</Badge>
                         <Badge color="slate">{currentQuestion.points} pts</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                         <Sparkles className="w-4 h-4" />
                         <span className="text-xs font-black uppercase tracking-widest">Active Hint: {currentQuestion.hint}</span>
                      </div>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 leading-tight">{currentQuestion.text}</h2>
                    <div className="grid gap-3">
                      {currentQuestion.options.map((opt, i) => (
                         <div key={i} className={`p-4 rounded-xl border-2 flex items-center gap-4 ${i === currentQuestion.correctAnswer ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${i === currentQuestion.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{String.fromCharCode(65+i)}</div>
                            <span className="font-bold text-lg">{opt}</span>
                            {i === currentQuestion.correctAnswer && <CheckCircle className="ml-auto w-5 h-5 text-emerald-500" />}
                         </div>
                      ))}
                    </div>
                  </div>
                ) : <div className="h-[300px] flex items-center justify-center text-slate-300 uppercase font-black tracking-widest">Ready Node Sequence</div>}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3 space-y-6">
             <Card className="h-[400px] flex flex-col" noPadding>
                <div className="p-5 border-b">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Live Telemetry</h3>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-3">
                   {session.submissions.map((s, i) => {
                      const team = session.teams.find(t => t.id === s.teamId);
                      return (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                           <div className="flex-grow">
                              <p className="text-xs font-black text-slate-900 uppercase">{team?.name}</p>
                              <p className="text-[9px] text-slate-400 uppercase">{s.type}</p>
                           </div>
                           <Badge color={s.isCorrect ? 'green' : 'red'}>{s.isCorrect ? 'HIT' : 'MISS'}</Badge>
                        </div>
                      );
                   })}
                </div>
             </Card>
             <Card noPadding>
                <div className="p-5 border-b">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Global Rank</h3>
                </div>
                <div className="p-4 space-y-2">
                   {session.teams.sort((a,b) => b.score - a.score).map((t, i) => (
                      <div key={i} className="flex justify-between items-center p-2 rounded-lg bg-slate-50">
                         <span className="text-sm font-bold text-slate-700 uppercase">{t.name}</span>
                         <span className="text-sm font-black text-slate-900">{t.score}</span>
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
