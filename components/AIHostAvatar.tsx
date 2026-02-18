
import React from 'react';

interface AIHostAvatarProps {
  isSpeaking?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const AIHostAvatar: React.FC<AIHostAvatarProps> = ({ isSpeaking, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-40 h-40',
    lg: 'w-64 h-64',
    xl: 'w-[32rem] h-[32rem]' 
  };

  const isLarge = size === 'xl' || size === 'lg';
  const numBars = 48; // Number of amplitude bars

  return (
    <div className={`relative flex items-center justify-center flex-col ${isLarge ? 'h-full w-full' : ''}`}>
      {/* CSS for the amplitude bars animation */}
      <style>
        {`
          @keyframes audio-bar-pulse {
            0% { transform: scaleY(1); opacity: 0.3; }
            50% { transform: scaleY(2.5); opacity: 1; }
            100% { transform: scaleY(1); opacity: 0.3; }
          }
          .amplitude-bar {
            transform-box: fill-box;
            transform-origin: bottom;
          }
        `}
      </style>

      <div className={`relative ${sizeClasses[size]} flex items-center justify-center pointer-events-none`}>
        
        {/* SVG Layer for Rings and Visualizer */}
        <svg className="absolute inset-0 w-full h-full drop-shadow-[0_0_40px_rgba(99,102,241,0.4)]" viewBox="0 0 200 200">
           <defs>
             <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
               <stop offset="0%" style={{ stopColor: '#94a3b8', stopOpacity: 1 }} />
               <stop offset="100%" style={{ stopColor: '#475569', stopOpacity: 1 }} />
             </linearGradient>
             <filter id="core-glow">
                <feGaussianBlur stdDeviation="8" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
             </filter>
           </defs>
           
           {/* 1. OUTER COMPLEX RINGS (Thickened) */}
           <g className="animate-[spin_60s_linear_infinite] origin-center opacity-40">
              <circle cx="100" cy="100" r="95" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="100" cy="100" r="88" fill="none" stroke="#475569" strokeWidth="4" strokeDasharray="20 40" />
           </g>

           <g className="animate-[spin_40s_linear_infinite_reverse] origin-center opacity-60">
              <path d="M 100 10 A 90 90 0 0 1 190 100" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
              <path d="M 100 190 A 90 90 0 0 1 10 100" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" />
           </g>

           {/* 2. RADIAL AMPLITUDE VISUALIZER RING */}
           {/* Rotating container to make the whole visualizer spin slowly */}
           <g className="animate-[spin_20s_linear_infinite] origin-center">
             {Array.from({ length: numBars }).map((_, i) => {
               // Calculate random delays for "organic" look if speaking
               const randomDelay = Math.random() * 0.5;
               const angle = (360 / numBars) * i;
               
               return (
                 <rect
                   key={i}
                   x="98.5" // width 3, centered at 100
                   y="35"   // distance from center (radius approx 65)
                   width="3"
                   height="12" // base length
                   fill={isSpeaking ? "#a5b4fc" : "#334155"}
                   transform={`rotate(${angle} 100 100)`}
                   className={`amplitude-bar transition-colors duration-300`}
                   style={{
                     animation: isSpeaking ? `audio-bar-pulse 0.4s ease-in-out infinite` : 'none',
                     animationDelay: `-${randomDelay}s` // negative delay to start immediately at different phases
                   }}
                 />
               );
             })}
           </g>

           {/* 3. INNER FRAMING RING */}
           <circle cx="100" cy="100" r="45" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.2" />
           
        </svg>

        {/* CENTRAL CORE - PURE ENERGY NODE */}
        <div className="relative z-10 flex items-center justify-center">
            {/* The Glow Halo */}
            <div className={`absolute inset-0 bg-white rounded-full blur-[40px] transition-all duration-100 ease-out ${isSpeaking ? 'opacity-80 scale-150' : 'opacity-20 scale-100'}`} />
            
            {/* The Solid Core */}
            <div className={`
                relative rounded-full bg-white shadow-[0_0_60px_rgba(255,255,255,0.8)]
                transition-all duration-150 ease-in-out
                ${isSpeaking ? 'w-24 h-24 md:w-32 md:h-32 scale-110' : 'w-16 h-16 md:w-20 md:h-20 scale-100'}
            `}>
                {/* Inner turbulence effect (optional, subtle gray) */}
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.1)_100%)]" />
            </div>
        </div>

      </div>
    </div>
  );
};
