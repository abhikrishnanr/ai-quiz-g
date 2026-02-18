
import React from 'react';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  commentary?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-40 h-40',
    lg: 'w-64 h-64',
    xl: 'w-[28rem] h-[28rem]' 
  };

  const isLarge = size === 'xl' || size === 'lg';

  return (
    <div className={`relative flex items-center justify-center flex-col ${isLarge ? 'h-full w-full' : ''}`}>
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center pointer-events-none`}>
        
        {/* SVG Core Layer */}
        <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_30px_rgba(99,102,241,0.6)]" viewBox="0 0 200 200">
           <defs>
             <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" style={{ stopColor: '#818cf8', stopOpacity: 0.9 }} />
               <stop offset="100%" style={{ stopColor: '#c084fc', stopOpacity: 0.4 }} />
             </linearGradient>
             <filter id="glow">
                <feGaussianBlur stdDeviation="3.5" result="blur"/>
                <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
             </filter>
           </defs>
           
           {/* AMPLITUDE RING - The requested pulsing ring around the avatar */}
           <circle 
              cx="100" cy="100" r="98" 
              fill="none" 
              stroke="#6366f1" 
              strokeWidth={isSpeaking ? "5" : "1"} 
              opacity={isSpeaking ? "0.8" : "0.1"}
              className={`transition-all duration-150 ${isSpeaking ? 'neural-speaking' : ''}`}
              style={{ 
                strokeDasharray: isSpeaking ? "5 10" : "2 15",
                filter: isSpeaking ? 'url(#glow)' : 'none'
              }}
           />

           {/* Outer Gear Ring - THICKENED as requested */}
           <g className="animate-[spin_40s_linear_infinite] origin-center">
             <circle cx="100" cy="100" r="90" fill="none" stroke="url(#ringGrad)" strokeWidth="6" strokeDasharray="15 25" />
           </g>
           
           {/* Middle Rotating Ring - THICKENED */}
           <g className="animate-[spin_25s_linear_infinite_reverse] origin-center">
             <circle cx="100" cy="100" r="76" fill="none" stroke="#6366f1" strokeWidth="4" strokeDasharray="30 20" opacity="0.6" />
           </g>

           {/* Inner Fast Rotation Ring */}
           <g className="animate-[spin_12s_linear_infinite] origin-center">
              <circle cx="100" cy="100" r="60" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="10 10" opacity="0.4" />
           </g>

           {/* Central Stabilization Ring */}
           <circle 
              cx="100" cy="100" r="50" 
              fill="none" 
              stroke="#fff" 
              strokeWidth={isSpeaking ? "4" : "1"} 
              opacity={isSpeaking ? "1" : "0.3"} 
              className="transition-all duration-300"
              filter="url(#glow)"
           />
        </svg>

        {/* Central Core Element */}
        <div className="relative flex items-center justify-center z-10">
           {/* Bloom Light */}
           <div className={`absolute inset-0 rounded-full bg-indigo-500 blur-[80px] transition-all duration-300 ${isSpeaking ? 'opacity-70 scale-150' : 'opacity-10 scale-100'}`} />

           {/* Main Orb */}
           <div className={`
              relative rounded-full bg-slate-950 border transition-all duration-500 ease-out flex items-center justify-center overflow-hidden
              ${isSpeaking 
                 ? 'w-44 h-44 md:w-64 md:h-64 border-white shadow-[0_0_120px_rgba(255,255,255,0.4)]' 
                 : 'w-24 h-24 md:w-40 md:h-40 border-indigo-500/40 shadow-none'
              }
           `}>
              {/* Internal Scanning Glow */}
              <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(99,102,241,0.3)_180deg,transparent_360deg)] animate-[spin_2s_linear_infinite]" />
              
              {/* Central Pupil */}
              <div className={`
                 rounded-full transition-all duration-200 ease-in-out
                 ${isSpeaking 
                    ? 'w-[92%] h-[92%] bg-white shadow-[0_0_150px_rgba(255,255,255,1)]' 
                    : 'w-[18%] h-[18%] bg-indigo-400 shadow-[0_0_30px_rgba(99,102,241,1)]'
                 }
              `} />
           </div>
        </div>
      </div>
    </div>
  );
};
