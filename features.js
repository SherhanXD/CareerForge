/* ============================================================
   CareerForge — feature modules
   Most features run client-side; Resume Checker calls the local SLM API.
   ============================================================ */

/* ---------- per-user data store ---------- */
function dataKey(user, name) { return `cf_${name}_${user.id}`; }
function loadData(user, name, fallback) {
  try { return JSON.parse(localStorage.getItem(dataKey(user, name))) ?? fallback; }
  catch { return fallback; }
}
function saveData(user, name, value) {
  localStorage.setItem(dataKey(user, name), JSON.stringify(value));
}
/* shared (cross-user) store, e.g. peer feed & alumni queue */
function loadShared(name, fallback) {
  try { return JSON.parse(localStorage.getItem(`cf_shared_${name}`)) ?? fallback; }
  catch { return fallback; }
}
function saveShared(name, value) {
  localStorage.setItem(`cf_shared_${name}`, JSON.stringify(value));
}

function escapeHtml(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ============================================================
   THE "BRAIN" — heuristic stand-ins for AI
   ============================================================ */

const SKILL_MAP = [
  { kw: ['debug', 'bug', 'fixed', 'error', 'crash'], skill: 'Debugging & problem-solving' },
  { kw: ['led', 'organized', 'coordinated', 'managed', 'mentored'], skill: 'Leadership' },
  { kw: ['team', 'collaborated', 'pair', 'group'], skill: 'Teamwork & collaboration' },
  { kw: ['presented', 'demo', 'pitch', 'spoke', 'talk'], skill: 'Communication & presenting' },
  { kw: ['python', 'java', 'javascript', 'react', 'sql', 'node', 'c++', 'html', 'css'], skill: 'Technical / programming' },
  { kw: ['designed', 'figma', 'ui', 'ux', 'wireframe', 'prototype'], skill: 'Design' },
  { kw: ['data', 'analysis', 'analyzed', 'metrics', 'dashboard', 'excel'], skill: 'Data analysis' },
  { kw: ['wrote', 'documentation', 'blog', 'report', 'essay'], skill: 'Writing & documentation' },
  { kw: ['deadline', 'planned', 'scheduled', 'prioritized'], skill: 'Time management' },
  { kw: ['learned', 'studied', 'course', 'tutorial', 'researched'], skill: 'Self-learning' },
];

function extractSkills(text) {
  const lower = text.toLowerCase();
  const found = [];
  SKILL_MAP.forEach(({ kw, skill }) => {
    if (kw.some(k => lower.includes(k)) && !found.includes(skill)) found.push(skill);
  });
  return found.length ? found : ['General experience'];
}

// Turn a log entry into a resume bullet + a STAR-ish interview story.
function logToPortfolio(text) {
  const skills = extractSkills(text);
  const clean = text.trim().replace(/\s+/g, ' ');
  const firstVerb = clean.split(' ')[0];
  const action = firstVerb.match(/ed$|ing$/i) ? clean : `Worked on ${clean.charAt(0).toLowerCase()}${clean.slice(1)}`;
  const bullet = `${action.charAt(0).toUpperCase()}${action.slice(1)}${/[.!?]$/.test(action) ? '' : '.'}`;
  const story =
    `Situation: ${clean}\n` +
    `Task: I needed to make progress and deliver a result.\n` +
    `Action: I broke it down, applied ${skills[0].toLowerCase()}, and pushed it forward.\n` +
    `Result: I completed it and can now speak to it confidently in an interview.`;
  return { skills, bullet, story };
}

// PII scrubbing — the privacy feature. Regex + simple name detection.
function scrubPII(text) {
  let redactions = 0;
  let out = text;
  const bump = (re, label) => {
    out = out.replace(re, () => { redactions++; return label; });
  };
  // emails
  bump(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');
  // phone numbers (various formats)
  bump(/(\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[PHONE]');
  // urls & social/portfolio links
  bump(/\b(https?:\/\/|www\.)[^\s]+/gi, '[LINK]');
  bump(/\b(linkedin\.com|github\.com|behance\.net|dribbble\.com)\/[^\s]+/gi, '[LINK]');
  // street addresses (number + street words)
  bump(/\d{1,5}\s+([A-Z][a-z]+\s){1,3}(St|Street|Ave|Avenue|Rd|Road|Blvd|Dr|Drive|Ln|Lane|Ct|Court)\.?/g, '[ADDRESS]');
  // likely full names on the first non-empty line (common resume header)
  const lines = out.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (/^([A-Z][a-z]+)(\s[A-Z]\.?)?\s([A-Z][a-z]+)$/.test(t)) {
      lines[i] = lines[i].replace(t, '[NAME]');
      redactions++;
    }
    break; // only the header line
  }
  out = lines.join('\n');
  return { text: out, redactions };
}

// Interview questions from a role/resume.
function makeInterviewQuestions(role, resume) {
  const base = [
    `Tell me about yourself and why you're interested in the ${role || 'this'} role.`,
    'Describe a challenging problem you solved. What was your approach?',
    'Tell me about a time you worked on a team. What was your contribution?',
    'What is a project you are proud of, and what did you learn from it?',
    'Where do you see yourself growing in this role?',
  ];
  if (/[a-z]/.test(resume || '')) {
    base.splice(2, 0, 'Your background mentions specific experience — walk me through it in detail.');
  }
  return base.slice(0, 5);
}

// Feedback on a single interview answer.
function gradeAnswer(answer) {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const wc = words.length;
  const fillers = (answer.toLowerCase().match(/\b(um|uh|like|you know|basically|actually|literally)\b/g) || []).length;
  const hasStar = /(situation|task|action|result|because|so that|which led|as a result)/i.test(answer);
  const hasNumber = /\d/.test(answer);

  let score = 50;
  if (wc >= 40) score += 20; else if (wc >= 20) score += 10;
  if (hasStar) score += 15;
  if (hasNumber) score += 10;
  score -= fillers * 4;
  score = Math.max(10, Math.min(99, score));

  const notes = [];
  if (wc < 20) notes.push('Your answer was short. Aim for 4–6 sentences with a concrete example.');
  else notes.push('Good length — detailed enough to be convincing.');
  if (!hasStar) notes.push('Structure it with STAR: Situation, Task, Action, Result.');
  else notes.push('Nice structure — you walked through the story clearly.');
  if (hasNumber) notes.push('Great use of a concrete number to show impact.');
  else notes.push('Add a number or measurable result if you can.');
  if (fillers > 2) notes.push(`Watch filler words (found ${fillers}). Pause instead of saying "um" or "like".`);

  return { score, notes };
}

/* ============================================================
   FEATURE RENDERERS — each returns HTML and wires events via init fn
   ============================================================ */
window.CF_FEATURES = {};

/* ---------- 1. LIFE LOGGER ---------- */
window.CF_FEATURES.logger = {
  render(user) {
    const logs = loadData(user, 'logs', []);
    return `
      <div class="feat">
        <div class="feat-input">
          <h3>What did you work on today?</h3>
          <p class="feat-sub">Write a sentence or two. CareerForge turns it into resume bullets and interview stories.</p>
          <textarea id="logText" class="ta" placeholder="e.g. Debugged a tricky login bug and led a study group for the midterm."></textarea>
          <button class="btn btn-primary" id="logAdd">✨ Add & extract</button>
        </div>
        <h4 class="list-head">Your portfolio (${logs.length})</h4>
        <div id="logList" class="card-list">${this.listHtml(logs)}</div>
      </div>`;
  },
  listHtml(logs) {
    if (!logs.length) return `<p class="empty">No entries yet. Add your first above.</p>`;
    return logs.slice().reverse().map(l => `
      <div class="entry">
        <div class="entry-top"><span class="entry-date">${timeAgo(l.at)}</span></div>
        <p class="entry-raw">${escapeHtml(l.text)}</p>
        <div class="chips">${l.skills.map(s => `<span class="chip">${escapeHtml(s)}</span>`).join('')}</div>
        <div class="mini"><strong>📄 Resume bullet</strong><p>${escapeHtml(l.bullet)}</p></div>
        <div class="mini"><strong>🎤 Interview story</strong><pre>${escapeHtml(l.story)}</pre></div>
      </div>`).join('');
  },
  init(user) {
    document.getElementById('logAdd').addEventListener('click', () => {
      const el = document.getElementById('logText');
      const text = el.value.trim();
      if (!text) { el.focus(); return; }
      const { skills, bullet, story } = logToPortfolio(text);
      const logs = loadData(user, 'logs', []);
      logs.push({ text, skills, bullet, story, at: new Date().toISOString() });
      saveData(user, 'logs', logs);
      el.value = '';
      document.getElementById('logList').innerHTML = this.listHtml(logs);
      document.querySelector('.list-head').textContent = `Your portfolio (${logs.length})`;
    });
  },
};

/* ---------- 2. AI INTERVIEW COACH ---------- */
window.CF_FEATURES.interview = {
  render(user) {
    return `
      <div class="feat">
        <div class="feat-input">
          <h3>Set up your mock interview</h3>
          <label class="field"><span>Target role</span>
            <input id="ivRole" placeholder="e.g. Software Engineering Intern" /></label>
          <label class="field"><span>Paste your resume (optional — tailors questions)</span>
            <textarea id="ivResume" class="ta sm" placeholder="Paste resume text..."></textarea></label>
          <button class="btn btn-primary" id="ivStart">🎤 Start interview</button>
        </div>
        <div id="ivArea"></div>
      </div>`;
  },
  init(user) {
    const area = document.getElementById('ivArea');
    const startBtn = document.getElementById('ivStart');
    const runInterview = () => {
      const role = document.getElementById('ivRole').value.trim();
      const resume = document.getElementById('ivResume').value.trim();
      const qs = makeInterviewQuestions(role, resume);
      let i = 0;
      const results = [];
      const showQ = () => {
        area.innerHTML = `
          <div class="iv-card">
            <div class="iv-progress">Question ${i + 1} of ${qs.length}</div>
            <h3 class="iv-q">${escapeHtml(qs[i])}</h3>
            <textarea id="ivAns" class="ta" placeholder="Type your answer..."></textarea>
            <button class="btn btn-primary" id="ivNext">${i === qs.length - 1 ? 'Finish & get feedback' : 'Next question'}</button>
          </div>`;
        document.getElementById('ivNext').addEventListener('click', () => {
          const ans = document.getElementById('ivAns').value.trim();
          results.push({ q: qs[i], a: ans, grade: gradeAnswer(ans) });
          i++;
          if (i < qs.length) showQ(); else showReport();
        });
      };
      const showReport = () => {
        const avg = Math.round(results.reduce((s, r) => s + r.grade.score, 0) / results.length);
        area.innerHTML = `
          <div class="report">
            <div class="score-ring" style="--v:${avg}"><span>${avg}</span><small>/100</small></div>
            <h3>Interview feedback</h3>
            ${results.map((r, n) => `
              <div class="iv-review">
                <p class="iv-rq">Q${n + 1}: ${escapeHtml(r.q)}</p>
                <p class="iv-ra">${r.a ? escapeHtml(r.a) : '<em>(no answer)</em>'}</p>
                <div class="score-bar"><span style="width:${r.grade.score}%"></span></div>
                <ul>${r.grade.notes.map(nt => `<li>${escapeHtml(nt)}</li>`).join('')}</ul>
              </div>`).join('')}
            <button class="btn btn-ghost" id="ivRestart">↻ Practice again</button>
          </div>`;
        document.getElementById('ivRestart').addEventListener('click', runInterview);
      };
      showQ();
    };
    startBtn.addEventListener('click', runInterview);
  },
};

/* ---------- 3. RESUME CHECKER ---------- */
window.CF_FEATURES.resume = {
  render(user) {
    return `
      <div class="feat">
        <div class="feat-input">
          <h3>Check your resume against a job</h3>
          <label class="field"><span>Your resume</span>
            <textarea id="rcResume" class="ta" placeholder="Paste your resume text..."></textarea></label>
          <label class="field"><span>Job description</span>
            <textarea id="rcJd" class="ta sm" placeholder="Paste the job description..."></textarea></label>
          <button class="btn btn-primary" id="rcRun">📊 Analyze</button>
        </div>
        <div id="rcArea"></div>
      </div>`;
  },
  init(user) {
    document.getElementById('rcRun').addEventListener('click', async () => {
      const resume = document.getElementById('rcResume').value.trim();
      const jd = document.getElementById('rcJd').value.trim();
      if (!resume || !jd) { alert('Paste both your resume and a job description.'); return; }
      const button = document.getElementById('rcRun');
      const area = document.getElementById('rcArea');
      button.disabled = true;
      button.textContent = 'Analyzing…';
      area.innerHTML = '<p class="feat-sub" role="status">Analyzing your resume. This may take a minute.</p>';
      try {
        const response = await fetch('/api/resume-check', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resume, job_description: jd }),
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.error || 'Analysis failed.');
        const score = Math.max(0, Math.min(100, Number(res.overall_score) || 0));
        const list = (value) => Array.isArray(value) ? value : [];
        const scores = res.category_scores || {};
        const categories = [['Job relevance', scores.job_relevance], ['Impact', scores.impact], ['Clarity', scores.clarity], ['Completeness', scores.completeness]];
        area.innerHTML = `
        <div class="report">
          <div class="score-ring" style="--v:${score}"><span>${score}</span><small>/100</small></div>
          <p class="report-line">Resume match score</p>
          <div class="two-col">${categories.map(([label, value]) => `<div class="mini"><strong>${label}</strong><span>${escapeHtml(String(value ?? '—'))}/100</span></div>`).join('')}</div>
          <div class="two-col">
            <div><h4>✅ Matched skills</h4><div class="chips">${list(res.matched_skills).map(k => `<span class="chip good">${escapeHtml(String(k))}</span>`).join('') || '<span class="empty">none</span>'}</div></div>
            <div><h4>⚠️ Missing skills</h4><div class="chips">${list(res.missing_skills).map(k => `<span class="chip bad">${escapeHtml(String(k))}</span>`).join('') || '<span class="empty">none</span>'}</div></div>
          </div>
          <h4>Strengths</h4><ul class="tips">${list(res.strengths).map(s => `<li><strong>${escapeHtml(String(s.evidence || ''))}</strong> ${escapeHtml(String(s.reason || ''))}</li>`).join('') || '<li>No strengths listed.</li>'}</ul>
          <h4>💡 How to improve</h4><ul class="tips">${list(res.issues).map(i => `<li><strong>${escapeHtml(String(i.section || 'Resume'))}:</strong> ${escapeHtml(String(i.reason || ''))} ${escapeHtml(String(i.suggestion || ''))}</li>`).join('') || '<li>No issues listed.</li>'}</ul>
          ${list(res.rewrites).filter(r => r.facts_added === false).length ? `<h4>Suggested rewrites</h4><ul class="tips">${list(res.rewrites).filter(r => r.facts_added === false).map(r => `<li>${escapeHtml(String(r.original || ''))} → ${escapeHtml(String(r.suggested || ''))}</li>`).join('')}</ul>` : ''}
          ${list(res.limitations).length ? `<h4>Limitations</h4><ul class="tips">${list(res.limitations).map(t => `<li>${escapeHtml(String(t))}</li>`).join('')}</ul>` : ''}
          <p class="report-line">CareerForge rubric score, not a hiring prediction.</p>
        </div>`;
      } catch (error) {
        area.innerHTML = `<p class="form-error" role="alert">${escapeHtml(error instanceof TypeError ? 'Cannot reach Resume Checker. Start the local API server.' : error.message)}</p>`;
      } finally {
        button.disabled = false;
        button.textContent = '📊 Analyze';
      }
    });
  },
};

/* ---------- 4. ALUMNI REVIEWS (student side) ---------- */
window.CF_FEATURES.alumni = {
  render(user) {
    const mine = loadShared('reviewQueue', []).filter(r => r.studentId === user.id);
    return `
      <div class="feat">
        <div class="feat-input">
          <h3>Request an alumni resume review</h3>
          <p class="feat-sub">Submit your resume and an ASU alumni will leave written feedback. You stay anonymous — they only see your handle (${escapeHtml(user.handle)}).</p>
          <textarea id="alResume" class="ta" placeholder="Paste your resume..."></textarea>
          <button class="btn btn-primary" id="alSubmit">🎓 Submit for review</button>
        </div>
        <h4 class="list-head">Your submissions (${mine.length})</h4>
        <div id="alList" class="card-list">${this.listHtml(mine)}</div>
      </div>`;
  },
  listHtml(items) {
    if (!items.length) return `<p class="empty">No submissions yet.</p>`;
    return items.slice().reverse().map(r => `
      <div class="entry">
        <div class="entry-top">
          <span class="entry-date">${timeAgo(r.at)}</span>
          <span class="status ${r.review ? 'done' : 'pending'}">${r.review ? 'Reviewed' : 'Pending'}</span>
        </div>
        <pre class="entry-raw">${escapeHtml(r.resume.slice(0, 240))}${r.resume.length > 240 ? '…' : ''}</pre>
        ${r.review ? `<div class="mini review"><strong>🎓 ${escapeHtml(r.reviewerHandle || 'Alumni')} says:</strong><p>${escapeHtml(r.review)}</p></div>` : `<p class="empty">Waiting for an alumni to review.</p>`}
      </div>`).join('');
  },
  init(user) {
    document.getElementById('alSubmit').addEventListener('click', () => {
      const resume = document.getElementById('alResume').value.trim();
      if (!resume) return;
      const q = loadShared('reviewQueue', []);
      q.push({ id: Date.now(), studentId: user.id, studentHandle: user.handle, resume, review: null, at: new Date().toISOString() });
      saveShared('reviewQueue', q);
      document.getElementById('alResume').value = '';
      const mine = q.filter(r => r.studentId === user.id);
      document.getElementById('alList').innerHTML = this.listHtml(mine);
      document.querySelector('.list-head').textContent = `Your submissions (${mine.length})`;
    });
  },
};

/* ---------- 4b. REVIEW QUEUE (alumni side) ---------- */
window.CF_FEATURES.queue = {
  render(user) {
    const q = loadShared('reviewQueue', []);
    const pending = q.filter(r => !r.review);
    const done = q.filter(r => r.review && r.reviewerId === user.id);
    return `
      <div class="feat">
        <h3>Resumes waiting for review (${pending.length})</h3>
        <p class="feat-sub">Read the resume and leave honest written feedback. Students are anonymous.</p>
        <div id="qPending" class="card-list">${this.pendingHtml(pending)}</div>
        <h4 class="list-head">Reviews you've given (${done.length})</h4>
        <div class="card-list">${done.map(r => `<div class="entry"><div class="entry-top"><span class="entry-date">${escapeHtml(r.studentHandle)}</span><span class="status done">Done</span></div><div class="mini review"><p>${escapeHtml(r.review)}</p></div></div>`).join('') || '<p class="empty">None yet.</p>'}</div>
      </div>`;
  },
  pendingHtml(pending) {
    if (!pending.length) return `<p class="empty">Nothing in the queue right now. Check back later.</p>`;
    return pending.slice().reverse().map(r => `
      <div class="entry">
        <div class="entry-top"><span class="entry-date">From ${escapeHtml(r.studentHandle)} · ${timeAgo(r.at)}</span></div>
        <pre class="entry-raw">${escapeHtml(r.resume)}</pre>
        <textarea class="ta sm rvText" data-id="${r.id}" placeholder="Write your feedback..."></textarea>
        <button class="btn btn-primary rvSend" data-id="${r.id}">Send review</button>
      </div>`).join('');
  },
  init(user) {
    document.querySelectorAll('.rvSend').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = Number(btn.getAttribute('data-id'));
        const text = document.querySelector(`.rvText[data-id="${id}"]`).value.trim();
        if (!text) return;
        const q = loadShared('reviewQueue', []);
        const item = q.find(r => r.id === id);
        if (item) { item.review = text; item.reviewerId = user.id; item.reviewerHandle = user.handle; }
        saveShared('reviewQueue', q);
        const pending = q.filter(r => !r.review);
        document.getElementById('qPending').innerHTML = this.pendingHtml(pending);
        this.init(user);
      });
    });
  },
};

