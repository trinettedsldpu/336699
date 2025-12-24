import React from 'react';

interface LoaderProps {
  visible: boolean;
}

const Loader: React.FC<LoaderProps> = ({ visible }) => {
  return (
    <div 
      className={`fixed inset-0 bg-black flex flex-col justify-center items-center z-50 transition-opacity duration-1000 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="w-12 h-12 border-2 border-gold/10 border-t-gold rounded-full animate-spin mb-5"></div>
      <div className="text-gold font-cinzel text-sm tracking-[4px]">
        メリークリスマス
      </div>
    </div>
  );
};

export default Loader;