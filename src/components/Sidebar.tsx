import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileText,
    Lightbulb,
    Play,
    Square,
    SkipForward,
    ChevronDown,
    Film,
} from 'lucide-react';
import type { SidebarProps } from '../types';

const Sidebar: React.FC<SidebarProps> = ({
    state,
    onInputChange,
    onInputModeChange,
    onModeChange,
    onStart,
    onContinue,
    onStop,
}) => {
    const isRunning = state.status === 'generating';
    const isPaused = state.status === 'paused';
    const canStart = !isRunning && !isPaused;
    const canContinue = isPaused && state.mode === 'step';
    const canStop = isRunning || isPaused;

    return (
        <aside className="sidebar">
            {/* Brand */}
            <div className="sidebar-brand">
                <div className="brand-icon">
                    <Film size={18} className="text-emerald-400" />
                </div>
                <div>
                    <h1 className="brand-title">StoryAI</h1>
                    <p className="brand-sub">Storyboard Generator</p>
                </div>
            </div>

            <div className="sidebar-content">
                {/* Input Mode Toggle */}
                <div className="section">
                    <label className="section-label">Input Mode</label>
                    <div className="toggle-group">
                        <button
                            className={`toggle-btn ${state.inputMode === 'script' ? 'toggle-active' : ''}`}
                            onClick={() => onInputModeChange('script')}
                        >
                            <FileText size={14} />
                            Script
                        </button>
                        <button
                            className={`toggle-btn ${state.inputMode === 'idea' ? 'toggle-active' : ''}`}
                            onClick={() => onInputModeChange('idea')}
                        >
                            <Lightbulb size={14} />
                            Idea
                        </button>
                    </div>
                </div>

                {/* Textarea */}
                <div className="section">
                    <label className="section-label">
                        {state.inputMode === 'script' ? 'Your Script' : 'Your Idea'}
                    </label>
                    <textarea
                        className="input-textarea"
                        placeholder={
                            state.inputMode === 'script'
                                ? 'Paste your scene script here…\n\nExample:\nEXT. CITY ROOFTOP - NIGHT\nA lone figure stands against the storm…'
                                : 'Describe your story idea…\n\nExample:\nA cyberpunk detective uncovers a conspiracy in a rain-soaked megacity…'
                        }
                        value={state.input}
                        onChange={(e) => onInputChange(e.target.value)}
                        disabled={isRunning || isPaused}
                    />
                </div>

                {/* Generate Mode */}
                <div className="section">
                    <label className="section-label">Generation Mode</label>
                    <div className="select-wrapper">
                        <select
                            className="input-select"
                            value={state.mode}
                            onChange={(e) => onModeChange(e.target.value as 'step' | 'batch')}
                            disabled={isRunning || isPaused}
                        >
                            <option value="batch">Batch Generate</option>
                            <option value="step">Step-by-Step</option>
                        </select>
                        <ChevronDown size={14} className="select-icon" />
                    </div>
                    <p className="hint-text">
                        {state.mode === 'step'
                            ? 'Pauses after each frame for manual control.'
                            : 'Generates all frames automatically in sequence.'}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="section actions-section">
                    <AnimatePresence mode="wait">
                        {canStart && (
                            <motion.button
                                key="start"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="btn btn-start"
                                onClick={onStart}
                            >
                                <Play size={16} fill="currentColor" />
                                Start Generation
                            </motion.button>
                        )}
                    </AnimatePresence>

                    {canContinue && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="btn btn-continue"
                            onClick={onContinue}
                        >
                            <SkipForward size={16} />
                            Continue
                        </motion.button>
                    )}

                    {canStop && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="btn btn-stop"
                            onClick={onStop}
                        >
                            <Square size={16} fill="currentColor" />
                            Stop
                        </motion.button>
                    )}

                    {(state.status === 'completed' || state.status === 'stopped') && (
                        <motion.button
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="btn btn-start"
                            onClick={onStart}
                        >
                            <Play size={16} fill="currentColor" />
                            Start New
                        </motion.button>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
