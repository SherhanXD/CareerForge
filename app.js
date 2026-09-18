/* CareerForge — front-end logic (no backend, uses localStorage) */

const DB_KEY = 'careerforge_users';
const SESSION_KEY = 'careerforge_session';

/* ---------- storage helpers ---------- */
function getUsers() {
  try { return JSON.parse(localStorage.getItem(DB_KEY)) || []; }
  catch { return []; }
}
function saveUsers(users) { localStorage.setItem(DB_KEY, JSON.stringify(users)); }
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
  catch { return null; }
}
function setSession(user) { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

/* ---------- anonymous handle generator ---------- */
function makeHandle() {
  const adjectives = ['Bold', 'Swift', 'Bright', 'Calm', 'Sharp', 'Keen', 'Brave', 'Wise'];
  const nouns = ['SunDevil', 'Scholar', 'Maroon', 'Gold', 'Cactus', 'Pitchfork', 'Forge', 'Spark'];
  const a = adjectives[Math.floor(Math.random() * adjectives.length)];
  const n = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${a}${n}_${num}`;
}
function initials(str) {
  const parts = str.replace(/[^a-zA-Z ]/g, '').trim().split(/\s+/);
  if (parts.length === 0) return 'CF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/* ============================================================
   AUTH PAGE
   ============================================================ */
function initAuthPage() {
  const tabSignup = document.getElementById('tabSignup');
  const tabLogin = document.getElementById('tabLogin');
  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');
  if (!signupForm || !loginForm) return;

  function showTab(tab) {
    const isSignup = tab === 'signup';
    tabSignup.classList.toggle('active', isSignup);
    tabLogin.classList.toggle('active', !isSignup);
    signupForm.classList.toggle('hidden', !isSignup);
    loginForm.classList.toggle('hidden', isSignup);
  }
  tabSignup.addEventListener('click', () => showTab('signup'));
  tabLogin.addEventListener('click', () => showTab('login'));

  // open on the right tab based on ?mode=
  const params = new URLSearchParams(location.search);
  showTab(params.get('mode') === 'login' ? 'login' : 'signup');

  // SIGN UP
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = document.getElementById('signupError');
    err.textContent = '';
    const fd = new FormData(signupForm);
    const name = fd.get('name').trim();
    const email = fd.get('email').trim().toLowerCase();
    const password = fd.get('password');
    const role = fd.get('role');

    const users = getUsers();
    if (users.some(u => u.email === email)) {
      err.textContent = 'An account with that email already exists. Try logging in.';
      return;
    }
    const user = {
      id: Date.now(),
      name, email, password, role,
      handle: makeHandle(),
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    saveUsers(users);
    setSession(user);
    location.href = 'dashboard.html';
  });

  // LOGIN
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = document.getElementById('loginError');
    err.textContent = '';
    const fd = new FormData(loginForm);
    const email = fd.get('email').trim().toLowerCase();
    const password = fd.get('password');
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      err.textContent = 'No matching account. Check your email and password.';
      return;
    }
    setSession(user);
    location.href = 'dashboard.html';
  });
}

/* ============================================================
   DASHBOARD PAGE
   ============================================================ */
const STUDENT_TOOLS = [
  { id: 'logger', icon: '📝', title: 'Life Logger', desc: 'Turn today into resume bullets and interview stories.', tag: 'AI' },
  { id: 'interview', icon: '🎤', title: 'AI Interview Coach', desc: 'Practice a mock interview tailored to your resume.', tag: 'AI' },
  { id: 'resume', icon: '📄', title: 'Resume Checker', desc: 'Score your resume against a job description.', tag: 'AI' },
  { id: 'alumni', icon: '🎓', title: 'Alumni Reviews', desc: 'Submit your resume for honest written feedback.', tag: 'People' },
  { id: 'feed', icon: '💬', title: 'Anonymous Peer Feed', desc: 'Share a scrubbed resume and get peer comments.', tag: 'Community' },
  { id: 'talk', icon: '🏢', title: 'CCR 101 — CareerCorp Readiness', desc: 'Master workplace communication in short modules.', tag: 'Learn' },
];
const ALUMNI_TOOLS = [
  { id: 'queue', icon: '📥', title: 'Review Queue', desc: 'Read student resumes and leave written feedback.', tag: 'Reviews' },
];

function initDashboard() {
  const dashContent = document.getElementById('dashContent');
  if (!dashContent) return;

  const user = getSession();
  if (!user) { location.href = 'auth.html?mode=login'; return; }

  // header
  document.getElementById('welcome').textContent = `Welcome back, ${user.handle}`;
  document.getElementById('handle').textContent = user.handle;
  document.getElementById('roleBadge').textContent = user.role === 'alumni' ? 'Alumni' : 'Student';
  document.getElementById('avatar').textContent = initials(user.name || user.handle);

  const tools = user.role === 'alumni' ? ALUMNI_TOOLS : STUDENT_TOOLS;

  // sidebar
  const sideNav = document.getElementById('sideNav');
  sideNav.innerHTML = `<a class="side-item active" data-nav="home">🏠 <span>Dashboard</span></a>` +
    tools.map(t => `<a class="side-item" data-nav="${t.id}">${t.icon} <span>${t.title}</span></a>`).join('');

  function renderHome() {
    const intro = user.role === 'alumni'
      ? `<div class="banner"><h2>Thanks for giving back 🎓</h2><p>Students submit resumes anonymously. Read them and leave honest text feedback, that's the whole job.</p></div>`
      : `<div class="banner"><h2>Pick a tool to get started</h2><p>Everything you do feeds the next step. Log your day, then watch it show up in your resume and interviews.</p></div>`;

    dashContent.innerHTML = intro + `<div class="tool-grid">` + tools.map(t => `
      <button class="tool-card" data-nav="${t.id}">
        <div class="tool-top">
          <span class="tool-icon">${t.icon}</span>
          <span class="tag">${t.tag}</span>
        </div>
        <h3>${t.title}</h3>
        <p>${t.desc}</p>
        <span class="tool-open">Open →</span>
      </button>`).join('') + `</div>`;
    bindNav();
  }

  function renderTool(id) {
    const tool = tools.find(t => t.id === id);
    if (!tool && id !== 'home') return;
    if (id === 'home') { renderHome(); return; }

    const feature = window.CF_FEATURES && window.CF_FEATURES[id];
    const body = feature
      ? feature.render(user)
      : `<div class="placeholder"><p>🚧 Coming soon.</p></div>`;

    dashContent.innerHTML = `
      <button class="back-link" data-nav="home">← Back to dashboard</button>
      <div class="tool-view">
        <div class="tool-view-head">
          <span class="tool-icon lg">${tool.icon}</span>
          <div><h2>${tool.title}</h2><p>${tool.desc}</p></div>
        </div>
        ${body}
      </div>`;
    bindNav();
    if (feature && typeof feature.init === 'function') feature.init(user);
  }

  // let feature modules trigger a re-render of themselves
  window.CF_RENDER_TOOL = renderTool;

  function bindNav() {
    document.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        const target = el.getAttribute('data-nav');
        document.querySelectorAll('.side-item').forEach(s =>
          s.classList.toggle('active', s.getAttribute('data-nav') === target));
        if (target === 'home') renderHome(); else renderTool(target);
      });
    });
  }

  document.getElementById('logoutBtn').addEventListener('click', () => {
    clearSession();
    location.href = 'index.html';
  });

  renderHome();
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  initAuthPage();
  initDashboard();
});
