# CareerForge — Hackathon Plan

**Goal:** ship ONE polished, demoable slice in 24-48 hours that tells the whole story.

---

## Roles (chosen at sign-up)

Two account types, picked when you sign up:

- **Student** — uses all the tools: life logger, interview coach, resume checker,
  peer community, CCR 101 (CareerCorp Readiness), and can request alumni reviews.
- **Alumni** — a lightweight role with ONE job: read a student's submitted resume and
  leave a text review. That's it. No scheduling, no calls, no matching UI to build.
  A student submits a resume → it lands in an alumni review queue → an alumni writes
  text feedback → the student sees it.

This keeps the alumni feature demoable in minutes instead of being a whole subsystem.

## Anonymity & PII scrubbing (core privacy feature)

- **Everyone has an anonymous profile.** Students and alumni are identified only by a
  generated handle (e.g., "SunDevil_4821"), never their real name, in any public or
  peer-facing view.
- **Auto-scrub resumes on the peer ("Reddit for jobs") feature.** When a student drops a
  resume into the community feed, the app strips personal details BEFORE anyone can see it:
  - Names
  - Phone numbers
  - Email addresses
  - Physical addresses
  - Personal links (LinkedIn/GitHub/portfolio URLs, social handles)
  The scrubbed resume is what gets posted; the original is never exposed publicly.
- **How to build it (hackathon-fast):** run the resume text through a redaction pass —
  regex for the structured stuff (emails, phones, URLs) plus an LLM pass to catch names
  and anything the regex misses. Replace with placeholders like [NAME], [EMAIL], [PHONE].
- **Demo moment:** show a resume with real details going in, and the redacted version
  appearing in the public feed. Judges love a visible privacy win.

Note: alumni reviews (private, one-to-one) can keep more detail since they're not public,
but the reviewer still only sees the student's anonymous handle, not their identity.

## What to build (the demo slice)

**"Upload your resume → get an AI mock interview tailored to it → get an instant feedback report."**

This single flow demos 3 of your 6 pillars at once (resume checker + AI interview +
feedback loop), is fully interactive for judges, and hints at the bigger vision.

Cut for the demo (mention as "what's next"): voice, alumni network, peer community,
curriculum. Show them on ONE slide, don't build them.

---

## The 4-minute demo script

1. **Hook (30s):** "Students don't fail interviews because they're unqualified. They
   fail because they never practice and never get honest feedback. CareerForge fixes that."
2. **Upload (30s):** Drop in a resume + paste a job description.
3. **Interview (90s):** AI asks 3-4 tailored questions (pulled from the resume + JD).
   Judge or teammate answers live.
4. **Feedback (60s):** Instant report — score, what was strong, what to fix, a rewritten
   resume bullet, and a suggested STAR answer.
5. **Vision (30s):** One slide: "This is one piece of a full career-readiness platform —
   voice coaching, alumni reviews, anonymous peer community, delivered as a required course."

---

## Scope tiers (build in this order, stop when time runs out)

**TIER 1 — Must have (core demo, aim to finish first)**
- Resume upload (paste text is fine if file parsing is slow)
- Job description input
- Generate 3-4 tailored interview questions
- Text-based Q&A (type answers)
- Feedback report: score + strengths + fixes

**TIER 2 — Should have (makes it impressive)**
- Rewrite a weak resume bullet using the answer content
- Clean, polished UI (this wins hackathons more than features)
- STAR-structured suggested answer

**TIER 3 — Nice to have (only if ahead of schedule)**
- Voice input/output (speech-to-text, text-to-speech)
- Save/share the report
- Multiple rounds / difficulty levels

---

## Tech stack (fast to build, easy to demo)

- **Next.js** (React) — one repo, frontend + API routes, deploys to Vercel in minutes
- **An LLM API** for question generation + feedback (the whole brain of the app)
- **Tailwind CSS** — fast, clean UI
- **No database needed for the demo** — keep state in the browser session. Add one only
  if you have time. This removes a huge chunk of setup.

Why: fewest moving parts, deployable, and the LLM does the heavy lifting so you spend
time on the experience, not infrastructure.

---

## Team split (if you have 3-4 people)

- **Person A:** LLM prompts (question generation + feedback grading) — this is the core IP
- **Person B:** UI/UX flow (upload -> interview -> report), make it look clean
- **Person C:** Integration + deploy + demo script + slides
- **Person D (if any):** stretch goals (voice) or polish + backup demo recording

---

## Judging strategy

- **Record a backup demo video.** Live demos fail. Always have a recording.
- Lead with the problem and who it's for (ASU students — you have a real user base story).
- Emphasize the *loop* and the *required-course distribution* — judges love a plan for
  actual adoption, not just tech.
- Have the rewritten resume bullet ready as the "aha" moment.

---

## Anti-goals (do NOT do these at the hackathon)

- Don't build auth/login. Skip it.
- Don't build the database unless Tier 1 is done and solid.
- Don't build the community or alumni features. One slide only.
- Don't chase voice until everything else works.
