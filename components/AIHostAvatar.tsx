
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
      {/* THE ENTITY EYE */}
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        
        {/* SVG Tech Layer - Rotating Rings & Data Lines */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
           <defs>
             <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 0.5 }} />
               <stop offset="100%" style={{ stopColor: '#a855f7', stopOpacity: 0.1 }} />
             </linearGradient>
           </defs>
           
           {/* Outer Static Ring */}
           <circle cx="100" cy="100" r="98" fill="none" stroke="url(#grad1)" strokeWidth="0.5" opacity="0.3" />
           
           {/* Rotating Dash Ring 1 */}
           <g className="animate-[spin_20s_linear_infinite] origin-center">
             <circle cx="100" cy="100" r="85" fill="none" stroke="#818cf8" strokeWidth="1" strokeDasharray="20 40" opacity="0.4" />
           </g>

           {/* Rotating Dash Ring 2 (Reverse) */}
           <g className="animate-[spin_30s_linear_infinite_reverse] origin-center">
             <circle cx="100" cy="100" r="70" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 8" opacity="0.3" />
             <path d="M100 20 L100 10 M100 190 L100 180 M20 100 L10 100 M190 100 L180 100" stroke="#fff" strokeWidth="2" opacity="0.6" />
           </g>

           {/* Inner Tech Ring */}
           <g className="animate-[spin_10s_linear_infinite] origin-center">
              <circle cx="100" cy="100" r="50" fill="none" stroke="#6366f1" strokeWidth="0.5" strokeDasharray="50 50" opacity="0.5" />
           </g>
        </svg>

        {/* Dynamic Scanning Lines (Crosshair) */}
        <div className="absolute inset-0 flex items-center justify-center animate-[spin_60s_linear_infinite]">
            <div className="w-[140%] h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
            <div className="absolute w-[1px] h-[140%] bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent" />
        </div>

        {/* Floating Particles/Nodes around the core */}
        <div className="absolute inset-0 animate-[spin_40s_linear_infinite]">
           {[0, 60, 120, 180, 240, 300].map((deg, i) => (
             <div 
               key={i} 
               className="absolute w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"
               style={{
                 top: '50%',
                 left: '50%',
                 transform: `rotate(${deg}deg) translateX(${size === 'xl' ? '120px' : '60px'})`
               }}
             />
           ))}
        </div>
        
        {/* CORE ASSEMBLY */}
        <div className="relative flex items-center justify-center z-10">
           
           {/* Reactive Halo Bloom */}
           <div className={`absolute inset-0 rounded-full bg-indigo-500 blur-[40px] transition-all duration-100 ${isSpeaking ? 'opacity-60 scale-150' : 'opacity-20 scale-100'}`} />

           {/* The Core Shell */}
           <div className={`relative rounded-full bg-slate-950 border border-indigo-400/50 flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-200 ${isSpeaking ? 'w-32 h-32 md:w-48 md:h-48 border-white/40' : 'w-24 h-24 md:w-36 md:h-36 border-indigo-500/20'}`}>
              
              {/* Internal Spinning Grid */}
              <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(99,102,241,0.3)_180deg,transparent_360deg)] animate-[spin_3s_linear_infinite]" />
              
              {/* The Pupil (Expands/Contracts) */}
              <div className={`
                 rounded-full transition-all duration-75 ease-out flex items-center justify-center
                 ${isSpeaking 
                    ? 'w-[90%] h-[90%] bg-white shadow-[0_0_60px_rgba(255,255,255,0.9)] scale-100' 
                    : 'w-[40%] h-[40%] bg-indigo-600 shadow-[0_0_20px_rgba(99,102,241,0.8)] scale-100'
                 }
              `}>
                  {/* Inner detail when not speaking fully white */}
                  <div className={`w-[30%] h-[30%] bg-slate-950 rounded-full transition-all duration-100 ${isSpeaking ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`} />
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
