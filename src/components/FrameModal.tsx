import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2, Save, Download, RotateCcw } from 'lucide-react';
import type { StoryboardFrame } from '../types';
import { enhancePrompt } from '../services/mockApi';

interface FrameModalProps {
    frame: StoryboardFrame | null;
    onClose: () => void;
    onUpdatePrompt: (id: string, newPrompt: string) => void;
}

const FrameModal: React.FC<FrameModalProps> = ({ frame, onClose, onUpdatePrompt }) => {
    const [promptValue, setPromptValue] = useState(frame?.prompt || frame?.description || '');
    const [isEnhancing, setIsEnhancing] = useState(false);

    // Reset local prompt state when frame changes
    React.useEffect(() => {
        if (frame) {
            setPromptValue(frame.prompt || frame.description);
        }
    }, [frame]);

    React.useEffect(() => {
        if (!frame) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [frame, onClose]);

    if (!frame) return null;

    const handleEnhance = async () => {
        setIsEnhancing(true);
        try {
            const newPrompt = await enhancePrompt(frame.description, promptValue);
            setPromptValue(newPrompt);
        } catch (e) {
            console.error('Enhance failed', e);
        } finally {
            setIsEnhancing(false);
        }
    };

    const handleSave = () => {
        onUpdatePrompt(frame.id, promptValue);
        onClose();
    };

    const handleRevert = () => {
        setPromptValue(frame.description);
    };

    const isEdited = promptValue !== frame.description;

    const handleDownload = async () => {
        try {
            const response = await fetch(frame.imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `StoriAI-Frame-${frame.index + 1}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading image:', error);
            // Fallback: open in new tab if fetch fails due to CORS
            const popup = window.open(frame.imageUrl, '_blank', 'noopener,noreferrer');
            if (popup) popup.opener = null;
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                className="modal-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
            >
                <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                    <motion.div
                        className="modal-content"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="frame-modal-title"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        {/* Header */}
                        <div className="modal-header">
                            <div>
                                <h3 id="frame-modal-title" className="modal-title">Edit Frame {frame.index + 1}</h3>
                                <p className="modal-sub">Refine the AI prompt or add photographic directions.</p>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="modal-icon-btn" onClick={handleDownload} title="Download Frame">
                                    <Download size={20} />
                                </button>
                                <button className="modal-icon-btn" onClick={onClose} title="Close">
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="modal-body">
                            {/* Image Preview */}
                            <div className="modal-image-wrapper">
                                <img src={frame.imageUrl} alt={`Frame ${frame.index + 1}`} className="modal-image" />
                                <div className="modal-frame-badge">Frame {frame.index + 1}</div>
                            </div>

                            {/* Details Editor */}
                            <div className="modal-editor">
                                <div className="modal-section">
                                    <label className="modal-label">Original Scene Description</label>
                                    <div className="modal-readonly-text">{frame.description}</div>
                                </div>

                                <div className="modal-section" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <div className="modal-label-row">
                                        <label className="modal-label">Photographic AI Prompt</label>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <AnimatePresence>
                                                {isEdited && (
                                                    <motion.button 
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        className="modal-enhance-btn" 
                                                        style={{ color: 'var(--text-secondary)', background: 'transparent', borderColor: 'var(--border)' }}
                                                        onClick={handleRevert}
                                                        disabled={isEnhancing}
                                                    >
                                                        <RotateCcw size={13} />
                                                        Revert
                                                    </motion.button>
                                                )}
                                            </AnimatePresence>
                                            <button 
                                                className="modal-enhance-btn" 
                                                onClick={handleEnhance}
                                                disabled={isEnhancing}
                                            >
                                                {isEnhancing ? (
                                                    <Loader2 size={13} className="spin-icon text-emerald-400" />
                                                ) : (
                                                    <Sparkles size={13} className="text-emerald-400" />
                                                )}
                                                {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
                                            </button>
                                        </div>
                                    </div>
                                    <textarea
                                        className="modal-textarea"
                                        value={promptValue}
                                        onChange={(e) => setPromptValue(e.target.value)}
                                        placeholder="Add cinematic camera angles, lighting details, etc..."
                                        disabled={isEnhancing}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="modal-footer">
                            <button className="btn-modal-cancel" onClick={onClose} disabled={isEnhancing}>Cancel</button>
                            <button className="btn-modal-save" onClick={handleSave} disabled={isEnhancing}>
                                <Save size={16} /> Save Changes
                            </button>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default FrameModal;
