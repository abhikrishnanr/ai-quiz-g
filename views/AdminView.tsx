
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { Card, Button, Badge } from '../components/SharedUI';
import { 
  Settings, RefreshCcw, Zap, Layers, ChevronRight, 
  Forward, AlertTriangle, CheckCircle, BrainCircuit, 
  MessageSquare, Play, Lock as LockIcon, Eye, Trash2,
  HelpCircle, Info, Star
} from 'lucide-react';

const AdminView: React.FC = () => {
  const { session, loading, refresh } = useQuizSync();
  const [updating, setUpdating] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [confirmReset, setConfirmReset] = useState(false);
  // Fix: Use ReturnType<typeof setTimeout> to avoid NodeJS namespace error in browser environment
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading || !session) return null;

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

  const triggerAuraCommentary = async () => {
    setUpdating(true);
    try {
      await refresh();
    } finally {
      setUpdating(false);
    }
  };

  const sortedSubmissions = [...session.submissions].sort((a, b) => a.timestamp - b.timestamp);

  const StatusButton = ({ 
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
    variant: any, 
    desc: string,
    disabled?: boolean
  }) => {
    const isActive = session.status === status;
    return (
      <div className="flex flex-col gap-2 flex-1 group">
        <Button 
          variant={isActive ? variant : 'secondary'} 
          onClick={() => performAction(() => API.updateSessionStatus(status))} 
          disabled={disabled || updating}
          className={`flex-1 h-20 flex items-center justify-center gap-3 relative transition-all ${
            isActive ? 'ring-4 ring-offset-2' : 'hover:border-slate-400'
          }`}
        >
          <Icon className={`w-6 h-6 ${isActive ? 'animate-pulse' : ''}`} />
          <span className="text-lg font-black">{label}</span>
          {isActive && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-slate-900 shadow-md">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
          )}
        </Button>
        <div className="px-2">
           <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center group-hover:text-slate-900 transition-colors">
            {desc}
           </p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[95rem] mx-auto p-8 space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border-2 border-slate-300 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="bg-slate-950 p-4 rounded-2xl shadow-xl">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-950 tracking-tight uppercase italic">Quiz Architect</h1>
            <div className="flex items-center gap-3">
              <span className="text-slate-700 text-sm font-mono uppercase font-black tracking-widest">
                Node {session.id}
              </span>
              <div className="h-4 w-px bg-slate-200" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Sync Active</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-6 items-center">
          <Button 
            variant={confirmReset ? 'danger' : 'ghost'} 
            onClick={handleReset} 
            disabled={updating} 
            className={`font-black border-2 px-8 py-4 text-base transition-all duration-300 ${
              confirmReset ? 'border-red-600 scale-105 shadow-lg' : 'border-slate-300 hover:bg-slate-50 text-slate-950'
            }`}
          >
            {confirmReset ? <AlertTriangle className="w-5 h-5 mr-3 animate-bounce" /> : <RefreshCcw className="w-5 h-5 mr-3" />}
            {confirmReset ? 'CONFIRM RESET?' : 'Hard Reset'}
          </Button>
          <div className="h-12 w-px bg-slate-200" />
          <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest">System Entity</span>
             <Badge color="green">AURA ONLINE</Badge>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar: Sequence Deck */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.3em] flex items-center gap-2">
              <Layers className="w-4 h-4" /> Sequence Deck
            </h3>
            <span className="bg-slate-200 px-3 py-1 rounded-full text-slate-700 font-black text-[10px] uppercase">{MOCK_QUESTIONS.length} Units</span>
          </div>
          
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
            {MOCK_QUESTIONS.map((q) => (
              <button 
                key={q.id}
                onClick={() => performAction(() => API.setCurrentQuestion(q.id))}
                className={`w-full text-left p-6 rounded-[2rem] border-2 transition-all group relative overflow-hidden ${
                  session.currentQuestionId === q.id 
                    ? 'bg-slate-950 border-slate-950 shadow-2xl translate-x-2' 
                    : 'bg-white border-slate-300 hover:border-slate-500 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md ${
                    session.currentQuestionId === q.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {q.roundType} Mode
                  </span>
                  {q.roundType === 'BUZZER' ? <Zap className="w-5 h-5 text-amber-500" /> : <Layers className="w-5 h-5 text-indigo-500" />}
                </div>
                <p className={`text-xl font-black leading-tight line-clamp-2 ${session.currentQuestionId === q.id ? 'text-white' : 'text-slate-950'}`}>
                  {q.text}
                </p>
                <div className="mt-6 flex items-center justify-between">
                  <span className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ${session.currentQuestionId === q.id ? 'text-slate-400' : 'text-slate-600'}`}>
                    {/* Fix: Added missing Star icon from lucide-react */}
                    <Star className="w-3 h-3" /> {q.points} Credits
                  </span>
                  <ChevronRight className={`w-5 h-5 transition-transform ${session.currentQuestionId === q.id ? 'text-white translate-x-1' : 'text-slate-300 group-hover:translate-x-1'}`} />
                </div>
              </button>
            ))}
          </div>

          <Card className="bg-indigo-950 text-white border-none p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <BrainCircuit className="w-20 h-20" />
             </div>
             <div className="flex items-center gap-4 mb-6">
               <div className="p-3 bg-white/10 rounded-xl">
                 <MessageSquare className="w-6 h-6 text-indigo-400" />
               </div>
               <h4 className="text-sm font-black uppercase tracking-widest italic">Aura Insight Engine</h4>
             </div>
             <p className="text-xs text-indigo-200 mb-8 leading-relaxed font-medium italic">Trigger an autonomous commentary sequence to maintain event momentum.</p>
             <Button 
               variant="primary" 
               className="w-full bg-indigo-500 hover:bg-indigo-400 border-none py-5 text-white font-black text-base shadow-lg"
               onClick={triggerAuraCommentary}
             >
               Force Contextual Insight
             </Button>
          </Card>
        </div>

        {/* Main Control Center */}
        <div className="lg:col-span-6 space-y-10">
          <Card className="border-t-8 border-slate-950 p-0 overflow-hidden shadow-2xl border-2 border-slate-200 rounded-[3rem]">
            <div className="bg-slate-50 border-b-2 border-slate-200 p-10 flex gap-6">
               <StatusButton 
                  status={QuizStatus.PREVIEW} 
                  label="PREVIEW" 
                  icon={Eye} 
                  variant="primary"
                  desc="Sync question to nodes"
                  disabled={!session.currentQuestionId}
               />
               <StatusButton 
                  status={QuizStatus.LIVE} 
                  label="ENGAGE" 
                  icon={Play} 
                  variant="success"
                  desc="Activate user inputs"
                  disabled={!session.currentQuestionId}
               />
               <StatusButton 
                  status={QuizStatus.LOCKED} 
                  label="LOCK" 
                  icon={LockIcon} 
                  variant="danger"
                  desc="Disable telemetry"
                  disabled={session.status !== QuizStatus.LIVE}
               />
               <div className="flex flex-col gap-2 flex-1 group">
                 <Button 
                    variant={session.status === QuizStatus.REVEALED ? 'primary' : 'secondary'} 
                    onClick={() => performAction(API.revealAnswerAndProcessScores)} 
                    disabled={(session.status !== QuizStatus.LOCKED && session.status !== QuizStatus.LIVE) || updating}
                    className={`flex-1 h-20 flex items-center justify-center gap-3 transition-all ${
                      session.status === QuizStatus.REVEALED ? 'bg-indigo-700 ring-4 ring-offset-2' : ''
                    }`}
                 >
                   <CheckCircle className="w-6 h-6" />
                   <span className="text-lg font-black">REVEAL</span>
                 </Button>
                 <div className="px-2">
                   <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center group-hover:text-slate-900 transition-colors">
                     Calculate Delta
                   </p>
                 </div>
               </div>
            </div>

            <div className="p-12">
              {currentQuestion ? (
                <div className="space-y-10">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className={`p-4 rounded-2xl ${currentQuestion.roundType === 'BUZZER' ? 'bg-amber-100' : 'bg-indigo-100'}`}>
                         {currentQuestion.roundType === 'BUZZER' ? <Zap className="w-6 h-6 text-amber-600" /> : <Layers className="w-6 h-6 text-indigo-600" />}
                      </div>
                      <div>
                        <Badge color={currentQuestion.roundType === 'BUZZER' ? 'amber' : 'blue'}>{currentQuestion.roundType} PROTOCOL</Badge>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">{currentQuestion.points} Points in Cluster Pool</p>
                      </div>
                    </div>
                    {currentQuestion.roundType === 'STANDARD' && session.status === QuizStatus.LIVE && (
                       <Button 
                         variant="secondary" 
                         onClick={() => performAction(API.forcePass)} 
                         disabled={updating} 
                         className="bg-white text-slate-950 hover:bg-slate-50 border-2 border-slate-900 px-6 py-3 rounded-2xl shadow-md flex items-center gap-3 font-black"
                       >
                         <Forward className="w-5 h-5 text-indigo-600" /> PASS TURN
                       </Button>
                    )}
                  </div>

                  <h2 className="text-5xl font-black text-slate-950 leading-tight tracking-tight italic">
                    {currentQuestion.text}
                  </h2>
                  
                  <div className="grid grid-cols-1 gap-6">
                    {currentQuestion.options.map((opt, i) => {
                      const isCorrect = i === currentQuestion.correctAnswer;
                      return (
                        <div key={i} className={`p-8 rounded-[2rem] border-2 flex items-center gap-8 transition-all duration-300 ${
                          isCorrect 
                            ? 'bg-emerald-50 border-emerald-600 shadow-lg scale-[1.01]' 
                            : 'bg-white border-slate-200'
                        }`}>
                          <span className={`w-16 h-16 rounded-[1.2rem] flex items-center justify-center font-black text-3xl shadow-xl ${
                            isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-white'
                          }`}>
                            {String.fromCharCode(65+i)}
                          </span> 
                          <span className={`font-black text-2xl tracking-tight ${isCorrect ? 'text-emerald-950' : 'text-slate-950'}`}>
                            {opt}
                          </span>
                          {isCorrect && (
                            <div className="ml-auto bg-emerald-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                              Target Match
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-48 text-center space-y-8 animate-pulse">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                    <Info className="w-12 h-12 text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">System Idle</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-2">Selection required to begin uplink</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {currentQuestion?.roundType === 'STANDARD' && session.activeTeamId && session.status === QuizStatus.LIVE && (
            <Card className="bg-indigo-950 text-white p-10 rounded-[3rem] shadow-2xl border-b-[12px] border-indigo-900 animate-in slide-in-from-bottom duration-500">
              <div className="flex justify-between items-center">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                    <h4 className="text-[11px] font-black text-indigo-300 uppercase tracking-[0.4em] italic">Active possession</h4>
                  </div>
                  <p className="text-5xl font-black uppercase italic text-white tracking-tighter">
                    {session.teams.find(t => t.id === session.activeTeamId)?.name}
                  </p>
                </div>
                <div className="text-right space-y-4">
                   <p className="text-[11px] font-black text-indigo-300 uppercase tracking-[0.4em] italic">Shot Clock</p>
                   <div className="text-8xl font-display font-black text-amber-400 tabular-nums drop-shadow-2xl">
                     {Math.max(0, 30 - Math.floor((now - (session.turnStartTime || now)) / 1000))}s
                   </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar: Status & Standings */}
        <div className="lg:col-span-3 space-y-10">
          <Card className="bg-slate-950 text-white rounded-[2.5rem] p-10 border-none shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
            <h3 className="text-[12px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-8 italic flex items-center gap-3">
               <Zap className="w-4 h-4" /> Live Buffer Feed
            </h3>
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
              {sortedSubmissions.length === 0 ? (
                <div className="py-24 text-center space-y-4">
                  <HelpCircle className="w-12 h-12 text-slate-800 mx-auto" />
                  <p className="text-slate-600 font-black uppercase text-[10px] tracking-widest italic">Waiting for telemetry...</p>
                </div>
              ) : (
                sortedSubmissions.map((s, i) => {
                  const team = session.teams.find(t => t.id === s.teamId);
                  return (
                    <div key={i} className="p-6 rounded-[1.8rem] flex items-center gap-5 border bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black bg-slate-900 text-indigo-400 border border-white/10">
                        {i + 1}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-lg font-black truncate text-white uppercase italic tracking-tight">{team?.name}</p>
                        <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">{s.type} RECV</p>
                      </div>
                      <Badge color={s.isCorrect ? 'green' : 'red'}>{s.isCorrect ? 'VALID' : '-50'}</Badge>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="border-2 border-slate-300 bg-white rounded-[2.5rem] p-10 shadow-xl">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mb-10 italic flex items-center gap-3">
               <Trophy className="w-4 h-4 text-amber-500" /> Cluster Rank
            </h3>
            <div className="space-y-6">
              {session.teams.sort((a,b) => b.score - a.score).map((t, i) => (
                <div key={i} className={`flex justify-between items-center p-6 rounded-[2rem] transition-all duration-300 ${
                  i === 0 ? 'bg-slate-950 text-white shadow-xl scale-[1.03]' : 'bg-slate-50 border border-slate-200'
                }`}>
                  <div className="flex items-center gap-5">
                    <span className={`text-xl font-black italic ${i === 0 ? 'text-indigo-400' : 'text-slate-400'}`}>
                      {i + 1 < 10 ? `0${i + 1}` : i + 1}
                    </span>
                    <span className="font-black text-xl uppercase tracking-tighter italic">{t.name}</span>
                  </div>
                  <span className={`font-display font-black text-2xl italic ${i === 0 ? 'text-amber-400' : 'text-slate-950'}`}>
                    {t.score}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-10 pt-6 border-t-2 border-slate-100 flex items-center justify-center gap-3">
               <Info className="w-4 h-4 text-slate-400" />
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Auto-Sync Frequency: 1.5s</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Trophy = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
  </svg>
);

export default AdminView;
