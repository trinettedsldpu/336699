import React, { useState, useRef } from 'react';
import Canvas3D, { Canvas3DRef } from './components/Canvas3D';
import UI from './components/UI';
import Loader from './components/Loader';
import { AppMode } from './types';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [statusText, setStatusText] = useState('Initializing Systems...');
  const [mode, setMode] = useState<AppMode>(AppMode.TREE);
  
  const canvasRef = useRef<Canvas3DRef>(null);

  const handleStatusChange = (status: string) => {
    setStatusText(status);
    // Extract mode from status text if possible for UI feedback, 
    // though in this design the UI is mostly stateless regarding mode
    if (status.includes("Tree")) setMode(AppMode.TREE);
    else if (status.includes("Scatter")) setMode(AppMode.SCATTER);
    else if (status.includes("Gallery") || status.includes("Pinch")) setMode(AppMode.FOCUS);
  };

  const handleLoaded = () => {
    // Add a small delay for smooth transition
    setTimeout(() => {
      setLoading(false);
    }, 800);
  };

  const handleUpload = (files: File[]) => {
    if (canvasRef.current) {
      canvasRef.current.addPhotos(files);
      setStatusText("Photos Added to Gallery");
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-deep">
      <Loader visible={loading} />
      
      <UI 
        statusText={statusText} 
        onUpload={handleUpload}
        currentMode={mode}
      />
      
      <Canvas3D 
        ref={canvasRef}
        onStatusChange={handleStatusChange}
        onLoaded={handleLoaded}
      />
    </div>
  );
};

export default App;