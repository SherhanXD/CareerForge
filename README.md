# CareerForge

Turn four years of student life into a career. A hackathon project built for ASU students.

CareerForge is one dashboard with six career-readiness tools that feed each other. Sign up
as a **student** (full toolkit) or an **alumni** (review student resumes). Everyone is
anonymous by default.

## Features

1. **Life Logger → Portfolio** — log your day; it becomes resume bullets and interview stories.
2. **AI Interview Coach** — tailored mock interview with scored feedback.
3. **Resume Checker** — score your resume against a job description with keyword gaps and tips.
4. **Alumni Reviews** — submit your resume anonymously for written alumni feedback.
5. **Anonymous Peer Feed** — share a resume; personal details are auto-scrubbed before posting.
6. **CCR 101 — CareerCorp Readiness** — short modules on workplace communication.

## Privacy

- Everyone gets an anonymous handle (e.g. `BoldSunDevil_4821`); real names are never shown.
- Resumes posted to the peer feed are auto-scrubbed of names, emails, phones, links, and addresses.

## Run it

For all tools except Resume Checker, no build step or install is needed. Open
`index.html` in a browser.

To use Resume Checker with the local SLM, install the dependencies described in
the `CareerForge SLM/README.md`, activate that Python environment, and
run from `CareerForge SLM`:

```bash
python api.py
```

Then open `http://127.0.0.1:8000`. The local server serves this website and
the Resume Checker API together. The first analysis loads the model and may
take longer. `GET /api/health` checks whether the adapter file is present.

Or serve it locally:

```bash
# Python
python -m http.server 8000
# then open http://localhost:8000

# or Node
npx serve
```

## Tech

Plain HTML, CSS, and JavaScript. All data is stored in the browser via `localStorage`,
so there's no backend for those tools. Resume Checker sends the pasted resume
and job description to the local SLM API; the other AI-labelled tools still use
client-side heuristics.

## Files

- `index.html` — landing page
- `auth.html` — sign up / log in (student vs alumni)
- `dashboard.html` — the app dashboard
- `app.js` — auth, sessions, dashboard rendering
- `features.js` — the six feature modules
- `styles.css` — styling

## Status

Hackathon prototype. Accounts, roles, anonymous handles, and all six tools are functional.
