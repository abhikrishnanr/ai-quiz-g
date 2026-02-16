
import React from 'react';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  commentary?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking, commentary, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-40 h-40',
    lg: 'w-64 h-64',
    xl: 'w-[28rem] h-[28rem]' 
  };

  const isLarge = size === 'xl' || size === 'lg';

  return (
    <div className={`relative flex items-center justify-center flex-col ${isLarge ? 'h-full w-full' : ''}`}>
      {/* THE ENTITY EYE - Floating Interface */}
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center pointer-events-none`}>
        
        {/* SVG Core Layer - Rotating Technical Rings */}
        <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" viewBox="0 0 200 200">
           <defs>
             <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" style={{ stopColor: '#818cf8', stopOpacity: 0.8 }} />
               <stop offset="100%" style={{ stopColor: '#c084fc', stopOpacity: 0.2 }} />
             </linearGradient>
           </defs>
           
           {/* Radiating Background Lines */}
           <g opacity="0.15">
              {[...Array(12)].map((_, i) => (
                <line 
                  key={i}
                  x1="100" y1="100" 
                  x2={100 + Math.cos(i * (Math.PI/6)) * 95} 
                  y2={100 + Math.sin(i * (Math.PI/6)) * 95} 
                  stroke="#fff" 
                  strokeWidth="0.5"
                  className="animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
           </g>

           {/* Outer Rotating Gear Ring */}
           <g className="animate-[spin_43s_linear_infinite] origin-center">
             <circle cx="100" cy="100" r="92" fill="none" stroke="url(#ringGrad)" strokeWidth="0.5" strokeDasharray="1 15" />
           </g>
           
           {/* Middle Rotating Dash Ring */}
           <g className="animate-[spin_29s_linear_infinite_reverse] origin-center">
             <circle cx="100" cy="100" r="78" fill="none" stroke="#6366f1" strokeWidth="1" strokeDasharray="15 30" opacity="0.4" />
           </g>

           {/* Inner Fast Rotation Ring */}
           <g className="animate-[spin_11s_linear_infinite] origin-center">
              <circle cx="100" cy="100" r="55" fill="none" stroke="#fff" strokeWidth="0.5" strokeDasharray="2 10" opacity="0.6" />
           </g>

           {/* Central Pulse Ring */}
           <circle 
              cx="100" cy="100" r="48" 
              fill="none" 
              stroke="#fff" 
              strokeWidth={isSpeaking ? "2" : "0.5"} 
              opacity={isSpeaking ? "0.8" : "0.2"} 
              className="transition-all duration-300"
           />
        </svg>

        {/* Dynamic Scanning Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center animate-[spin_120s_linear_infinite]">
            <div className="w-[120%] h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute w-[1px] h-[120%] bg-gradient-to-b from-transparent via-white/10 to-transparent" />
        </div>

        {/* Floating Data Nodes */}
        <div className="absolute inset-0 animate-[spin_53s_linear_infinite]">
           {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => (
             <div 
               key={i} 
               className="absolute w-1 h-1 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
               style={{
                 top: '50%',
                 left: '50%',
                 transform: `rotate(${deg}deg) translateX(${size === 'xl' ? '135px' : '75px'})`
               }}
             />
           ))}
        </div>
        
        {/* REACTIVE CENTRAL CORE */}
        <div className="relative flex items-center justify-center z-10">
           
           {/* Audio Bloom (Glow Effect) */}
           <div className={`absolute inset-0 rounded-full bg-indigo-500 blur-[50px] transition-all duration-200 ${isSpeaking ? 'opacity-70 scale-150' : 'opacity-20 scale-100'}`} />

           {/* The Core Orb */}
           <div className={`
              relative rounded-full bg-slate-950 border transition-all duration-300 ease-out flex items-center justify-center overflow-hidden
              ${isSpeaking 
                 ? 'w-40 h-40 md:w-56 md:h-56 border-white/60 shadow-[0_0_80px_rgba(255,255,255,0.2)]' 
                 : 'w-24 h-24 md:w-36 md:h-36 border-indigo-500/30 shadow-none'
              }
           `}>
              {/* Internal Neural Weave */}
              <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.1)_180deg,transparent_360deg)] animate-[spin_2s_linear_infinite]" />
              
              {/* Main White Pupil (Pulses on speech) */}
              <div className={`
                 rounded-full transition-all duration-150 ease-in-out
                 ${isSpeaking 
                    ? 'w-[85%] h-[85%] bg-white shadow-[0_0_100px_rgba(255,255,255,1)]' 
                    : 'w-[15%] h-[15%] bg-indigo-400 shadow-[0_0_20px_rgba(99,102,241,1)]'
                 }
              `} />
           </div>
        </div>

      </div>
    </div>
  );
};
