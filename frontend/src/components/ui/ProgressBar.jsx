import React from 'react';

const ProgressBar = ({ 
  current, 
  total, 
  label, 
  showValues = true,
  className = '' 
}) => {
  const percentage = Math.min(Math.round((current / total) * 100) || 0, 100);
  const isComplete = percentage >= 100;

  return (
    <div className={`w-full ${className}`}>
      {(label || showValues) && (
        <div className="flex justify-between items-center mb-1 text-sm font-medium">
          {label && <span className="text-slate-700">{label}</span>}
          {showValues && (
            <span className={isComplete ? 'text-green-600' : 'text-slate-500'}>
              {current} / {total}
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-primary'}`} 
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar;
