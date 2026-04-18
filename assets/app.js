/* ═══════════════════════════════════════════════
   Seped28 Portfolio — app.js
   Fetches live data from GitHub API at runtime.
   No build step required.
═══════════════════════════════════════════════ */

const GITHUB_USERNAME = 'Seped28';
const GITHUB_API      = 'https://api.github.com';

// ─── LANGUAGE COLORS (subset of github/linguist) ────────────────────
const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  HTML: '#e34c26', CSS: '#563d7c', SCSS: '#c6538c',
  Java: '#b07219', 'C#': '#178600', 'C++': '#f34b7d',
  C: '#555555', Go: '#00ADD8', Rust: '#dea584',
  Ruby: '#701516', PHP: '#4F5D95', Swift: '#F05138',
  Kotlin: '#A97BFF', Dart: '#00B4AB', Shell: '#89e051',
  Vue: '#41b883', Svelte: '#ff3e00', Jupyter: '#DA5B0B',
  'Jupyter Notebook': '#DA5B0B', Makefile: '#427819',
  default: '#8b949e'
};

function langColor(lang) {
  return LANG_COLORS[lang] || LANG_COLORS.default;
}

// ─── SKILL CHIP COLORS ───────────────────────────────────────────────
const SKILL_PALETTES = [
  '#c8f53e','#06d6a0','#3178c6','#f1e05a','#ff6b6b',
  '#a29bfe','#fd79a8','#74b9ff','#55efc4','#ffeaa7'
];

// ─── CURSOR ──────────────────────────────────────────────────────────
const cursor      = document.getElementById('cursor');
const cursorTrail = document.getElementById('cursor-trail');
let mouseX = 0, mouseY = 0, trailX = 0, trailY = 0;

document.addEventListener('mousemove', e => {
  mouseX = e.clientX; mouseY = e.clientY;
  cursor.style.left = mouseX + 'px';
  cursor.style.top  = mouseY + 'px';
});

function animateTrail() {
  trailX += (mouseX - trailX) * .12;
  trailY += (mouseY - trailY) * .12;
  cursorTrail.style.left = trailX + 'px';
  cursorTrail.style.top  = trailY + 'px';
  requestAnimationFrame(animateTrail);
}
animateTrail();

document.querySelectorAll('a, button, .project-card, .skill-chip').forEach(el => {
  el.addEventListener('mouseenter', () => {
    cursor.style.width  = '20px';
    cursor.style.height = '20px';
    cursorTrail.style.width  = '50px';
    cursorTrail.style.height = '50px';
  });
  el.addEventListener('mouseleave', () => {
    cursor.style.width  = '12px';
    cursor.style.height = '12px';
    cursorTrail.style.width  = '36px';
    cursorTrail.style.height = '36px';
  });
});

// ─── NAVBAR SCROLL ───────────────────────────────────────────────────
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
});

