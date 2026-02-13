
import React from 'react';

interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
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
  const baseStyles = 'px-6 py-2.5 rounded-lg font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider';
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 shadow-md',
    secondary: 'bg-slate-200 text-slate-800 hover:bg-slate-300',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-6 ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = 'blue' }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[color]}`}>
      {children}
    </span>
  );
};

export const Timer: React.FC<{ seconds: number; max: number }> = ({ seconds, max }) => {
  const percentage = Math.max(0, (seconds / max) * 100);
  const colorClass = seconds < 5 ? 'bg-red-500' : seconds < 15 ? 'bg-amber-500' : 'bg-emerald-500';
  
  return (
    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
      <div 
        className={`h-full transition-all duration-1000 ${colorClass}`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
