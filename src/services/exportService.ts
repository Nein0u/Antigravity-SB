import type { StoryboardFrame } from '../types';

/**
 * Generates a composite contact sheet of all storyboard frames and downloads it as a PNG.
 */
export async function downloadComposite(frames: StoryboardFrame[], title: string = 'storyboard-composite') {
    if (frames.length === 0) return;

    const CANVAS_WIDTH = 1920;
    const GRID_COLS = 3;
    const GRID_GAP = 40;
    const PADDING = 60;
    
    // Calculate layout
    const numRows = Math.ceil(frames.length / GRID_COLS);
    const frameWidth = (CANVAS_WIDTH - (GRID_COLS - 1) * GRID_GAP - 2 * PADDING) / GRID_COLS;
    const frameHeight = (frameWidth * 9) / 16; // 16:9 aspect ratio
    const textHeight = 80;
    const rowHeight = frameHeight + textHeight + GRID_GAP;
    const CANVAS_HEIGHT = numRows * rowHeight + 2 * PADDING;

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#121214'; // Dark theme matching the UI
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Header
    ctx.fillStyle = '#10b981'; // Emerald-400
    ctx.font = 'bold 40px Inter, sans-serif';
    ctx.fillText('STORYAI | COMPOSITE CONTACT SHEET', PADDING, PADDING + 30);
    
    ctx.fillStyle = '#a1a1aa'; // Zinc-400
    ctx.font = '24px Inter, sans-serif';
    ctx.fillText(`${frames.length} TOTAL FRAMES`, PADDING, PADDING + 70);

    // Draw frames
    const loadPromises = frames.map((frame, i) => {
        return new Promise<void>((resolve) => {
            if (!frame.imageUrl) {
               resolve();
               return;
            }
            const img = new Image();
            img.crossOrigin = 'anonymous'; // For base64 or external URLs
            img.onload = () => {
                const row = Math.floor(i / GRID_COLS);
                const col = i % GRID_COLS;
                const x = PADDING + col * (frameWidth + GRID_GAP);
                const y = PADDING + 120 + row * rowHeight;

                // Frame Box
                ctx.strokeStyle = '#27272a'; // Zinc-800
                ctx.lineWidth = 2;
                ctx.strokeRect(x - 2, y - 2, frameWidth + 4, frameHeight + 4);

                // Image
                ctx.drawImage(img, x, y, frameWidth, frameHeight);

                // Label
                ctx.fillStyle = '#f4f4f5'; // Zinc-100
                ctx.font = 'bold 20px Inter, sans-serif';
                ctx.fillText(`FRAME ${i + 1}`, x, y + frameHeight + 35);

                // Description (truncated)
                ctx.fillStyle = '#a1a1aa'; // Zinc-400
                ctx.font = '16px Inter, sans-serif';
                const desc = frame.description.length > 80 
                    ? frame.description.substring(0, 77) + '...' 
                    : frame.description;
                ctx.fillText(desc, x, y + frameHeight + 65);
                
                resolve();
            };
            img.onerror = () => resolve(); // Skip if fails
            img.src = frame.imageUrl;
        });
    });

    await Promise.all(loadPromises);

    // Download
    const link = document.createElement('a');
    link.download = `${title}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

/**
 * Downloads the storyboard data as a JSON file.
 */
export function downloadJSON<T>(data: T, title: string = 'storyboard-project') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `${title}-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}
