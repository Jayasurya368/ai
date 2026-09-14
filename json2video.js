// Serverless proxy for JSON2Video's /v2/movies endpoint.
// Runs on the server, not in the browser — this avoids exposing the API
// key in page source and gives us one place to shape the movie JSON.
//
// NOTE ON WHAT THIS ACTUALLY GENERATES: JSON2Video does not do a
// lip-synced photorealistic talking-head like D-ID did. Its avatar-style
// output is a narrated caption video — an AI (Azure) voiceover reading
// the lesson script, over a plain background with the script shown as
// on-screen text. That's what buildMovieJSON() below builds. If you want
// an actual talking face, you'd need a different provider (D-ID, HeyGen,
// Synthesia, etc.) alongside JSON2Video.
//
// Set JSON2VIDEO_API_KEY as an environment variable in your Vercel
// project settings (Project → Settings → Environment Variables). Do NOT
// hardcode it here if this repo will ever be public.
// Get a free key at https://json2video.com

const J2V_BASE = 'https://api.json2video.com/v2/movies';

function buildMovieJSON(script) {
  return {
    resolution: 'full-hd',
    quality: 'high',
    scenes: [
      {
        background_color: '#20231F',
        elements: [
          {
            type: 'voice',
            model: 'azure',
            text: script,
            voice: 'en-US-JennyNeural',
          },
          {
            type: 'text',
            text: script,
            style: '005',
            position: 'center-center',
            settings: {
              'font-family': 'Inter',
              'font-size': '48px',
              color: '#F6E6C2',
            },
          },
        ],
      },
    ],
  };
}

export default async function handler(req, res) {
  const J2V_API_KEY = process.env.JSON2VIDEO_API_KEY;
  if (!J2V_API_KEY) {
    return res.status(500).json({ error: 'JSON2VIDEO_API_KEY is not set on the server.' });
  }

  try {
    if (req.method === 'POST') {
      // Start a new render
      const { script } = req.body || {};
      if (!script) return res.status(400).json({ error: 'Missing "script" in request body.' });

      const r = await fetch(J2V_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': J2V_API_KEY,
        },
        body: JSON.stringify(buildMovieJSON(script)),
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      // Normalize to { id } so the client polling code stays simple.
      return res.status(200).json({ id: data.project, raw: data });
    }

    if (req.method === 'GET') {
      // Poll an existing render by project id
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing "id" query parameter.' });

      const r = await fetch(J2V_BASE + '?project=' + encodeURIComponent(id), {
        headers: { 'x-api-key': J2V_API_KEY },
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      const movie = data.movie || {};
      // Normalize JSON2Video's status/url fields to the shape the client
      // already expects: { status, result_url, error }.
      return res.status(200).json({
        status: movie.status,
        result_url: movie.url || null,
        error: movie.status === 'error' ? { description: movie.message } : null,
      });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
