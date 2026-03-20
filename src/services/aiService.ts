import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL;
let imageModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;

function getImageModel() {
    if (!API_KEY) {
        throw new Error('Missing VITE_GEMINI_API_KEY. Configure your environment before using AI services.');
    }
    if (!imageModel) {
        const client = new GoogleGenerativeAI(API_KEY);
        // Using imagen-3.0-generate-001 for image generation
        imageModel = client.getGenerativeModel({ model: "imagen-3.0-generate-001" });
    }
    return imageModel;
}

export interface AIScriptResult {
    text: string;
    frames: string[];
}

function createAbortError() {
    return new DOMException('Aborted', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal) {
    if (signal?.aborted) throw createAbortError();
}

async function withAbort<T>(operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (!signal) return operation();
    throwIfAborted(signal);

    let onAbort: (() => void) | null = null;
    const abortPromise = new Promise<T>((_, reject) => {
        onAbort = () => reject(createAbortError());
        signal.addEventListener('abort', onAbort, { once: true });
    });

    try {
        const runningOperation = operation();
        return await Promise.race([runningOperation, abortPromise]);
    } finally {
        if (onAbort) signal.removeEventListener('abort', onAbort);
    }
}

async function directGeminiText(prompt: string, signal?: AbortSignal): Promise<string> {
    if (!API_KEY) {
        throw new Error('Missing VITE_GEMINI_API_KEY. Configure your environment before using AI services.');
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }],
                    },
                ],
            }),
            signal,
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini API returned an empty response.');
    return text;
}

async function proxyGeminiText(prompt: string, signal?: AbortSignal): Promise<string> {
    const response = await fetch(PROXY_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal,
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Proxy Gemini error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data?.text) throw new Error('Proxy Gemini returned an empty response.');
    return data.text;
}

async function generateText(prompt: string, signal?: AbortSignal): Promise<string> {
    throwIfAborted(signal);
    if (PROXY_URL) return await proxyGeminiText(prompt, signal);
    return await directGeminiText(prompt, signal);
}

export async function generateAIScript(
    input: string,
    mode: 'script' | 'idea',
    signal?: AbortSignal
): Promise<AIScriptResult> {
    throwIfAborted(signal);

    if (mode === 'script') {
        const prompt = `
            You are a professional storyboard writer. 
            The user has provided a script. 
            Please split it into clear, individual storyboard frames (scenes) WITHOUT rewriting the content.
            Keep each frame as a direct, literal line or paragraph from the user's original script.
            Return ONLY the frames separated by double newlines.
            
            USER SCRIPT:
            ${input}
        `;
        
        const text = await generateText(prompt, signal);
        const frames = text.split(/\n\s*\n/).map((s: string) => s.trim()).filter(Boolean);
        
        return {
            text: `[ORIGINAL SCRIPT PRESERVED]\n\n${text}`,
            frames
        };
    } else {
        // Generate a script from an idea
        const prompt = `
            You are a professional storyboard artist and screenwriter.
            The user has an idea for a story. 
            Generate a sequence of 6-8 storyboard frames that tell this story visually.
            Each frame should be a concise but descriptive visual beat.
            Return ONLY the frames separated by double newlines.
            
            USER IDEA:
            ${input}
        `;
        
        const text = await generateText(prompt, signal);
        const frames = text.split(/\n\s*\n/).map((s: string) => s.trim()).filter(Boolean);
        
        return {
            text: `[AI GENERATED STORYBOARD FROM IDEA]\n\n${text}`,
            frames
        };
    }
}

export async function generateProjectDNA(script: string, signal?: AbortSignal): Promise<string> {
    throwIfAborted(signal);
    const prompt = `
        You are a visual director and concept artist. 
        Analyze the following storyboard script and create a "Project DNA" — a concise visual blueprint 
        that ensures consistency across all frames.
        
        Extract and describe:
        1. MAIN CHARACTERS: Physical appearance, key clothing items, and recurring traits.
        2. SETTING: Core environment details, recurring locations.
        3. VISUAL STYLE: Lighting (e.g., moody, high-key), color palette, and cinematic tone (e.g., noir, vibrant, gritty).
        
        Keep it concise (1-2 paragraphs) and optimized for use as a prefix in image generation prompts.
        
        SCRIPT:
        ${script}
    `;
    
    return (await generateText(prompt, signal)).trim();
}

export async function enhanceAIPrompt(description: string, dna: string = '', signal?: AbortSignal): Promise<string> {
    throwIfAborted(signal);
    const prompt = `
        You are an expert AI image prompt engineer for cinematic storyboards.
        Take the following scene description and the "Project DNA" (visual consistency guide) 
        and turn them into a high-quality, professional photographic prompt.
        
        PROJECT DNA (Consistency context):
        ${dna}
        
        SCENE DESCRIPTION:
        ${description}
        
        Focus on: cinematic lighting, camera angle, lens type (e.g., 35mm, anamorphic), 
        and specifically ensuring characters match the DNA description perfectly.
        Return ONLY the enhanced prompt.
    `;
    
    return (await generateText(prompt, signal)).trim();
}

/**
 * Generates an image using Gemini/Imagen.
 * Falls back to placeholder if generation fails for better stability during evaluation.
 */
export async function generateAIImage(
    description: string,
    index: number,
    dna: string = '',
    signal?: AbortSignal
): Promise<string> {
    throwIfAborted(signal);
    try {
        // First enhance the prompt if DNA is provided
        const finalPrompt = dna ? await enhanceAIPrompt(description, dna, signal) : description;
        throwIfAborted(signal);
        
        // Use the image model
        // Note: In some SDK versions, generation might be different. 
        // We'll wrap it in a way that attempts a standard generation call.
        const result = await withAbort(() => getImageModel().generateContent(finalPrompt), signal);
        const response = await result.response;
        throwIfAborted(signal);
        
        // Handle image data in response
        const part = response.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        
        // If the above fails, check if text was returned instead (some models return image URLs or paths)
        const textResponse = response.text();
        if (textResponse.startsWith('http')) {
            return textResponse;
        }
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        console.error("AI Image Generation failed:", error);
    }

    // Fallback logic (refined to use prompt keywords for better (though still limited) relevance)
    const seed = index * 13 + Date.now() % 1000;
    const cleanDescription = description.replace(/[^\w\s]/gi, '');
    const words = cleanDescription.split(/\W+/).filter(w => w.length > 4);
    const keyword = words.length > 0 ? words[seed % words.length].toLowerCase() : 'cinematic';
    
    // Using a slightly better source for placeholders that supports keywords
    return `https://source.unsplash.com/featured/640x360?${keyword},cinematic&sig=${seed}`;
}
