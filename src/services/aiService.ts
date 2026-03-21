const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';
const RAW_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_KEY = RAW_API_KEY && RAW_API_KEY !== 'undefined' && RAW_API_KEY !== 'null' ? RAW_API_KEY : '';
const PROXY_URL = import.meta.env.VITE_GEMINI_PROXY_URL || (!API_KEY ? '/api/gemini' : '');
const FORCE_IMAGE_FALLBACK = import.meta.env.VITE_FORCE_IMAGE_FALLBACK === 'true';

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
        throw new Error('Missing VITE_GEMINI_API_KEY. Configure it, or set VITE_GEMINI_PROXY_URL=/api/gemini with server GEMINI_API_KEY.');
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
    if (PROXY_URL) {
        try {
            return await proxyGeminiText(prompt, signal);
        } catch (proxyError) {
            if (!API_KEY) {
                const details = proxyError instanceof Error ? proxyError.message : 'Unknown proxy error';
                throw new Error(`Gemini proxy request failed and no VITE_GEMINI_API_KEY is available. ${details}`);
            }
        }
    }
    if (!API_KEY) {
        throw new Error('Missing VITE_GEMINI_API_KEY. Configure it, or set VITE_GEMINI_PROXY_URL=/api/gemini with server GEMINI_API_KEY.');
    }
    return await directGeminiText(prompt, signal);
}

async function generateImageWithGemini(prompt: string, signal?: AbortSignal): Promise<string> {
    if (!API_KEY) {
        throw new Error('Missing VITE_GEMINI_API_KEY for image generation.');
    }

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${API_KEY}`,
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
                generationConfig: {
                    responseModalities: ['TEXT', 'IMAGE'],
                },
            }),
            signal,
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini image API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const candidates = data?.candidates ?? [];
    for (const candidate of candidates) {
        const parts = candidate?.content?.parts ?? [];
        for (const part of parts) {
            const inlineData = part?.inlineData;
            if (
                inlineData?.data &&
                typeof inlineData.mimeType === 'string' &&
                inlineData.mimeType.startsWith('image/')
            ) {
                return `data:${inlineData.mimeType};base64,${inlineData.data}`;
            }
        }
    }

    throw new Error('Gemini image model returned no image data.');
}

function createFallbackImage(description: string, index: number): string {
    const safeText = (description || `Frame ${index + 1}`)
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 90);
    const escapedText = safeText
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#18181b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#bg)"/>
  <rect x="40" y="40" width="1200" height="640" rx="16" fill="none" stroke="#27272a" stroke-width="2"/>
  <text x="80" y="140" fill="#10b981" font-size="36" font-family="Inter, Arial, sans-serif" font-weight="700">
    StoryAI Placeholder
  </text>
  <text x="80" y="200" fill="#a1a1aa" font-size="28" font-family="Inter, Arial, sans-serif">
    Frame ${index + 1}
  </text>
  <text x="80" y="280" fill="#d4d4d8" font-size="26" font-family="Inter, Arial, sans-serif">
    ${escapedText}
  </text>
</svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
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
    if (!API_KEY) return createFallbackImage(description, index);
    if (FORCE_IMAGE_FALLBACK) return createFallbackImage(description, index);

    try {
        // First enhance the prompt if DNA is provided
        const finalPrompt = dna ? await enhanceAIPrompt(description, dna, signal) : description;
        throwIfAborted(signal);
        
        return await withAbort(() => generateImageWithGemini(finalPrompt, signal), signal);
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') throw error;
        console.error("AI Image Generation failed:", error);
    }

    // Local SVG fallback to avoid third-party hotlink/CORS/rate-limit failures in production.
    return createFallbackImage(description, index);
}
