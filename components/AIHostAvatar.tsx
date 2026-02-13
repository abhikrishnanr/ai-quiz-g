
import React from 'react';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  commentary?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking, commentary, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-48 h-48'
  };

  return (
    <div className="relative flex items-center gap-6 animate-in fade-in slide-in-from-left duration-1000">
      {/* Speech Bubble - Only show if there's commentary and not on 'sm' size */}
      {commentary && size !== 'sm' && (
        <div className="absolute bottom-28 left-4 w-72 bg-slate-950/80 backdrop-blur-2xl p-6 rounded-[2.5rem] rounded-bl-none border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in zoom-in slide-in-from-bottom-4 duration-300 z-50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em]">Neural Uplink</span>
          </div>
          <p className="text-white text-lg font-bold leading-tight italic tracking-tight">
            "{commentary}"
          </p>
          <div className="absolute -bottom-4 left-0 w-8 h-4 bg-slate-950/80 [clip-path:polygon(0_0,100%_0,0_100%)]"></div>
        </div>
      )}

      {/* Holographic Neural Core */}
      <div className={`relative ${sizeClasses[size]} group`}>
        {/* Outer Orbital Ring 1 */}
        <div className={`absolute inset-0 border-[3px] border-indigo-500/20 rounded-full animate-spin [animation-duration:10s] ${isSpeaking ? 'border-indigo-400/40 scale-110' : ''}`}>
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_10px_#818cf8]" />
        </div>

        {/* Outer Orbital Ring 2 */}
        <div className={`absolute inset-2 border-[2px] border-cyan-500/10 rounded-full animate-spin [animation-duration:15s] [animation-direction:reverse] ${isSpeaking ? 'scale-105' : ''}`}>
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_10px_#22d3ee]" />
        </div>

        {/* Core Glow Layer */}
        <div className={`absolute inset-4 rounded-full transition-all duration-700 ${
          isSpeaking 
            ? 'bg-gradient-to-tr from-indigo-600 via-indigo-400 to-cyan-300 shadow-[0_0_60px_rgba(99,102,241,0.8)] scale-110' 
            : 'bg-indigo-900/40 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
        }`}>
          {/* Internal Geometric SVG */}
          <svg viewBox="0 0 100 100" className="w-full h-full p-4 opacity-80">
            <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="4 8" className="animate-spin [animation-duration:20s]" />
            <path 
              d="M30 50 Q 50 10 70 50 T 110 50" 
              fill="none" 
              stroke="white" 
              strokeWidth={isSpeaking ? "3" : "1"} 
              className={isSpeaking ? "animate-pulse" : "opacity-30"}
            />
            {isSpeaking && (
              <g className="animate-pulse">
                <circle cx="50" cy="50" r="15" fill="white" className="blur-[10px]" />
                <circle cx="50" cy="50" r="8" fill="white" />
              </g>
            )}
          </svg>
        </div>

        {/* Floating Data Motes */}
        {isSpeaking && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className="absolute w-1 h-1 bg-white rounded-full animate-ping"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 0.5}s`
                }}
              />
            ))}
          </div>
        )}
      </div>

      {size !== 'sm' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em] italic">Active Intelligence</span>
          </div>
          <span className="text-slate-950 text-3xl font-black tracking-tighter italic">AURA <span className="text-indigo-600">v3.1</span></span>
        </div>
      )}
    </div>
  );
};
