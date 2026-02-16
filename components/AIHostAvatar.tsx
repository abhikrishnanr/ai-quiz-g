import React from 'react';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  commentary?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking, commentary, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64 md:w-96 md:h-96'
  };

  const isLarge = size === 'xl' || size === 'lg';

  return (
    <div className={`relative flex items-center justify-center flex-col ${isLarge ? 'h-full w-full' : ''}`}>
      {/* Speech Bubble / Commentary */}
      {commentary && (
        <div className={`absolute z-50 ${isLarge ? 'bottom-[85%] mb-8 animate-in zoom-in' : 'left-full ml-6 w-64'} bg-slate-900/95 backdrop-blur-3xl border border-white/10 p-4 rounded-2xl shadow-2xl transition-all duration-300`}>
          <p className="text-xs font-bold text-indigo-300 leading-relaxed italic">
            "{commentary}"
          </p>
          {/* Tip of bubble */}
          <div className={`absolute ${isLarge ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-900/95 border-x-transparent border-t-8 border-x-8' : 'right-full top-1/2 -translate-y-1/2 border-r-slate-900/95 border-y-transparent border-r-8 border-y-8'}`} />
        </div>
      )}

      {/* 2D Neural Core Visualizer */}
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        {/* Exterior Glowing Rings */}
        <div className="absolute inset-0 rounded-full border border-indigo-500/20 neural-ring" style={{ animationDelay: '0s' }} />
        <div className="absolute inset-[-15%] rounded-full border border-indigo-400/10 neural-ring" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-[-30%] rounded-full border border-indigo-300/5 neural-ring" style={{ animationDelay: '2s' }} />

        {/* The Core */}
        <div className={`relative w-full h-full rounded-full bg-gradient-to-br from-indigo-600 to-violet-900 shadow-[0_0_60px_rgba(79,70,229,0.5)] overflow-hidden flex items-center justify-center p-2 transition-all duration-500 ${isSpeaking ? 'scale-110' : 'scale-100'}`}>
          {/* Rotating Grid Pattern */}
          <div className="absolute inset-0 opacity-20 neural-core-rotate" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '15px 15px' }} />
          
          {/* Inner Pulsating Eye */}
          <div className="w-3/4 h-3/4 rounded-full bg-slate-950/80 backdrop-blur-sm border border-white/20 flex items-center justify-center relative">
            {/* The "Pupil" - Reacts to speaking */}
            <div className={`w-1/2 h-1/2 rounded-full bg-indigo-400 shadow-[0_0_30px_rgba(129,140,248,0.8)] transition-all duration-300 ${isSpeaking ? 'scale-125 bg-white neural-speaking' : 'scale-100'}`} />
            
            {/* Data Scanning Line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-400/50 shadow-[0_0_10px_rgba(129,140,248,1)] animate-[scan_2s_infinite_linear]" style={{ animationName: 'scan' }} />
          </div>
        </div>

        {/* Orbiting Particle Dots (Pure CSS) */}
        {[...Array(6)].map((_, i) => (
          <div 
            key={i}
            className={`absolute w-2 h-2 bg-indigo-300 rounded-full blur-[1px] transition-opacity duration-500`}
            style={{
              top: '50%',
              left: '50%',
              transform: `rotate(${i * 60}deg) translateX(${size === 'xl' ? '180px' : '80px'})`,
              opacity: isSpeaking ? 1 : 0.2
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};