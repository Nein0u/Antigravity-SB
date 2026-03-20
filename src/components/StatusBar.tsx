import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp, FileText, Download, FileJson } from 'lucide-react';
import type { GeneratorState } from '../types';
import { downloadComposite, downloadJSON } from '../services/exportService';

interface StatusBarProps {
    state: GeneratorState;
    onToggleScript: () => void;
}

const StatusBar: React.FC<StatusBarProps> = ({ state, onToggleScript }) => {
    const isCompleted = state.status === 'completed';

    const getStatusIcon = () => {
        // ... (rest of the helper functions remain the same)
        switch (state.status) {
            case 'generating':
                return <Loader2 size={15} className="text-emerald-400 spin-icon" />;
            case 'paused':
                return <AlertCircle size={15} className="text-amber-400" />;
            case 'completed':
                return <CheckCircle size={15} className="text-emerald-400" />;
            case 'stopped':
                return <AlertCircle size={15} className="text-red-400" />;
            default:
                return null;
        }
    };

    const getStatusColor = () => {
        switch (state.status) {
            case 'generating': return 'text-emerald-400';
            case 'paused': return 'text-amber-400';
            case 'completed': return 'text-emerald-400';
            case 'stopped': return 'text-red-400';
            default: return 'text-zinc-400';
        }
    };

    return (
        <div className="status-bar-container">
            {/* Status Card */}
            <div className="status-card">
                <div className="status-card-header">
                    <div className="status-info">
                        {getStatusIcon()}
                        <span className={`status-action ${getStatusColor()}`}>
                            {state.currentAction}
                        </span>
                    </div>
                    {isCompleted ? (
                        <div className="status-actions">
                            <button 
                                className="export-btn" 
                                onClick={() => downloadComposite(state.frames)}
                                title="Download Composite PNG"
                            >
                                <Download size={14} />
                                <span>Composite</span>
                            </button>
                            <button 
                                className="export-btn" 
                                onClick={() => downloadJSON(state)}
                                title="Export Project JSON"
                            >
                                <FileJson size={14} />
                                <span>Export JSON</span>
                            </button>
                        </div>
                    ) : (
                        <span className="progress-pct">{state.progress}%</span>
                    )}
                </div>

                {/* Progress Bar */}
                <div className="progress-track">
                    <motion.div
                        className="progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${state.progress}%` }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        style={{
                            background:
                                state.status === 'stopped'
                                    ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                                    : state.status === 'paused'
                                        ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                                        : 'linear-gradient(90deg, #10b981, #059669)',
                        }}
                    />
                </div>

                {/* Frame Dots */}
                {state.totalFrames > 0 && (
                    <div className="frame-dots">
                        {Array.from({ length: state.totalFrames }).map((_, i) => {
                            const frame = state.frames[i];
                            const isDone = frame?.status === 'done';
                            const isGenerating = frame?.status === 'generating';
                            return (
                                <motion.div
                                    key={i}
                                    className={`frame-dot ${isDone ? 'dot-done' : isGenerating ? 'dot-generating' : 'dot-pending'}`}
                                    animate={isGenerating ? { scale: [1, 1.3, 1] } : {}}
                                    transition={{ repeat: Infinity, duration: 0.8 }}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Script Viewer */}
            <AnimatePresence>
                {state.processedScript && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="script-accordion"
                    >
                        <button className="script-toggle" onClick={onToggleScript}>
                            <div className="script-toggle-left">
                                <FileText size={14} className="text-emerald-400" />
                                <span>Processed Script</span>
                            </div>
                            {state.isScriptExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <AnimatePresence>
                            {state.isScriptExpanded && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="script-body"
                                >
                                    <pre className="script-content">{state.processedScript}</pre>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
                {state.projectDNA && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="script-accordion mt-2"
                    >
                        <div className="script-toggle" style={{ cursor: 'default' }}>
                            <div className="script-toggle-left">
                                <AlertCircle size={14} className="text-amber-400" />
                                <span>Visual Style DNA</span>
                            </div>
                        </div>
                        <div className="script-body">
                            <div className="dna-content text-xs text-zinc-400 italic leading-relaxed p-2 border-t border-zinc-800/50 bg-zinc-900/20">
                                {state.projectDNA}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default StatusBar;
