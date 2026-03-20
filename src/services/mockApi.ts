import type { StoryboardFrame } from '../types';
import { 
    generateAIScript, 
    generateAIImage, 
    generateProjectDNA as aiGenerateProjectDNA,
    enhanceAIPrompt as aiEnhancePrompt
} from './aiService';

export interface ScriptResult {
    text: string;
    frames: string[];
}

export async function generateScript(
    input: string,
    mode: 'script' | 'idea',
    _signal?: AbortSignal
): Promise<ScriptResult> {
    return await generateAIScript(input, mode);
}

export async function generateProjectDNA(script: string): Promise<string> {
    return await aiGenerateProjectDNA(script);
}

export async function generateFrame(
    index: number,
    description: string,
    dna: string = '',
    signal?: AbortSignal
): Promise<StoryboardFrame> {
    const imageUrl = await generateAIImage(description, index, dna);
    
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    return {
        id: `frame-${Date.now()}-${index}`,
        index,
        imageUrl,
        description,
        prompt: '',
        status: 'done',
    };
}

export async function enhancePrompt(
    description: string,
    _currentPrompt: string,
    dna: string = '',
    _signal?: AbortSignal
): Promise<string> {
    return await aiEnhancePrompt(description, dna);
}

