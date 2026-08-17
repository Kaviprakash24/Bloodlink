import React, { forwardRef } from 'react';

const Input = forwardRef(({ 
  label, 
  id, 
  error, 
  className = '', 
  ...props 
}, ref) => {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm transition-colors ${
          error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-300'
        }`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
