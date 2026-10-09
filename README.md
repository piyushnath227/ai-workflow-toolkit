# AI Workflow Toolkit

A free, browser-first workflow blueprint builder for solo consultants and small agencies. Describe a business process and get a structured workflow plan, visual map, tool-mapping suggestions, failure-handling rules, test checklist, and downloadable JSON or Markdown.

**Live site:** https://ai-workflow-toolkit.pages.dev  
**Workflow Builder:** https://ai-workflow-toolkit.pages.dev/builder/

## Features

- Template-powered workflow builder for client onboarding, lead follow-up, content production, customer support triage, weekly reporting, and general processes.
- Visual step map with triggers, actions, decisions, human approval points, and final verification.
- Build plan with suggested tool mappings, decision rules, failure modes, implementation sequence, and monitoring ideas.
- Test checklist for happy paths, missing data, duplicate triggers, integration failures, approval gates, verification mismatches, and privacy/access.
- Export as JSON for structured use or Markdown for sharing with a teammate or developer.
- Existing client onboarding checklist generator and practical guides.
- Responsive dark interface; no account, server-side data storage, or paid API key required.

## Important scope note

The builder is deterministic and template-powered. It does **not** call a live AI model, connect to external apps, or execute workflows. Outputs are implementation blueprints, not proof that an integration has been deployed or tested. Review tool capabilities, permissions, security, and pricing before implementing any workflow in production.

## Run locally

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

Build the static site:

```bash
npm run build
npm run preview
```

The production build is generated in `dist/`. The project is built with Astro and can be deployed to Cloudflare Pages using:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: leave empty
- Environment variables: none required

A GitHub Actions workflow in `.github/workflows/build.yml` runs the Astro build on pushes and pull requests to `main`.

## Privacy

Workflow input and generated content are processed in the browser. The site does not submit workflow descriptions to an AI provider or application server.

## License

MIT
