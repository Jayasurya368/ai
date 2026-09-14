# AI Teacher — deploy with working lesson video

Chat (lesson generation, RAG follow-up, checkpoint re-explanations) runs on
**Groq**. The lesson-intro video runs on **JSON2Video**. Browsers can't
call either API directly (CORS + it would expose the key), so this folder
includes a tiny serverless proxy for each. Deploy time: about 2 minutes,
free.

## Folder structure
```
/index.html               ← the app (open this locally to test the UI, not the AI features)
/api/json2video.js        ← serverless proxy that talks to JSON2Video on the server side
/api/groq-message.js      ← serverless proxy that talks to Groq on the server side
```

## Deploy on Vercel (fastest option)

1. Go to https://vercel.com and sign up / log in (free, no card needed for this).
2. Click **Add New → Project → Deploy without Git** (or drag-and-drop this
   whole folder onto the Vercel dashboard import screen — both work).
3. Once it's created, go to **Project → Settings → Environment Variables**
   and add BOTH of these:
   - Key: `GROQ_API_KEY` — Value: your Groq API key (from
     console.groq.com/keys — free tier available)
   - Key: `JSON2VIDEO_API_KEY` — Value: your JSON2Video API key (from
     json2video.com — free tier available)
4. Redeploy (Vercel prompts you to after adding env vars — required, they
   don't apply to a deployment that's already live).
5. Open the deployed URL — lesson generation, chat, and the lesson video
   should all now work.

You can also add the keys with the Vercel CLI from this folder:
```bash
vercel env add GROQ_API_KEY production
vercel env add JSON2VIDEO_API_KEY production
```
Paste each key when prompted, then redeploy with `vercel --prod`.

## Why this fixes it

- **CORS**: neither Groq's API nor JSON2Video's API accept requests
  directly from a browser page — both expect a server to call them. The
  proxies (`api/groq-message.js`, `api/json2video.js`) run on Vercel's
  server and forward the requests — your browser now talks to your own
  domain, which has no CORS restriction, and your domain talks to
  Groq/JSON2Video server-to-server.
- **Key exposure**: both keys now live only in Vercel's environment
  variables, never in any file you'd commit or share. Safe to make the repo
  public.

## What changed vs. the D-ID/Claude version

- **Chat → Groq**: `api/groq-message.js` calls Groq's OpenAI-compatible
  `/openai/v1/chat/completions` endpoint (model: `llama-3.3-70b-versatile`
  by default). Groq has no native PDF/document input like Claude did, so
  when you upload a PDF, `index.html` extracts its text in the browser
  (via pdf.js) first, then sends that text to Groq.
- **Video → JSON2Video**: `api/json2video.js` calls JSON2Video's
  `/v2/movies` endpoint. **Note:** JSON2Video doesn't do a lip-synced
  photorealistic talking head the way D-ID did. What it generates instead
  is a narrated caption video — an AI (Azure) voice reading the lesson
  script over on-screen text. If you specifically want a talking face
  again, you'd need to add a provider like D-ID, HeyGen, or Synthesia
  alongside this. Renders also take longer than D-ID's clips did (the app
  now polls for up to ~4 minutes instead of ~1).

## Testing locally without deploying

You can open `index.html` directly in a browser to look at the UI, but
onboarding → lesson generation → quiz → RAG chat → lesson video will all
fail without the deployed proxies, since all of them need a live key
server-side.
