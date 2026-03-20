export type GeneratorStatus = 'idle' | 'generating' | 'paused' | 'completed' | 'stopped';
export type GeneratorMode = 'step' | 'batch';
export type InputMode = 'script' | 'idea';

export interface StoryboardFrame {
    id: string;
    index: number;
    imageUrl: string;
    description: string;
    prompt: string;
    status: 'pending' | 'generating' | 'done' | 'error';
}

export interface GeneratorState {
    status: GeneratorStatus;
    mode: GeneratorMode;
    inputMode: InputMode;
    input: string;
    processedScript: string;
    frames: StoryboardFrame[];
    currentFrameIndex: number;
    totalFrames: number;
    progress: number;
    currentAction: string;
    isScriptExpanded: boolean;
    projectDNA: string;
}


export interface SidebarProps {
    state: GeneratorState;
    onInputChange: (value: string) => void;
    onInputModeChange: (mode: InputMode) => void;
    onModeChange: (mode: GeneratorMode) => void;
    onStart: () => void;
    onContinue: () => void;
    onStop: () => void;
}
