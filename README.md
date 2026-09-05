# AI Teacher — deploy with working avatar video

The avatar video didn't work as a plain static HTML file because D-ID's API
blocks direct calls from a browser (CORS). This folder fixes that with a
tiny serverless proxy. Deploy time: about 2 minutes, free.

## Folder structure
```
/index.html               ← the app (open this locally to test the UI, not the AI features)
/api/did-clip.js          ← serverless proxy that talks to D-ID on the server side
/api/claude-message.js    ← serverless proxy that talks to Claude on the server side
```

## Deploy on Vercel (fastest option)

1. Go to https://vercel.com and sign up / log in (free, no card needed for this).
2. Click **Add New → Project → Deploy without Git** (or drag-and-drop this
   whole folder onto the Vercel dashboard import screen — both work).
3. Once it's created, go to **Project → Settings → Environment Variables**
   and add BOTH of these:
   - Key: `DID_API_KEY` — Value: your D-ID API key (from D-ID Studio)
   - Key: `ANTHROPIC_API_KEY` — Value: your Anthropic API key (from
     console.anthropic.com — note this is billed separately from any
     claude.ai subscription, and needs prepaid credit on the account)
4. Redeploy (Vercel prompts you to after adding env vars — required, they
   don't apply to a deployment that's already live).
5. Open the deployed URL — lesson generation, chat, and avatar video should
   all now work.

You can also add the video key with the Vercel CLI from this folder:
```bash
vercel env add DID_API_KEY production
vercel env add DID_API_KEY preview
vercel env add DID_API_KEY development
```
Paste the key when prompted, then redeploy with `vercel --prod`.

## Why this fixes it

- **CORS**: neither D-ID's API nor Anthropic's API accept requests directly
  from a browser page — both expect a server to call them. The proxies
  (`api/did-clip.js`, `api/claude-message.js`) run on Vercel's server and
  forward the requests — your browser now talks to your own domain, which
  has no CORS restriction, and your domain talks to D-ID/Anthropic
  server-to-server.
- **Key exposure**: both keys now live only in Vercel's environment
  variables, never in any file you'd commit or share. Safe to make the repo
  public.

## Testing locally without deploying

You can open `index.html` directly in a browser to look at the UI, but
onboarding → lesson generation → quiz → RAG chat → avatar video will all
fail without the deployed proxies, since all of them need a live key
server-side.
