# AI Workflow Toolkit

Practical, free workflow tools and automation guides for solo consultants and small agencies.

## Run locally

Requirements: Node.js 20.3+ (Node 22 LTS recommended).

```bash
npm install
npm run dev
```

Open the local URL Astro prints in your terminal. Build for production with `npm run build`; output is in `dist/`.

## Deploy to Cloudflare Pages

1. Sign in to Cloudflare and open **Workers & Pages**.
2. Choose **Create application → Pages → Connect to Git** and select `piyushnath227/ai-workflow-toolkit`.
3. Framework preset: **Astro** (or None if Astro is not offered).
4. Build command: `npm run build`; build output directory: `dist`.
5. Save and deploy. The site is static and does not need secrets or a paid AI API.

The canonical site URL is configured as `https://ai-workflow-toolkit.pages.dev` in `astro.config.mjs`. If you choose a different Pages project name or add a custom domain, update that value.

## What is included

- Responsive landing page
- Client-side onboarding checklist generator (no account or API key)
- Practical automation guides
- Digital toolkit landing page
- SEO metadata, sitemap integration, and robots.txt

## Important

The checklist generator uses deterministic templates in the browser; it does not send client information to a server. Review and customize each checklist before using it with a real client.
