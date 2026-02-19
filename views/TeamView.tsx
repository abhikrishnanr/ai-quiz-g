
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { QuizStatus, SubmissionType } from '../types';
import { Card, Button, Badge } from '../components/SharedUI';
import { 
  CheckCircle2, AlertCircle, Clock, Zap, LogOut, 
  Sparkles, MessageSquare, BrainCircuit, Waves, 
  Lock as LockIcon, Activity, HandMetal, Mic, Send, Eye,
  ArrowRight, Volume2, Keyboard, Eraser
} from 'lucide-react';

const TeamView: React.FC = () => {
  const { session, loading, refresh } = useQuizSync();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(localStorage.getItem('duk_team_id'));
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  
  const [askAiText, setAskAiText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const currentQuestion = session?.currentQuestion;
  const mySubmission = session?.submissions.find(s => s.teamId === selectedTeam);
  const myTeam = session?.teams.find(t => t.id === selectedTeam);
  const isMyTurn = session?.activeTeamId === selectedTeam;
  const isReading = session?.isReading;

  useEffect(() => {
    if (session?.status === QuizStatus.PREVIEW) {
      setSelectedAnswer(null);
      setAskAiText("");
      setTimeExpired(false);
    }
  }, [session?.currentQuestion?.id, session?.status]);

  useEffect(() => {
    if (session?.status === QuizStatus.LIVE && currentQuestion?.roundType === 'STANDARD' && isMyTurn && session.turnStartTime && !isReading) {
        const checkTimer = () => {
            const elapsed = (Date.now() - session.turnStartTime!) / 1000;
            if (elapsed > 30 && !timeExpired) setTimeExpired(true);
            else if (elapsed <= 30 && timeExpired) setTimeExpired(false);
        };
        const interval = setInterval(checkTimer, 500);
        return () => clearInterval(interval);
    }
  }, [session?.status, currentQuestion, isMyTurn, session?.turnStartTime, timeExpired, isReading]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAskAiText(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      
      recognitionRef.current = recognition;
    }
  }, []);

  if (loading || !session) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
       <div className="w-16 h-16 rounded-full border-[3px] border-slate-900 border-t-indigo-500 animate-spin" />
    </div>
  );

  if (!selectedTeam) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 relative overflow-hidden">
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full border-4 border-indigo-500/20 flex items-center justify-center mb-12 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                <BrainCircuit className="w-12 h-12 text-indigo-400" />
            </div>
            <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-12">Select Team</h1>
            <div className="w-full space-y-4">
              {session.teams.map(t => (
                <button 
                  key={t.id} 
                  onClick={() => { setSelectedTeam(t.id); localStorage.setItem('duk_team_id', t.id); }} 
                  className="w-full p-6 bg-white/5 border border-white/10 rounded-[2rem] text-white font-black uppercase text-xl hover:bg-white/10 hover:border-indigo-500/50 transition-all active:scale-95"
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
      await API.submitTeamAnswer(selectedTeam, session.currentQuestion!.id, selectedAnswer ?? undefined, type);
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
  
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
    } else {
        setAskAiText(""); // Clear on new listen
        recognitionRef.current.start();
        setIsListening(true);
    }
  };

  const submitAskAi = async () => {
      if (!askAiText.trim()) return;
      setIsSubmitting(true);
      try {
          await API.submitAskAiQuestion(askAiText);
          await refresh();
      } finally {
          setIsSubmitting(false);
      }
  };

  const renderContent = () => {
    if (!currentQuestion || session.status === QuizStatus.PREVIEW) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-12">
          <Clock className="w-24 h-24 text-indigo-400 animate-pulse" />
          <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Connected to Bodhini</h2>
          <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-[10px]">Awaiting system signal...</p>
        </div>
      );
    }

    if (currentQuestion.roundType === 'ASK_AI') {
        if (!isMyTurn) {
             return (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center animate-in zoom-in">
                    <div className="w-32 h-32 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mb-8">
                        <LockIcon className="w-12 h-12 text-slate-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">Active Team: {session.teams.find(t=>t.id===session.activeTeamId)?.name}</h2>
                    <p className="text-slate-400 mt-4 uppercase tracking-widest text-xs">Waiting for your challenge...</p>
                </div>
             );
        }

        if (session.askAiState === 'IDLE') {
             return (
                <div className="flex flex-col items-center justify-center h-[50vh] text-center animate-in zoom-in">
                    <BrainCircuit className="w-24 h-24 text-indigo-500 mb-8 animate-pulse" />
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">AI Challenge Ready</h2>
                    <p className="text-slate-400 mt-4 uppercase tracking-widest text-xs max-w-md mx-auto">Prepare your toughest question for Bodhini.</p>
                </div>
             );
        }

        if (session.askAiState === 'LISTENING') {
            return (
                <div className="flex flex-col items-center gap-10 max-w-2xl mx-auto animate-in slide-in-from-bottom">
                     <div className="text-center space-y-4">
                        <Badge color="amber">ASK AI CHALLENGE</Badge>
                        <h2 className="text-4xl font-black text-white uppercase">Speak to Bodhini</h2>
                     </div>
                     
                     {/* Interactive Mic Button */}
                     <div className="relative group">
                        <div className={`absolute inset-0 rounded-full blur-3xl transition-colors duration-500 ${isListening ? 'bg-rose-500/30' : 'bg-indigo-500/20'}`} />
                        <button 
                            onClick={toggleListening} 
                            className={`relative w-40 h-40 rounded-full flex items-center justify-center border-4 transition-all duration-300 shadow-2xl active:scale-90
                                ${isListening 
                                    ? 'bg-rose-600 border-rose-400 animate-pulse' 
                                    : 'bg-indigo-600 border-indigo-400 hover:bg-indigo-500'}`}
                        >
                            {isListening ? (
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-8 bg-white rounded-full animate-[mic-bar_0.5s_infinite_ease-in-out]" />
                                    <div className="w-2 h-12 bg-white rounded-full animate-[mic-bar_0.5s_infinite_ease-in-out_0.1s]" />
                                    <div className="w-2 h-8 bg-white rounded-full animate-[mic-bar_0.5s_infinite_ease-in-out_0.2s]" />
                                </div>
                            ) : (
                                <Mic className="w-16 h-16 text-white" />
                            )}
                        </button>
                     </div>

                     <div className="w-full space-y-4">
                        <div className="relative group">
                            <textarea
                                value={askAiText}
                                onChange={(e) => setAskAiText(e.target.value)}
                                placeholder={isListening ? "Listening..." : "Click mic to speak or type here..."}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-[2.5rem] p-10 h-44 text-2xl text-white font-medium resize-none focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
                            />
                            {askAiText && (
                                <button onClick={() => setAskAiText("")} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white">
                                    <Eraser className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Helper Text */}
                        <div className="flex items-center justify-center gap-2 text-slate-500 py-2 animate-in fade-in">
                            <Keyboard className="w-4 h-4" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">
                                Spotted a typo? You can edit the text manually before sending.
                            </p>
                        </div>
                     </div>

                     <Button 
                        variant="success" 
                        className="w-full h-24 text-2xl rounded-[3rem] shadow-[0_0_50px_rgba(16,185,129,0.3)]" 
                        onClick={submitAskAi} 
                        disabled={!askAiText.trim() || isSubmitting || isListening}
                     >
                        <Send className="w-8 h-8 mr-4" /> CHALLENGE BODHINI
                     </Button>
                </div>
            );
        }

        return (
             <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-8 animate-in zoom-in">
                 <div className="relative w-32 h-32">
                     <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full" />
                     <div className="absolute inset-0 border-t-4 border-indigo-500 rounded-full animate-spin" />
                     <BrainCircuit className="absolute inset-0 m-auto w-12 h-12 text-indigo-400" />
                 </div>
                 <h3 className="text-2xl font-black text-white uppercase">Bodhini is Researching...</h3>
                 <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 max-w-xl shadow-2xl">
                    <p className="text-indigo-100 text-xl italic font-medium">"{session.currentAskAiQuestion}"</p>
                 </div>
             </div>
        );
    }

    if (session.status === QuizStatus.LIVE || session.status === QuizStatus.LOCKED) {
      const isBuzzer = currentQuestion.roundType === 'BUZZER';
      const isVisual = currentQuestion.roundType === 'VISUAL';
      const canPlay = isBuzzer || isMyTurn;
      const isLocked = session.status === QuizStatus.LOCKED;
      const timeLock = timeExpired && currentQuestion.roundType === 'STANDARD';
      const inputLocked = isLocked || timeLock || isReading;

      return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in slide-in-from-bottom-8">
           <div className="lg:col-span-4 space-y-8">
              <div className={`p-10 rounded-[3rem] border-2 flex flex-col gap-6 shadow-2xl transition-all duration-700 ${
                isBuzzer ? 'bg-amber-600/10 border-amber-600' : isVisual ? 'bg-cyan-600/10 border-cyan-600' : 'bg-indigo-600/10 border-indigo-600'
              }`}>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">System Status</span>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-white uppercase tracking-tighter text-4xl">
                        {isBuzzer ? 'Buzzer' : isVisual ? 'Visual' : isMyTurn ? 'Your Turn' : 'Active'}
                    </span>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isBuzzer ? 'bg-amber-500' : isVisual ? 'bg-cyan-600' : 'bg-indigo-600'}`}>
                      {isBuzzer ? <Zap className="w-7 h-7 text-white" /> : isVisual ? <Eye className="w-7 h-7 text-white" /> : <Waves className="w-7 h-7 text-white" />}
                    </div>
                  </div>
              </div>

              {isMyTurn && !mySubmission && currentQuestion.roundType === 'STANDARD' && (
                <div className="bg-white/5 border border-white/10 rounded-[3rem] p-10 space-y-6">
                  <Button variant="primary" className="w-full h-20 rounded-3xl text-lg" disabled={session.requestedHint || session.hintVisible || isSubmitting || inputLocked} onClick={handleRequestHint}>
                    {session.hintVisible ? 'Hint Received' : session.requestedHint ? 'Awaiting Host' : 'Request Hint'}
                  </Button>
                </div>
              )}

              {session.hintVisible && (
                <div className="bg-indigo-600/10 border border-indigo-500/50 p-10 rounded-[3rem] backdrop-blur-3xl animate-in zoom-in border-l-[12px]">
                    <p className="text-2xl font-bold text-slate-100 italic">"{currentQuestion.hint}"</p>
                </div>
              )}
           </div>

           <div className="lg:col-span-8 space-y-8">
              <Card className="bg-slate-900/80 border-white/10 p-12 overflow-hidden relative group">
                 {isVisual && currentQuestion.visualUri && (
                    <img src={currentQuestion.visualUri} className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" alt="Asset" />
                 )}
                 <h2 className="text-4xl font-black text-white leading-tight tracking-tighter relative z-10">{currentQuestion.text}</h2>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                {(isLocked || timeLock) && !mySubmission && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-30 flex items-center justify-center rounded-[3rem] border border-white/5">
                        <div className="bg-slate-900 border border-rose-500/50 px-12 py-6 rounded-full flex items-center gap-6 shadow-2xl">
                          <LockIcon className="w-6 h-6 text-rose-500" />
                          <span className="text-sm font-black uppercase text-rose-500 tracking-[0.4em]">{timeLock ? "TIME EXPIRED" : "LOCKED"}</span>
                        </div>
                    </div>
                )}
                
                {isReading && !mySubmission && !isLocked && (
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-30 flex items-center justify-center rounded-[3rem] border border-indigo-500/30">
                        <div className="bg-indigo-900/40 border border-indigo-500/50 px-12 py-6 rounded-full flex items-center gap-6 shadow-[0_0_50px_rgba(79,70,229,0.5)]">
                          <Volume2 className="w-6 h-6 text-indigo-400 animate-pulse" />
                          <span className="text-sm font-black uppercase text-indigo-400 tracking-[0.4em]">BODHINI IS READING...</span>
                        </div>
                    </div>
                )}

                {currentQuestion.options.map((opt, i) => (
                  <button key={i} disabled={!!mySubmission || !canPlay || inputLocked} onClick={() => setSelectedAnswer(i)} className={`p-10 rounded-[3rem] border-2 text-left flex items-center transition-all duration-500 group active:scale-[0.98] ${selectedAnswer === i ? 'bg-white border-white text-slate-950 shadow-2xl' : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'}`}>
                    <span className={`w-14 h-14 rounded-2xl flex items-center justify-center mr-8 font-black text-2xl transition-colors ${selectedAnswer === i ? 'bg-slate-900 text-white' : 'bg-white/10 text-slate-500 group-hover:text-indigo-400'}`}>{String.fromCharCode(65+i)}</span>
                    <span className="text-2xl font-bold tracking-tight">{opt}</span>
                  </button>
                ))}
              </div>

              {!mySubmission && canPlay && !inputLocked && (
                  <div className="flex gap-4">
                        <button disabled={selectedAnswer === null || isSubmitting} onClick={() => handleSubmit('ANSWER')} className={`flex-1 py-12 text-white rounded-[4rem] text-4xl font-black uppercase tracking-tighter shadow-2xl transition-all duration-700 active:scale-95 ${selectedAnswer === null ? 'bg-slate-900/50 opacity-40' : isBuzzer ? 'bg-amber-600' : isVisual ? 'bg-cyan-600' : 'bg-indigo-600'}`}>
                        {isBuzzer ? 'BUZZ NOW' : 'SUBMIT RESPONSE'}
                        </button>
                        
                        {!isBuzzer && (
                            <button disabled={isSubmitting} onClick={() => handleSubmit('PASS')} className="w-40 bg-slate-800 text-slate-400 hover:bg-rose-900 hover:text-white rounded-[4rem] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-colors">
                                <ArrowRight className="w-6 h-6" /> PASS
                            </button>
                        )}
                  </div>
              )}

              {mySubmission && (
                 <div className="bg-white/5 p-16 rounded-[4rem] border border-white/10 text-center space-y-6 shadow-inner">
                    {mySubmission.type === 'PASS' ? (
                        <>
                             <ArrowRight className="w-16 h-16 text-slate-500 mx-auto" />
                             <h3 className="text-3xl font-black text-white uppercase italic tracking-widest">TURN PASSED</h3>
                        </>
                    ) : (
                        <>
                            <div className="relative w-20 h-20 mx-auto mb-8">
                                <CheckCircle2 className="w-full h-full text-emerald-500" />
                                <div className="absolute inset-0 w-full h-full border-2 border-emerald-500/30 rounded-full animate-ping" />
                            </div>
                            <h3 className="text-3xl font-black text-white uppercase italic tracking-widest">RESPONSE SECURED</h3>
                            <p className="text-slate-500 font-mono text-[10px] tracking-[0.5em] uppercase">Encrypted & Locked</p>
                        </>
                    )}
                 </div>
              )}
           </div>
        </div>
      );
    }

    if (session.status === QuizStatus.REVEALED) {
       const isCorrect = mySubmission?.isCorrect;
       const passed = mySubmission?.type === 'PASS';
       
       return (
         <div className="flex flex-col items-center justify-center h-[70vh] space-y-16 animate-in zoom-in max-w-5xl mx-auto">
            {!passed ? (
                <>
                    <div className={`w-48 h-48 rounded-full flex items-center justify-center border-8 transition-all duration-1000 ${isCorrect ? 'bg-emerald-600 border-emerald-400 shadow-[0_0_80px_rgba(16,185,129,0.5)]' : 'bg-rose-700 border-rose-500 shadow-[0_0_50px_rgba(225,29,72,0.4)]'}`}>
                        {isCorrect ? <CheckCircle2 className="w-28 h-28 text-white" /> : <AlertCircle className="w-28 h-28 text-white" />}
                    </div>
                    <div className="text-center space-y-4">
                        <h2 className={`text-9xl font-black uppercase italic tracking-tighter drop-shadow-2xl ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>{isCorrect ? 'CORRECT' : 'INCORRECT'}</h2>
                        <p className="text-slate-500 font-black uppercase tracking-[0.8em] text-xs">Response Verified</p>
                    </div>
                </>
            ) : (
                <div className="text-center">
                     <div className="w-40 h-40 rounded-full flex items-center justify-center border-4 bg-slate-700 border-slate-500 shadow-2xl mx-auto mb-10 opacity-60">
                        <ArrowRight className="w-24 h-24 text-slate-300" />
                     </div>
                     <h2 className="text-8xl font-black uppercase italic tracking-tighter text-slate-400">PASSED</h2>
                </div>
            )}
            
            <div className="bg-white/5 backdrop-blur-3xl p-12 rounded-[4rem] w-full flex justify-between items-center border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/5">
               <div>
                  <span className="text-slate-600 font-black uppercase tracking-[0.4em] text-[10px] block mb-4">Cumulative Score</span>
                  <span className="text-8xl font-black text-white italic tracking-tighter tabular-nums drop-shadow-md">{myTeam?.score} <span className="text-3xl font-normal text-slate-700 not-italic ml-2">POINTS</span></span>
               </div>
               <div className="w-24 h-24 rounded-[2rem] bg-indigo-600 flex items-center justify-center shadow-lg">
                    <Activity className="w-12 h-12 text-white" />
               </div>
            </div>
         </div>
       );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans w-full max-w-[1440px] mx-auto relative flex flex-col shadow-2xl overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(transparent_0%,#020617_100%)] pointer-events-none" />
      <header className="bg-slate-900/60 backdrop-blur-3xl p-10 flex justify-between items-center border-b border-white/10 sticky top-0 z-50">
         <div className="flex items-center gap-8">
            <div className="w-16 h-16 rounded-3xl border border-indigo-500/30 flex items-center justify-center bg-indigo-500/5 shadow-inner">
                <BrainCircuit className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase text-indigo-500 mb-2 tracking-[0.4em] animate-pulse">Connection Stable</p>
               <p className="text-3xl font-black text-white tracking-tighter">{myTeam?.name}</p>
            </div>
         </div>
         <button onClick={() => { localStorage.removeItem('duk_team_id'); setSelectedTeam(null); }} className="p-5 bg-white/5 rounded-[2rem] text-slate-500 hover:text-rose-500 transition-all border border-white/5 active:scale-90 group">
            <LogOut className="w-8 h-8 group-hover:scale-110 transition-transform" />
         </button>
      </header>
      <main className="flex-grow p-12 overflow-y-auto custom-scrollbar relative z-10">
         {renderContent()}
      </main>
      <footer className="bg-slate-900/80 backdrop-blur-3xl border-t border-white/10 p-10 flex items-center gap-8">
         <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
         </div>
         <p className="text-xs text-slate-500 uppercase font-black tracking-[0.3em]">Encrypted Data Uplink Active: Digital University Kerala</p>
      </footer>
    </div>
  );
};

export default TeamView;