// ─── CANVAS GRID BACKGROUND ──────────────────────────────────────────
const canvas = document.getElementById('grid-canvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let frame = 0;
function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cell = 60;
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1;

  // vertical lines
  for (let x = 0; x < canvas.width; x += cell) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  // horizontal lines
  for (let y = 0; y < canvas.height; y += cell) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // accent glow dots at intersections (animated)
  const t = frame * .02;
  for (let x = 0; x < canvas.width; x += cell) {
    for (let y = 0; y < canvas.height; y += cell) {
      const wave = Math.sin(x * .02 + t) * Math.cos(y * .02 + t);
      if (wave > .7) {
        const alpha = (wave - .7) / .3;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,245,62,${alpha * .8})`;
        ctx.fill();
      }
    }
  }

  frame++;
  requestAnimationFrame(drawGrid);
}
drawGrid();

// ─── SCROLL REVEAL ───────────────────────────────────────────────────
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => e.isIntersecting && e.target.classList.add('visible'));
}, { threshold: .1 });

function setupReveal() {
  document.querySelectorAll(
    '.section-label, .section-heading, .about-text p, .about-tags, ' +
    '.terminal-card, .skill-chip, .project-card, .contact-link, .stat'
  ).forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i % 6) * .06 + 's';
    revealObs.observe(el);
  });
}

// ─── COUNTER ANIMATION ───────────────────────────────────────────────
function animateCount(el, target, suffix = '') {
  const dur  = 1200;
  const step = 16;
  const inc  = target / (dur / step);
  let cur = 0;
  const t = setInterval(() => {
    cur = Math.min(cur + inc, target);
    el.textContent = Math.round(cur) + suffix;
    if (cur >= target) clearInterval(t);
  }, step);
}

// ─── GITHUB FETCH HELPERS ────────────────────────────────────────────
async function ghFetch(path) {
  const r = await fetch(`${GITHUB_API}${path}`, {
    headers: { 'Accept': 'application/vnd.github.v3+json' }
  });
  // If we hit a rate limit (403), try to return cached data if available
  if (r.status === 403) throw new Error("RATE_LIMIT"); 
  if (!r.ok) throw new Error(`GitHub API error: ${r.status}`);
  return r.json();
}

// ─── LOAD PROFILE ────────────────────────────────────────────────────
async function loadProfile() {
  const CACHE_KEY = 'gh_profile_cache';
  const ONE_HOUR = 3600000;
  
  try {
    let user;
    const cached = localStorage.getItem(CACHE_KEY);
    const lastFetch = localStorage.getItem(CACHE_KEY + '_time');

    if (cached && lastFetch && (Date.now() - lastFetch < ONE_HOUR)) {
      user = JSON.parse(cached);
    } else {
      user = await ghFetch(`/users/${GITHUB_USERNAME}`);
      localStorage.setItem(CACHE_KEY, JSON.stringify(user));
      localStorage.setItem(CACHE_KEY + '_time', Date.now());
    }

    animateCount(document.getElementById('stat-repos'),     user.public_repos);
    animateCount(document.getElementById('stat-followers'),  user.followers);

    if (user.email) {
      const emailLink = document.getElementById('email-link');
      if(emailLink) emailLink.href = `mailto:${user.email}`;
    }

    const bioText = user.bio || `Software developer · ${user.public_repos} public repositories`;
    const termEl  = document.getElementById('terminal-typing');
    if (termEl) {
      termEl.textContent = '';
      let i = 0;
      const bioInterval = setInterval(() => {
        if (i < bioText.length) {
          termEl.textContent += bioText[i++];
        } else {
          clearInterval(bioInterval);
        }
      }, 40);
    }
    return user;
  } catch (err) {
    console.warn('Profile fetch failed:', err.message);
    // Fallback to cache even if expired if we hit a rate limit
    const backup = localStorage.getItem(CACHE_KEY);
    if (backup) return JSON.parse(backup);
  }
}

// ─── LOAD REPOS & PROJECTS ───────────────────────────────────────────
async function loadRepos() {
  const CACHE_KEY = 'github_repos_cache';
  const CACHE_TIME_KEY = 'github_repos_timestamp';
  const ONE_HOUR = 3600000;

  try {
    let repos;
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTimestamp = localStorage.getItem(CACHE_TIME_KEY);

    if (cachedData && cachedTimestamp && (Date.now() - cachedTimestamp < ONE_HOUR)) {
      repos = JSON.parse(cachedData);
    } else {
      repos = await ghFetch(`/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=100&type=owner`);
      localStorage.setItem(CACHE_KEY, JSON.stringify(repos));
      localStorage.setItem(CACHE_TIME_KEY, Date.now());
    }

    const filtered = repos
      .filter(r => !r.fork && r.name !== GITHUB_USERNAME)
      .sort((a, b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.updated_at) - new Date(a.updated_at)));

    const displayed = filtered.slice(0, 30);
    renderProjects(displayed); // Make sure your rendering function is called here
  } catch (err) {
    console.error("Repo load failed:", err.message);
    const grid = document.getElementById('projects-grid');
    if (err.message === "RATE_LIMIT" || grid.innerHTML.includes("loading")) {
        // Try to show expired cache rather than an error if possible
        const backup = localStorage.getItem(CACHE_KEY);
        if (backup) {
            const repos = JSON.parse(backup);
            const filtered = repos.filter(r => !r.fork && r.name !== GITHUB_USERNAME);
            renderProjects(filtered.slice(0, 30));
        } else {
            grid.innerHTML = `<div class="error">⚠️ Could not load repositories. GitHub API rate limit may be active.</div>`;
        }
    }
  }
}

    // ── Total stars ──
    const totalStars = repos.reduce((s, r) => s + r.stargazers_count, 0);
    animateCount(document.getElementById('stat-stars'), totalStars);

    // ── Contributions (approximation via event count) ──
    try {
      const events = await ghFetch(`/users/${GITHUB_USERNAME}/events?per_page=100`);
      const pushEvents = events.filter(e => e.type === 'PushEvent');
      const commits = pushEvents.reduce((s, e) => s + (e.payload?.commits?.length || 0), 0);
      animateCount(document.getElementById('stat-commits'), commits, '+');
    } catch { document.getElementById('stat-commits').textContent = '—'; }

    // ── Terminal commits ──
    const commitEl = document.getElementById('terminal-commits');
    if (displayed.length > 0) {
      commitEl.innerHTML = displayed.slice(0, 3).map(r =>
        `<div class="t-out t-muted" style="margin:0">${r.name.slice(0,20).padEnd(20)} ${r.description ? r.description.slice(0,28) : 'No description'}</div>`
      ).join('');
    }

    // ── Build language filter ──
    const langs = [...new Set(displayed.map(r => r.language).filter(Boolean))];
    const filterEl = document.getElementById('projects-filter');
    langs.forEach(lang => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.dataset.filter = lang;
      btn.textContent = lang;
      filterEl.appendChild(btn);
    });

    filterEl.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.filter;
      document.querySelectorAll('.project-card').forEach(card => {
        const show = f === 'all' || card.dataset.lang === f;
        card.style.display = show ? '' : 'none';
      });
    });

    // ── Build skills from languages ──
    buildSkills(langs);

    // ── Render project cards ──
    grid.innerHTML = '';
    if (displayed.length === 0) {
      grid.innerHTML = '<div class="projects-loading"><span>No public repositories found.</span></div>';
      return;
    }

    displayed.forEach((repo, idx) => {
      const card = document.createElement('div');
      card.className = 'project-card reveal';
      card.dataset.lang = repo.language || '';
      card.style.transitionDelay = (idx % 6) * .07 + 's';

      const color   = langColor(repo.language);
      const updated = new Date(repo.updated_at).toLocaleDateString('en-US', { month:'short', year:'numeric' });
      const desc    = repo.description || 'No description provided.';
      const topic   = repo.topics?.[0] || '';

      card.innerHTML = `
        <div class="project-card-head">
          <div class="project-lang-dot">
            <div class="lang-dot" style="background:${color}"></div>
            ${repo.language || 'Unknown'}
          </div>
          <div class="project-links">
            <a href="${repo.html_url}" target="_blank" rel="noopener" class="project-link" title="View on GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
            </a>
            ${repo.homepage ? `<a href="${repo.homepage}" target="_blank" rel="noopener" class="project-link" title="Live site"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>` : ''}
          </div>
        </div>
        <div class="project-name">${repo.name}</div>
        <div class="project-desc">${escHtml(desc)}</div>
        <div class="project-meta">
          <div class="meta-item">⭐ ${repo.stargazers_count}</div>
          <div class="meta-item">🍴 ${repo.forks_count}</div>
          <div class="meta-item">📅 ${updated}</div>
          ${topic ? `<div class="project-topic">${escHtml(topic)}</div>` : ''}
        </div>
      `;

      grid.appendChild(card);
      revealObs.observe(card);
    });

  } catch (err) {
    console.warn('Repos fetch failed:', err.message);
    grid.innerHTML = `
      <div class="projects-loading">
        <span>⚠️ Could not load repositories. GitHub API rate limit may be active.<br/>
        <a href="https://github.com/${GITHUB_USERNAME}?tab=repositories" target="_blank" style="color:var(--accent)">
        View on GitHub ↗</a></span>
      </div>`;
  }
}

// ─── BUILD SKILLS ────────────────────────────────────────────────────
const STATIC_SKILLS = [
  'Git', 'GitHub', 'REST APIs', 'CLI Tools',
  'JSON', 'Markdown', 'npm / yarn', 'VS Code'
];

function buildSkills(langs) {
  const grid = document.getElementById('skills-grid');
  grid.innerHTML = '';

  const allSkills = [...langs, ...STATIC_SKILLS];

  allSkills.forEach((skill, i) => {
    const chip  = document.createElement('div');
    chip.className = 'skill-chip reveal';
    chip.style.transitionDelay = (i % 8) * .05 + 's';
    const color = langs.includes(skill) ? langColor(skill) : SKILL_PALETTES[i % SKILL_PALETTES.length];
    chip.innerHTML = `<div class="skill-dot" style="background:${color}"></div>${skill}`;
    grid.appendChild(chip);
    revealObs.observe(chip);
  });
}

// ─── FOOTER YEAR ─────────────────────────────────────────────────────
document.getElementById('footer-year').textContent = new Date().getFullYear();

// ─── UTILS ───────────────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── HAMBURGER ───────────────────────────────────────────────────────
const ham = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');
ham.addEventListener('click', () => {
  const open = navLinks.style.display === 'flex';
  navLinks.style.display = open ? 'none' : 'flex';
  navLinks.style.flexDirection = 'column';
  navLinks.style.position = 'absolute';
  navLinks.style.top = '70px';
  navLinks.style.left = '0';
  navLinks.style.right = '0';
  navLinks.style.background = 'var(--bg-card)';
  navLinks.style.padding = '1.5rem 2rem';
  navLinks.style.borderBottom = '1px solid var(--border)';
});

// ─── INIT ─────────────────────────────────────────────────────────────
async function init() {
  await loadProfile();
  await loadRepos();
  setupReveal();
}

init();
