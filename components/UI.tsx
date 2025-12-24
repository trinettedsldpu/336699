import React, { useRef } from 'react';
import { AppMode } from '../types';

interface UIProps {
  statusText: string;
  onUpload: (files: File[]) => void;
  currentMode: AppMode;
}

const UI: React.FC<UIProps> = ({ statusText, onUpload, currentMode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(Array.from(e.target.files));
      // Reset value so same file can be selected again if needed
      e.target.value = '';
    }
  };

  return (
    <>
      <div className="absolute top-[env(safe-area-inset-top,20px)] w-full flex flex-col items-center z-10 pointer-events-none p-4">
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="pointer-events-auto mb-3 px-7 py-2.5 font-cinzel text-sm font-bold tracking-widest text-gold bg-black/30 border border-gold/30 rounded backdrop-blur-sm transition-all hover:bg-black/50 hover:border-gold active:scale-95"
        >
          写真
        </button>
        
        <h1 className="relative m-0 px-4 text-center text-2xl md:text-4xl lg:text-5xl font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-b from-white via-gold-light to-gold-dark drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] leading-snug">
          哥 姐 西西 睿睿 <br className="md:hidden"/> 圣诞快乐！
        </h1>
        
        <div className="mt-4 text-[10px] md:text-xs text-gold uppercase tracking-[2px] opacity-60">
          {statusText}
        </div>
      </div>

      {/* Hidden Inputs */}
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        multiple 
        className="hidden" 
        onChange={handleFileChange}
      />
      
      {/* Gesture Input Video - Must be rendered (not display:none) for stream to work in some browsers */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '1px', opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <video id="webcam-video" autoPlay playsInline muted></video>
      </div>
    </>
  );
};

export default UI;