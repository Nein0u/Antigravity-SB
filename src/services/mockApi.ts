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
    signal?: AbortSignal
): Promise<ScriptResult> {
    return await generateAIScript(input, mode, signal);
}

export async function generateProjectDNA(script: string, signal?: AbortSignal): Promise<string> {
    return await aiGenerateProjectDNA(script, signal);
}

export async function generateFrame(
    index: number,
    description: string,
    dna: string = '',
    signal?: AbortSignal
): Promise<StoryboardFrame> {
    const imageUrl = await generateAIImage(description, index, dna, signal);
    
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
    currentPrompt: string,
    dna: string = '',
    signal?: AbortSignal
): Promise<string> {
    const sourceText = currentPrompt?.trim() ? `${description}\n\nCurrent prompt:\n${currentPrompt}` : description;
    return await aiEnhancePrompt(sourceText, dna, signal);
}
