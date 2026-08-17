import React from 'react';
import Button from './Button';

const ConfirmationDialog = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  isDestructive = false,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
          <p className="text-slate-600 mb-6">{message}</p>
          <div className="flex justify-end gap-3">
            <Button 
              variant="outline" 
              onClick={onCancel}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button 
              variant={isDestructive ? 'primary' : 'primary'} 
              className={isDestructive ? 'bg-red-600 hover:bg-red-700 border-transparent text-white' : ''}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
