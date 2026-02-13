
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
      setTimeout(() => setBlink(false), 200);
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(blinkInterval);
  }, []);

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-48 h-48',
    xl: 'w-[400px] h-[400px] md:w-[500px] md:h-[500px]'
  };

  const isLarge = size === 'xl' || size === 'lg';

  return (
    <div className={`relative flex items-center justify-center ${isLarge ? 'flex-col' : ''}`}>
      
      {/* Commentary Bubble - Only show if provided */}
      {commentary && (
        <div className={`absolute z-50 ${isLarge ? 'bottom-[85%] mb-4 animate-in zoom-in slide-in-from-bottom' : 'left-full ml-4 w-64'} bg-slate-900/90 backdrop-blur-xl border border-indigo-500/40 p-6 rounded-[2rem] shadow-[0_10px_50px_rgba(0,0,0,0.6)] max-w-lg text-center`}>
           <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Host Transmission</p>
           <p className="text-white text-lg md:text-xl font-medium leading-relaxed font-sans">"{commentary}"</p>
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-4 h-4 bg-slate-900/90 rotate-45 border-r border-b border-indigo-500/40" />
        </div>
      )}

      {/* The Face Container */}
      <div className={`relative ${sizeClasses[size]} transition-all duration-500`}>
        
        {/* Holographic Glow Aura */}
        <div className={`absolute inset-0 bg-indigo-600/20 rounded-full blur-[80px] animate-pulse ${isSpeaking ? 'bg-indigo-500/30 scale-105' : ''}`} />

        {/* Main Head Shape (SVG) */}
        <svg viewBox="0 0 200 240" className="w-full h-full drop-shadow-[0_0_25px_rgba(99,102,241,0.6)]">
          <defs>
             <linearGradient id="cyber-face-grad" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
               <stop offset="100%" stopColor="#c084fc" stopOpacity="0.8" />
             </linearGradient>
             <filter id="eye-glow">
               <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
               <feMerge>
                 <feMergeNode in="coloredBlur"/>
                 <feMergeNode in="SourceGraphic"/>
               </feMerge>
             </filter>
          </defs>

          {/* Face Contour - Humanoid Shape */}
          <path 
            d="M 50 80 Q 100 20 150 80 L 155 140 Q 160 190 100 220 Q 40 190 45 140 Z" 
            fill="none" 
            stroke="url(#cyber-face-grad)" 
            strokeWidth="1.5"
            className="opacity-60"
          />

          {/* Hair / Headgear accents */}
          <path d="M 45 80 Q 100 40 155 80" stroke="#a5b4fc" strokeWidth="1" fill="none" opacity="0.4" />
          <path d="M 30 140 L 45 140" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
          <path d="M 170 140 L 155 140" stroke="#6366f1" strokeWidth="1" opacity="0.3" />

          {/* Eyes Container */}
          <g transform="translate(0, 10)">
             {/* Left Eye */}
             <g transform="translate(70, 100)">
                <path d="M -12 0 Q 0 -5 12 0 Q 0 5 -12 0 Z" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
                <circle 
                  cx="0" cy="0" r="3.5" 
                  fill="#22d3ee" 
                  filter="url(#eye-glow)"
                  className={`${blink ? 'scale-y-0' : 'scale-y-100'} transition-transform duration-150 origin-center`} 
                />
             </g>

             {/* Right Eye */}
             <g transform="translate(130, 100)">
                <path d="M -12 0 Q 0 -5 12 0 Q 0 5 -12 0 Z" fill="#1e1b4b" stroke="#818cf8" strokeWidth="1" />
                <circle 
                  cx="0" cy="0" r="3.5" 
                  fill="#22d3ee" 
                  filter="url(#eye-glow)"
                  className={`${blink ? 'scale-y-0' : 'scale-y-100'} transition-transform duration-150 origin-center`} 
                />
             </g>
             
             {/* Nose Bridge */}
             <path d="M 100 100 L 100 125" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
          </g>

          {/* Mouth / Lips */}
          <g transform="translate(100, 160)">
             {isSpeaking ? (
                // Speaking Lips Animation
                <g className="animate-pulse">
                  {/* Upper Lip */}
                  <path d="M -15 0 Q 0 -5 15 0" stroke="#a78bfa" strokeWidth="2" fill="none" />
                  {/* Lower Lip - Moving */}
                  <path 
                    d="M -10 2 Q 0 8 10 2" 
                    stroke="#a78bfa" strokeWidth="2" fill="none"
                    className="animate-bounce" 
                    style={{ animationDuration: '0.3s' }}
                  />
                  {/* Voice Waveform Activity behind lips */}
                  <rect x="-8" y="-2" width="16" height="6" fill="#818cf8" opacity="0.5" rx="2">
                     <animate attributeName="height" values="4;10;4" dur="0.2s" repeatCount="indefinite" />
                     <animate attributeName="y" values="-2;-5;-2" dur="0.2s" repeatCount="indefinite" />
                  </rect>
                </g>
             ) : (
                // Silent Lips
                <g>
                  <path d="M -12 0 Q 0 2 12 0" stroke="#818cf8" strokeWidth="2" fill="none" opacity="0.8" />
                  <path d="M -8 3 Q 0 5 8 3" stroke="#818cf8" strokeWidth="1" fill="none" opacity="0.5" />
                </g>
             )}
          </g>

          {/* Jawline Accents */}
          <path d="M 80 200 L 120 200" stroke="#6366f1" strokeWidth="1" opacity="0.4" />

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
        <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom duration-1000">
           <h2 className="text-3xl font-black italic tracking-tighter text-white">AURA <span className="text-indigo-400">HOST</span></h2>
           <div className="flex items-center justify-center gap-2 mt-2">
             <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
             <span className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{isSpeaking ? 'Voice Active' : 'System Listening'}</span>
           </div>
        </div>
      )}
    </div>
  );
};
