
import React, { useState, useEffect, useRef } from 'react';
import { useQuizSync } from '../hooks/useQuizSync';
import { API } from '../services/api';
import { SFX } from '../services/sfx';
import { QuizStatus } from '../types';
import { MOCK_QUESTIONS, HOST_SCRIPTS } from '../constants';
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

// FIX: Use native browser decoding for MP3 data instead of raw PCM parsing
async function decodeAudioData(data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> {
  // We need to pass an ArrayBuffer to decodeAudioData.
  // We slice it to ensure we have a clean buffer copy required by the API.
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  return await ctx.decodeAudioData(arrayBuffer);
}

const DisplayView: React.FC = () => {
  const { session, loading } = useQuizSync();
  const [turnTimeLeft, setTurnTimeLeft] = useState(30);
  const [commentary, setCommentary] = useState<string>("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [timerStartAt, setTimerStartAt] = useState<number | null>(null);
  
  // Refs
  const lastQuestionIdRef = useRef<string | null>(null);
  const lastSubmissionCountRef = useRef<number>(0);
  const lastStatusRef = useRef<QuizStatus | null>(null);
  const lastActiveTeamIdRef = useRef<string | null>(null);
  const hasPlayedWarningRef = useRef<boolean>(false);
  const teamsAudioCachedRef = useRef<Set<string>>(new Set());
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  // Local Memory Cache (syncs with Persistent cache in API)
  const audioCacheRef = useRef<Record<string, string>>({});

  const currentQuestion = MOCK_QUESTIONS.find(q => q.id === session?.currentQuestionId);
  const activeTeam = session?.teams.find(t => t.id === session.activeTeamId);

  const initAudio = () => {
    if (!audioContextRef.current) {
      // Remove fixed sampleRate to allow native hardware rate (better for MP3 decoding)
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    SFX.init();
    SFX.playIntro();
    setAudioInitialized(true);
    preloadGeneralClips();
  };

  const preloadGeneralClips = async () => {
    const clips = [
        { key: 'warning_10s', text: HOST_SCRIPTS.WARNING_10S },
        { key: 'generic_correct', text: HOST_SCRIPTS.GENERIC_CORRECT },
        { key: 'generic_wrong', text: HOST_SCRIPTS.GENERIC_WRONG },
    ];
    for (const clip of clips) {
        // API.getTTSAudio handles the queue and persistence now
        const audio = await API.getTTSAudio(clip.text);
        if (audio) audioCacheRef.current[clip.key] = audio;
    }
  };

  // --- Pre-Fetching --- //

  // 1. Teams
  useEffect(() => {
     if (!session?.teams) return;
     session.teams.forEach(async (team) => {
        if (!teamsAudioCachedRef.current.has(team.id)) {
            teamsAudioCachedRef.current.add(team.id);
            const lockAudio = await API.getTTSAudio(`Answer locked by ${team.name}.`);
            if (lockAudio) audioCacheRef.current[`locked_${team.id}`] = lockAudio;
            const passAudio = await API.getTTSAudio(`Passing to ${team.name}.`);
            if (passAudio) audioCacheRef.current[`pass_${team.id}`] = passAudio;
        }
     });
  }, [session?.teams]);

  // 2. Question Audio (Unique per ID)
  useEffect(() => {
    if (session?.status === QuizStatus.PREVIEW && currentQuestion) {
        const uniqueKey = `read_${currentQuestion.id}`;
        
        // Only fetch if we haven't already
        if (!audioCacheRef.current[uniqueKey]) {
            const prepareQuestionAudio = async () => {
                const startingTeam = session.teams.find(t => t.id === session.activeTeamId); 
                const textToRead = API.formatQuestionForSpeech(currentQuestion, startingTeam?.name);
                const audio = await API.getTTSAudio(textToRead);
                if (audio) audioCacheRef.current[uniqueKey] = audio;
            };
            prepareQuestionAudio();
        }
    }
  }, [session?.status, session?.currentQuestionId, currentQuestion, session?.teams]);

  // 3. Result Audio
  useEffect(() => {
    if (!session || !currentQuestion) return;
    const prepareResultAudio = async () => {
        const lastSub = session.submissions[session.submissions.length - 1];
        const uniqueKey = lastSub 
            ? `result_${lastSub.teamId}_${lastSub.timestamp}` 
            : `result_nosub_${currentQuestion.id}`;

        if (audioCacheRef.current[uniqueKey]) return;
        
        let context = "";
        let text = "";
        if (lastSub) {
            const team = session.teams.find(t => t.id === lastSub.teamId);
            const isCorrect = !!lastSub.isCorrect;
            context = `Team ${team?.name} was ${isCorrect ? 'Correct' : 'Incorrect'}. Answer: ${currentQuestion.options[currentQuestion.correctAnswer]}.`;
        } else {
             context = `No answer received. The correct answer is ${currentQuestion.options[currentQuestion.correctAnswer]}.`;
        }
        
        text = await API.getAIHostInsight(QuizStatus.REVEALED, currentQuestion.text, context);
        const audio = await API.getTTSAudio(text);
        if (audio) {
            audioCacheRef.current[uniqueKey] = audio;
            audioCacheRef.current[uniqueKey + '_text'] = text; 
        }
    };
    if (session.status === QuizStatus.LOCKED || session.status === QuizStatus.LIVE) {
        prepareResultAudio();
    }
  }, [session?.submissions, session?.status, currentQuestion]);

  // --- Playback --- //

  const playAudio = async (base64Data: string, text?: string, onEnd?: () => void) => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (activeSourceRef.current) {
      try { activeSourceRef.current.stop(); } catch(e) {}
    }
    
    // Clean SSML tags from text before displaying
    if (text) {
        const cleanText = text.replace(/<[^>]*>/g, '').trim();
        setCommentary(cleanText);
    }
    
    setIsSpeaking(true);

    try {
        const audioBuffer = await decodeAudioData(decodeBase64(base64Data), ctx);
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        activeSourceRef.current = source;
        source.onended = () => {
            setIsSpeaking(false);
            if (text) setTimeout(() => setCommentary(""), 2000);
            if (onEnd) onEnd();
        };
        source.start();
    } catch (e) {
        console.error("Audio playback error", e);
        setIsSpeaking(false);
        if (onEnd) onEnd();
    }
  };

  const playFromCache = (key: string, textOverride?: string, onEnd?: () => void) => {
     if (audioCacheRef.current[key]) {
         playAudio(audioCacheRef.current[key], textOverride, onEnd);
         return true;
     }
     return false;
  };

  // --- Event Handling --- //

  useEffect(() => {
    if (!session) return;

    // PREVIEW -> LIVE (Read Question)
    if (session.status === QuizStatus.LIVE && lastStatusRef.current !== QuizStatus.LIVE) {
       SFX.playIntro();
       hasPlayedWarningRef.current = false;
       
       const uniqueKey = `read_${currentQuestion?.id}`;
       
       if (!playFromCache(uniqueKey, undefined, () => {
           if (session.isReading) API.completeReading();
       })) {
           // Fallback
           const text = API.formatQuestionForSpeech(currentQuestion!, activeTeam?.name);
           API.getTTSAudio(text).then(audio => {
               if (audio) playAudio(audio, undefined, () => API.completeReading());
               else API.completeReading();
           });
       }
    }

    // Submission Locked
    if (session.submissions.length > lastSubmissionCountRef.current) {
       const newSub = session.submissions[session.submissions.length - 1];
       const team = session.teams.find(t => t.id === newSub.teamId);
       if (team) {
           SFX.playLock();
           const played = playFromCache(`locked_${team.id}`, `Locked by ${team.name}`);
           if (!played) {
               const cleanText = `Locked by ${team.name}`;
               setCommentary(cleanText);
               setTimeout(() => setCommentary(""), 2000);
           }
       }
    }

    // Passing
    if (session.status === QuizStatus.LIVE && session.activeTeamId !== lastActiveTeamIdRef.current && lastActiveTeamIdRef.current !== null) {
        if (activeTeam) playFromCache(`pass_${activeTeam.id}`, `Passing to ${activeTeam.name}`);
    }

    // Result Revealed
    if (session.status === QuizStatus.REVEALED && lastStatusRef.current !== QuizStatus.REVEALED) {
       const lastSub = session.submissions[session.submissions.length - 1];
       const isCorrect = lastSub ? !!lastSub.isCorrect : false;
       if (isCorrect) SFX.playCorrect(); else SFX.playWrong();

       const uniqueKey = lastSub 
            ? `result_${lastSub.teamId}_${lastSub.timestamp}` 
            : `result_nosub_${currentQuestion?.id}`;
       
       const specificText = audioCacheRef.current[uniqueKey + '_text'];
       
       if (audioCacheRef.current[uniqueKey]) {
            playFromCache(uniqueKey, specificText);
       } else {
           const genericKey = isCorrect ? 'generic_correct' : 'generic_wrong';
           const genericText = isCorrect ? HOST_SCRIPTS.GENERIC_CORRECT : HOST_SCRIPTS.GENERIC_WRONG;
           
           playFromCache(genericKey, genericText, async () => {
                let context = "No answer.";
                if (lastSub) {
                    const team = session.teams.find(t => t.id === lastSub.teamId);
                    context = `Team ${team?.name} was ${isCorrect ? 'Correct' : 'Incorrect'}. Answer: ${currentQuestion?.options[currentQuestion.correctAnswer]}.`;
                }
                const insight = await API.getAIHostInsight(QuizStatus.REVEALED, currentQuestion?.text, context);
                const audio = await API.getTTSAudio(insight);
                if (audio) setTimeout(() => playAudio(audio, insight), 300);
           });
       }
    }

    lastStatusRef.current = session.status;
    lastSubmissionCountRef.current = session.submissions.length;
    lastActiveTeamIdRef.current = session.activeTeamId;
    if (session.currentQuestionId !== lastQuestionIdRef.current) {
        lastQuestionIdRef.current = session.currentQuestionId;
        hasPlayedWarningRef.current = false;
    }

  }, [session?.status, session?.submissions.length, session?.activeTeamId, session?.id]);


  // --- Timer --- //
  useEffect(() => {
    if (session?.status === QuizStatus.LIVE && currentQuestion?.roundType === 'STANDARD') {
      if (session.isReading) {
          setTurnTimeLeft(30);
          return;
      }
      if (!timerStartAt) setTimerStartAt(session.turnStartTime || Date.now());
      
      const interval = setInterval(() => {
        const startTime = session.turnStartTime || timerStartAt || Date.now();
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const remaining = Math.max(0, 30 - elapsed);
        setTurnTimeLeft(remaining);
        if (remaining <= 5 && remaining > 0) SFX.playTimerTick();
        if (remaining === 10 && !hasPlayedWarningRef.current) {
            hasPlayedWarningRef.current = true;
            playFromCache('warning_10s');
        }
      }, 200);
      return () => clearInterval(interval);
    } else {
        if (session?.status !== QuizStatus.LIVE) setTimerStartAt(null);
    }
  }, [session?.status, currentQuestion, session?.isReading, session?.turnStartTime, timerStartAt]);

  if (loading || !session) return null;
  const isIdle = !session.currentQuestionId;
  const isPreview = session.status === QuizStatus.PREVIEW;
  const isQuestionVisible = session.status === QuizStatus.LIVE || session.status === QuizStatus.LOCKED || session.status === QuizStatus.REVEALED;
  const isResult = session.status === QuizStatus.REVEALED;

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
      <div className="absolute inset-0 pointer-events-none">
         <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-cyan-600/10 blur-[150px] rounded-full animate-pulse" />
         <div className="absolute inset-0 bg-[radial-gradient(transparent_0%,#020617_100%)]" />
      </div>

      <div className="relative z-10 w-full h-screen grid grid-cols-12 gap-8 p-8">
        <div className={`flex flex-col items-center justify-center transition-all duration-1000 ${
            isPreview || isIdle ? 'col-span-12 scale-150' : 'col-span-4 scale-100'
        }`}>
           <AIHostAvatar size="xl" isSpeaking={isSpeaking} commentary={commentary} />
           {isPreview && currentQuestion && (
               <div className="mt-12 text-center animate-in fade-in slide-in-from-bottom duration-1000">
                   <Badge color="indigo">INCOMING SEQUENCE</Badge>
                   <h2 className="text-5xl font-black text-white mt-4 tracking-tighter uppercase">{currentQuestion.roundType} ROUND</h2>
                   <p className="text-indigo-400 font-bold uppercase tracking-[0.3em] mt-2">Value: {currentQuestion.points} Credits</p>
                   {currentQuestion.roundType === 'STANDARD' && activeTeam && (
                        <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                           <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Active Team</p>
                           <p className="text-2xl font-black text-white uppercase">{activeTeam.name}</p>
                        </div>
                   )}
               </div>
           )}
        </div>

        {isQuestionVisible && (
          <div className="col-span-8 flex flex-col justify-center h-full animate-in slide-in-from-right duration-700 pl-8">
               <div className="space-y-8">
                  <div className="flex justify-between items-center">
                    <Badge color={currentQuestion?.roundType === 'BUZZER' ? 'amber' : 'blue'}>
                       {currentQuestion?.roundType} ROUND
                    </Badge>
                    <div className="text-right">
                       <p className="text-indigo-400 text-xs font-black uppercase tracking-widest">Value</p>
                       <p className="text-4xl font-black text-white italic tracking-tighter">{currentQuestion?.points} <span className="text-lg text-slate-500">CR</span></p>
                    </div>
                  </div>

                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-[3rem] shadow-2xl relative overflow-hidden group">
                     {session.isReading && currentQuestion?.roundType === 'BUZZER' && (
                         <div className="absolute inset-0 bg-amber-950/80 backdrop-blur-sm flex items-center justify-center z-30 animate-in fade-in">
                           <div className="text-center">
                              <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                                  <LockIcon className="w-8 h-8 text-amber-500" />
                              </div>
                              <h3 className="text-3xl font-black text-white uppercase italic tracking-widest">BODHINI IS SPEAKING</h3>
                              <p className="text-amber-200 mt-2 font-bold uppercase tracking-wider text-xs">Buzzers Locked</p>
                           </div>
                         </div>
                     )}

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

                  <div className="flex items-center justify-between">
                     {currentQuestion?.roundType === 'STANDARD' && (
                        <div className="flex items-center gap-4">
                           <div className="p-4 bg-slate-800 rounded-2xl border border-slate-700">
                              <Timer seconds={turnTimeLeft} max={30} />
                              <p className="text-center text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{session.isReading ? 'READING QUESTION...' : `${turnTimeLeft}s REMAINING`}</p>
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
