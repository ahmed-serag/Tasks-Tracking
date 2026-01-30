import React from 'react';

interface LoadingOverlayProps {
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "Saving..." }) => {
  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-white p-4 rounded-xl shadow-lg border border-primary-100 flex items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        <span className="text-gray-700 font-medium">{message}</span>
      </div>
    </div>
  );
};