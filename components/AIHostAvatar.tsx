
import React, { useEffect, useState } from 'react';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  commentary?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking, commentary, size = 'md' }) => {
  const [blink, setBlink] = useState(false);

  // Random blink logic
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-48 h-48',
    xl: 'w-[500px] h-[500px]'
  };

  const isLarge = size === 'xl' || size === 'lg';

  return (
    <div className={`relative flex items-center justify-center ${isLarge ? 'flex-col' : ''}`}>
      
      {/* Commentary Bubble */}
      {commentary && (
        <div className={`absolute z-50 ${isLarge ? 'bottom-[90%] mb-4 animate-in zoom-in slide-in-from-bottom' : 'left-full ml-4 w-64'} bg-slate-950/90 backdrop-blur-xl border border-indigo-500/30 p-6 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-w-lg text-center`}>
           <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Host Transmission</p>
           <p className="text-white text-xl md:text-2xl font-bold italic leading-tight">"{commentary}"</p>
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-4 h-4 bg-slate-950/90 rotate-45 border-r border-b border-indigo-500/30" />
        </div>
      )}

      {/* The Face Container */}
      <div className={`relative ${sizeClasses[size]} transition-all duration-500`}>
        
        {/* Holographic Glow Aura */}
        <div className={`absolute inset-0 bg-indigo-500/20 rounded-full blur-[60px] animate-pulse ${isSpeaking ? 'bg-indigo-400/30 scale-110' : ''}`} />

        {/* Main Head Shape (SVG) */}
        <svg viewBox="0 0 200 240" className="w-full h-full drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
          <defs>
             <linearGradient id="cyber-grad" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor="#818cf8" />
               <stop offset="100%" stopColor="#c084fc" />
             </linearGradient>
             <filter id="glow">
               <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
               <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
               </feMerge>
             </filter>
          </defs>

          {/* Skull/Helmet Structure */}
          <path 
            d="M 40 60 Q 100 -20 160 60 L 170 140 Q 180 200 100 230 Q 20 200 30 140 Z" 
            fill="none" 
            stroke="url(#cyber-grad)" 
            strokeWidth="2"
            className="opacity-50"
          />
          
          {/* Internal Circuitry Lines */}
          <path d="M 100 230 L 100 180" stroke="#6366f1" strokeWidth="1" opacity="0.4" />
          <path d="M 30 140 L 70 140" stroke="#6366f1" strokeWidth="1" opacity="0.4" />
          <path d="M 170 140 L 130 140" stroke="#6366f1" strokeWidth="1" opacity="0.4" />

          {/* Eyes Container */}
          <g transform="translate(0, 10)">
             {/* Left Eye */}
             <g transform="translate(65, 90)">
                <rect x="-15" y="-6" width="30" height="12" fill="#0f172a" stroke="#818cf8" strokeWidth="2" rx="2" />
                <rect 
                  x="-12" y="-4" width="24" height="8" 
                  fill="#22d3ee" 
                  filter="url(#glow)"
                  className={`${blink ? 'scale-y-0' : 'scale-y-100'} transition-transform duration-100 origin-center`} 
                />
             </g>

             {/* Right Eye */}
             <g transform="translate(135, 90)">
                <rect x="-15" y="-6" width="30" height="12" fill="#0f172a" stroke="#818cf8" strokeWidth="2" rx="2" />
                <rect 
                  x="-12" y="-4" width="24" height="8" 
                  fill="#22d3ee" 
                  filter="url(#glow)"
                  className={`${blink ? 'scale-y-0' : 'scale-y-100'} transition-transform duration-100 origin-center`} 
                />
             </g>
          </g>

          {/* Mouth Visualization */}
          <g transform="translate(100, 170)">
             {isSpeaking ? (
                // Speaking Waveform
                <g>
                  <rect x="-20" y="-2" width="4" height="12" rx="2" fill="#818cf8" className="animate-pulse [animation-delay:0s] origin-center" />
                  <rect x="-12" y="-5" width="4" height="18" rx="2" fill="#a78bfa" className="animate-pulse [animation-delay:0.1s] origin-center" />
                  <rect x="-4" y="-8" width="4" height="24" rx="2" fill="#c084fc" className="animate-pulse [animation-delay:0.2s] origin-center" />
                  <rect x="4" y="-5" width="4" height="18" rx="2" fill="#a78bfa" className="animate-pulse [animation-delay:0.1s] origin-center" />
                  <rect x="12" y="-2" width="4" height="12" rx="2" fill="#818cf8" className="animate-pulse [animation-delay:0s] origin-center" />
                </g>
             ) : (
                // Silent Line
                <rect x="-15" y="0" width="30" height="2" fill="#475569" />
             )}
          </g>

          {/* Cheek Accents */}
          <circle cx="45" cy="150" r="2" fill="#6366f1" className="animate-pulse" />
          <circle cx="155" cy="150" r="2" fill="#6366f1" className="animate-pulse" />

        </svg>

        {/* Orbitals for XL mode */}
        {isLarge && (
           <>
             <div className="absolute -inset-10 border border-indigo-500/20 rounded-full animate-spin [animation-duration:20s]" />
             <div className="absolute -inset-20 border border-cyan-500/10 rounded-full animate-spin [animation-duration:30s] [animation-direction:reverse]" />
           </>
        )}
      </div>
      
      {isLarge && (
        <div className="mt-8 text-center">
           <h2 className="text-3xl font-black italic tracking-tighter text-white">AURA <span className="text-indigo-400">HOST</span></h2>
           <div className="flex items-center justify-center gap-2 mt-2">
             <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
             <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{isSpeaking ? 'Transmitting Voice' : 'Listening'}</span>
           </div>
        </div>
      )}
    </div>
  );
};
