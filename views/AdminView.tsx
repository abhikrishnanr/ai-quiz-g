
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { Card, Button, Badge } from '../components/SharedUI';
import { 
  Settings, RefreshCcw, Zap, Layers, ChevronRight, 
  Forward, AlertTriangle, CheckCircle, BrainCircuit, 
  MessageSquare, Play, Lock as LockIcon, Eye, Star,
  Info
} from 'lucide-react';

const AdminView: React.FC = () => {
  const { session, loading, refresh } = useQuizSync();
  const [updating, setUpdating] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [confirmReset, setConfirmReset] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading || !session) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"/></div>;

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

  const triggerBodhiniCommentary = async () => {
    setUpdating(true);
    try {
      await refresh();
    } finally {
      setUpdating(false);
    }
  };

  const sortedSubmissions = [...session.submissions].sort((a, b) => a.timestamp - b.timestamp);

  const ControlButton = ({ 
    status, 
    label, 
    icon: Icon, 
    variant, 
    desc,
    disabled = false 
  }: { 
    status: QuizStatus, 
    label: string, 
    icon: any, 
    variant: 'primary' | 'success' | 'danger', 
    desc: string,
    disabled?: boolean
  }) => {
    const isActive = session.status === status;

    // Static mappings for styles to ensure Tailwind purge works correctly
    const styles = {
      primary: {
        active: 'bg-indigo-50 border-indigo-500 shadow-md transform scale-[1.02]',
        iconActive: 'text-indigo-600',
        ping: 'bg-indigo-400',
        dot: 'bg-indigo-500'
      },
      success: {
        active: 'bg-emerald-50 border-emerald-500 shadow-md transform scale-[1.02]',
        iconActive: 'text-emerald-600',
        ping: 'bg-emerald-400',
        dot: 'bg-emerald-500'
      },
      danger: {
        active: 'bg-red-50 border-red-500 shadow-md transform scale-[1.02]',
        iconActive: 'text-red-600',
        ping: 'bg-red-400',
        dot: 'bg-red-500'
      }
    };

    const variantStyle = styles[variant];

    return (
      <button
        onClick={() => performAction(() => API.updateSessionStatus(status))}
        disabled={disabled || updating}
        className={`relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 h-28 group ${
          isActive 
            ? variantStyle.active
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 opacity-100 disabled:opacity-50 disabled:cursor-not-allowed'
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
        
        {/* Header */}
        <header className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5 w-full lg:w-auto">
            <div className="bg-slate-900 p-3 rounded-2xl shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Quiz Architect</h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge color="slate">Node {session.id.substring(0,8)}</Badge>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Online</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full lg:w-auto justify-end">
             <Button 
              variant={confirmReset ? 'danger' : 'secondary'} 
              onClick={handleReset} 
              disabled={updating}
              className="w-full lg:w-auto"
             >
               {confirmReset ? <AlertTriangle className="w-4 h-4 mr-2" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
               {confirmReset ? 'Confirm?' : 'Reset'}
             </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Sequence Deck */}
          <div className="lg:col-span-3 space-y-4 h-fit">
            <Card className="max-h-[800px] flex flex-col" noPadding>
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                   <Layers className="w-4 h-4" /> Sequence Deck
                 </h3>
                 <span className="bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600">{MOCK_QUESTIONS.length}</span>
               </div>
               
               <div className="overflow-y-auto p-4 space-y-3 custom-scrollbar">
                 {MOCK_QUESTIONS.map((q) => (
                   <button 
                     key={q.id}
                     onClick={() => performAction(() => API.setCurrentQuestion(q.id))}
                     className={`w-full text-left p-4 rounded-xl border transition-all duration-200 group relative ${
                       session.currentQuestionId === q.id 
                         ? 'bg-slate-900 border-slate-900 shadow-lg' 
                         : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                     }`}
                   >
                     <div className="flex justify-between items-center mb-2">
                       <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                         session.currentQuestionId === q.id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
                       }`}>
                         {q.roundType}
                       </span>
                       {q.roundType === 'BUZZER' 
                         ? <Zap className={`w-3 h-3 ${session.currentQuestionId === q.id ? 'text-amber-400' : 'text-amber-500'}`} /> 
                         : <Layers className={`w-3 h-3 ${session.currentQuestionId === q.id ? 'text-indigo-400' : 'text-indigo-500'}`} />
                       }
                     </div>
                     <p className={`text-sm font-bold leading-snug line-clamp-2 ${session.currentQuestionId === q.id ? 'text-white' : 'text-slate-700'}`}>
                       {q.text}
                     </p>
                     <div className={`mt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest ${session.currentQuestionId === q.id ? 'text-slate-400' : 'text-slate-400'}`}>
                       <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {q.points}</span>
                       {session.currentQuestionId === q.id && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
                     </div>
                   </button>
                 ))}
               </div>
            </Card>

            <button 
               onClick={triggerBodhiniCommentary}
               className="w-full bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-white/10 group relative overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                  <BrainCircuit className="w-16 h-16" />
               </div>
               <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-white/10 rounded-lg">
                   <MessageSquare className="w-4 h-4 text-indigo-300" />
                 </div>
                 <span className="text-xs font-black uppercase tracking-widest text-indigo-200">Bodhini AI</span>
               </div>
               <p className="text-left text-sm font-bold leading-tight relative z-10">Trigger Contextual Commentary</p>
            </button>
          </div>

          {/* Center Column: Stage Control */}
          <div className="lg:col-span-6 space-y-6">
            <Card className="border-t-4 border-t-slate-900 overflow-hidden" noPadding>
              {/* Controls Grid */}
              <div className="bg-slate-50/50 p-6 grid grid-cols-2 md:grid-cols-4 gap-3 border-b border-slate-100">
                <ControlButton status={QuizStatus.PREVIEW} label="Preview" icon={Eye} variant="primary" desc="Sync Nodes" disabled={!session.currentQuestionId} />
                <ControlButton status={QuizStatus.LIVE} label="Engage" icon={Play} variant="success" desc="Open Inputs" disabled={!session.currentQuestionId} />
                <ControlButton status={QuizStatus.LOCKED} label="Lock" icon={LockIcon} variant="danger" desc="Halt Inputs" disabled={session.status !== QuizStatus.LIVE} />
                
                <button
                  onClick={() => performAction(API.revealAnswerAndProcessScores)} 
                  disabled={(session.status !== QuizStatus.LOCKED && session.status !== QuizStatus.LIVE) || updating}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 h-28 group ${
                    session.status === QuizStatus.REVEALED 
                      ? 'bg-indigo-600 border-indigo-600 shadow-md' 
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:bg-slate-50 opacity-100 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                   <CheckCircle className={`w-6 h-6 mb-2 ${session.status === QuizStatus.REVEALED ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                   <span className={`font-black uppercase text-sm ${session.status === QuizStatus.REVEALED ? 'text-white' : 'text-slate-600'}`}>Reveal</span>
                   <span className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${session.status === QuizStatus.REVEALED ? 'text-indigo-200' : 'text-slate-400'}`}>Show Result</span>
                </button>
              </div>

              {/* Question Display */}
              <div className="p-8 min-h-[400px] flex flex-col">
                {currentQuestion ? (
                  <div className="flex-grow space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <Badge color={currentQuestion.roundType === 'BUZZER' ? 'amber' : 'blue'}>{currentQuestion.roundType}</Badge>
                         <span className="text-slate-400 text-xs font-black uppercase tracking-wider">{currentQuestion.points} Credits</span>
                      </div>
                      
                      {currentQuestion.roundType === 'STANDARD' && session.status === QuizStatus.LIVE && (
                         <Button variant="secondary" onClick={() => performAction(API.forcePass)} disabled={updating} className="h-8 text-xs py-0">
                           <Forward className="w-3 h-3 mr-2" /> Force Pass
                         </Button>
                      )}
                    </div>

                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                      {currentQuestion.text}
                    </h2>
                    
                    <div className="grid gap-3">
                      {currentQuestion.options.map((opt, i) => {
                         const isCorrect = i === currentQuestion.correctAnswer;
                         return (
                           <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                             isCorrect 
                               ? 'bg-emerald-50 border-emerald-200 shadow-sm' 
                               : 'bg-white border-slate-100 opacity-60 grayscale-[0.5]'
                           }`}>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg ${
                                isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'
                              }`}>
                                {String.fromCharCode(65+i)}
                              </div>
                              <span className={`font-bold text-lg ${isCorrect ? 'text-emerald-900' : 'text-slate-700'}`}>{opt}</span>
                              {isCorrect && <CheckCircle className="ml-auto w-5 h-5 text-emerald-500" />}
                           </div>
                         );
                      })}
                    </div>
                  </div>
                ) : (
                   <div className="flex-grow flex flex-col items-center justify-center text-slate-300 space-y-4">
                      <Info className="w-16 h-16 opacity-20" />
                      <p className="font-black uppercase tracking-widest text-sm">Select a sequence to initiate</p>
                   </div>
                )}
              </div>
            </Card>

            {/* Active Turn Indicator (Standard Mode) */}
            {currentQuestion?.roundType === 'STANDARD' && session.activeTeamId && session.status === QuizStatus.LIVE && (
               <div className="bg-slate-900 text-white p-6 rounded-3xl flex items-center justify-between shadow-xl animate-in slide-in-from-bottom">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Current Turn</p>
                    <p className="text-2xl font-black uppercase tracking-tight">{session.teams.find(t => t.id === session.activeTeamId)?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Time Remaining</p>
                    <p className="text-4xl font-black text-amber-500 font-mono tabular-nums">
                      {Math.max(0, 30 - Math.floor((now - (session.turnStartTime || now)) / 1000))}s
                    </p>
                  </div>
               </div>
            )}
          </div>

          {/* Right Column: Live Feed & Rank */}
          <div className="lg:col-span-3 space-y-6">
             <Card className="flex flex-col h-[400px]" noPadding>
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> Live Feed
                  </h3>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar">
                   {sortedSubmissions.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-300 text-[10px] font-black uppercase tracking-widest">
                        Awaiting Telemetry...
                      </div>
                   ) : (
                      sortedSubmissions.map((s, i) => {
                         const team = session.teams.find(t => t.id === s.teamId);
                         return (
                           <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                              <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">
                                {i+1}
                              </div>
                              <div className="min-w-0 flex-grow">
                                 <p className="text-xs font-black text-slate-900 truncate uppercase">{team?.name}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase">{s.type}</p>
                              </div>
                              <Badge color={s.isCorrect ? 'green' : 'red'}>{s.isCorrect ? 'HIT' : 'MISS'}</Badge>
                           </div>
                         );
                      })
                   )}
                </div>
             </Card>

             <Card noPadding>
                <div className="p-5 border-b border-slate-100">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Cluster Rank</h3>
                </div>
                <div className="p-2">
                  {session.teams.sort((a,b) => b.score - a.score).map((t, i) => (
                     <div key={i} className={`flex items-center justify-between p-3 rounded-xl mb-1 ${i === 0 ? 'bg-amber-50 border border-amber-100' : ''}`}>
                        <div className="flex items-center gap-3">
                           <span className={`text-sm font-black ${i === 0 ? 'text-amber-600' : 'text-slate-400'}`}>0{i+1}</span>
                           <span className="text-sm font-bold text-slate-700 uppercase">{t.name}</span>
                        </div>
                        <span className={`text-sm font-black ${i === 0 ? 'text-amber-600' : 'text-slate-900'}`}>{t.score}</span>
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
