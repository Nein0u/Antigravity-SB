import React from 'react';
import { motion } from 'framer-motion';
import { Clapperboard } from 'lucide-react';
import { useGenerator } from './hooks/useGenerator';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import StoryboardGrid from './components/StoryboardGrid';
import FrameModal from './components/FrameModal';

const LiveDot: React.FC<{ active: boolean }> = ({ active }) => (
  <span className="live-badge">
    <motion.span
      className={`live-dot ${active ? 'live-dot-active' : 'live-dot-idle'}`}
      animate={active ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1.2 }}
    />
    {active ? 'Live' : 'Idle'}
  </span>
);

function App() {
  const [selectedFrameId, setSelectedFrameId] = React.useState<string | null>(null);

  const {
    state,
    handleStart,
    handleContinue,
    handleStop,
    setInput,
    setInputMode,
    setMode,
    toggleScript,
    updateFramePrompt,
  } = useGenerator();

  const isActive = state.status === 'generating' || state.status === 'paused';
  const selectedFrame = state.frames.find(f => f.id === selectedFrameId) || null;

  return (
    <div className="app-root">
      <Sidebar
        state={state}
        onInputChange={setInput}
        onInputModeChange={setInputMode}
        onModeChange={setMode}
        onStart={handleStart}
        onContinue={handleContinue}
        onStop={handleStop}
      />

      <main className="main-panel">
        {/* Header */}
        <header className="main-header">
          <div className="header-left">
            <div className="header-icon">
              <Clapperboard size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="header-title">Fernando</h2>
              <p className="header-sub">Visual storytelling powered by artificial intelligence</p>
            </div>
          </div>
          <LiveDot active={isActive} />
        </header>

        {/* Status Bar */}
        <StatusBar state={state} onToggleScript={toggleScript} />

        {/* Grid or Empty State */}
        {state.frames.length > 0 ? (
          <StoryboardGrid frames={state.frames} onFrameClick={setSelectedFrameId} />
        ) : (
          <motion.div
            className="empty-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="empty-icon">
              <Clapperboard size={36} className="text-zinc-600" />
            </div>
            <p className="empty-title">No frames generated yet</p>
            <p className="empty-sub">
              Enter your script or idea in the sidebar and click <strong>Start Generation</strong> to begin.
            </p>
          </motion.div>
        )}
      </main>

      <FrameModal 
        frame={selectedFrame} 
        onClose={() => setSelectedFrameId(null)} 
        onUpdatePrompt={updateFramePrompt} 
      />
    </div>
  );
}

export default App;
