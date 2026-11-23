import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  fallbackTitle: string;
  className?: string;
}

export const ResilientImage: React.FC<ResilientImageProps> = ({
  src,
  alt,
  fallbackTitle,
  className = '',
}) => {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 border border-slate-200 text-slate-600 p-6 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <BookOpen className="w-8 h-8 text-blue-700 mb-2" aria-hidden="true" />
        <span className="text-sm font-medium text-slate-800">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
};
