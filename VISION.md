# CareerForge (working name)

**One platform that turns a student's everyday life into a job-ready career, then plugs them into a community and alumni network that helps them land the role.**

Built for ASU students first, designed to scale to any university.

---

## The Core Insight

Students don't struggle to get jobs because they lack ability. They struggle because:
- They don't know how to talk about themselves (interviews, "tell me about yourself").
- They forget the valuable things they actually did day to day.
- Their resume is a static document nobody reviews honestly.
- They have no low-stakes way to practice or get peer/expert feedback.
- Nobody taught them this as a real skill.

CareerForge fixes all five, in one connected loop.

---

## The Big Idea: The Career Loop

```
   LIVE IT              CAPTURE IT           PACKAGE IT
 (daily life)   -->   (life logger)   -->  (resume/portfolio)
                                                  |
                                                  v
   LAND IT             PRACTICE IT          REVIEW IT
 (job outcomes) <--  (AI interview)  <--  (peers + alumni)
```

Everything you do feeds the next stage. Your daily logs become portfolio bullets.
Your portfolio powers your resume. Your resume drives your mock interviews.
Your interview performance and resume get reviewed by peers and alumni.
That feedback loops back to improve everything.

---

## The Six Pillars (best of every idea, combined)

### 1. Life Logger → Auto-Portfolio
*(Your idea #2 daily life tracker + #3 portfolio)*

A dead-simple daily logger (text, voice note, or quick prompts). "What did you work
on today? What did you learn? What went wrong?"

The AI extracts:
- **Skills demonstrated** (e.g., "debugged a race condition" -> concurrency, problem-solving)
- **Achievements** (quantified where possible)
- **Projects** (auto-grouped from related entries)
- **STAR stories** (Situation-Task-Action-Result) ready for interviews

Output: a living portfolio + a bank of real, personal stories you can pull into
resumes and interviews. This is the secret weapon: most people forget 90% of what
they did. CareerForge remembers it for them.

### 2. AI Interview Coach (Voice)
*(Your idea #2 AI voice interview bot)*

A voice bot that runs realistic mock interviews:
- **Behavioral** ("Tell me about a time you failed") — pulls from YOUR logged stories.
- **Technical** — role-specific.
- **Company/role-tailored** — paste a job description, it adapts.

Gives feedback on:
- Content (did you answer the question, was it structured — STAR)
- Delivery (filler words, pace, confidence, clarity)
- Relevance to the target role and to your own resume

Because it knows your resume AND your life log, it can call out gaps:
"Your resume says you led a team, but you didn't mention leadership in your answer."

### 3. Resume Checker with Feedback Loop
*(Your idea #2 resume checker)*

Upload a resume, get:
- ATS/keyword analysis against a target job description
- Bullet-by-bullet rewrite suggestions (using your real logged achievements)
- A score with specific, actionable fixes
- **Cross-check with interview performance** — "You interview well on projects but
  your resume buries them. Move them up."

This is the connective tissue: resume + interview + life log reviewed together.

### 4. Alumni Network for Reviews
*(Your idea #3 connect with ASU alumni)*

Match students with ASU alumni (by major, target industry, company) for:
- Resume reviews
- Mock interviews / informational chats
- Referrals over time

Alumni get a lightweight, structured way to give back (templated review requests,
time-boxed, no messy DMs). Verified via ASU affiliation.

### 5. Anonymous Peer Community ("Reddit for Jobs")
*(Your idea #4)*

A feed where students:
- Drop resumes anonymously and get peer comments
- Share offers, rejections, interview questions they got asked
- Upvote the best advice
- Crowdsource "what does company X actually ask?"

Anonymity lowers the fear of judgment. Peer volume covers what alumni can't scale to.

### 6. CCR 101 — CareerCorp Readiness + Required Curriculum
*(Your ideas #1 and #5)*

The teachable backbone that makes this a real, credit-bearing course:
- Modules on workplace communication, email etiquette, meetings, feedback, negotiation
- Interview and resume fundamentals
- Assignments that ARE the product: "log 5 days," "run 2 mock interviews,"
  "get 1 peer review," "book 1 alumni chat"

Delivered as a **required 1-credit career-readiness course**. The platform is the
homework and the toolkit. This is the distribution engine — every student uses it
because it's built into their degree.

---

## Why This Combination Wins

- **Self-reinforcing:** each pillar makes the others better. The life log feeds the
  interview bot AND the resume. Reviews feed back into all three.
- **Built-in distribution:** the required course guarantees users. No cold-start problem.
- **Human + AI:** AI for scale and practice, alumni/peers for trust and real feedback.
- **Data moat:** over a semester, CareerForge knows a student better than any resume can.

---

## Suggested Build Order (MVP first)

You cannot build all six at once. Recommended sequence:

**Phase 1 — Core value, buildable now**
1. Resume Checker (upload + JD + feedback + score)
2. Life Logger with AI extraction into portfolio bullets

**Phase 2 — The differentiator**
3. AI Interview Coach (start text, then add voice)
4. Connect interview + resume + log feedback into one report

**Phase 3 — Community & scale**
5. Anonymous peer community
6. Alumni matching

**Phase 4 — Institutional**
7. Package CCR 101 (CareerCorp Readiness) + curriculum integration, LMS hooks, instructor dashboards

---

## Tech Sketch (high level)

- **Frontend:** web app (React/Next.js), mobile-friendly for quick daily logging
- **Backend:** API service; auth with ASU SSO for student/alumni verification
- **AI layer:** LLM for extraction, resume analysis, interview Q&A + feedback;
  speech-to-text + text-to-speech for the voice bot
- **Data:** user profiles, life-log entries, resume versions, interview transcripts,
  community posts, alumni matches
- **Privacy:** anonymity for community posts, strict separation of identity from
  anonymous content, student data protections

---

## Open Questions

- Is this ASU-only to start, or university-agnostic from day one?
- Web-first or mobile-first? (Logging wants mobile; the rest is fine on web.)
- Do you want to start prototyping Phase 1, or refine this vision more first?