/* ---------- 5. ANONYMOUS PEER FEED ---------- */
window.CF_FEATURES.feed = {
  render(user) {
    const posts = loadShared('feed', []);
    return `
      <div class="feat">
        <div class="feat-input">
          <h3>Drop your resume for anonymous peer feedback</h3>
          <p class="feat-sub">🔒 Personal details (name, email, phone, links, address) are auto-removed before anyone sees your post.</p>
          <textarea id="fdText" class="ta" placeholder="Paste your resume or ask a question..."></textarea>
          <button class="btn btn-primary" id="fdPreview">🔍 Preview scrubbed version</button>
          <div id="fdPreviewBox"></div>
        </div>
        <h4 class="list-head">Community feed (${posts.length})</h4>
        <div id="fdList" class="card-list">${this.listHtml(posts, user)}</div>
      </div>`;
  },
  listHtml(posts, user) {
    if (!posts.length) return `<p class="empty">No posts yet. Be the first to share.</p>`;
    return posts.slice().reverse().map(p => `
      <div class="entry">
        <div class="entry-top">
          <span class="entry-date">${escapeHtml(p.author)} · ${timeAgo(p.at)}</span>
          <button class="upvote" data-id="${p.id}">▲ ${p.votes}</button>
        </div>
        ${p.redactions ? `<span class="scrub-note">🔒 ${p.redactions} personal detail(s) removed</span>` : ''}
        <pre class="entry-raw">${escapeHtml(p.text)}</pre>
        <div class="comments">
          ${p.comments.map(c => `<div class="comment"><strong>${escapeHtml(c.author)}</strong> ${escapeHtml(c.text)}</div>`).join('')}
          <div class="comment-add">
            <input class="cmtInput" data-id="${p.id}" placeholder="Add anonymous comment..." />
            <button class="btn btn-ghost cmtBtn" data-id="${p.id}">Post</button>
          </div>
        </div>
      </div>`).join('');
  },
  init(user) {
    const previewBox = document.getElementById('fdPreviewBox');
    document.getElementById('fdPreview').addEventListener('click', () => {
      const raw = document.getElementById('fdText').value.trim();
      if (!raw) return;
      const { text, redactions } = scrubPII(raw);
      previewBox.innerHTML = `
        <div class="preview">
          <span class="scrub-note">🔒 ${redactions} personal detail(s) will be removed</span>
          <pre class="entry-raw">${escapeHtml(text)}</pre>
          <button class="btn btn-primary" id="fdPost">Post this anonymously</button>
        </div>`;
      document.getElementById('fdPost').addEventListener('click', () => {
        const posts = loadShared('feed', []);
        posts.push({ id: Date.now(), author: user.handle, text, redactions, votes: 0, comments: [], at: new Date().toISOString() });
        saveShared('feed', posts);
        document.getElementById('fdText').value = '';
        previewBox.innerHTML = '';
        document.getElementById('fdList').innerHTML = this.listHtml(posts, user);
        document.querySelector('.list-head').textContent = `Community feed (${posts.length})`;
        this.bindFeed(user);
      });
    });
    this.bindFeed(user);
  },
  bindFeed(user) {
    document.querySelectorAll('.upvote').forEach(b => b.addEventListener('click', () => {
      const id = Number(b.getAttribute('data-id'));
      const posts = loadShared('feed', []);
      const p = posts.find(x => x.id === id); if (p) p.votes++;
      saveShared('feed', posts);
      document.getElementById('fdList').innerHTML = this.listHtml(posts, user);
      this.bindFeed(user);
    }));
    document.querySelectorAll('.cmtBtn').forEach(b => b.addEventListener('click', () => {
      const id = Number(b.getAttribute('data-id'));
      const input = document.querySelector(`.cmtInput[data-id="${id}"]`);
      const text = input.value.trim(); if (!text) return;
      const posts = loadShared('feed', []);
      const p = posts.find(x => x.id === id);
      if (p) p.comments.push({ author: user.handle, text });
      saveShared('feed', posts);
      document.getElementById('fdList').innerHTML = this.listHtml(posts, user);
      this.bindFeed(user);
    }));
  },
};

