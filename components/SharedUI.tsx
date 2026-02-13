
import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'amber';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

export const Button: React.FC<ButtonProps> = ({ 
  onClick, 
  children, 
  variant = 'primary', 
  disabled, 
  className = '',
  type = 'button'
}) => {
  const baseStyles = 'relative overflow-hidden px-6 py-3 rounded-xl font-bold transition-all duration-300 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest flex items-center justify-center';
  
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-[0_4px_14px_0_rgba(15,23,42,0.39)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.23)]',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm hover:shadow-md',
    danger: 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 shadow-[0_4px_14px_0_rgba(225,29,72,0.39)]',
    success: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-[0_4px_14px_0_rgba(16,185,129,0.39)]',
    amber: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-[0_4px_14px_0_rgba(245,158,11,0.39)]',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      <span className="relative z-10 flex items-center">{children}</span>
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string; noPadding?: boolean }> = ({ children, className = '', noPadding = false }) => (
  <div className={`bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 ${noPadding ? '' : 'p-6 md:p-8'} ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'blue' }) => {
  const colors: Record<string, string> = {
    blue: 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-indigo-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-100',
    red: 'bg-rose-50 text-rose-700 border-rose-200 shadow-rose-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 shadow-amber-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200 shadow-slate-100',
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${colors[color]}`}>
      {children}
    </span>
  );
};

export const Timer: React.FC<{ seconds: number; max: number }> = ({ seconds, max }) => {
  const percentage = Math.max(0, (seconds / max) * 100);
  // Color gradient interpolation logic could go here, but sticking to distinct steps for clarity
  const colorClass = seconds < 10 ? 'bg-rose-500' : seconds < 20 ? 'bg-amber-500' : 'bg-emerald-500';
  
  return (
    <div className="w-full h-4 bg-slate-100/50 rounded-full overflow-hidden border border-slate-200 backdrop-blur-sm shadow-inner">
      <div 
        className={`h-full transition-all duration-1000 ease-linear ${colorClass} shadow-[0_0_10px_rgba(0,0,0,0.2)] relative`} 
        style={{ width: `${percentage}%` }}
      >
        <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/50 animate-pulse" />
      </div>
    </div>
  );
};
