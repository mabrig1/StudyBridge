# StudyBridge — Nigerian-first, offline-friendly learning assistant

StudyBridge is an accessible student study companion: upload or paste your own course notes, locate matching explanations with unit citations, practise questions, track completion, and share study-circle invitations.

## Run it

**Static/offline mode:** open `index.html` or deploy the repository root to Cloudflare Pages or GitHub Pages. No build command is needed. After the first hosted visit, the service worker caches the shell for offline reopening.

**Python backend mode** (adds PDF/DOCX extraction, optional AI tutoring):

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Open `http://127.0.0.1:8000`. The app and API share the same origin. A `Dockerfile` is provided for Python-capable container hosts.

## Features and limitations

| Capability | Static host / offline | Python server |
| --- | --- | --- |
| Dashboard, library, paste notes | Yes | Yes |
| TXT/Markdown import | Yes | Yes |
| PDF/DOCX import | No | Yes |
| Local note-grounded excerpt retrieval | Yes | Yes |
| Quiz scoring and progress | Yes | Yes |
| WhatsApp study-circle invitations | Yes | Yes |
| Optional generative AI answers | No | Yes, with private server key |

This is an **MVP**, not a paid SaaS or collaborative learning-management system. Offline tutor responses are extracted from user-supplied material, not generated explanations. Custom-note quizzes emphasise recognition rather than mastery. Multiple devices do not synchronise student notes, and the app has no student accounts, payments, OCR, live study rooms or administrative dashboard.

Browser data can be lost when users clear storage: **export JSON backups frequently**. Sample courses are demo material rather than official Nigerian syllabuses.

## Enable optional AI (server-side only)

Set the following environment variables in the private Python server environment:

```bash
STUDYBRIDGE_AI_API_KEY=<your-key>
STUDYBRIDGE_AI_MODEL=gpt-4o-mini
STUDYBRIDGE_AI_BASE_URL=https://api.openai.com/v1
```

No key is necessary for normal offline study. The key **must not appear in index.html, browser JavaScript, public Pages variables or the Git repository**. Only when the student opts into online AI does the app send their question and up to four relevant note excerpts to the configured provider. The server itself does not store that content.

**Critical:** do not expose the Python AI endpoint publicly with a paid key until identity, per-user quotas, WAF / rate limits, moderation, spending caps and abuse monitoring are implemented. This example backend is intentionally not production-hardened. Do not enable paid AI by merely adding a secret to an unrestricted public server.

## Deploy the static version

- **Cloudflare Pages:** connect this repository, leave build command blank, publish directory `/` (repository root).
- **GitHub Pages:** Settings → Pages → Deploy from branch → `main` → `/(root)`. Repository code alone does not enable Pages.
- **Python hosting:** deploy with the supplied Dockerfile or run Uvicorn behind HTTPS on a Python ASGI host. Do not use static-only Pages for the Python API.

## Checks

```bash
pip install -r requirements-dev.txt
python -m pytest tests -q
```

The GitHub Actions workflow runs these tests on pushes to `main` and on pull requests.

## Repository layout

- `index.html` — portable, single-file study UI with embedded CSS and JavaScript.
- `manifest.webmanifest`, `favicon.svg`, `sw.js` — progressive-web-app shell.
- `app/main.py` — FastAPI document import, offline tutor endpoint and optional AI bridge.
- `app/knowledge.py` — bounded excerpt matching and unit citations.
- `tests/` — backend smoke tests and privacy regression checks.
- `.env.example`, `requirements*.txt`, `Dockerfile` — deployment configuration.

© 2026 StudyBridge. Use only educational materials you have the right to share.
