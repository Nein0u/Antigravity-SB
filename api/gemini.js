const GEMINI_TEXT_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash'];
const GEMINI_IMAGE_MODELS = ['gemini-2.0-flash-preview-image-generation'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error:
        'Missing server API key. Set GEMINI_API_KEY (preferred) or GOOGLE_API_KEY in Vercel project settings.',
    });
    return;
  }

  const prompt = req.body?.prompt;
  const type = req.body?.type === 'image' ? 'image' : 'text';
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Invalid prompt' });
    return;
  }

  try {
    const models = type === 'image' ? GEMINI_IMAGE_MODELS : GEMINI_TEXT_MODELS;
    const body =
      type === 'image'
        ? {
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          }
        : {
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
          };

    let data = null;
    let response = null;
    let lastStatus = 500;
    let lastError = { error: 'Gemini proxy failed before request' };

    for (const model of models) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      data = await response.json();
      if (response.ok) break;

      lastStatus = response.status;
      lastError = data;
      // Try next model only on quota errors.
      if (response.status !== 429) break;
    }

    if (!response?.ok) {
      res.status(lastStatus).json({
        ...lastError,
        attemptedModels: models,
      });
      return;
    }

    if (type === 'image') {
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
            res.status(200).json({ imageData: `data:${inlineData.mimeType};base64,${inlineData.data}` });
            return;
          }
        }
      }

      res.status(502).json({ error: 'Gemini image response did not include image data.' });
      return;
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    res.status(200).json({ text });
  } catch (error) {
    res.status(500).json({
      error: 'Gemini proxy failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
