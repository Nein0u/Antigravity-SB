const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Missing GEMINI_API_KEY on server' });
    return;
  }

  const prompt = req.body?.prompt;
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Invalid prompt' });
    return;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`,
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
      }
    );

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json(data);
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
