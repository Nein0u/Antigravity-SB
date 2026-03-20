import { useState, useRef, useCallback } from 'react';
import type { GeneratorState, GeneratorMode, InputMode } from '../types';
import { generateScript, generateFrame, generateProjectDNA } from '../services/mockApi';


const initialState: GeneratorState = {
    status: 'idle',
    mode: 'batch',
    inputMode: 'script',
    input: '',
    processedScript: '',
    frames: [],
    currentFrameIndex: -1,
    totalFrames: 0,
    progress: 0,
    currentAction: 'Ready to generate your storyboard.',
    isScriptExpanded: false,
    projectDNA: '',
};


export function useGenerator() {
    const [state, setState] = useState<GeneratorState>(initialState);
    const abortRef = useRef<AbortController | null>(null);
    const continueSignalRef = useRef<(() => void) | null>(null);

    const setPartialState = useCallback((partial: Partial<GeneratorState>) => {
        setState((prev) => ({ ...prev, ...partial }));
    }, []);

    const waitForContinue = useCallback((): Promise<void> => {
        return new Promise((resolve) => {
            continueSignalRef.current = resolve;
            setPartialState({ status: 'paused', currentAction: 'Paused — click Continue to generate next frame.' });
        });
    }, [setPartialState]);

    const handleStart = useCallback(async () => {
        abortRef.current = new AbortController();
        const signal = abortRef.current.signal;

        setState((prev) => ({
            ...prev,
            status: 'generating',
            frames: [],
            currentFrameIndex: -1,
            progress: 0,
            processedScript: '',
            currentAction: 'Processing script…',
        }));

        try {
            // Step 1: Process script
            const result = await generateScript(state.input, state.inputMode, signal);
            if (signal.aborted) return;
            
            const script = result.text;
            const framesText = result.frames;
            const newTotalFrames = framesText.length;

            setState((prev) => ({
                ...prev,
                processedScript: script,
                totalFrames: newTotalFrames,
                currentAction: 'Extracting visual DNA…',
                progress: 5,
            }));

            // Step 1.5: Generate Project DNA
            const dna = await generateProjectDNA(script, signal);
            if (signal.aborted) return;

            setState((prev) => ({
                ...prev,
                projectDNA: dna,
                currentAction: 'Visual DNA ready. Generating frames…',
                progress: 10,
            }));

            // Step 2: Generate frames
            for (let i = 0; i < newTotalFrames; i++) {

                if (signal.aborted) return;

                setState((prev) => ({
                    ...prev,
                    status: 'generating',
                    currentFrameIndex: i,
                    currentAction: `Generating frame ${i + 1} of ${newTotalFrames}…`,
                    frames: [
                        ...prev.frames,
                        {
                            id: `pending-${i}`,
                            index: i,
                            imageUrl: '',
                            description: framesText[i],
                            prompt: '',
                            status: 'generating',
                        },
                    ],
                }));

                const frame = await generateFrame(i, framesText[i], dna, signal);

                if (signal.aborted) return;

                setState((prev) => {
                    const newFrames = [...prev.frames];
                    newFrames[i] = frame;
                    const progress = Math.round(((i + 1) / newTotalFrames) * 95) + 5;
                    return {
                        ...prev,
                        frames: newFrames,
                        progress,
                        currentAction: `Frame ${i + 1} complete.`,
                    };
                });

                // In step mode, pause after generating each frame (except the last)
                if (state.mode === 'step' && i < newTotalFrames - 1) {
                    await waitForContinue();
                    if (signal.aborted) return;
                }
            }

            if (!signal.aborted) {
                setPartialState({
                    status: 'completed',
                    progress: 100,
                    currentAction: `All ${newTotalFrames} frames generated successfully!`,
                });
            }
        } catch (e: unknown) {
            if (e instanceof Error && e.name === 'AbortError') return;
            setPartialState({
                status: 'idle',
                currentAction: e instanceof Error ? e.message : 'An error occurred. Please try again.',
            });
        }
    }, [state.input, state.inputMode, state.mode, waitForContinue, setPartialState]);

    const handleContinue = useCallback(() => {
        if (continueSignalRef.current) {
            continueSignalRef.current();
            continueSignalRef.current = null;
        }
    }, []);

    const handleStop = useCallback(() => {
        abortRef.current?.abort();
        continueSignalRef.current?.();
        continueSignalRef.current = null;
        setPartialState({
            status: 'stopped',
            currentAction: 'Generation stopped by user.',
        });
    }, [setPartialState]);

    const setInput = useCallback((value: string) => setPartialState({ input: value }), [setPartialState]);
    const setInputMode = useCallback((inputMode: InputMode) => setPartialState({ inputMode }), [setPartialState]);
    const setMode = useCallback((mode: GeneratorMode) => setPartialState({ mode }), [setPartialState]);
    
    const updateFramePrompt = useCallback((id: string, newPrompt: string) => {
        setState((prev) => ({
            ...prev,
            frames: prev.frames.map((f) => (f.id === id ? { ...f, prompt: newPrompt } : f)),
        }));
    }, []);

    const toggleScript = useCallback(
        () => setPartialState({ isScriptExpanded: !state.isScriptExpanded }),
        [state.isScriptExpanded, setPartialState]
    );

    return {
        state,
        handleStart,
        handleContinue,
        handleStop,
        setInput,
        setInputMode,
        setMode,
        toggleScript,
        updateFramePrompt,
    };
}
