# StudyBridge — offline-first learning companion

StudyBridge helps students organize their own notes, study by topic, practice questions, and invite classmates to study circles. Built with accessibility and low-data use in mind.

## Try the app

Open [index.html](./index.html) in a browser, or deploy the repository as a **static site** using Cloudflare Pages, GitHub Pages, or another static host. The homepage is `index.html`; no build command is required.

## Features in this repository

- Responsive desktop and mobile dashboard, dark mode.
- Course library with editable personal notes and three sample subjects.
- Note-grounded **offline retrieval**: answers quote matching note extracts, with unit citations. This is **not** generative AI.
- Practice quizzes, local progress records, and WhatsApp invitation generator.
- Paste notes or import text / Markdown files; local data stored in IndexedDB with a fallback.
- Export, restore, or delete personal data; service worker for basic offline page caching after the first visit.

## Limitations

**This branch is the single-file static edition.** PDF/DOCX imports and optional generative AI require the separate Python backend from the StudyBridge v1.0 development package; that backend is **not included in this repository yet**. Student accounts, payments, synchronized data, and real-time rooms are not present. The "online AI" toggle will not work without a separately deployed compatible /api service.

Materials you save reside on the browser/device, and can be lost if site data is cleared. Make frequent JSON backups. The demo lessons are not official course material.

## Static deployment

### Cloudflare Pages

Create a Pages project connected to `mabrig1/StudyBridge` with **no build command** and publish the repository root. Do not put an AI provider key in browser code or Pages public environment variables.

### GitHub Pages

In repository **Settings → Pages**, choose **Deploy from a branch**; branch `main`, folder `/(root)`. GitHub Pages configuration is not automatically enabled by pushing these files.

## Production requirements for AI

Before deploying a paid AI backend, add authentication, per-user usage limits, rate limiting / WAF, abuse protection, secrets kept on the server, and document privacy controls. Only then connect the full FastAPI backend.

This repository was initialized from the existing standalone StudyBridge offline app. Full project download remains in the earlier ChatGPT conversation.