/* ---------- 6. CCR 101 — CareerCorp Readiness ---------- */
const CCR_MODULES = [
  { t: 'Professional Email', body: 'Keep it short. Clear subject line, greeting, one main ask, a polite close. Reply within 24h. Proofread before sending.' },
  { t: 'Running & Joining Meetings', body: 'Come with an agenda or know the goal. Speak up early. Take notes. End with clear next steps and owners.' },
  { t: 'Giving & Taking Feedback', body: 'Be specific and kind: situation, behavior, impact. When receiving it, listen fully, thank them, and ask one clarifying question.' },
  { t: 'Networking Without the Cringe', body: 'Lead with curiosity, not asks. Ask about their path. Follow up with one specific thing you learned. Keep it human.' },
  { t: 'Negotiating an Offer', body: 'Always thank them first. Ask for time. Anchor with research. Negotiate total package, not just salary. Get it in writing.' },
  { t: 'Resume Fundamentals', body: 'One page. Action verbs. Quantify results. Tailor to each job. No personal pronouns. Consistent formatting.' },
];
window.CF_FEATURES.talk = {
  render(user) {
    const done = loadData(user, 'ccrDone', []);
    return `
      <div class="feat">
        <h3>CareerCorp Readiness — 6 quick modules</h3>
        <p class="feat-sub">Progress: ${done.length}/${CCR_MODULES.length} complete</p>
        <div class="module-grid">
          ${CCR_MODULES.map((m, i) => `
            <div class="module ${done.includes(i) ? 'done' : ''}">
              <div class="module-head"><h4>${escapeHtml(m.t)}</h4>${done.includes(i) ? '<span class="check">✓</span>' : ''}</div>
              <p>${escapeHtml(m.body)}</p>
              <button class="btn ${done.includes(i) ? 'btn-ghost' : 'btn-primary'} ccrBtn" data-i="${i}">
                ${done.includes(i) ? 'Completed' : 'Mark complete'}</button>
            </div>`).join('')}
        </div>
      </div>`;
  },
  init(user) {
    document.querySelectorAll('.ccrBtn').forEach(b => b.addEventListener('click', () => {
      const i = Number(b.getAttribute('data-i'));
      const done = loadData(user, 'ccrDone', []);
      if (!done.includes(i)) done.push(i);
      saveData(user, 'ccrDone', done);
      const host = document.getElementById('dashContent');
      // re-render just this feature
      if (window.CF_RENDER_TOOL) window.CF_RENDER_TOOL('talk');
    }));
  },
};
