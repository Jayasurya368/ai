// Serverless proxy for Groq's OpenAI-compatible /openai/v1/chat/completions
// endpoint. The app's lesson generation, RAG follow-up chat, and checkpoint
// re-explanations all call this instead of api.groq.com directly — browsers
// can't call it directly without exposing the key (and it's good practice
// to keep it server-side anyway), so this runs server-side instead.
//
// Set GROQ_API_KEY as an environment variable in Vercel project settings
// (Project → Settings → Environment Variables). Never hardcode it here if
// this repo will ever be public. Get a key at https://console.groq.com/keys

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export default async function handler(req, res) {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not set on the server.' });
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { model, max_tokens, messages } = req.body || {};
    if (!messages) return res.status(400).json({ error: 'Missing "messages" in request body.' });

    // Groq's chat/completions is OpenAI-shaped: messages use plain string
    // "content", not Anthropic's content-block arrays. Flatten anything the
    // client sent in block form (e.g. [{type:'text', text:'...'}]) down to
    // a string, and drop unsupported block types (e.g. 'document' — Groq
    // has no PDF input, the client already extracts PDF text before this).
    const flattenedMessages = messages.map((m) => {
      if (typeof m.content === 'string') return m;
      if (Array.isArray(m.content)) {
        const text = m.content
          .filter((b) => b.type === 'text')
          .map((b) => b.text)
          .join('\n\n');
        return { role: m.role, content: text };
      }
      return m;
    });

    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + GROQ_API_KEY,
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        max_tokens: max_tokens || 1000,
        messages: flattenedMessages,
      }),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
