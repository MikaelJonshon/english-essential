// ── Progresso do Aluno — English Essential ─────────────────────────────────

const SUPABASE_URL  = 'https://jhpqdxqsgnyqtzqvggvx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocHFkeHFzZ255cXR6cXZnZ3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTEyMjksImV4cCI6MjA5NTY2NzIyOX0.xGC_jijXKpRAdhuyyTMQxS8qkca0Dap_Wcs3_8xKvcw';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

let session = null;
const initials = n => (n||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

function doLogout() { localStorage.removeItem('ee_session'); window.location.href = '../index.html'; }

// ── Init ────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try { session = JSON.parse(localStorage.getItem('ee_session')); } catch(e) {}
  if (!session || session.role !== 'student') { window.location.href = '../index.html'; return; }

  // Sidebar básica enquanto carrega
  renderSidebar(session);

  document.getElementById('topbarSub').textContent =
    new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  await loadProgress();
});

function renderSidebar(profile) {
  const av   = document.getElementById('sidebarAvatar');
  const name = document.getElementById('sidebarName');
  const disp = profile?.display_name || profile?.full_name || 'Aluno';
  av.textContent = profile?.avatar_url || initials(profile?.full_name || disp);
  av.classList.toggle('has-custom-avatar', Boolean(profile?.avatar_url));
  name.textContent = disp;
}

// ── Carregar dados ───────────────────────────────────────────────────────────
async function loadProgress() {
  const { data, error } = await db.rpc('get_student_progress', { p_caller_id: session.id });

  if (error || !data) {
    document.getElementById('loader').innerHTML =
      '<div style="color:var(--danger,#f87171);text-align:center;padding:40px;">Erro ao carregar progresso. Tente novamente.</div>';
    return;
  }

  // Atualiza sidebar XP
  const xp      = data.user?.total_xp   || 0;
  const level   = Math.floor(xp / 1000) + 1;
  const xpInLvl = xp % 1000;
  document.getElementById('sidebarLevel').textContent  = 'Nível ' + level;
  document.getElementById('sidebarXpNext').textContent = xpInLvl + ' / 1000 XP';
  document.getElementById('sidebarXpBar').style.width  = ((xpInLvl / 1000) * 100) + '%';
  document.getElementById('topbarXpVal').textContent   = xp + ' XP';

  const totEx   = Number(data.exercise_totals?.total   || 0);
  const corrEx  = Number(data.exercise_totals?.correct  || 0);
  const lessons = data.completed_lessons || [];
  const coins   = data.user?.coins || 0;

  // Ranking — topo
  renderRankPanel(level);

  // Stats rápidas
  document.getElementById('topbarXpVal').textContent  = xp + ' XP';
  document.getElementById('statXp').textContent       = xp.toLocaleString('pt-BR');
  document.getElementById('statLessons').textContent  = lessons.length;
  document.getElementById('statAccuracy').textContent = totEx > 0 ? Math.round((corrEx / totEx) * 100) + '%' : '—';
  document.getElementById('statCoins').textContent    = coins.toLocaleString('pt-BR');

  // Skills
  const skills = data.skills || { speaking: 0, listening: 0, writing: 0, reading: 0 };
  document.getElementById('legSpeaking').textContent  = skills.speaking  + '%';
  document.getElementById('legListening').textContent = skills.listening + '%';
  document.getElementById('legWriting').textContent   = skills.writing   + '%';
  document.getElementById('legReading').textContent   = skills.reading   + '%';

  // Radar sidebar + grande
  drawSidebarRadar(skills);
  drawBigRadar(skills);
  // Insights
  renderInsights(skills);
  // Lições
  renderLessons(lessons);

  // Mostra conteúdo
  document.getElementById('loader').style.display         = 'none';
  document.getElementById('progressContent').style.display = 'block';
}

