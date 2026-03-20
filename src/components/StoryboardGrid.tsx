import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import type { StoryboardFrame } from '../types';

interface StoryboardGridProps {
    frames: StoryboardFrame[];
    onFrameClick: (id: string) => void;
}

const FrameCard: React.FC<{ frame: StoryboardFrame; idx: number; onClick: () => void }> = ({ frame, idx, onClick }) => {
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgError, setImgError] = useState(false);

    return (
        <motion.div
            className="storyboard-card"
            style={{ cursor: 'pointer' }}
            onClick={onClick}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: idx * 0.06, ease: 'easeOut' }}
            layout
        >
            {/* Image Area */}
            <div className="card-image-area">
                {frame.status === 'generating' ? (
                    <div className="card-skeleton">
                        <div className="skeleton-shimmer" />
                        <div className="skeleton-center">
                            <Loader2 size={24} className="text-zinc-500 spin-icon" />
                            <span className="skeleton-label">Generating…</span>
                        </div>
                    </div>
                ) : imgError ? (
                    <div className="card-error-img">
                        <ImageIcon size={28} className="text-zinc-600" />
                        <span className="skeleton-label">Image unavailable</span>
                    </div>
                ) : (
                    <>
                        {!imgLoaded && (
                            <div className="card-skeleton" style={{ position: 'absolute', inset: 0 }}>
                                <div className="skeleton-shimmer" />
                            </div>
                        )}
                        <img
                            src={frame.imageUrl}
                            alt={`Frame ${frame.index + 1}`}
                            className="card-img"
                            loading="lazy"
                            decoding="async"
                            style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }}
                            onLoad={() => setImgLoaded(true)}
                            onError={() => setImgError(true)}
                        />
                    </>
                )}

                {/* Frame Badge */}
                <div className="frame-badge">
                    <span>Frame {frame.index + 1}</span>
                </div>
            </div>

            {/* Description */}
            <div className="card-body">
                <div className="card-prompt-label">{frame.prompt ? 'AI Prompt (Edited)' : 'Scene Description'}</div>
                <p className="card-description">{frame.prompt || frame.description || '—'}</p>
            </div>
        </motion.div>
    );
};

const StoryboardGrid: React.FC<StoryboardGridProps> = ({ frames, onFrameClick }) => {
    if (frames.length === 0) return null;

    return (
        <motion.div className="grid-container" layout>
            <AnimatePresence>
                {frames.map((frame, idx) => (
                    <FrameCard key={frame.id} frame={frame} idx={idx} onClick={() => onFrameClick(frame.id)} />
                ))}
            </AnimatePresence>
        </motion.div>
    );
};

export default StoryboardGrid;
