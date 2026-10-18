'use client';

import React from 'react';

export default function SparkleBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40 z-0">
      {/* Light Gold Sparkles */}
      <div className="absolute top-12 left-1/4 w-2 h-2 bg-amber-400/80 rounded-full animate-ping" />
      <div className="absolute top-48 right-1/3 w-2.5 h-2.5 bg-amber-300/90 rounded-full animate-pulse" />
      <div className="absolute top-96 left-1/6 w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
      
      {/* Light Rose Sparkles */}
      <div className="absolute top-28 right-1/4 w-2 h-2 bg-rose-400/70 rounded-full animate-pulse" />
      <div className="absolute top-72 left-1/3 w-2 h-2 bg-rose-300/80 rounded-full animate-ping" style={{ animationDuration: '2.5s' }} />
      <div className="absolute top-3/4 right-1/5 w-1.5 h-1.5 bg-rose-400/80 rounded-full animate-pulse" />
    </div>
  );
}