// ── Radar sidebar (pequeno, animado) ─────────────────────────────────────────
function drawSidebarRadar(skills) {
  const canvas = document.getElementById('skillRadar');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const W = 220, H = 190, cx = 110, cy = 95, r = 60;
  const target = [skills.speaking, skills.listening, skills.writing, skills.reading];
  const labels = ['S', 'L', 'W', 'R'];
  const angles = [-Math.PI/2, 0, Math.PI/2, Math.PI];
  const offsets = [[0,-10],[10,4],[0,12],[-10,4]];

  const DURATION = 900; // ms
  const start    = performance.now();

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    const elapsed  = now - start;
    const progress = easeOutCubic(Math.min(elapsed / DURATION, 1));
    const vals     = target.map(v => v * progress);

    ctx.clearRect(0, 0, W, H);

    // Grid
    [.25, .5, .75, 1].forEach(t => {
      ctx.beginPath();
      angles.forEach((a, i) => {
        const x = cx+r*t*Math.cos(a), y = cy+r*t*Math.sin(a);
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(37,99,235,.12)'; ctx.lineWidth = 1; ctx.stroke();
    });

    // Eixos
    angles.forEach(a => {
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.lineTo(cx+r*Math.cos(a), cy+r*Math.sin(a));
      ctx.strokeStyle = 'rgba(37,99,235,.18)'; ctx.lineWidth = 1; ctx.stroke();
    });

    // Área
    ctx.beginPath();
    angles.forEach((a,i) => {
      const v = vals[i]/100, x = cx+r*v*Math.cos(a), y = cy+r*v*Math.sin(a);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fillStyle   = `rgba(37,99,235,${0.12 + 0.08 * progress})`;
    ctx.fill();
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2; ctx.stroke();

    // Pontos
    angles.forEach((a,i) => {
      const v = vals[i]/100;
      ctx.beginPath();
      ctx.arc(cx+r*v*Math.cos(a), cy+r*v*Math.sin(a), 3.5, 0, Math.PI*2);
      ctx.fillStyle = '#2563eb'; ctx.fill();
    });

    // Labels (aparecem junto com a animação)
    ctx.font = `11px "DM Sans",sans-serif`;
    ctx.globalAlpha = progress;
    angles.forEach((a,i) => {
      const lx = cx+(r+12)*Math.cos(a)+offsets[i][0];
      const ly = cy+(r+12)*Math.sin(a)+offsets[i][1];
      ctx.textAlign  = i===1?'left':i===3?'right':'center';
      ctx.fillStyle  = '#1a1a2e';
      ctx.fillText(labels[i], lx, ly);
    });
    ctx.globalAlpha = 1;

    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// ── Radar grande (animado) ────────────────────────────────────────────────────
function drawBigRadar(skills) {
  const canvas = document.getElementById('bigRadar');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const W = 400, H = 300, cx = 200, cy = 145, r = 95;
  const target = [skills.speaking, skills.listening, skills.writing, skills.reading];
  const labels = ['Speaking', 'Listening', 'Writing', 'Reading'];
  const colors = ['#2563eb', '#7c3aed', '#0891b2', '#059669'];
  const angles = [-Math.PI/2, 0, Math.PI/2, Math.PI];
  const offsets = [[0,-14],[20,4],[0,16],[-20,4]];

  const DURATION = 1000;
  const start    = performance.now();

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    const elapsed  = now - start;
    const progress = easeOutCubic(Math.min(elapsed / DURATION, 1));
    const vals     = target.map(v => v * progress);

    ctx.clearRect(0, 0, W, H);

    // Grid
    [.25, .5, .75, 1].forEach(t => {
      ctx.beginPath();
      angles.forEach((a, i) => {
        const x = cx+r*t*Math.cos(a), y = cy+r*t*Math.sin(a);
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(37,99,235,.10)'; ctx.lineWidth = 1; ctx.stroke();
      if (t < 1) {
        ctx.fillStyle = 'rgba(100,116,139,.5)'; ctx.font = '9px "DM Sans",sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(Math.round(t*100)+'%', cx+2, cy-r*t+3);
      }
    });

    // Eixos
    angles.forEach(a => {
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.lineTo(cx+r*Math.cos(a), cy+r*Math.sin(a));
      ctx.strokeStyle = 'rgba(37,99,235,.15)'; ctx.lineWidth = 1; ctx.stroke();
    });

    // Área
    ctx.beginPath();
    angles.forEach((a,i) => {
      const v = vals[i]/100, x = cx+r*v*Math.cos(a), y = cy+r*v*Math.sin(a);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.closePath();
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, `rgba(37,99,235,${0.25 * progress})`);
    grad.addColorStop(1, `rgba(37,99,235,${0.06 * progress})`);
    ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.5; ctx.stroke();

    // Pontos
    angles.forEach((a,i) => {
      const v = vals[i]/100, x = cx+r*v*Math.cos(a), y = cy+r*v*Math.sin(a);
      ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2);
      ctx.fillStyle = colors[i]; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    });

    // Labels (fade in)
    ctx.globalAlpha = progress;
    ctx.font = 'bold 12px "DM Sans",sans-serif';
    angles.forEach((a,i) => {
      const lx = cx+(r+18)*Math.cos(a)+offsets[i][0];
      const ly = cy+(r+18)*Math.sin(a)+offsets[i][1];
      ctx.textAlign = i===1?'left':i===3?'right':'center';
      ctx.fillStyle = colors[i];
      ctx.fillText(labels[i], lx, ly);
    });
    ctx.globalAlpha = 1;

    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// ── Insights ─────────────────────────────────────────────────────────────────
function renderInsights(skills) {
  const entries = [
    { key: 'speaking',  label: 'Speaking',  val: Number(skills.speaking)  },
    { key: 'listening', label: 'Listening', val: Number(skills.listening) },
    { key: 'writing',   label: 'Writing',   val: Number(skills.writing)   },
    { key: 'reading',   label: 'Reading',   val: Number(skills.reading)   },
  ];

  const allZero = entries.every(e => e.val === 0);
  const container = document.getElementById('insightsContent');

  if (allZero) {
    container.innerHTML = `
      <div class="prog-empty">
        <div class="prog-empty-icon">📊</div>
        <div>Complete alguns exercícios para ver sua análise de habilidades.</div>
      </div>`;
    return;
  }

  // Classifica
  const sorted = [...entries].sort((a,b) => b.val - a.val);
  const html = sorted.map(e => {
    let type, icon, title, desc;
    if (e.val >= 70) {
      type = 'strong'; icon = '💪';
      title = `${e.label} — Ponto forte`;
      desc  = `Excelente desempenho! Você acerta ${e.val}% dos exercícios de ${e.label}.`;
    } else if (e.val >= 40) {
      type = 'ok'; icon = '📈';
      title = `${e.label} — Em desenvolvimento`;
      desc  = `Bom progresso em ${e.label}. Continue praticando para chegar a 70%+.`;
    } else {
      type = 'weak'; icon = '🎯';
      title = `${e.label} — Precisa de atenção`;
      desc  = `${e.label} é a área que mais precisa de prática agora. Foque aqui!`;
    }
    return `
      <div class="insight-item insight-item--${type}">
        <div class="insight-icon">${icon}</div>
        <div class="insight-body">
          <div class="insight-title">${title}</div>
          <div class="insight-desc">${desc}</div>
          <div class="insight-bar-wrap">
            <div class="insight-bar-track">
              <div class="insight-bar-fill insight-bar-fill--${type}" style="width:${e.val}%"></div>
            </div>
            <div class="insight-score">${e.val}%</div>
          </div>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = html;
}

// ── Gráfico XP ───────────────────────────────────────────────────────────────
function drawXpChart(xpByDay) {
  const canvas = document.getElementById('xpChart');
  if (!canvas) return;

  // Gera os últimos 30 dias
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  const byDay = {};
  xpByDay.forEach(e => { byDay[e.day] = e.xp; });

  const labels = days.map(d => {
    const [, m, day] = d.split('-');
    return `${day}/${m}`;
  });
  const values = days.map(d => byDay[d] || 0);

  // Detecta dark blue
  const isDark = document.documentElement.classList.contains('dark-blue');
  const gridColor  = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const labelColor = isDark ? '#64748b' : '#94a3b8';

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'XP',
        data: values,
        backgroundColor: values.map(v => v > 0 ? 'rgba(37,99,235,.7)' : 'rgba(148,163,184,.15)'),
        borderRadius: 5,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` +${ctx.parsed.y} XP`
          }
        }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: { color: labelColor, font: { size: 11 } }
        }
      }
    }
  });
}

// ── Sistema de Ranking ────────────────────────────────────────────────────────

const RANKS = [
  {
    name: 'Bronze', minLv: 1, maxLv: 10,
    color: '#cd7f32', glow: 'rgba(205,127,50,.6)',
    gradient: ['#7c4a1a','#cd7f32','#f0a84e','#cd7f32','#7c4a1a'],
    svg: (size=120) => `
      <svg width="${size}" height="${size}" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bz-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7c4a1a"/>
            <stop offset="40%" stop-color="#cd7f32"/>
            <stop offset="70%" stop-color="#f0a84e"/>
            <stop offset="100%" stop-color="#7c4a1a"/>
          </linearGradient>
          <linearGradient id="bz-sh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(255,200,100,.25)"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
          </linearGradient>
        </defs>
        <path d="M60 4 L108 24 L108 72 Q108 108 60 136 Q12 108 12 72 L12 24 Z" fill="url(#bz-g)" stroke="rgba(255,180,60,.3)" stroke-width="1.5"/>
        <path d="M60 14 L98 30 L98 72 Q98 100 60 124 Q22 100 22 72 L22 30 Z" fill="url(#bz-sh)"/>
        <circle cx="60" cy="70" r="24" fill="none" stroke="rgba(255,180,60,.35)" stroke-width="2"/>
        <text x="60" y="77" text-anchor="middle" font-family="serif" font-size="28" font-weight="900" fill="rgba(255,200,100,.9)">B</text>
        <ellipse cx="60" cy="22" rx="20" ry="5" fill="rgba(255,200,100,.15)"/>
      </svg>`
  },
  {
    name: 'Prata', minLv: 10, maxLv: 20,
    color: '#b0b8c8', glow: 'rgba(176,184,200,.6)',
    gradient: ['#6b7280','#b0b8c8','#e2e8f0','#b0b8c8','#6b7280'],
    svg: (size=120) => `
      <svg width="${size}" height="${size}" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="sv-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#6b7280"/>
            <stop offset="35%" stop-color="#b0b8c8"/>
            <stop offset="60%" stop-color="#e2e8f0"/>
            <stop offset="100%" stop-color="#6b7280"/>
          </linearGradient>
        </defs>
        <path d="M60 4 L108 24 L108 72 Q108 108 60 136 Q12 108 12 72 L12 24 Z" fill="url(#sv-g)" stroke="rgba(220,230,240,.3)" stroke-width="1.5"/>
        <path d="M60 18 L96 34 L96 72 Q96 102 60 126 Q24 102 24 72 L24 34 Z" fill="rgba(255,255,255,.08)"/>
        <circle cx="60" cy="70" r="22" fill="none" stroke="rgba(220,235,255,.4)" stroke-width="1.5"/>
        <circle cx="60" cy="70" r="16" fill="none" stroke="rgba(220,235,255,.2)" stroke-width="1"/>
        <text x="60" y="77" text-anchor="middle" font-family="serif" font-size="26" font-weight="900" fill="rgba(230,240,255,.9)">S</text>
        <path d="M48 46 L72 46" stroke="rgba(220,235,255,.3)" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M48 94 L72 94" stroke="rgba(220,235,255,.3)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`
  },
  {
    name: 'Ouro', minLv: 20, maxLv: 30,
    color: '#fbbf24', glow: 'rgba(251,191,36,.65)',
    gradient: ['#b45309','#f59e0b','#fde68a','#f59e0b','#b45309'],
    svg: (size=120) => `
      <svg width="${size}" height="${size}" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="go-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#b45309"/>
            <stop offset="40%" stop-color="#f59e0b"/>
            <stop offset="65%" stop-color="#fde68a"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
        </defs>
        <path d="M60 4 L108 24 L108 72 Q108 108 60 136 Q12 108 12 72 L12 24 Z" fill="url(#go-g)" stroke="rgba(253,230,138,.35)" stroke-width="1.5"/>
        <path d="M60 18 L96 34 L96 72 Q96 102 60 126 Q24 102 24 72 L24 34 Z" fill="rgba(255,255,255,.1)"/>
        <polygon points="60,44 63.5,55 75,55 65.5,62 69,73 60,66 51,73 54.5,62 45,55 56.5,55" fill="rgba(255,240,100,.9)" stroke="rgba(180,83,9,.3)" stroke-width=".5"/>
        <circle cx="60" cy="90" r="8" fill="none" stroke="rgba(253,230,138,.4)" stroke-width="1.5"/>
        <text x="60" y="94" text-anchor="middle" font-family="serif" font-size="9" font-weight="900" fill="rgba(253,230,138,.8)">G</text>
      </svg>`
  },
  {
    name: 'Platina', minLv: 30, maxLv: 40,
    color: '#67e8f9', glow: 'rgba(103,232,249,.6)',
    gradient: ['#0e7490','#22d3ee','#a5f3fc','#22d3ee','#0e7490'],
    svg: (size=120) => `
      <svg width="${size}" height="${size}" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="pt-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0e7490"/>
            <stop offset="40%" stop-color="#22d3ee"/>
            <stop offset="65%" stop-color="#a5f3fc"/>
            <stop offset="100%" stop-color="#0e7490"/>
          </linearGradient>
        </defs>
        <path d="M60 4 L108 24 L108 72 Q108 108 60 136 Q12 108 12 72 L12 24 Z" fill="url(#pt-g)" stroke="rgba(165,243,252,.3)" stroke-width="1.5"/>
        <path d="M60 18 L96 34 L96 72 Q96 102 60 126 Q24 102 24 72 L24 34 Z" fill="rgba(255,255,255,.1)"/>
        <polygon points="60,50 65,63 79,63 68,72 72,85 60,76 48,85 52,72 41,63 55,63" fill="rgba(165,243,252,.85)" stroke="rgba(14,116,144,.4)" stroke-width=".5"/>
        <circle cx="60" cy="63" r="5" fill="rgba(255,255,255,.5)"/>
        <path d="M36 30 L84 30" stroke="rgba(165,243,252,.25)" stroke-width="1" stroke-linecap="round"/>
        <path d="M30 110 L90 110" stroke="rgba(165,243,252,.2)" stroke-width="1" stroke-linecap="round"/>
      </svg>`
  },
  {
    name: 'Diamante', minLv: 40, maxLv: 50,
    color: '#818cf8', glow: 'rgba(129,140,248,.65)',
    gradient: ['#3730a3','#6366f1','#c7d2fe','#6366f1','#3730a3'],
    svg: (size=120) => `
      <svg width="${size}" height="${size}" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dm-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#3730a3"/>
            <stop offset="35%" stop-color="#6366f1"/>
            <stop offset="60%" stop-color="#c7d2fe"/>
            <stop offset="100%" stop-color="#3730a3"/>
          </linearGradient>
        </defs>
        <path d="M60 4 L108 24 L108 72 Q108 108 60 136 Q12 108 12 72 L12 24 Z" fill="url(#dm-g)" stroke="rgba(199,210,254,.3)" stroke-width="1.5"/>
        <path d="M60 18 L96 34 L96 72 Q96 102 60 126 Q24 102 24 72 L24 34 Z" fill="rgba(255,255,255,.08)"/>
        <polygon points="60,42 76,58 60,98 44,58" fill="rgba(199,210,254,.8)" stroke="rgba(55,48,163,.3)" stroke-width=".5"/>
        <polygon points="60,42 76,58 60,70 44,58" fill="rgba(255,255,255,.35)"/>
        <line x1="44" y1="58" x2="76" y2="58" stroke="rgba(165,180,252,.5)" stroke-width="1"/>
        <circle cx="40" cy="38" r="2" fill="rgba(199,210,254,.7)"/>
        <circle cx="80" cy="38" r="2" fill="rgba(199,210,254,.7)"/>
        <circle cx="60" cy="28" r="2" fill="rgba(199,210,254,.9)"/>
        <circle cx="40" cy="105" r="1.5" fill="rgba(199,210,254,.5)"/>
        <circle cx="80" cy="105" r="1.5" fill="rgba(199,210,254,.5)"/>
      </svg>`
  },
  {
    name: 'Mestre', minLv: 50, maxLv: 80,
    color: '#c084fc', glow: 'rgba(192,132,252,.7)',
    gradient: ['#6b21a8','#a855f7','#e9d5ff','#a855f7','#6b21a8'],
    svg: (size=120) => `
      <svg width="${size}" height="${size}" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="ms-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#6b21a8"/>
            <stop offset="35%" stop-color="#a855f7"/>
            <stop offset="60%" stop-color="#e9d5ff"/>
            <stop offset="100%" stop-color="#6b21a8"/>
          </linearGradient>
        </defs>
        <path d="M60 4 L108 24 L108 72 Q108 108 60 136 Q12 108 12 72 L12 24 Z" fill="url(#ms-g)" stroke="rgba(233,213,255,.3)" stroke-width="1.5"/>
        <path d="M60 18 L96 34 L96 72 Q96 102 60 126 Q24 102 24 72 L24 34 Z" fill="rgba(255,255,255,.08)"/>
        <!-- Coroa -->
        <path d="M38 75 L38 58 L48 68 L60 48 L72 68 L82 58 L82 75 Z" fill="rgba(233,213,255,.85)" stroke="rgba(107,33,168,.4)" stroke-width=".8" stroke-linejoin="round"/>
        <rect x="36" y="75" width="48" height="8" rx="2" fill="rgba(233,213,255,.7)"/>
        <circle cx="60" cy="48" r="4" fill="rgba(255,255,255,.9)"/>
        <circle cx="38" cy="58" r="3" fill="rgba(233,213,255,.8)"/>
        <circle cx="82" cy="58" r="3" fill="rgba(233,213,255,.8)"/>
        <text x="60" y="108" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="800" fill="rgba(233,213,255,.7)" letter-spacing="1">MESTRE</text>
      </svg>`
  },
  {
    name: 'Grão-Mestre', minLv: 80, maxLv: 100,
    color: '#f87171', glow: 'rgba(248,113,113,.75)',
    gradient: ['#7f1d1d','#ef4444','#fca5a5','#ef4444','#7f1d1d'],
    svg: (size=120) => `
      <svg width="${size}" height="${size}" viewBox="0 0 120 145" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Corpo do escudo -->
          <linearGradient id="gm-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stop-color="#6b0f0f"/>
            <stop offset="30%"  stop-color="#dc2626"/>
            <stop offset="60%"  stop-color="#f87171"/>
            <stop offset="100%" stop-color="#7f1d1d"/>
          </linearGradient>
          <!-- Borda dourada -->
          <linearGradient id="gm-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stop-color="#92400e"/>
            <stop offset="25%"  stop-color="#f59e0b"/>
            <stop offset="50%"  stop-color="#fde68a"/>
            <stop offset="75%"  stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#92400e"/>
          </linearGradient>
          <!-- Brilho interno -->
          <linearGradient id="gm-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stop-color="rgba(255,200,200,.35)"/>
            <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
          </linearGradient>
          <!-- Chamas -->
          <linearGradient id="gm-fire" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%"   stop-color="#dc2626"/>
            <stop offset="50%"  stop-color="#f59e0b"/>
            <stop offset="100%" stop-color="#fde68a" stop-opacity="0"/>
          </linearGradient>
          <!-- Rubis -->
          <radialGradient id="gm-ruby" cx="40%" cy="30%">
            <stop offset="0%"   stop-color="#fca5a5"/>
            <stop offset="100%" stop-color="#991b1b"/>
          </radialGradient>
          <!-- Joias douradas -->
          <radialGradient id="gm-jewel" cx="40%" cy="30%">
            <stop offset="0%"   stop-color="#fde68a"/>
            <stop offset="100%" stop-color="#92400e"/>
          </radialGradient>
        </defs>

        <!-- Sombra do escudo -->
        <path d="M60 8 L112 30 L112 78 Q112 116 60 142 Q8 116 8 78 L8 30 Z"
              fill="rgba(0,0,0,.35)" transform="translate(2,3)"/>

        <!-- Borda dourada ornamentada -->
        <path d="M60 5 L114 28 L114 78 Q114 118 60 144 Q6 118 6 78 L6 28 Z"
              fill="url(#gm-gold)" stroke="#fde68a" stroke-width=".5"/>

        <!-- Entalhe decorativo na borda -->
        <path d="M60 5 L114 28 L114 78 Q114 118 60 144 Q6 118 6 78 L6 28 Z"
              fill="none" stroke="#92400e" stroke-width="2.5"/>

        <!-- Miolo do escudo -->
        <path d="M60 12 L108 32 L108 78 Q108 112 60 136 Q12 112 12 78 L12 32 Z"
              fill="url(#gm-body)"/>

        <!-- Brilho interno -->
        <path d="M60 12 L108 32 L108 78 Q108 112 60 136 Q12 112 12 78 L12 32 Z"
              fill="url(#gm-shine)"/>

        <!-- Ornamentos dourados nas laterais -->
        <path d="M12 44 Q6 44 6 28 L12 32Z" fill="#f59e0b" opacity=".6"/>
        <path d="M108 44 Q114 44 114 28 L108 32Z" fill="#f59e0b" opacity=".6"/>

        <!-- Chamas superiores -->
        <path d="M50 115 Q46 94 54 84 Q52 96 57 90 Q55 76 60 62 Q65 76 63 90 Q68 96 66 84 Q74 94 70 115 Q66 122 60 124 Q54 122 50 115Z"
              fill="url(#gm-fire)" opacity=".85"/>

        <!-- Linha decorativa dourada interna -->
        <path d="M22 40 L98 40" stroke="url(#gm-gold)" stroke-width="1.2" stroke-linecap="round" opacity=".5"/>
        <path d="M18 50 L102 50" stroke="url(#gm-gold)" stroke-width=".7" stroke-linecap="round" opacity=".3"/>

        <!-- Coroa elaborada -->
        <!-- Base da coroa -->
        <rect x="32" y="82" width="56" height="12" rx="2.5" fill="url(#gm-gold)" stroke="#92400e" stroke-width=".8"/>
        <!-- Hastes da coroa -->
        <path d="M34 82 L34 62 L44 74 L60 50 L76 74 L86 62 L86 82 Z"
              fill="url(#gm-gold)" stroke="#92400e" stroke-width=".8" stroke-linejoin="round"/>
        <!-- Highlights nas hastes -->
        <path d="M34 82 L34 62 L44 74 L60 50 L76 74 L86 62 L86 82 Z"
              fill="rgba(255,240,150,.15)"/>

        <!-- Joia central da coroa (rubi) -->
        <ellipse cx="60" cy="50" rx="7" ry="7" fill="url(#gm-ruby)" stroke="#fde68a" stroke-width="1.5"/>
        <ellipse cx="57" cy="47" rx="2.5" ry="2" fill="rgba(255,200,200,.6)"/>
        <circle  cx="60" cy="50" r="3" fill="rgba(220,38,38,.5)"/>

        <!-- Joias laterais da coroa -->
        <circle cx="34" cy="62" r="4.5" fill="url(#gm-jewel)" stroke="#92400e" stroke-width=".8"/>
        <circle cx="33" cy="61" r="1.5" fill="rgba(255,240,150,.7)"/>
        <circle cx="86" cy="62" r="4.5" fill="url(#gm-jewel)" stroke="#92400e" stroke-width=".8"/>
        <circle cx="85" cy="61" r="1.5" fill="rgba(255,240,150,.7)"/>

        <!-- Rubis na base da coroa -->
        <circle cx="46" cy="88" r="3.5" fill="url(#gm-ruby)" stroke="#fde68a" stroke-width=".8"/>
        <circle cx="60" cy="88" r="3.5" fill="url(#gm-ruby)" stroke="#fde68a" stroke-width=".8"/>
        <circle cx="74" cy="88" r="3.5" fill="url(#gm-ruby)" stroke="#fde68a" stroke-width=".8"/>

        <!-- Estrelas douradas decorativas -->
        <path d="M22 68 L23.2 72 L27 72 L24 74.5 L25.2 78.5 L22 76 L18.8 78.5 L20 74.5 L17 72 L20.8 72Z"
              fill="#fde68a" opacity=".8"/>
        <path d="M98 68 L99.2 72 L103 72 L100 74.5 L101.2 78.5 L98 76 L94.8 78.5 L96 74.5 L93 72 L96.8 72Z"
              fill="#fde68a" opacity=".8"/>

        <!-- Pequenas estrelas no topo -->
        <path d="M60 14 L61 17 L64 17 L61.5 19 L62.5 22 L60 20.5 L57.5 22 L58.5 19 L56 17 L59 17Z"
              fill="#fde68a" opacity=".9"/>
        <circle cx="40" cy="20" r="1.5" fill="#fde68a" opacity=".6"/>
        <circle cx="80" cy="20" r="1.5" fill="#fde68a" opacity=".6"/>
        <circle cx="30" cy="30" r="1"   fill="#fde68a" opacity=".5"/>
        <circle cx="90" cy="30" r="1"   fill="#fde68a" opacity=".5"/>

        <!-- Ornamentos dourados nos cantos da base -->
        <path d="M12 108 Q10 116 16 120 L20 112Z" fill="#f59e0b" opacity=".4"/>
        <path d="M108 108 Q110 116 104 120 L100 112Z" fill="#f59e0b" opacity=".4"/>
      </svg>`
  },
];

function getRankInfo(level) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (level >= RANKS[i].minLv) return { rank: RANKS[i], idx: i };
  }
  return { rank: RANKS[0], idx: 0 };
}

function renderRankPanel(level) {
  const { rank: earnedRank, idx } = getRankInfo(level);

  // Emblema ativo (pode ser diferente do rank ganho)
  const savedIdx     = parseInt(localStorage.getItem('ee_active_rank') ?? idx);
  const effectiveActive = (!isNaN(savedIdx) && savedIdx <= idx) ? savedIdx : idx;
  const displayRank  = RANKS[effectiveActive]; // brasão grande mostra o ativo

  // Barra de progresso usa o rank real ganho
  const nextRank = RANKS[idx + 1];
  const lvInRank = level - earnedRank.minLv;
  const lvRange  = earnedRank.maxLv - earnedRank.minLv;
  const pct      = Math.min(100, Math.round((lvInRank / lvRange) * 100));

  const progressHtml = nextRank ? `
    <div class="rank-current-progress">
      <div class="rank-progress-label">
        <span>Lv ${level} — ${earnedRank.name}</span>
        <span>${pct}% → ${nextRank.name}</span>
      </div>
      <div class="rank-progress-track">
        <div class="rank-progress-fill" style="width:${pct}%;background:linear-gradient(90deg,${earnedRank.color},${nextRank.color});box-shadow:0 0 12px ${earnedRank.glow};"></div>
      </div>
    </div>` : `<div class="rank-current-level" style="color:${earnedRank.color};font-weight:700;">Rank máximo atingido! 👑</div>`;

  const gridItems = RANKS.map((r, i) => {
    const reached    = level >= r.minLv;
    const isCurrent  = i === idx;
    const isActive   = i === effectiveActive;
    const cls = isCurrent ? 'rank-current-item' : reached ? 'rank-achieved' : 'rank-locked';
    const check = reached && !isActive ? '<div class="rank-item-check">✓</div>' : '';
    const glowStyle = isCurrent ? `box-shadow:0 0 28px ${r.glow};border-color:${r.color}44 !important;` : '';
    const activeBorder = isActive ? `outline:2px solid ${r.color};outline-offset:2px;` : '';

    const btnHtml = reached
      ? isActive
        ? `<button class="rank-activate-btn rank-activate-active" disabled>✓ Ativo</button>`
        : `<button class="rank-activate-btn" onclick="activateRank(${i})" style="--rank-color:${r.color};">Ativar emblema</button>`
      : '';

    return `
      <div class="rank-item ${cls}" style="${glowStyle}${activeBorder}" title="${r.name} · Lv ${r.minLv}–${r.maxLv}">
        ${check}
        ${r.svg(72)}
        <div class="rank-item-name" style="${isActive ? `color:${r.color};text-shadow:0 0 10px ${r.glow};` : ''}">${r.name}</div>
        <div class="rank-item-levels">Lv ${r.minLv}–${r.maxLv}</div>
        ${btnHtml}
      </div>`;
  }).join('');

  document.getElementById('rankPanel').innerHTML = `
    <div class="rank-current">
      <div class="rank-current-badge">
        <div class="rank-glow" style="background:${displayRank.glow};"></div>
        ${displayRank.svg(140)}
      </div>
      <div class="rank-current-name" style="color:${displayRank.color};text-shadow:0 0 20px ${displayRank.glow};">${displayRank.name}</div>
      <div class="rank-current-level">Nível ${level}</div>
      ${progressHtml}
    </div>
    <div class="rank-grid">${gridItems}</div>`;
}

// ── Ativar emblema ────────────────────────────────────────────────────────────
function activateRank(idx) {
  localStorage.setItem('ee_active_rank', idx);
  // Re-renderiza o painel com o novo emblema ativo
  const xp    = Number(document.getElementById('statXp')?.textContent?.replace(/\./g,'') || 0);
  const level = Math.floor(xp / 1000) + 1;
  renderRankPanel(level);
  // Toast
  const r = RANKS[idx];
  const toast = document.getElementById('cfgToast') || (() => {
    const el = document.createElement('div');
    el.id = 'cfgToast';
    el.className = 'cfg-toast';
    document.body.appendChild(el);
    return el;
  })();
  toast.textContent = `${r.name} ativado como seu emblema!`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ── Lista de lições ───────────────────────────────────────────────────────────
function renderLessons(lessons) {
  const card = document.getElementById('lessonsCard');
  const list = document.getElementById('lessonsList');
  if (!lessons || lessons.length === 0) return;

  card.style.display = 'block';
  list.innerHTML = lessons.map(l => {
    const score    = l.score != null ? Math.round(Number(l.score)) : null;
    const pass     = score != null && score >= 70;
    const scoreHtml = score != null
      ? `<span class="prog-lesson-score prog-lesson-score--${pass ? 'pass' : 'fail'}">${score}%</span>`
      : `<span class="prog-lesson-score" style="color:var(--white-muted,#94a3b8);">—</span>`;
    const date = l.completed_at
      ? new Date(l.completed_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' })
      : '';
    return `
      <div class="prog-lesson-row">
        <span class="prog-lesson-module">${l.module_title || ''}</span>
        <span class="prog-lesson-title">${l.lesson_title}</span>
        <span style="font-size:11px;color:var(--white-muted,#94a3b8);flex-shrink:0;">${date}</span>
        ${scoreHtml}
      </div>`;
  }).join('');
}

// ── Mobile sidebar ────────────────────────────────────────────────────────────
function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('mobile-open');
  document.getElementById('sidebarOverlay')?.classList.add('visible');
  document.body.style.overflow = 'hidden';
}
function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('mobile-open');
  document.getElementById('sidebarOverlay')?.classList.remove('visible');
  document.body.style.overflow = '';
}
function toggleMobileSidebar() {
  const open = document.getElementById('sidebar')?.classList.contains('mobile-open');
  open ? closeMobileSidebar() : openMobileSidebar();
}
document.addEventListener('click', e => {
  if (e.target.closest('.nav-item') && window.innerWidth <= 900) closeMobileSidebar();
});
