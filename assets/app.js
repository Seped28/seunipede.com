/* ═══════════════════════════════════════════════
   Oluwaseun Ipede — Portfolio app.js
   Cartographic-themed interactions. Static site,
   no external API dependency.
═══════════════════════════════════════════════ */

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

document.querySelectorAll('a, button, .project-card, .skill-card, .pub-card, .contact-link').forEach(el => {
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

// ─── CONTOUR-LINE CANVAS BACKGROUND ──────────────────────────────────
// Simulates topographic contour lines using layered noise-based paths.
const canvas = document.getElementById('contour-canvas');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// simple pseudo-noise via layered sine waves (no deps)
function noise(x, y, t) {
  return (
    Math.sin(x * 0.006 + t * 0.4) * Math.cos(y * 0.008 - t * 0.3) +
    Math.sin(x * 0.013 - y * 0.011 + t * 0.2) * 0.5
  );
}

let frame = 0;
function drawContours() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const t = frame * 0.01;
  const levels = 14;
  const step = 26;

  for (let l = 0; l < levels; l++) {
    const threshold = -1.3 + (l / levels) * 2.6;
    const isAccent = l % 4 === 0;
    ctx.beginPath();
    ctx.strokeStyle = isAccent ? 'rgba(255,46,136,0.35)' : 'rgba(41,224,255,0.08)';
    ctx.lineWidth = isAccent ? 1.1 : .6;

    for (let x = 0; x < canvas.width; x += step) {
      let started = false;
      for (let y = 0; y < canvas.height; y += step) {
        const n = noise(x, y, t);
        if (Math.abs(n - threshold) < 0.045) {
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();
  }

  // scatter faint survey points at intersections with high noise
  const pt = frame * 0.015;
  for (let x = 0; x < canvas.width; x += 90) {
    for (let y = 0; y < canvas.height; y += 90) {
      const n = noise(x, y, pt);
      if (n > 1.0) {
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,46,136,0.5)';
        ctx.fill();
      }
    }
  }

  frame++;
  requestAnimationFrame(drawContours);
}
drawContours();

// ─── SCROLL REVEAL ───────────────────────────────────────────────────
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => e.isIntersecting && e.target.classList.add('visible'));
}, { threshold: .1 });

document.querySelectorAll(
  '.section-label, .section-heading, .section-intro, .about-text p, .about-tags, ' +
  '.field-card, .skill-card, .pub-card, .project-card, .contact-link, .stat, .cred-item'
).forEach((el, i) => {
  el.classList.add('reveal');
  el.style.transitionDelay = (i % 6) * .06 + 's';
  revealObs.observe(el);
});

// ─── COUNTER ANIMATION ───────────────────────────────────────────────
function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.dataset.suffix || '';
  const dur  = 1400;
  const step = 16;
  const inc  = target / (dur / step);
  let cur = 0;
  const t = setInterval(() => {
    cur = Math.min(cur + inc, target);
    el.textContent = Math.round(cur).toLocaleString() + suffix;
    if (cur >= target) clearInterval(t);
  }, step);
}

const statObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCount(e.target);
      statObs.unobserve(e.target);
    }
  });
}, { threshold: .5 });

document.querySelectorAll('.stat-num').forEach(el => statObs.observe(el));

// ─── TYPING EFFECT (field notes card) ────────────────────────────────
const focusText = "Spatial epidemiology, GeoAI, urban resilience";
const focusEl = document.getElementById('focus-typing');

function typeText(el, text, speed = 45) {
  let i = 0;
  el.textContent = '';
  const iv = setInterval(() => {
    if (i < text.length) {
      el.textContent += text[i++];
    } else {
      clearInterval(iv);
    }
  }, speed);
}

// Trigger typing once the field card scrolls into view
const fieldObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      typeText(focusEl, focusText);
      fieldObs.unobserve(e.target);
    }
  });
}, { threshold: .4 });

const fieldCard = document.querySelector('.field-card');
if (fieldCard) fieldObs.observe(fieldCard);

// ─── FOOTER YEAR ─────────────────────────────────────────────────────
document.getElementById('footer-year').textContent = new Date().getFullYear();

// ─── HAMBURGER ───────────────────────────────────────────────────────
const ham = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');
ham.addEventListener('click', () => {
  const open = navLinks.style.display === 'flex';
  navLinks.style.display = open ? 'none' : 'flex';
  navLinks.style.flexDirection = 'column';
  navLinks.style.position = 'absolute';
  navLinks.style.top = '68px';
  navLinks.style.left = '0';
  navLinks.style.right = '0';
  navLinks.style.background = 'var(--bg-card)';
  navLinks.style.padding = '1.5rem 2rem';
  navLinks.style.borderBottom = '1px solid var(--border)';
  navLinks.style.gap = '1rem';
});

// close mobile nav on link click
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    if (window.innerWidth <= 640) navLinks.style.display = 'none';
  });
});
