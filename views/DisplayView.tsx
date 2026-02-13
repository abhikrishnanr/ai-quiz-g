
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { SFX } from '../services/sfx';
import { QuizStatus } from '../types';
import { MOCK_QUESTIONS } from '../constants';
import { Timer, Badge } from '../components/SharedUI';
import { Trophy, CheckCircle2, Lock as LockIcon, Power } from 'lucide-react';
import { AIHostAvatar } from '../components/AIHostAvatar';

// Audio decoding helpers
function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const buffer = ctx.createBuffer(1, dataInt16.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < dataInt16.length; i++) {
    channelData[i] = dataInt16[i] / 32768.0;
  }
  return buffer;
}

const DisplayView: React.FC = () => {
  const { session, loading } = useQuizSync();
  const [turnTimeLeft, setTurnTimeLeft] = useState(30);
  const [commentary, setCommentary] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [isReadingQuestion, setIsReadingQuestion] = useState(false);
  const [timerStartAt, setTimerStartAt] = useState<number | null>(null);
  
  // State tracking for event triggers
  const lastQuestionIdRef = useRef<string | null>(null);
  const lastSubmissionCountRef = useRef<number>(0);
  const lastStatusRef = useRef<QuizStatus | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Audio Caches
  const preloadedAudioRef = useRef<string | null>(null); // Question reading
  const preloadedResultAudioRef = useRef<{ id: string; audio: string; text: string } | null>(null); // Result commentary

  const currentQuestion = MOCK_QUESTIONS.find(q => q.id === session?.currentQuestionId);

  // Initialize Audio Context on user interaction
  const initAudio = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    SFX.init();
    SFX.playIntro();
    setAudioInitialized(true);
  };

  // 1. Pre-fetch Question Audio (PREVIEW Mode)
  useEffect(() => {
    if (session?.status === QuizStatus.PREVIEW && currentQuestion && session.currentQuestionId !== lastQuestionIdRef.current) {
        // Reset Result Cache on new question
        preloadedResultAudioRef.current = null;
        
        const fetchAudio = async () => {
            const textToRead = API.formatQuestionForSpeech(currentQuestion.text, currentQuestion.options);
            const audioData = await API.generateBodhiniAudio(textToRead);
            if (audioData) {
                preloadedAudioRef.current = audioData;
            }
        };
        fetchAudio();
    }
  }, [session?.status, session?.currentQuestionId, currentQuestion]);

  // 2. Pre-fetch Result Audio (LOCKED or Submissions Exist)
  useEffect(() => {
    if (!session || !currentQuestion) return;

    // We pre-calculate result audio as soon as we have a submission or lock
    // This ensures that when the admin hits "Reveal", the audio is already ready.
    const prepareResultAudio = async () => {
        const lastSub = session.submissions[session.submissions.length - 1];
        
        // Create a unique cache ID based on the submission state
        const cacheId = lastSub 
            ? `${lastSub.teamId}-${lastSub.timestamp}-${currentQuestion.id}` 
            : `no-subs-${currentQuestion.id}`;

        // If we already have this specific outcome cached, do nothing
        if (preloadedResultAudioRef.current?.id === cacheId) return;

        let context = "";
        if (lastSub) {
            const team = session.teams.find(t => t.id === lastSub.teamId);
            const isCorrect = !!lastSub.isCorrect;
            context = `Team ${team?.name} was ${isCorrect ? 'Correct' : 'Incorrect'}. Answer: ${currentQuestion.options[currentQuestion.correctAnswer]}.`;
        } else {
            context = `No answer received. The correct answer is ${currentQuestion.options[currentQuestion.correctAnswer]}.`;
        }

        // Trigger generation if we are Locked OR have submissions (anticipating reveal)
        if (session.submissions.length > 0 || session.status === QuizStatus.LOCKED) {
             try {
                const insight = await API.getAIHostInsight(QuizStatus.REVEALED, currentQuestion.text, context);
                const audio = await API.generateBodhiniAudio(insight);
                if (audio) {
                    preloadedResultAudioRef.current = { id: cacheId, audio, text: insight };
                }
             } catch (e) {
                 console.error("Failed to pre-fetch result audio", e);
             }
        }
    };
    
    if (session.status === QuizStatus.LOCKED || session.status === QuizStatus.LIVE) {
        prepareResultAudio();
    }

  }, [session?.submissions, session?.status, session?.currentQuestionId, currentQuestion]);


  // Timer Logic - Starts ONLY after reading is complete
  useEffect(() => {
    if (session?.status === QuizStatus.LIVE && currentQuestion?.roundType === 'STANDARD') {
      if (isReadingQuestion) {
          setTurnTimeLeft(30);
          return;
      }
      if (!timerStartAt) {
          setTimerStartAt(Date.now());
      }
      const interval = setInterval(() => {
        if (!timerStartAt) return;
        const elapsed = Math.floor((Date.now() - timerStartAt) / 1000);
        const remaining = Math.max(0, 30 - elapsed);
        setTurnTimeLeft(remaining);
        if (remaining <= 5 && remaining > 0) {
            SFX.playTimerTick();
        }
      }, 100);
      return () => clearInterval(interval);
    } else {
        if (session?.status !== QuizStatus.LIVE) {
            setTimerStartAt(null);
            setIsReadingQuestion(false);
        }
    }
  }, [session?.status, currentQuestion, isReadingQuestion, timerStartAt]);

  const playBodhiniSpeech = async (text: string, isCommentary: boolean = true, preloadedBase64?: string) => {
    if (!audioInitialized || !audioContextRef.current) return;
    const ctx = audioContextRef.current;
    
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch (e) {}
    }

    if (isCommentary) setCommentary(text);
    
    const audioBase64 = preloadedBase64 || await API.generateBodhiniAudio(text);
    
    if (audioBase64) {
      setIsSpeaking(true);
      const audioBuffer = await decodeAudioData(decodeBase64(audioBase64), ctx);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      activeSourceRef.current = source;
      
      source.onended = () => {
        setIsSpeaking(false);
        if (isCommentary) setTimeout(() => setCommentary(""), 2000);
        
        if (!isCommentary && isReadingQuestion) {
            setIsReadingQuestion(false);
        }
      };
      source.start();
    } else {
      setIsSpeaking(true);
      setTimeout(() => {
         setIsSpeaking(false);
         if (isCommentary) setCommentary("");
         if (!isCommentary && isReadingQuestion) setIsReadingQuestion(false);
      }, 3000);
    }
  };

  // --- Voice & SFX Event Triggers ---
  useEffect(() => {
    if (!session) return;

    // 1. PREVIEW Mode -> Reset states
    if (session.status === QuizStatus.PREVIEW && lastStatusRef.current !== QuizStatus.PREVIEW) {
        setCommentary("");
        setIsSpeaking(false);
        setIsReadingQuestion(false);
        setTimerStartAt(null);
    }

    // 2. LIVE Mode Detected -> Read Question
    if (session.status === QuizStatus.LIVE && lastStatusRef.current !== QuizStatus.LIVE) {
       if (session.currentQuestionId && currentQuestion) {
          SFX.playIntro();
          
          setIsReadingQuestion(true);
          const textToRead = API.formatQuestionForSpeech(currentQuestion.text, currentQuestion.options);
          
          // Use preloaded question audio
          const audio = preloadedAudioRef.current;
          preloadedAudioRef.current = null; // consume
          
          playBodhiniSpeech(textToRead, false, audio || undefined);
       }
    }

    // 3. New Submission -> "Locked"
    if (session.submissions.length > lastSubmissionCountRef.current) {
       const newSub = session.submissions[session.submissions.length - 1];
       const team = session.teams.find(t => t.id === newSub.teamId);
       
       if (team && currentQuestion?.roundType === 'STANDARD') {
          SFX.playLock();
          playBodhiniSpeech(`Locked.`, false);
       } else if (currentQuestion?.roundType === 'BUZZER') {
          SFX.playLock();
       }
       lastSubmissionCountRef.current = session.submissions.length;
    }

    // 4. Status Changed to REVEALED -> Result
    if (session.status === QuizStatus.REVEALED && lastStatusRef.current !== QuizStatus.REVEALED) {
       const processResult = async () => {
         const lastSub = session.submissions[session.submissions.length - 1];
         const isCorrect = lastSub ? !!lastSub.isCorrect : false;
         
         // Play SFX immediately
         if (isCorrect) SFX.playCorrect();
         else SFX.playWrong();

         // Use Preloaded Result Audio if available for Instant Playback
         // We construct the ID again to verify match
         const cacheId = lastSub 
            ? `${lastSub.teamId}-${lastSub.timestamp}-${currentQuestion?.id}` 
            : `no-subs-${currentQuestion?.id}`;

         if (preloadedResultAudioRef.current && preloadedResultAudioRef.current.id === cacheId) {
             // Instant playback from cache
             playBodhiniSpeech(preloadedResultAudioRef.current.text, true, preloadedResultAudioRef.current.audio);
         } else {
             // Fallback (cache miss)
             let context = "No answer.";
             if (lastSub) {
                const team = session.teams.find(t => t.id === lastSub.teamId);
                context = `Team ${team?.name} was ${isCorrect ? 'Correct' : 'Incorrect'}. Answer: ${currentQuestion?.options[currentQuestion.correctAnswer]}.`;
             }
             const insight = await API.getAIHostInsight(QuizStatus.REVEALED, currentQuestion?.text, context);
             playBodhiniSpeech(insight, true);
         }
       };
       processResult();
    }

    lastStatusRef.current = session.status;
    if (session.currentQuestionId !== lastQuestionIdRef.current) {
        lastQuestionIdRef.current = session.currentQuestionId;
        lastSubmissionCountRef.current = 0;
        preloadedAudioRef.current = null;
        preloadedResultAudioRef.current = null;
    }

  }, [session?.status, session?.currentQuestionId, session?.submissions.length, session?.id]);

  if (loading || !session) return null;

  const activeTeam = session.teams.find(t => t.id === session.activeTeamId);
  const isIdle = !session.currentQuestionId;
  const isPreview = session.status === QuizStatus.PREVIEW;
  const isQuestionVisible = session.status === QuizStatus.LIVE || session.status === QuizStatus.LOCKED || session.status === QuizStatus.REVEALED;
  const isResult = session.status === QuizStatus.REVEALED;

  // Initialization Screen
  if (!audioInitialized) {
      return (
          <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center cursor-pointer" onClick={initAudio}>
              <div className="relative group">
                  <div className="absolute -inset-10 bg-indigo-500/30 rounded-full blur-xl group-hover:bg-indigo-400/50 transition-all duration-500 animate-pulse" />
                  <div className="relative p-10 bg-slate-900 border border-indigo-500/50 rounded-full">
                      <Power className="w-16 h-16 text-indigo-400" />
                  </div>
              </div>
              <h1 className="mt-8 text-3xl font-black text-white uppercase tracking-[0.2em] animate-pulse">Initialize Display Node</h1>
              <p className="mt-2 text-slate-500 font-bold uppercase tracking-widest text-xs">Click to engage audio protocol</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex font-sans overflow-hidden selection:bg-indigo-500 selection:text-white relative">
      
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[150px] rounded-full animate-pulse" />
         <div className="absolute inset-0 bg-[radial-gradient(transparent_0%,#020617_100%)]" />
      </div>

      {/* Main Layout Grid */}
      <div className="relative z-10 w-full h-screen grid grid-cols-12 gap-8 p-8">
        
        {/* Left Column: AI Avatar */}
        {/* If in PREVIEW or IDLE, Avatar takes center stage */}
        <div className={`flex flex-col items-center justify-center transition-all duration-1000 ${
            isPreview || isIdle ? 'col-span-12 scale-150' : 'col-span-4 scale-100'
        }`}>
           <AIHostAvatar size="xl" isSpeaking={isSpeaking} commentary={commentary} />
           
           {isPreview && currentQuestion && (
               <div className="mt-12 text-center animate-in fade-in slide-in-from-bottom duration-1000">
                   <Badge color="indigo">INCOMING SEQUENCE</Badge>
                   <h2 className="text-5xl font-black text-white mt-4 tracking-tighter uppercase">{currentQuestion.roundType} ROUND</h2>
                   <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] mt-2">Value: {currentQuestion.points} Credits</p>
               </div>
           )}
        </div>

        {/* Right Column: Content Overlay (Only visible when engaged) */}
        {isQuestionVisible && (
          <div className="col-span-8 flex flex-col justify-center h-full animate-in slide-in-from-right duration-700 pl-8">
             
               <div className="space-y-8">
                  {/* Header Status */}
                  <div className="flex justify-between items-center">
                    <Badge color={currentQuestion?.roundType === 'BUZZER' ? 'amber' : 'blue'}>
                       {currentQuestion?.roundType} ROUND
                    </Badge>
                    <div className="text-right">
                       <p className="text-indigo-400 text-xs font-black uppercase tracking-widest">Value</p>
                       <p className="text-4xl font-black text-white italic tracking-tighter">{currentQuestion?.points} <span className="text-lg text-slate-500">CR</span></p>
                    </div>
                  </div>

                  {/* Question Card */}
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                     {session.status === QuizStatus.LOCKED && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20 animate-in fade-in">
                           <div className="text-center">
                              <LockIcon className="w-16 h-16 text-indigo-400 mx-auto mb-4 animate-bounce" />
                              <h3 className="text-4xl font-black text-white uppercase italic tracking-widest">LOCKED</h3>
                              {session.submissions.length > 0 && (
                                  <p className="text-slate-400 mt-2 font-bold uppercase tracking-wider">
                                      By {session.teams.find(t => t.id === session.submissions[session.submissions.length-1].teamId)?.name}
                                  </p>
                              )}
                           </div>
                        </div>
                     )}
                     
                     <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-8 drop-shadow-lg">
                        {currentQuestion?.text}
                     </h2>

                     <div className="grid grid-cols-1 gap-4">
                        {currentQuestion?.options.map((opt, i) => (
                           <div key={i} className={`flex items-center gap-6 p-4 rounded-2xl border transition-all ${
                               isResult && i === currentQuestion.correctAnswer 
                                ? 'bg-emerald-500/20 border-emerald-500' 
                                : isResult && i !== currentQuestion.correctAnswer
                                  ? 'opacity-30 border-white/5'
                                  : 'bg-white/5 border-white/5'
                           }`}>
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg transition-colors ${
                                  isResult && i === currentQuestion.correctAnswer ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'
                              }`}>
                                 {String.fromCharCode(65+i)}
                              </div>
                              <span className={`text-2xl font-bold ${
                                  isResult && i === currentQuestion.correctAnswer ? 'text-emerald-300' : 'text-slate-200'
                              }`}>{opt}</span>
                              {isResult && i === currentQuestion.correctAnswer && <CheckCircle2 className="w-8 h-8 text-emerald-500 ml-auto" />}
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Footer Info */}
                  <div className="flex items-center justify-between">
                     {currentQuestion?.roundType === 'STANDARD' && (
                        <div className="flex items-center gap-4">
                           <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                              <Timer seconds={turnTimeLeft} max={30} />
                              <p className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{isReadingQuestion ? 'READING QUESTION...' : `${turnTimeLeft}s REMAINING`}</p>
                           </div>
                           {activeTeam && (
                              <div className="text-left">
                                 <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Current Turn</p>
                                 <p className="text-2xl font-black text-white uppercase">{activeTeam.name}</p>
                              </div>
                           )}
                        </div>
                     )}
                     
                     {isResult && (
                        <div className="animate-in slide-in-from-bottom flex items-center gap-4 ml-auto">
                            <div className="text-right">
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Result</p>
                                <p className="text-3xl font-black text-white uppercase">{session.submissions[session.submissions.length-1]?.isCorrect ? 'SUCCESS' : 'FAILURE'}</p>
                            </div>
                            <div className={`p-4 rounded-full ${session.submissions[session.submissions.length-1]?.isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}>
                                <Trophy className="w-6 h-6 text-white" />
                            </div>
                        </div>
                     )}
                  </div>
               </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DisplayView;
