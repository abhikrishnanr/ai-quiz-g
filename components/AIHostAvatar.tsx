
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
          <div className={`absolute ${isLarge ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-900/95 border-x-transparent border-t-8 border-x-8' : 'right-full top-1/2 -translate-y-1/2 border-r-slate-900/95 border-y-transparent border-r-8 border-y-8'}`} />
        </div>
      )}

      {/* THE ENTITY EYE - Complex 2D CSS Animation */}
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        
        {/* Layer 1: Inward Waves (The "Entity" Feel) */}
        {/* We use multiple rings scaling down to center */}
        {[...Array(3)].map((_, i) => (
          <div 
             key={`wave-${i}`}
             className="entity-wave" 
             style={{ 
               animationDelay: `${i * 1.5}s`,
               borderStyle: i % 2 === 0 ? 'solid' : 'dashed',
               borderColor: `rgba(99, 102, 241, ${0.4 - i * 0.1})`
             }} 
          />
        ))}

        {/* Layer 2: The Outer Iris Halo */}
        <div className="absolute inset-[10%] rounded-full border border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.4)] animate-[pulse_4s_infinite]" />
        
        {/* Layer 3: Rotating Data Rings (Counter-Rotating) */}
        <div className="absolute inset-[15%] rounded-full border border-dashed border-indigo-400/20 animate-[spin_20s_linear_infinite]" />
        <div className="absolute inset-[20%] rounded-full border border-dotted border-cyan-400/30 animate-[spin_15s_linear_infinite_reverse]" />

        {/* Layer 4: Electronic Nodes (Particles) */}
        <div className="absolute inset-0 animate-[spin_30s_linear_infinite]">
           {[...Array(8)].map((_, i) => (
             <div 
               key={i} 
               className="absolute w-1.5 h-1.5 bg-indigo-300 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
               style={{
                 top: '50%',
                 left: '50%',
                 transform: `rotate(${i * 45}deg) translateX(${size === 'xl' ? '120px' : '40px'})`
               }}
             />
           ))}
        </div>

        {/* Layer 5: The Core (Iris/Pupil) */}
        <div className={`relative w-[60%] h-[60%] rounded-full bg-slate-950 border border-indigo-500/50 flex items-center justify-center overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,1)] transition-transform duration-200 ${isSpeaking ? 'scale-105' : 'scale-100'}`}>
           
           {/* Internal Iris Grid */}
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)] z-10" />
           <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(79,70,229,0.2)_180deg,transparent_360deg)] animate-[spin_4s_linear_infinite]" />
           
           {/* The Pupil (Reactive) */}
           <div className={`relative z-20 w-[40%] h-[40%] rounded-full bg-indigo-100 shadow-[0_0_50px_rgba(99,102,241,1)] transition-all duration-150 ${isSpeaking ? 'scale-150 bg-white' : 'scale-100 bg-indigo-200'}`}>
              <div className="absolute inset-0 bg-indigo-600 rounded-full blur-md opacity-50 animate-pulse" />
           </div>

           {/* Scanning Line inside Pupil */}
           <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent h-[20%] w-full animate-[scan_1.5s_linear_infinite]" />
        </div>

      </div>

      <style>{`
        @keyframes scan {
          0% { top: -20%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 120%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};
