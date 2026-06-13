// ── Dashboard do Aluno — English Essential ────────────────────────────────────

// Diagnóstico de erros JS (log apenas — overlay removido em produção)
window.onerror = (msg, src, line, col, err) => {
  if (typeof msg === 'string' && msg.includes('ResizeObserver')) return true;
  console.error('[ERRO GLOBAL]', msg, 'linha:', line, err);
};

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://jhpqdxqsgnyqtzqvggvx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocHFkeHFzZ255cXR6cXZnZ3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTEyMjksImV4cCI6MjA5NTY2NzIyOX0.xGC_jijXKpRAdhuyyTMQxS8qkca0Dap_Wcs3_8xKvcw';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Utilitário de escape HTML (previne XSS) ───────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ── Validação de URL — apenas domínio Supabase permitido ──────────────────────
function isSafeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === 'jhpqdxqsgnyqtzqvggvx.supabase.co';
  } catch { return false; }
}

// ── Branding da Org ────────────────────────────────────────────────────────────
function applyOrgBranding(branding) {
  const logoUrl = branding?.logo_url || null;
  const icon    = document.querySelector('.brand-icon');
  const name    = document.querySelector('.brand-name');
  const link    = document.querySelector('.brand-logo');
  if (!icon || !name) return;
  const role    = document.querySelector('.brand-role');
  const wrapper = name?.parentElement;
  if (logoUrl && isSafeUrl(logoUrl)) {
    icon.style.display = 'none';
    // Usar createElement para evitar XSS via logo_url malicioso
    name.textContent = '';
    const img = document.createElement('img');
    img.src = logoUrl;
    img.alt = 'Logo';
    img.style.cssText = 'max-height:34px;max-width:140px;object-fit:contain;display:block;margin:0 auto;';
    name.appendChild(img);
    if (link)    { link.style.flexDirection = 'column'; link.style.alignItems = 'center'; link.style.width = '100%'; }
    if (wrapper) wrapper.style.textAlign = 'center';
    if (role)    role.style.textAlign = 'center';
  } else {
    icon.style.display = '';
    name.innerHTML     = 'English <span>Essential</span>';
    if (link)    { link.style.flexDirection = ''; link.style.alignItems = ''; link.style.width = ''; }
    if (wrapper) wrapper.style.textAlign = '';
    if (role)    role.style.textAlign = '';
  }
}

async function fetchAndApplyOrgBranding() {
  const orgId = session?.organization_id;
  if (!orgId) return;
  try {
    const cache = JSON.parse(localStorage.getItem('ee_org_branding') || '{}');
    const entry = cache[orgId];
    if (entry) applyOrgBranding(entry);
  } catch(e) {}
  try {
    const { data } = await db.rpc('get_org_branding', { p_org_id: orgId });
    if (data) {
      applyOrgBranding(data);
      const cache = JSON.parse(localStorage.getItem('ee_org_branding') || '{}');
      cache[orgId] = data;
      localStorage.setItem('ee_org_branding', JSON.stringify(cache));
    }
  } catch(e) {}
}

// ── Estado global ─────────────────────────────────────────────────────────────
let session = null, homeData = null;
let currentLesson = null, currentExIdx = 0;
let answers = {}, selectedOption = null;

const initials = n => (n||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

function lessonDraftKey(lessonId = currentLesson?.id) {
  return session?.id && lessonId ? `ee_lesson_draft_${session.id}_${lessonId}` : null;
}

function saveLessonDraft(idxOverride = currentExIdx) {
  const key = lessonDraftKey();
  if (!key || !currentLesson?.exercises?.length) return;
  const payload = {
    lessonId: currentLesson.id,
    exerciseIds: currentLesson.exercises.map(e => e.id),
    currentExIdx: idxOverride,
    answers,
    updatedAt: Date.now()
  };
  localStorage.setItem(key, JSON.stringify(payload));
  persistLessonState(payload);
}

function loadLessonDraft(lessonId, exercises) {
  const key = lessonDraftKey(lessonId);
  if (!key) return null;
  try {
    const draft = JSON.parse(localStorage.getItem(key) || 'null');
    if (!draft || !Array.isArray(draft.exerciseIds)) return null;
    const ids = (exercises || []).map(e => e.id);
    const sameLesson = ids.length === draft.exerciseIds.length && ids.every((id, i) => id === draft.exerciseIds[i]);
    return sameLesson ? draft : null;
  } catch(e) {
    return null;
  }
}

async function loadRemoteLessonState(lessonId, exercises) {
  if (!session?.id || !lessonId) return null;
  try {
    const { data, error } = await db.rpc('get_lesson_progress_state', {
      p_token: session.token,
      p_lesson_id: lessonId
    });
    if (error || !data) return null;
    const draft = Array.isArray(data) ? data[0] : data;
    if (!draft || !Array.isArray(exercises)) return null;
    const ids = exercises.map(e => e.id);
    const remoteState = draft.lesson_state || {};
    const remoteIds = remoteState.exerciseIds || remoteState.exercise_ids;
    const sameLesson = Array.isArray(remoteIds) && ids.length === remoteIds.length && ids.every((id, i) => id === remoteIds[i]);
    return sameLesson ? {
      lessonId,
      exerciseIds: remoteIds,
      currentExIdx: Number(draft.current_exercise_index ?? draft.currentExIdx ?? 0),
      answers: remoteState.answers || draft.answers || {},
      updatedAt: draft.updated_at || draft.updatedAt || null
    } : null;
  } catch (e) {
    return null;
  }
}

async function persistLessonState(payload) {
  if (!session?.id || !currentLesson?.id) return;
  try {
    await db.rpc('save_lesson_progress_state', {
      p_token: session.token,
      p_lesson_id: currentLesson.id,
      p_current_exercise_index: Number(payload.currentExIdx || 0),
      p_lesson_state: {
        exerciseIds: payload.exerciseIds,
        answers: payload.answers,
        updatedAt: payload.updatedAt
      }
    });
  } catch (e) {}
}

function clearLessonDraft(lessonId = currentLesson?.id) {
  const key = lessonDraftKey(lessonId);
  if (key) localStorage.removeItem(key);
}

// ── Perfil / Sidebar ──────────────────────────────────────────────────────────
function renderSidebarProfile(profile) {
  const avatar = document.getElementById('sidebarAvatar');
  const name   = document.getElementById('sidebarName');
  const displayName = profile?.display_name || profile?.full_name || 'Aluno';
  avatar.textContent = profile?.avatar_url || initials(profile?.full_name || displayName);
  avatar.classList.toggle('has-custom-avatar', Boolean(profile?.avatar_url));
  name.textContent = displayName;
}

// ── Sessão inválida → logout ──────────────────────────────────────────────────
function forceLogout() {
  localStorage.removeItem('ee_session');
  window.location.href = '../index.html';
}

function isSessionError(error) {
  const msg = (error?.message || error?.hint || '').toLowerCase();
  return msg.includes('sessão') || msg.includes('sess') || msg.includes('inválid') || msg.includes('expirad') || msg.includes('inativ');
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('exCard').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="mic"]');
    if (btn) startSpeaking();
  });

  try { session = JSON.parse(localStorage.getItem('ee_session')); } catch(e) {}
  if (!session || session.role !== 'student' || !session.token) { window.location.href = '../index.html'; return; }
  if (session.expires_at && new Date(session.expires_at) <= new Date()) { localStorage.removeItem('ee_session'); window.location.href = '../index.html'; return; }
  renderSidebarProfile(session);
  document.getElementById('topbarSub').textContent =
    new Date().toLocaleDateString('pt-BR', { weekday:'long', day:'numeric', month:'long' });
  fetchAndApplyOrgBranding();
  await loadHome();
  // Abre modal de configurações se vier com #settings na URL
  if (window.location.hash === '#settings') {
    history.replaceState(null, '', window.location.pathname);
    openSettings();
  }
});

window.addEventListener('beforeunload', saveLessonDraft);

// ── Home ──────────────────────────────────────────────────────────────────────
async function loadHome() {
  const { data, error } = await db.rpc('get_student_home', { p_token: session.token });
  if (error) {
    if (isSessionError(error)) { forceLogout(); return; }
    document.getElementById('homeView').innerHTML =
      '<div class="loading-center" style="color:var(--danger);">Erro ao carregar o curso. Tente novamente.</div>';
    return;
  }
  if (!data) {
    document.getElementById('homeView').innerHTML =
      '<div class="loading-center" style="color:var(--danger);">Erro ao carregar o curso. Tente novamente.</div>';
    return;
  }
  homeData = data;
  if (data.user) {
    session = { ...session };
    if (Object.prototype.hasOwnProperty.call(data.user, 'display_name')) session.display_name = data.user.display_name;
    if (Object.prototype.hasOwnProperty.call(data.user, 'avatar_url'))   session.avatar_url   = data.user.avatar_url;
    localStorage.setItem('ee_session', JSON.stringify(session));
    renderSidebarProfile(session);
  }
  updateXpUI(data.user.total_xp, data.user.streak_days, data.user.coins);
  renderLearningPath(data);
  loadSkillStats();
}

function showHome() {
  saveLessonDraft();
  stopMic();
  document.body.classList.remove('exercise-mode');
  document.getElementById('homeView').style.display       = 'block';
  document.getElementById('exerciseView').style.display   = 'none';
  document.getElementById('completionView').style.display = 'none';
  document.getElementById('topbarTitle').textContent      = 'Meu aprendizado';
}

async function backToHome() {
  saveLessonDraft();
  document.getElementById('completionView').style.display = 'none';
  document.getElementById('topbarTitle').textContent      = 'Meu aprendizado';
  await loadHome();
  showHome();
}

// ── XP / Level ────────────────────────────────────────────────────────────────
// ── Ranks (mesmo array da página de progresso) ────────────────────────────────
const DASH_RANKS = [
  { name:'Bronze',      minLv:1,  color:'#cd7f32', glow:'rgba(205,127,50,.6)',  svg:`<svg width="32" height="37" viewBox="0 0 120 140" fill="none"><defs><linearGradient id="dr0" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#7c4a1a"/><stop offset="50%" stop-color="#f0a84e"/><stop offset="100%" stop-color="#7c4a1a"/></linearGradient></defs><path d="M60 4L108 24L108 72Q108 108 60 136Q12 108 12 72L12 24Z" fill="url(#dr0)"/><text x="60" y="80" text-anchor="middle" font-family="serif" font-size="52" font-weight="900" fill="rgba(255,210,120,.9)">B</text></svg>` },
  { name:'Prata',       minLv:10, color:'#b0b8c8', glow:'rgba(176,184,200,.6)', svg:`<svg width="32" height="37" viewBox="0 0 120 140" fill="none"><defs><linearGradient id="dr1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6b7280"/><stop offset="50%" stop-color="#e2e8f0"/><stop offset="100%" stop-color="#6b7280"/></linearGradient></defs><path d="M60 4L108 24L108 72Q108 108 60 136Q12 108 12 72L12 24Z" fill="url(#dr1)"/><text x="60" y="80" text-anchor="middle" font-family="serif" font-size="52" font-weight="900" fill="rgba(230,240,255,.9)">S</text></svg>` },
  { name:'Ouro',        minLv:20, color:'#fbbf24', glow:'rgba(251,191,36,.65)', svg:`<svg width="32" height="37" viewBox="0 0 120 140" fill="none"><defs><linearGradient id="dr2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#b45309"/><stop offset="50%" stop-color="#fde68a"/><stop offset="100%" stop-color="#b45309"/></linearGradient></defs><path d="M60 4L108 24L108 72Q108 108 60 136Q12 108 12 72L12 24Z" fill="url(#dr2)"/><polygon points="60,44 64,58 78,58 67,67 71,81 60,72 49,81 53,67 42,58 56,58" fill="rgba(255,240,100,.9)"/></svg>` },
  { name:'Platina',     minLv:30, color:'#67e8f9', glow:'rgba(103,232,249,.6)', svg:`<svg width="32" height="37" viewBox="0 0 120 140" fill="none"><defs><linearGradient id="dr3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0e7490"/><stop offset="50%" stop-color="#a5f3fc"/><stop offset="100%" stop-color="#0e7490"/></linearGradient></defs><path d="M60 4L108 24L108 72Q108 108 60 136Q12 108 12 72L12 24Z" fill="url(#dr3)"/><polygon points="60,44 66,62 84,62 70,74 76,92 60,80 44,92 50,74 36,62 54,62" fill="rgba(165,243,252,.85)"/></svg>` },
  { name:'Diamante',    minLv:40, color:'#818cf8', glow:'rgba(129,140,248,.65)',svg:`<svg width="32" height="37" viewBox="0 0 120 140" fill="none"><defs><linearGradient id="dr4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3730a3"/><stop offset="50%" stop-color="#c7d2fe"/><stop offset="100%" stop-color="#3730a3"/></linearGradient></defs><path d="M60 4L108 24L108 72Q108 108 60 136Q12 108 12 72L12 24Z" fill="url(#dr4)"/><polygon points="60,38 78,60 60,102 42,60" fill="rgba(199,210,254,.85)"/><polygon points="60,38 78,60 60,72 42,60" fill="rgba(255,255,255,.3)"/></svg>` },
  { name:'Mestre',      minLv:50, color:'#c084fc', glow:'rgba(192,132,252,.7)', svg:`<svg width="32" height="37" viewBox="0 0 120 140" fill="none"><defs><linearGradient id="dr5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6b21a8"/><stop offset="50%" stop-color="#e9d5ff"/><stop offset="100%" stop-color="#6b21a8"/></linearGradient></defs><path d="M60 4L108 24L108 72Q108 108 60 136Q12 108 12 72L12 24Z" fill="url(#dr5)"/><path d="M36 80L36 60L48 72L60 46L72 72L84 60L84 80Z" fill="rgba(233,213,255,.9)"/><rect x="34" y="80" width="52" height="10" rx="2" fill="rgba(233,213,255,.8)"/></svg>` },
  { name:'Grão-Mestre', minLv:80, color:'#f87171', glow:'rgba(248,113,113,.75)', svg:`<svg width="32" height="38" viewBox="0 0 120 145" fill="none"><defs><linearGradient id="dr6b" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#6b0f0f"/><stop offset="40%" stop-color="#dc2626"/><stop offset="70%" stop-color="#f87171"/><stop offset="100%" stop-color="#7f1d1d"/></linearGradient><linearGradient id="dr6g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#92400e"/><stop offset="50%" stop-color="#fde68a"/><stop offset="100%" stop-color="#92400e"/></linearGradient><linearGradient id="dr6f" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#dc2626"/><stop offset="60%" stop-color="#f59e0b"/><stop offset="100%" stop-color="#fde68a" stop-opacity="0"/></linearGradient><radialGradient id="dr6r" cx="40%" cy="30%"><stop offset="0%" stop-color="#fca5a5"/><stop offset="100%" stop-color="#991b1b"/></radialGradient><radialGradient id="dr6j" cx="40%" cy="30%"><stop offset="0%" stop-color="#fde68a"/><stop offset="100%" stop-color="#92400e"/></radialGradient></defs><path d="M60 5L114 28L114 78Q114 118 60 144Q6 118 6 78L6 28Z" fill="url(#dr6g)" stroke="#fde68a" stroke-width=".5"/><path d="M60 12L108 32L108 78Q108 112 60 136Q12 112 12 78L12 32Z" fill="url(#dr6b)"/><path d="M50 115Q46 94 54 84Q52 96 57 90Q55 76 60 62Q65 76 63 90Q68 96 66 84Q74 94 70 115Q66 122 60 124Q54 122 50 115Z" fill="url(#dr6f)" opacity=".8"/><rect x="32" y="82" width="56" height="12" rx="2.5" fill="url(#dr6g)" stroke="#92400e" stroke-width=".8"/><path d="M34 82L34 62L44 74L60 50L76 74L86 62L86 82Z" fill="url(#dr6g)" stroke="#92400e" stroke-width=".8" stroke-linejoin="round"/><ellipse cx="60" cy="50" rx="7" ry="7" fill="url(#dr6r)" stroke="#fde68a" stroke-width="1.5"/><circle cx="34" cy="62" r="4.5" fill="url(#dr6j)" stroke="#92400e" stroke-width=".8"/><circle cx="86" cy="62" r="4.5" fill="url(#dr6j)" stroke="#92400e" stroke-width=".8"/><circle cx="46" cy="88" r="3.5" fill="url(#dr6r)" stroke="#fde68a" stroke-width=".8"/><circle cx="60" cy="88" r="3.5" fill="url(#dr6r)" stroke="#fde68a" stroke-width=".8"/><circle cx="74" cy="88" r="3.5" fill="url(#dr6r)" stroke="#fde68a" stroke-width=".8"/><path d="M60 14L61 17L64 17L61.5 19L62.5 22L60 20.5L57.5 22L58.5 19L56 17L59 17Z" fill="#fde68a" opacity=".9"/></svg>` },
];

function updateTopbarRank(xp) {
  const level = Math.floor(xp / 1000) + 1;

  // Rank máximo desbloqueado
  let earnedIdx = 0;
  for (let i = DASH_RANKS.length - 1; i >= 0; i--) {
    if (level >= DASH_RANKS[i].minLv) { earnedIdx = i; break; }
  }

  // Emblema escolhido (pode ser diferente do rank atual)
  const savedIdx = parseInt(localStorage.getItem('ee_active_rank') ?? earnedIdx);
  const activeIdx = (!isNaN(savedIdx) && savedIdx <= earnedIdx) ? savedIdx : earnedIdx;
  const rank = DASH_RANKS[activeIdx];

  const el = document.getElementById('topbarRankBadge');
  if (!el) return;
  el.innerHTML = rank.svg;
  el.title = `${rank.name} — Nível ${level}`;
  el.style.filter = `drop-shadow(0 0 6px ${rank.glow})`;
}

function updateXpUI(xp, streak, coins) {
  const level   = Math.floor(xp / 1000) + 1;
  const xpInLvl = xp % 1000;
  document.getElementById('sidebarLevel').textContent  = 'Nível ' + level;
  document.getElementById('sidebarXpNext').textContent = xpInLvl + ' / 1000 XP';
  document.getElementById('topbarXpVal').textContent   = xp + ' XP';
  const streakEl = document.getElementById('sidebarStreak');
  if (streakEl) streakEl.textContent = streak || 0;
  document.getElementById('sidebarXpBar').style.width  = ((xpInLvl / 1000) * 100) + '%';
  const coinsEl = document.getElementById('sidebarCoins');
  if (coinsEl) coinsEl.textContent = (coins || 0).toLocaleString('pt-BR');
  const lvlEl = document.getElementById('hudLevelVal');
  if (lvlEl) lvlEl.textContent = Math.floor((xp||0)/1000)+1;
  updateTopbarRank(xp);
}

let xpPopupTimer = null;
function showXpPopup(text) {
  const el = document.getElementById('xpPopup');
  el.textContent = text;
  el.style.display = 'block';
  if (xpPopupTimer) clearTimeout(xpPopupTimer);
  xpPopupTimer = setTimeout(() => { el.style.display = 'none'; }, 2000);
}

// ── Radar de habilidades ──────────────────────────────────────────────────────
let skillStats  = { speaking: 0, listening: 0, writing: 0, reading: 0 };
let _skillCounts = {};

async function loadSkillStats() {
  const { data } = await db.rpc('get_skill_stats', { p_token: session.token });
  if (data) {
    skillStats = {
      speaking:  Number(data.speaking  || 0),
      listening: Number(data.listening || 0),
      writing:   Number(data.writing   || 0),
      reading:   Number(data.reading   || 0),
    };
    drawRadarChart();
  }
}

function updateSkillStats(questionType, isCorrect) {
  const map = { speaking: 'speaking', listening: 'listening', text: 'writing', multiple_choice: 'reading' };
  const key = map[questionType];
  if (!key) return;
  if (!_skillCounts[questionType]) _skillCounts[questionType] = { total: 0, correct: 0 };
  _skillCounts[questionType].total++;
  if (isCorrect) _skillCounts[questionType].correct++;
  skillStats[key] = Math.round(100 * _skillCounts[questionType].correct / _skillCounts[questionType].total);
  drawRadarChart();
}

function drawRadarChart() {
  const canvas = document.getElementById('skillRadar');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const W = 220, H = 190, cx = 110, cy = 95, r = 60;
  const accent = '#4f46e5';
  const labels = ['S', 'L', 'W', 'R'];
  const target = [skillStats.speaking, skillStats.listening, skillStats.writing, skillStats.reading];
  const angles = [-Math.PI/2, 0, Math.PI/2, Math.PI];
  const offsets = [[0,-10],[10,4],[0,12],[-10,4]];

  const DURATION = 900;
  const start    = performance.now();

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function frame(now) {
    const progress = easeOutCubic(Math.min((now - start) / DURATION, 1));
    const vals     = target.map(v => v * progress);

    ctx.clearRect(0, 0, W, H);

    // Grid
    [0.25, 0.5, 0.75, 1].forEach(t => {
      ctx.beginPath();
      angles.forEach((a, i) => {
        const x = cx+r*t*Math.cos(a), y = cy+r*t*Math.sin(a);
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(79,70,229,.12)'; ctx.lineWidth = 1; ctx.stroke();
    });

    // Eixos
    angles.forEach(a => {
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx+r*Math.cos(a), cy+r*Math.sin(a));
      ctx.strokeStyle = 'rgba(79,70,229,.18)'; ctx.lineWidth = 1; ctx.stroke();
    });

    // Área
    ctx.beginPath();
    angles.forEach((a, i) => {
      const v = vals[i]/100, x = cx+r*v*Math.cos(a), y = cy+r*v*Math.sin(a);
      i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    });
    ctx.closePath();
    ctx.fillStyle   = `rgba(79,70,229,${0.15 + 0.07 * progress})`;
    ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.stroke();

    // Pontos
    angles.forEach((a, i) => {
      const v = vals[i]/100;
      ctx.beginPath();
      ctx.arc(cx+r*v*Math.cos(a), cy+r*v*Math.sin(a), 3.5, 0, Math.PI*2);
      ctx.fillStyle = accent; ctx.fill();
    });

    // Labels (fade in)
    ctx.globalAlpha = progress;
    ctx.font = '11px "DM Sans", sans-serif';
    angles.forEach((a, i) => {
      const lx = cx+(r+10)*Math.cos(a)+offsets[i][0];
      const ly = cy+(r+10)*Math.sin(a)+offsets[i][1];
      ctx.textAlign = i===1?'left':i===3?'right':'center';
      ctx.fillStyle = '#1a1a2e';
      ctx.fillText(labels[i], lx, ly);
    });
    ctx.globalAlpha = 1;

    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

// ── Renderização do curso ─────────────────────────────────────────────────────
function renderHome(data) {
  const user = data.user, courses = data.courses || [], total = Number(data.total_lessons || 0);
  let totalDone = 0;
  courses.forEach(c => c.modules.forEach(m => m.lessons.forEach(l => { if (l.completed) totalDone++; })));
  const first = escapeHtml(user.full_name ? user.full_name.split(' ')[0] : 'aluno');
  document.getElementById('homeView').innerHTML = `
    <div class="welcome-banner">
      <div class="welcome-text">
        <h2>Olá, <em>${first}!</em> 👋</h2>
        
      </div>
      <div class="welcome-stats">
        <div class="wstat"><div class="wstat-val">${user.total_xp}</div><div class="wstat-lbl">XP Total</div></div>
      </div>
    </div>
    <div class="course-section">
      ${courses.length === 0
        ? '<p style="color:var(--ink-muted);font-size:14px;">Nenhum curso disponível ainda.</p>'
        : courses.map(renderCourse).join('')}
    </div>`;
}

function renderCourse(course) {
  const levelLabel = { basic:'Básico', intermediate:'Intermediário', advanced:'Avançado' }[course.level] || course.level;
  return `<div class="course-section">
    <div class="course-title">${escapeHtml(course.title)} <span style="font-size:13px;font-weight:400;color:var(--ink-muted);">· ${escapeHtml(levelLabel)}</span></div>
    ${(course.modules||[]).map(renderModule).join('')}
  </div>`;
}

function renderModule(mod) {
  const lessons = mod.lessons || [], done = lessons.filter(l=>l.completed).length;
  return `<div class="module-block open" id="mod-${escapeHtml(mod.id)}">
    <div class="module-header" data-id="${escapeHtml(mod.id)}" onclick="toggleModule(this.dataset.id)">
      <div class="module-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
      </div>
      <div class="module-meta">
        <div class="module-name">${escapeHtml(mod.title)}</div>
        <div class="module-sub">${done}/${lessons.length} lições concluídas</div>
      </div>
      <div class="module-chevron">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>
    <div class="lesson-list" id="lessons-${escapeHtml(mod.id)}">
      ${lessons.map((l, i) => renderLesson(l, i, mod)).join('')}
    </div>
  </div>`;
}

function renderLesson(lesson, idx, mod) {
  const prevLesson = idx > 0 ? mod.lessons[idx-1] : null;
  const isLocked   = prevLesson && !(prevLesson.completed && Number(prevLesson.score||0) >= 70);
  const isDone     = lesson.completed;
  const iconClass  = isDone ? 'lsi-done' : (isLocked ? 'lsi-locked' : 'lsi-avail');
  const rowClass   = isLocked ? 'lesson-row locked' : 'lesson-row';
  const score      = Math.round(Number(lesson.score || 0));
  const scoreClass = isDone ? (score >= 70 ? 'ls-pass' : 'ls-fail') : (isLocked ? 'ls-locked' : 'ls-avail');
  const scoreLabel = isDone ? `${score}%` : (isLocked ? 'Bloqueado' : 'Disponível');
  const icon = isDone
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
    : (isLocked
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>');
  const onclickAttr = isLocked ? '' : `data-id="${escapeHtml(lesson.id)}" data-title="${escapeHtml(lesson.title)}" onclick="openLesson(this.dataset.id, this.dataset.title)"`;
  const exCount  = lesson.exercise_count || 0;
  return `<div class="${rowClass}" ${onclickAttr}>
    <div class="lesson-status-icon ${iconClass}">${icon}</div>
    <div class="lesson-meta">
      <div class="lesson-name">${escapeHtml(lesson.title)}</div>
      <div class="lesson-info">${exCount} exercício${exCount !== 1 ? 's' : ''}</div>
    </div>
    <div class="lesson-score ${scoreClass}">${scoreLabel}</div>
  </div>`;
}

function toggleModule(id) {
  const el = document.getElementById('mod-'+id), list = document.getElementById('lessons-'+id);
  el.classList.toggle('open');
  list.style.display = el.classList.contains('open') ? 'block' : 'none';
}

// ── Learning Path ─────────────────────────────────────────────────────────────
const LOCK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
const MODULE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
</svg>`;

function renderLearningPath(data) {
  const user  = data.user;
  const first = (user.display_name || user.full_name || 'aluno').split(' ')[0];

  // Módulo 1 — LP1 aberta com 10 sub-aulas, LP2-4 bloqueadas
  const mod1Block = renderModule1(data);

  // Módulos 2–8 — todos bloqueados (sem exercícios ainda)
  const lockedModules = [
    'Módulo 2 - Cumprimentos e Apresentação',
    'Módulo 3 - Trabalho e Escola',
    'Módulo 4 - Compras',
    'Módulo 5 - Viagem',
    'Módulo 6 - Passado e Futuro',
    'Módulo 7 - Amigos e Vida Social',
    'Módulo 8 - Refeições e Férias',
  ].map((name, i) => renderLockedModule(name, i + 2)).join('');

  const level   = Math.floor((user.total_xp || 0) / 1000) + 1;
  const xpInLvl = (user.total_xp || 0) % 1000;
  const xpPct   = Math.round((xpInLvl / 1000) * 100);

  document.getElementById('homeView').innerHTML = `
    <div class="welcome-banner">
      <div class="welcome-banner-left">
        <div class="welcome-greeting">Olá, <em>${first}!</em> 👋</div>

        <div class="welcome-progress-wrap">
          <div class="welcome-progress-label">
            <span>Nível ${level}</span>
            <span>${xpInLvl} / 1000 XP</span>
          </div>
          <div class="welcome-progress-track">
            <div class="welcome-progress-fill" style="width:${xpPct}%"></div>
          </div>
        </div>
      </div>
      <div class="welcome-stats">
        <div class="wstat">
          <div class="wstat-icon">⚡</div>
          <div class="wstat-val">${(user.total_xp || 0).toLocaleString('pt-BR')}</div>
          <div class="wstat-lbl">XP Total</div>
        </div>
        <div class="wstat">
          <div class="wstat-icon">🪙</div>
          <div class="wstat-val">${(user.coins || 0).toLocaleString('pt-BR')}</div>
          <div class="wstat-lbl">Moedas</div>
        </div>
        <div class="wstat">
          <div class="wstat-icon">🏅</div>
          <div class="wstat-val">${level}</div>
          <div class="wstat-lbl">Nível</div>
        </div>
      </div>
    </div>
    <div class="course-section">
      <div class="course-title">Seu curso</div>
      ${mod1Block}
      ${lockedModules}
    </div>`;
}

function renderModule1(data) {
  const mainLessons = ['Lição Principal 1','Lição Principal 2','Lição Principal 3','Lição Principal 4'];
  const blocks = mainLessons.map((lpName, lpIdx) => {

    const num = String(lpIdx + 1).padStart(2, '0');
    if (lpIdx > 0) {
      return `
        <div class="main-lesson-block locked">
          <div class="main-lesson-header" style="cursor:default;opacity:.55;" title="Conclua a lição anterior para desbloquear">
            <div class="main-lesson-number lsi-locked" style="background:none;">${LOCK_ICON}</div>
            <div class="lesson-meta">
              <div class="lesson-name">${lpName}</div>
              <div class="lesson-info">10 aulas · Bloqueado</div>
            </div>
          </div>
        </div>`;
    }
    return `
      <div class="main-lesson-block open" id="path-main-lesson-${num}">
        <div class="main-lesson-header" onclick="togglePathMainLesson('${num}')">
          <div class="main-lesson-number">${num}</div>
          <div class="lesson-meta">
            <div class="lesson-name">${lpName}</div>
            <div class="lesson-info">10 aulas</div>
          </div>
          <div class="main-lesson-chevron">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <div class="accordion-panel class-list open" id="path-classes-${num}">
          <div class="accordion-panel-inner">${renderPathClasses(data, 0)}</div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="module-block open" id="path-module-01" data-mod="1">
      <div class="module-header" onclick="togglePathModule('01')">
        <div class="module-icon">${MODULE_ICON}</div>
        <div class="module-meta">
          <div class="module-name">Módulo 1 - Conceitos Básicos do Idioma</div>
          <div class="module-sub">4 lições principais</div>
        </div>
        <div class="module-chevron">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
      <div class="accordion-panel main-lesson-list open" id="path-main-lessons-01">
        <div class="accordion-panel-inner">${blocks}</div>
      </div>
    </div>`;
}

function renderLockedModule(name, modNum) {
  return `
    <div class="module-block locked" data-mod="${modNum}" style="opacity:.45;pointer-events:none;">
      <div class="module-header" style="cursor:default;">
        <div class="module-icon">${MODULE_ICON}</div>
        <div class="module-meta">
          <div class="module-name">${name}</div>
          <div class="module-sub">4 lições principais · Bloqueado</div>
        </div>
        <div class="module-chevron">${LOCK_ICON}</div>
      </div>
    </div>`;
}

function getProgressFromHomeData(data, lessonId) {
  if (!lessonId || !data) return { completed: false, score: null };
  const lessons = (data.courses || [])
    .flatMap(c => c.modules || [])
    .flatMap(m => m.lessons || []);
  const found = lessons.find(l => l.id === lessonId);
  return found ? { completed: !!found.completed, score: found.score ?? null } : { completed: false, score: null };
}

// IDs das aulas no banco por Lição Principal
// Cada array tem 10 posições (as 10 sub-aulas de cada LP)
const PATH_LESSONS = [
  // LP 1
  [
    '42a2e67f-e928-4052-95d2-abaec23bab15', // 0 - Lição Principal 1
    '15ab02df-b429-4ccf-bb0f-c3bf8b7f3438', // 1 - Pronúncia
    '804d5426-1a82-4682-98b4-b9b607ef3199', // 2 - Vocabulário
    'f3a1b2c4-d5e6-7890-abcd-ef1234567890', // 3 - Gramática
    '7a69ea06-d95b-43a9-b82f-8975f2c05a27', // 4 - Escutar e Ler
    '45788287-4806-464b-9686-f3f6337b7f7a', // 5 - Ler
    'ce03f749-1879-48ba-ac87-fa83a800aa0f', // 6 - Escrever
    'e5c00001-0000-4000-8000-000000000001', // 7 - Escutar
    'fa1a0001-0000-4000-8000-000000000001', // 8 - Falar
    'ee010001-0000-4000-8000-000000000001', // 9 - Revisão
  ],
  // LP 2
  [ null, null, null, null, null, null, null, null, null, null ],
  // LP 3
  [ null, null, null, null, null, null, null, null, null, null ],
  // LP 4
  [ null, null, null, null, null, null, null, null, null, null ],
];
// Compat: mantém PATH_LESSON_IDS apontando para LP1
const PATH_LESSON_IDS = PATH_LESSONS[0];

const PATH_CLASS_NAMES = ['Lição Principal','Pronúncia','Vocabulário','Gramática','Escutar e Ler','Ler','Escrever','Escutar','Falar','Revisão'];

function renderPathClasses(data, lpIdx = 0) {
  const ids      = PATH_LESSONS[lpIdx] || [];
  const progress = ids.map(id => getProgressFromHomeData(data, id));
  const lessonPassed = i => progress[i].completed && (progress[i].score ?? 0) >= 70;
  const lockIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  const doneIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
  const availIcon = i => String(i + 1).padStart(2, '0');

  return PATH_CLASS_NAMES.map((title, index) => {
    const isAvail  = index === 0 || lessonPassed(index - 1);
    const isDone   = lessonPassed(index);
    const isLocked = !isAvail;
    const score      = Math.round(Number(progress[index].score || 0));
    const isFailed   = !isDone && !isLocked && progress[index].score !== null;
    const rowClass   = isLocked ? 'lesson-row class-row locked' : 'lesson-row class-row';
    const iconClass  = isDone ? 'lsi-done' : (isLocked ? 'lsi-locked' : 'lsi-avail');
    const scoreClass = isDone ? 'ls-pass' : (isFailed ? 'ls-fail' : (isLocked ? 'ls-locked' : 'ls-avail'));
    const scoreLabel = isDone ? `${score}%` : (isFailed ? `${score}%` : (isLocked ? 'Bloqueado' : 'Disponível'));
    const icon       = isDone ? doneIcon : (isLocked ? lockIcon : availIcon(index));
    const prevName   = index > 0 ? PATH_CLASS_NAMES[index - 1] : '';
    const clickAttr  = isLocked
      ? `title="Conclua '${prevName}' com 70% ou mais para desbloquear"`
      : `onclick="openPathClass(${lpIdx}, ${index})"`;
    return `
      <div class="${rowClass}" ${clickAttr}>
        <div class="lesson-status-icon ${iconClass}">${icon}</div>
        <div class="lesson-meta">
          <div class="lesson-name">${title}</div>
          <div class="lesson-info">Aula ${index + 1}</div>
        </div>
        <div class="lesson-score ${scoreClass}">${scoreLabel}</div>
      </div>`;
  }).join('');
}

function togglePathModule(id) {
  const el = document.getElementById('path-module-'+id);
  const list = document.getElementById('path-main-lessons-'+id);
  el.classList.toggle('open');
  list.classList.toggle('open', el.classList.contains('open'));
}

function togglePathMainLesson(id) {
  const el = document.getElementById('path-main-lesson-'+id);
  const list = document.getElementById('path-classes-'+id);
  el.classList.toggle('open');
  list.classList.toggle('open', el.classList.contains('open'));
}

function openPathClass(lpIdx, index) {
  const title    = PATH_CLASS_NAMES[index] || `Aula ${index + 1}`;
  const lessonId = (PATH_LESSONS[lpIdx] || [])[index];
  if (lessonId) {
    openLesson(lessonId, title, index);
  } else {
    currentLesson = { id: null, title, exercises: [], pathClassIndex: index };
    document.getElementById('homeView').style.display       = 'none';
    document.getElementById('completionView').style.display = 'none';
    document.getElementById('exerciseView').style.display   = 'block';
    document.body.classList.add('exercise-mode');
    document.getElementById('topbarTitle').textContent      = title;
    document.getElementById('exCard').innerHTML =
      `<div class="loading-center" style="color:var(--ink-muted);font-size:15px;">
        <div style="font-size:40px;margin-bottom:12px;">🚧</div>
        Esta aula ainda não tem exercícios cadastrados.
      </div>`;
  }
}

// ── Exercícios ────────────────────────────────────────────────────────────────
async function openLesson(lessonId, lessonTitle, pathClassIndex = null) {
  document.getElementById('homeView').style.display       = 'none';
  document.getElementById('completionView').style.display = 'none';
  document.getElementById('exerciseView').style.display   = 'block';
  document.body.classList.add('exercise-mode');
  document.getElementById('exCard').innerHTML =
    '<div class="loading-center"><div class="dot-loader"><span></span><span></span><span></span></div><div>Carregando lição...</div></div>';
  document.getElementById('topbarTitle').textContent = lessonTitle;

  const { data, error } = await db.rpc('get_lesson_content', { p_token: session.token, p_lesson_id: lessonId });
  if (error || !data) { document.getElementById('exCard').innerHTML = '<div class="loading-center" style="color:var(--danger);">Erro ao carregar lição.</div>'; return; }
  if (data.locked) { document.getElementById('exCard').innerHTML = `<div style="text-align:center;padding:40px 20px;"><div style="font-size:48px;margin-bottom:16px;">🔒</div><p style="font-size:15px;color:var(--ink-muted);">${escapeHtml(data.message)}</p></div>`; return; }

  const prevBestScore = Number(data.progress?.score || 0);
  currentLesson = { id: lessonId, title: lessonTitle, exercises: data.exercises || [], pathClassIndex, bestScore: prevBestScore };
  currentExIdx = 0; answers = {}; selectedOption = null;

  currentLesson.exercises.forEach(e => {
    if (e.answered) answers[e.id] = { is_correct: e.answered.is_correct, xp_earned: 0 };
  });

  const allAnswered = currentLesson.exercises.every(e => e.answered);
  if (allAnswered && currentLesson.exercises.length > 0) {
    clearLessonDraft(lessonId);
    showCompletion(); return;
  }

  const remoteDraft = await loadRemoteLessonState(lessonId, currentLesson.exercises);
  const draft = remoteDraft || loadLessonDraft(lessonId, currentLesson.exercises);
  const firstUnanswered = currentLesson.exercises.findIndex(e => !e.answered);
  if (draft) {
    answers = { ...answers, ...(draft.answers || {}) };
    currentExIdx = Math.min(Math.max(Number(draft.currentExIdx) || 0, 0), currentLesson.exercises.length - 1);
  } else if (firstUnanswered > 0) {
    currentExIdx = firstUnanswered;
  }
  saveLessonDraft();
  renderExercise();
}

function renderExercise() {
  if (!currentLesson || !currentLesson.exercises.length) return;
  saveLessonDraft();
  const exercises = currentLesson.exercises, total = exercises.length, idx = currentExIdx, ex = exercises[idx];
  const pct = total > 0 ? Math.round((idx / total) * 100) : 0;
  // barra de progresso removida do HTML
  // contador removido do HTML
  document.getElementById('exerciseView').classList.remove('has-explanation');
  selectedOption = null;
  wordOrderPlaced = [];

  const typeLabels = {
    multiple_choice:'Múltipla escolha', text:'Resposta livre', listening:'Escuta', speaking:'Pronúncia',
    is_or_are:'IS ou ARE?', image_choice: ex.audio_url ? 'Escutar' : 'Toque na imagem certa', word_order: ex.audio_url ? 'Escutar e Ler' : 'Leitura'
  };
  const typeIcons  = {
    multiple_choice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    text:            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>',
    listening:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>',
    speaking:        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
    is_or_are:       '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    image_choice:    ex.audio_url ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
    word_order:      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'
  };

  let answerHTML;
  if (ex.question_type === 'is_or_are') {
    const opts = ex.options && ex.options.length ? ex.options : [{option_text:'IS'},{option_text:'ARE'}];
    answerHTML = `<div class="is-or-are-grid">${opts.map(o =>
      `<button class="ia-btn" data-val="${escapeHtml(o.option_text)}" onclick="selectIsOrAre(this, this.dataset.val)">${escapeHtml(o.option_text)}</button>`
    ).join('')}</div>`;
  } else if (ex.question_type === 'image_choice' && ex.options) {
    answerHTML = `<div class="img-choice-grid">${ex.options.map(o =>
      `<button class="img-choice-btn" data-val="${escapeHtml(o.option_text)}" onclick="selectImageChoice(this, this.dataset.val)">
        <img src="${escapeHtml(o.image_url || '')}" alt="${escapeHtml(o.option_text)}" loading="lazy" onerror="this.style.display='none'">
      </button>`
    ).join('')}</div>`;
  } else if (ex.question_type === 'word_order' && ex.options) {
    const tiles = ex.options.map(o => o.option_text);
    const shuffled = tiles.slice().sort(() => Math.random() - 0.5);
    answerHTML = `
      ${ex.audio_url ? `
      <div class="listening-area" style="margin:0 0 14px;">
        <button class="play-btn" id="playBtn" data-url="${escapeHtml(ex.audio_url)}" onclick="playAudio(this.dataset.url)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32">
            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/>
          </svg>
        </button>
        <div class="word-drop-hint" style="margin:0;">Ouça, leia e organize as palavras</div>
      </div>` : ''}
      <div class="word-bank" id="wordBank">${shuffled.map(w =>
        `<button class="word-tile" data-word="${escapeHtml(w)}" onclick="placeWord(this, this.dataset.word)">${escapeHtml(w)}</button>`
      ).join('')}</div>
      <div class="word-drop" id="wordDrop" onclick="removeLastWord()">
        <span class="word-drop-hint" id="wordDropHint">Toque nas palavras na ordem certa</span>
      </div>`;
  } else if (ex.question_type === 'multiple_choice' && ex.options) {
    answerHTML = `<div class="options-grid">${ex.options.map(o =>
      `<button class="option-btn" data-id="${escapeHtml(o.id)}" onclick="selectOption(this, this.dataset.id)">${escapeHtml(o.option_text)}</button>`
    ).join('')}</div>`;
  } else if (ex.question_type === 'listening' && ex.options) {
    answerHTML = `
      <div class="listening-area">
        <button class="play-btn" id="playBtn" data-url="${escapeHtml(ex.audio_url)}" onclick="playAudio(this.dataset.url)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32">
            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/>
          </svg>
        </button>
        <div class="options-grid" style="width:100%">${ex.options.map(o =>
          `<button class="option-btn" data-id="${escapeHtml(o.id)}" onclick="selectOption(this, this.dataset.id)">${escapeHtml(o.option_text)}</button>`
        ).join('')}</div>
      </div>`;
  } else if (ex.question_type === 'speaking') {
    answerHTML = `
      <div class="speaking-area">
        <button class="mic-btn" id="micBtn" data-action="mic">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="36" height="36">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <span id="micLabel">Pressione para falar</span>
        </button>
        <div class="speaking-transcript" id="speakingTranscript"></div>
      </div>`;
  } else {
    answerHTML = `<input class="text-input" id="textAnswer" type="text" placeholder="Digite sua resposta em inglês..." onkeydown="if(event.key==='Enter') confirmAnswer()" />`;
  }

  const imageHTML = ex.image_url
    ? (ex.question_type === 'speaking' && ex.audio_url
        ? `<div class="ex-image-wrap">
             <img class="ex-image" src="${escapeHtml(ex.image_url)}" alt="" loading="lazy" style="margin-bottom:0">
             <div class="play-btn-wrap">
               <span class="play-btn-label">Pressione para ouvir novamente</span>
               <button class="play-btn play-btn--overlay" id="playBtn" data-url="${escapeHtml(ex.audio_url)}" onclick="playAudio(this.dataset.url)" title="Ouvir pronúncia">
                 <svg viewBox="0 0 24 24" fill="none" width="28" height="28">
                   <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
                 </svg>
               </button>
             </div>
           </div>`
        : `<img class="ex-image" src="${escapeHtml(ex.image_url)}" alt="" loading="lazy">`)
    : '';
  const audioHTML = ex.audio_url && ex.question_type !== 'speaking' && ex.question_type !== 'word_order' && ex.question_type !== 'listening'
    ? `<div class="listening-area" style="margin:0 0 14px;">
         <button class="play-btn" id="playBtn" data-url="${escapeHtml(ex.audio_url)}" onclick="playAudio(this.dataset.url)">
           <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="32" height="32">
             <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/>
           </svg>
         </button>
         <div class="word-drop-hint" style="margin:0;">Ouça antes de responder</div>
       </div>`
    : '';

  document.getElementById('exCard').innerHTML = `
    <div class="ex-type-badge">${typeIcons[ex.question_type]||''} ${escapeHtml(typeLabels[ex.question_type]||ex.question_type)}</div>
    ${imageHTML}
    ${audioHTML}
    <div class="ex-question">${escapeHtml(ex.question)}</div>
    ${answerHTML}
    <div class="ex-feedback" id="exFeedback">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="feedbackIcon"><polyline points="20 6 9 17 4 12"/></svg>
      <div class="feedback-body"><strong id="feedbackTitle"></strong><span id="feedbackExplanation"></span></div>
    </div>
    <div class="ex-actions">
      <button class="btn-confirm" id="btnConfirm" onclick="confirmAnswer()" ${ex.question_type === 'speaking' ? 'disabled' : ''}>
        <div class="btn-spin" id="btnSpin"></div>
        <span id="btnLabel">Confirmar</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>`;

  if (ex.question_type === 'text')    setTimeout(() => document.getElementById('textAnswer')?.focus(), 50);
  if (ex.audio_url) queueExerciseAutoAudio(ex);
}

function selectOption(el, optionId) {
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedOption = optionId;
}

function selectIsOrAre(el, val) {
  document.querySelectorAll('.ia-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedOption = val;
}

function selectImageChoice(el, val) {
  document.querySelectorAll('.img-choice-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  selectedOption = val;
}

let wordOrderPlaced = [];

function placeWord(el, word) {
  if (el.classList.contains('used')) return;
  el.classList.add('used');
  wordOrderPlaced.push(word);
  renderWordDrop();
}

function removeLastWord() {
  if (!wordOrderPlaced.length) return;
  const last = wordOrderPlaced.pop();
  const tiles = document.querySelectorAll('.word-tile');
  for (const t of tiles) {
    if (t.dataset.word === last && t.classList.contains('used')) { t.classList.remove('used'); break; }
  }
  renderWordDrop();
}

function renderWordDrop() {
  const drop = document.getElementById('wordDrop');
  const hint = document.getElementById('wordDropHint');
  if (!drop) return;
  const existing = drop.querySelectorAll('.placed-tile');
  existing.forEach(e => e.remove());
  if (wordOrderPlaced.length === 0) {
    if (hint) hint.style.display = '';
  } else {
    if (hint) hint.style.display = 'none';
    wordOrderPlaced.forEach(w => {
      const span = document.createElement('span');
      span.className = 'placed-tile';
      span.textContent = w;
      drop.appendChild(span);
    });
  }
}

// ── Áudio ─────────────────────────────────────────────────────────────────────
let _currentAudio = null;
let _lastAutoAudioKey = null;
function queueExerciseAutoAudio(ex) {
  const lessonId = currentLesson && currentLesson.id ? currentLesson.id : '';
  const exerciseId = ex.id || currentExIdx;
  const autoAudioKey = lessonId + ':' + exerciseId + ':' + ex.audio_url;
  if (_lastAutoAudioKey === autoAudioKey) return;
  _lastAutoAudioKey = autoAudioKey;
  setTimeout(() => playAudio(ex.audio_url), 300);
}
function playAudio(url) {
  if (!isSafeUrl(url)) return;
  if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
  const btn = document.getElementById('playBtn');
  _currentAudio = new Audio(url);
  if (btn) btn.classList.add('playing');
  const playPromise = _currentAudio.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => { if (btn) btn.classList.remove('playing'); _currentAudio = null; });
  }
  _currentAudio.onended = () => { if (btn) btn.classList.remove('playing'); _currentAudio = null; };
  _currentAudio.onerror = () => { if (btn) btn.classList.remove('playing'); _currentAudio = null; };
}

// ── Microfone — Web Speech API ────────────────────────────────────────────────
let speakingAnswer = '', micActive = false, _recognition = null;

function stopMic() {
  micActive = false;
  if (_recognition) { try { _recognition.abort(); } catch(e) {} _recognition = null; }
}

function startSpeaking() {
  if (micActive) {
    micActive = false;
    if (_recognition) { try { _recognition.stop(); } catch(e) {} }
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { _micSetUI('erro', 'Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.'); return; }

  speakingAnswer = '';
  micActive      = true;
  _micSetUI('listening', '');
  const confirmBtn = document.getElementById('btnConfirm');
  if (confirmBtn) confirmBtn.disabled = true;

  _recognition = new SR();
  _recognition.lang            = 'en-US';
  _recognition.continuous      = true;
  _recognition.interimResults  = true;
  _recognition.maxAlternatives = 1;

  _recognition.onresult = (event) => {
    let interim = '', final = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) final += t; else interim += t;
    }
    const el = document.getElementById('speakingTranscript');
    if (el) { el.textContent = final || interim; el.style.fontStyle = final ? 'normal' : 'italic'; el.style.opacity = final ? '1' : '0.65'; }
    if (final) { speakingAnswer = final.trim(); try { _recognition.stop(); } catch(e) {} }
  };

  _recognition.onend = () => {
    micActive = false; _recognition = null;
    if (speakingAnswer) {
      _micSetUI('captado', `"${speakingAnswer}"`);
      const btn = document.getElementById('btnConfirm');
      if (btn) btn.disabled = false;
    } else { _micSetUI('vazio', ''); }
  };

  _recognition.onerror = (event) => {
    micActive = false; _recognition = null;
    const msgs = { 'not-allowed':'Permissão de microfone negada — habilite nas configurações do navegador.', 'no-speech':'Nenhuma fala detectada — tente novamente.', 'network':'Erro de rede — verifique sua conexão.', 'audio-capture':'Microfone não encontrado ou em uso por outro programa.' };
    _micSetUI('erro', msgs[event.error] || `Erro: ${event.error}`);
  };

  try { _recognition.start(); } catch(e) { micActive = false; _recognition = null; _micSetUI('erro', 'Não foi possível iniciar o microfone — tente novamente.'); }
}

function _micSetUI(estado, extra) {
  const btn = document.getElementById('micBtn'), label = document.getElementById('micLabel');
  if (!btn || !label) return;
  btn.classList.toggle('mic-listening', estado === 'listening');
  const textos = { listening:'', captado:'✓ Captado — confirme abaixo', vazio:'Pressione para falar', erro:extra };
  label.textContent = textos[estado] ?? extra;
  const el = document.getElementById('speakingTranscript');
  if (estado === 'captado' && el) { el.textContent = extra; el.style.fontStyle = 'normal'; el.style.opacity = '1'; }
  else if (el) el.textContent = '';
}

// ── Confirmar resposta ────────────────────────────────────────────────────────
let _confirmProcessing = false;
async function confirmAnswer() {
  if (_confirmProcessing) return;
  _confirmProcessing = true;
  const ex = currentLesson.exercises[currentExIdx];
  let answer = '';
  const _bail = () => { _confirmProcessing = false; };
  if (ex.question_type === 'multiple_choice' || ex.question_type === 'listening') { if (!selectedOption) { _bail(); return; } answer = selectedOption; }
  else if (ex.question_type === 'speaking') { if (!speakingAnswer) { _bail(); return; } answer = speakingAnswer; speakingAnswer = ''; }
  else if (ex.question_type === 'is_or_are') { if (!selectedOption) { _bail(); return; } answer = selectedOption; }
  else if (ex.question_type === 'image_choice') { if (!selectedOption) { _bail(); return; } answer = selectedOption; }
  else if (ex.question_type === 'word_order') {
    answer = wordOrderPlaced.join(' ').trim();
    if (!answer) { _bail(); return; }
  }
  else {
    answer = (document.getElementById('textAnswer')?.value || '').trim();
    if (!answer) { _bail(); return; }
  }

  const btn = document.getElementById('btnConfirm');
  btn.disabled = true;
  document.getElementById('btnSpin').style.display = 'block';
  document.getElementById('btnLabel').textContent  = 'Verificando...';

  const { data, error } = await db.rpc('submit_answer', { p_token: session.token, p_exercise_id: ex.id, p_answer: answer });
  document.getElementById('btnSpin').style.display = 'none';
  if (error || !data) {
    document.getElementById('btnLabel').textContent = 'Confirmar';
    btn.disabled = false;
    _confirmProcessing = false;
    return;
  }

  answers[ex.id] = { is_correct: data.is_correct, xp_earned: data.xp_earned };
  showAnswerFeedback(data, ex, answer);
  updateSkillStats(ex.question_type, data.is_correct);
  if (data.xp_earned > 0) { updateXpUI(data.total_xp, homeData?.user?.streak_days || 0, data.total_coins); showXpPopup('+' + data.xp_earned + ' XP'); }

  const isLast = currentExIdx >= currentLesson.exercises.length - 1;
  saveLessonDraft(isLast ? currentExIdx : currentExIdx + 1);
  document.getElementById('btnLabel').textContent = isLast ? 'Ver resultado' : 'Próximo';
  btn.onclick  = isLast ? finishLesson : nextExercise;
  btn.disabled = false;
  _confirmProcessing = false;
}

// ── Explicações Gramaticais (entre exercícios) ────────────────────────────────
const LESSON_EXPLANATIONS = {

  // ── Pronúncia 1 ────────────────────────────────────────────
  '15ab02df-b429-4ccf-bb0f-c3bf8b7f3438': [
    {
      afterIndex: 2,
      title: 'Present Continuous',
      subtitle: 'Verbos + ING (Gerúndio)',
      body: `
        <p class="expl-intro">
          Verbos descrevem <strong>ações</strong>. No inglês, quando adicionamos
          <strong>-ING</strong> ao final de um verbo, estamos dizendo que a ação
          está acontecendo <em>agora mesmo</em>!
        </p>
        <div class="expl-banner">DRINKING &nbsp;·&nbsp; RUNNING &nbsp;·&nbsp; EATING &nbsp;·&nbsp; SWIMMING</div>
        <div class="expl-examples">
          <div class="expl-row">
            <span class="expl-pt">BEBER</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">DRINK<span class="expl-ing">ING</span></span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">CORRER</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">RUNN<span class="expl-ing">ING</span></span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">COMER</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">EAT<span class="expl-ing">ING</span></span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">NADAR</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">SWIMM<span class="expl-ing">ING</span></span>
          </div>
        </div>
        <div class="expl-box">
          Todos terminam com <strong>ING</strong>. Em português, equivale a
          <strong>ENDO</strong>, <strong>ANDO</strong> e <strong>INDO</strong>:<br>
          <em>bebENDO · corrENDO · comENDO · nadANDO</em>
        </div>
        <p class="expl-note">
          Este tempo verbal é o <strong>Simple Present Continuous</strong> —
          usado para ações que estão acontecendo no momento da fala.
        </p>
      `
    }
  ],

  // ── Vocabulário 1 ──────────────────────────────────────────
  '804d5426-1a82-4682-98b4-b9b607ef3199': [
    {
      afterIndex: 2,
      title: 'Noun — Substantivo',
      subtitle: 'O nome das coisas e pessoas',
      body: `
        <p class="expl-intro">
          <strong>Substantivo</strong> é o nome que damos a qualquer coisa, pessoa ou animal.
          Em inglês, podemos colocá-los no <em>plural</em> para indicar mais de um.
        </p>
        <div class="expl-banner">BOY &nbsp;·&nbsp; GIRL &nbsp;·&nbsp; MAN &nbsp;·&nbsp; WOMAN</div>
        <div class="expl-examples">
          <div class="expl-row">
            <span class="expl-pt">menino → meninos</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">BOY → BOY<span class="expl-ing">S</span></span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">menina → meninas</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">GIRL → GIRL<span class="expl-ing">S</span></span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">homem → homens</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">MAN → <span class="expl-ing">MEN</span></span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">mulher → mulheres</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">WOMAN → <span class="expl-ing">WOMEN</span></span>
          </div>
        </div>
        <div class="expl-box">
          Na maioria das vezes basta adicionar <strong>S</strong> no final.<br>
          Mas <strong>MAN</strong> e <strong>WOMAN</strong> são exceções — eles mudam
          completamente no plural: <em>Men</em> e <em>Women</em>.
        </div>
        <p class="expl-note">
          Dica: a pronúncia de <strong>Women</strong> soa como <em>"uímen"</em> —
          diferente de Woman (<em>"uúman"</em>)!
        </p>
      `
    }
  ],

  // ── Gramática 1 ────────────────────────────────────────────
  'f3a1b2c4-d5e6-7890-abcd-ef1234567890': [
    {
      afterIndex: 2,
      title: 'Verb To Be',
      subtitle: 'Verbo Ser ou Estar — IS e ARE',
      body: `
        <p class="expl-intro">
          O verbo <strong>To Be</strong> significa <em>Ser</em> ou <em>Estar</em>.
          Ele tem três formas: <strong>AM</strong>, <strong>IS</strong> e <strong>ARE</strong> —
          todas com o mesmo significado, mas usadas em situações diferentes.
        </p>
        <div class="expl-banner">IS &nbsp;&nbsp;·&nbsp;&nbsp; ARE</div>
        <div class="expl-examples">
          <div class="expl-row">
            <span class="expl-pt">A mulher está lendo</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">The woman <span class="expl-ing">is</span> reading</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">O homem está comendo</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">The man <span class="expl-ing">is</span> eating</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">As mulheres estão lendo</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">The women <span class="expl-ing">are</span> reading</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">Os meninos estão correndo</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">The boys <span class="expl-ing">are</span> running</span>
          </div>
        </div>
        <div class="expl-box">
          Use <strong>IS</strong> com HE, SHE, IT e qualquer coisa no <em>singular</em>.<br>
          Use <strong>ARE</strong> com YOU, THEY, WE e qualquer coisa no <em>plural</em>.
        </div>
        <p class="expl-note">
          Singular = um só &nbsp;|&nbsp; Plural = mais de um
        </p>
      `
    }
  ],

  // ── Escutar e Ler 1 ────────────────────────────────────────
  '7a69ea06-d95b-43a9-b82f-8975f2c05a27': [
    {
      afterIndex: 2,
      title: 'Pronoun — Pronomes',
      subtitle: 'Palavras que substituem pessoas',
      body: `
        <p class="expl-intro">
          <strong>Pronomes pessoais</strong> substituem o nome de uma pessoa ou coisa,
          evitando repetição. Os três mais usados no início são:
        </p>
        <div class="expl-banner">HE &nbsp;·&nbsp; SHE &nbsp;·&nbsp; THEY</div>
        <div class="expl-examples">
          <div class="expl-row">
            <span class="expl-pt">ELE</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">HE</span> &nbsp;— masculino</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">ELA</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">SHE</span> &nbsp;— feminino</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">ELES / ELAS</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">THEY</span> &nbsp;— plural</span>
          </div>
        </div>
        <div class="expl-box">
          <strong>THEY</strong> é neutro em inglês — serve tanto para masculino
          quanto feminino quando falamos de um grupo.<br><br>
          <em>He is eating. &nbsp;·&nbsp; She is running. &nbsp;·&nbsp; They are swimming.</em>
        </div>
        <p class="expl-note">
          Com esses três pronomes, já conseguimos falar de praticamente
          qualquer pessoa ou grupo!
        </p>
      `
    }
  ],

  // ── Ler 1 ──────────────────────────────────────────────────
  '45788287-4806-464b-9686-f3f6337b7f7a': [
    {
      afterIndex: 2,
      title: 'Artigos: THE e A',
      subtitle: 'Definido e Indefinido',
      body: `
        <p class="expl-intro">
          <strong>Artigos</strong> são palavras que acompanham os substantivos.
          Em inglês só existem dois: <strong>THE</strong> e <strong>A</strong> —
          e eles são bem simples!
        </p>
        <div class="expl-banner">THE &nbsp;&nbsp;·&nbsp;&nbsp; A</div>
        <div class="expl-examples">
          <div class="expl-row">
            <span class="expl-pt">O menino / A menina</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">THE</span> boy / <span class="expl-ing">THE</span> girl</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">Os meninos / As meninas</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">THE</span> boys / <span class="expl-ing">THE</span> girls</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">Um menino</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">A</span> boy</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">Uma menina</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">A</span> girl</span>
          </div>
        </div>
        <div class="expl-box">
          <strong>THE</strong> = O, A, OS, AS — usado quando sabemos <em>exatamente</em> de quem estamos falando.<br><br>
          <strong>A</strong> = UM, UMA — usado quando falamos de algo de forma <em>geral</em>.
        </div>
        <p class="expl-note">
          <strong>THE</strong> é o mesmo para singular e plural, masculino e feminino —
          muito mais simples que o português!
        </p>
      `
    }
  ],

  // ── Escrever 1 — revisão: Present Continuous ───────────────
  'ce03f749-1879-48ba-ac87-fa83a800aa0f': [
    {
      afterIndex: 2,
      title: 'Revisão: Present Continuous',
      subtitle: 'Verbos + ING — você lembra?',
      body: `
        <p class="expl-intro">
          Vimos que adicionamos <strong>-ING</strong> ao verbo para indicar uma ação
          acontecendo <em>agora</em>. Vamos relembrar?
        </p>
        <div class="expl-banner">DRINKING &nbsp;·&nbsp; RUNNING &nbsp;·&nbsp; EATING &nbsp;·&nbsp; SWIMMING</div>
        <div class="expl-examples">
          <div class="expl-row">
            <span class="expl-pt">bebENDO</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">DRINK<span class="expl-ing">ING</span></span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">corrENDO</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">RUNN<span class="expl-ing">ING</span></span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">comENDO</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">EAT<span class="expl-ing">ING</span></span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">nadANDO</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">SWIMM<span class="expl-ing">ING</span></span>
          </div>
        </div>
        <div class="expl-box">
          O <strong>Simple Present Continuous</strong> descreve ações que estão
          acontecendo <em>agora mesmo</em>. A terminação <strong>ING</strong>
          é sempre a mesma — só o verbo base muda.
        </div>
        <p class="expl-note">
          Pratique escrevendo frases: <em>She is eating. He is running. They are swimming.</em>
        </p>
      `
    }
  ],

  // ── Escutar 1 — revisão: Noun (Substantivo) ────────────────
  'e5c00001-0000-4000-8000-000000000001': [
    {
      afterIndex: 2,
      title: 'Revisão: Noun — Substantivo',
      subtitle: 'Singular e Plural',
      body: `
        <p class="expl-intro">
          Lembra dos <strong>substantivos</strong>? São os nomes de pessoas, coisas e animais.
          Vamos revisar como formamos o <em>plural</em> em inglês:
        </p>
        <div class="expl-banner">BOY &nbsp;·&nbsp; GIRL &nbsp;·&nbsp; MAN &nbsp;·&nbsp; WOMAN</div>
        <div class="expl-examples">
          <div class="expl-row">
            <span class="expl-pt">BOY (menino)</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">BOY<span class="expl-ing">S</span> (meninos)</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">GIRL (menina)</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">GIRL<span class="expl-ing">S</span> (meninas)</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">MAN (homem)</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">MEN</span> (homens)</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">WOMAN (mulher)</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">WOMEN</span> (mulheres)</span>
          </div>
        </div>
        <div class="expl-box">
          Regra geral: adicione <strong>S</strong> no final.<br>
          Exceções importantes: <strong>MAN → MEN</strong> e <strong>WOMAN → WOMEN</strong>
          — esses mudam completamente!
        </div>
        <p class="expl-note">
          Ao escutar, preste atenção: <em>woman</em> = "uúman" &nbsp;|&nbsp; <em>women</em> = "uímen"
        </p>
      `
    }
  ],

  // ── Falar 1 — revisão: Verb To Be (IS / ARE) ───────────────
  'fa1a0001-0000-4000-8000-000000000001': [
    {
      afterIndex: 2,
      title: 'Revisão: Verb To Be',
      subtitle: 'IS e ARE — quando usar cada um?',
      body: `
        <p class="expl-intro">
          O <strong>Verb To Be</strong> (ser/estar) usa formas diferentes dependendo
          de quem está praticando a ação. Vamos revisar <em>IS</em> e <em>ARE</em>:
        </p>
        <div class="expl-banner">IS &nbsp;&nbsp;·&nbsp;&nbsp; ARE</div>
        <div class="expl-examples">
          <div class="expl-row">
            <span class="expl-pt">HE / SHE / IT + singular</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">IS</span></span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">YOU / THEY / WE + plural</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">ARE</span></span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">O menino está correndo</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">The boy <span class="expl-ing">is</span> running</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">Os meninos estão correndo</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en">The boys <span class="expl-ing">are</span> running</span>
          </div>
        </div>
        <div class="expl-box">
          Singular (um só) = <strong>IS</strong><br>
          Plural (mais de um) = <strong>ARE</strong><br><br>
          <em>She is eating. &nbsp;·&nbsp; They are eating.</em>
        </div>
        <p class="expl-note">
          Ao falar, pense: estou falando de <strong>uma</strong> pessoa ou de <strong>várias</strong>?
        </p>
      `
    }
  ],

  // ── Revisão 1 — revisão: Pronomes + Artigos ────────────────
  'ee010001-0000-4000-8000-000000000001': [
    {
      afterIndex: 2,
      title: 'Revisão: Pronomes',
      subtitle: 'HE · SHE · THEY',
      body: `
        <p class="expl-intro">
          <strong>Pronomes</strong> substituem o nome de pessoas e coisas.
          Vamos revisar os três principais que aprendemos:
        </p>
        <div class="expl-banner">HE &nbsp;·&nbsp; SHE &nbsp;·&nbsp; THEY</div>
        <div class="expl-examples">
          <div class="expl-row">
            <span class="expl-pt">ELE (masculino)</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">HE</span> is running</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">ELA (feminino)</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">SHE</span> is eating</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">ELES / ELAS (grupo)</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">THEY</span> are swimming</span>
          </div>
        </div>
        <div class="expl-box">
          <strong>THEY</strong> é neutro — funciona para grupos mistos ou quando
          não queremos especificar o gênero.<br><br>
          <em>He is + IS &nbsp;·&nbsp; She is + IS &nbsp;·&nbsp; They are + ARE</em>
        </div>
        <p class="expl-note">
          Perceba: HE e SHE usam <strong>IS</strong>, enquanto THEY usa <strong>ARE</strong>.
        </p>
      `
    },
    {
      afterIndex: 6,
      title: 'Revisão: Artigos THE e A',
      subtitle: 'Definido e Indefinido',
      body: `
        <p class="expl-intro">
          Chegamos ao final! Vamos revisar os <strong>artigos</strong> — essas
          pequenas palavras que fazem uma grande diferença na frase:
        </p>
        <div class="expl-banner">THE &nbsp;&nbsp;·&nbsp;&nbsp; A</div>
        <div class="expl-examples">
          <div class="expl-row">
            <span class="expl-pt">O / A / OS / AS</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">THE</span> boy / THE girl</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">UM / UMA</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">A</span> boy / A girl</span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">específico, já conhecido</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">THE</span></span>
          </div>
          <div class="expl-row">
            <span class="expl-pt">geral, qualquer um</span>
            <span class="expl-arrow">→</span>
            <span class="expl-en"><span class="expl-ing">A</span></span>
          </div>
        </div>
        <div class="expl-box">
          <em>"I see <strong>a</strong> boy."</em> — qualquer menino, não sabemos qual.<br>
          <em>"I see <strong>the</strong> boy."</em> — aquele menino específico que já conhecemos.
        </div>
        <p class="expl-note">
          Parabéns por chegar até aqui! Você aprendeu verbos, substantivos,
          pronomes, o Verb To Be e os artigos. 🎉
        </p>
      `
    }
  ]

};

function showExplanationSlide(expl) {
  const total = currentLesson.exercises.length;
  // barra de progresso removida do HTML
  // contador removido do HTML
  document.getElementById('exerciseView').classList.add('has-explanation');

  document.getElementById('exCard').innerHTML = `
    <div class="explanation-slide">
      <div class="expl-header">
        <div class="expl-badge">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          Explicação Gramatical
        </div>
        <h2 class="expl-title">${expl.title}</h2>
        ${expl.subtitle ? `<p class="expl-subtitle">${expl.subtitle}</p>` : ''}
      </div>
      <div class="expl-body">${expl.body}</div>
      <button class="btn-expl-continue" onclick="renderExercise()">
        Entendi! Continuar
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>
  `;
}

function nextExercise() {
  stopMic();
  if (_currentAudio) { _currentAudio.pause(); _currentAudio = null; }
  const prevIdx = currentExIdx;
  currentExIdx++;
  saveLessonDraft();
  // Verificar se há explicação para mostrar entre este e o próximo exercício
  const expl = (LESSON_EXPLANATIONS[currentLesson?.id] || []).find(e => e.afterIndex === prevIdx);
  if (expl) {
    showExplanationSlide(expl);
  } else {
    renderExercise();
  }
}

// ── Som de acerto ─────────────────────────────────────────────────────────────
let _audioCtx = null;
function _getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

async function playCorrectSound() {
  try {
    const ctx = _getAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    const now = ctx.currentTime;
    [[523,0],[659,0.09],[784,0.18],[1047,0.27]].forEach(([freq, start]) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now+start);
      gain.gain.linearRampToValueAtTime(0.22, now+start+0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, now+start+0.28);
      osc.start(now+start); osc.stop(now+start+0.32);
    });
  } catch(e) {}
}

async function playWrongSound() {
  try {
    const ctx = _getAudioCtx();
    if (ctx.state === 'suspended') await ctx.resume();
    const now = ctx.currentTime;
    // Dois tons descendentes — grave e dissonante, estilo Duolingo
    [[380, 0, 0.18], [300, 0.2, 0.22]].forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sawtooth'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + start);
      gain.gain.linearRampToValueAtTime(0.18, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
      osc.start(now + start); osc.stop(now + start + dur + 0.02);
    });
  } catch(e) {}
}

function showAnswerFeedback(data, ex, answer) {
  const feedback = document.getElementById('exFeedback'), isCorr = data.is_correct;
  if (isCorr) playCorrectSound(); else playWrongSound();
  feedback.className = 'ex-feedback show ' + (isCorr ? 'correct' : 'wrong');
  document.getElementById('feedbackIcon').innerHTML = isCorr ? '<polyline points="20 6 9 17 4 12"/>' : '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>';
  document.getElementById('feedbackTitle').textContent       = isCorr ? '✓ Correto!' : '✗ Incorreto';
  document.getElementById('feedbackExplanation').textContent = data.explanation || (isCorr ? '' : `Resposta correta: ${data.correct_answer || ''}`);
  if (ex.question_type === 'multiple_choice' || ex.question_type === 'listening') {
    document.querySelectorAll('.option-btn').forEach(b => { b.disabled = true; if (b.dataset.id === answer) b.classList.add(isCorr ? 'correct' : 'wrong'); });
  } else if (ex.question_type === 'is_or_are') {
    document.querySelectorAll('.ia-btn').forEach(b => { b.disabled = true; if (b.dataset.val === answer) b.classList.add(isCorr ? 'correct' : 'wrong'); });
  } else if (ex.question_type === 'image_choice') {
    document.querySelectorAll('.img-choice-btn').forEach(b => { b.disabled = true; if (b.dataset.val === answer) b.classList.add(isCorr ? 'correct' : 'wrong'); });
  } else if (ex.question_type === 'word_order') {
    document.querySelectorAll('.word-tile').forEach(b => b.disabled = true);
    document.getElementById('wordDrop')?.classList.add(isCorr ? 'correct' : 'wrong');
  } else {
    const inp = document.getElementById('textAnswer');
    if (inp) { inp.disabled = true; inp.className = 'text-input ' + (isCorr ? 'correct' : 'wrong'); }
  }
}

// ── Conclusão da lição ────────────────────────────────────────────────────────
async function finishLesson() {
  const total   = currentLesson.exercises.length;
  const correct = Object.values(answers).filter(a => a.is_correct).length;
  const score   = total > 0 ? Math.round((correct / total) * 100) : 0;
  const { data } = await db.rpc('complete_lesson', { p_token: session.token, p_lesson_id: currentLesson.id, p_score: score });
  clearLessonDraft();
  showCompletion(score, data || {});
}

function showCompletion(score, result = {}) {
  document.body.classList.remove('exercise-mode');
  document.getElementById('exerciseView').style.display   = 'none';
  document.getElementById('completionView').style.display = 'block';
  const total     = currentLesson.exercises.length;
  const correct   = Object.values(answers).filter(a => a.is_correct).length;
  const scoreSess = score !== undefined ? score : (total > 0 ? Math.round((correct/total)*100) : 0);
  const prevBest  = currentLesson?.bestScore || 0;
  const rpcScore  = result.final_score !== undefined ? Math.round(Number(result.final_score)) : scoreSess;
  const sc        = Math.max(rpcScore, prevBest);
  const passed    = sc >= 70;
  const xpTotal     = result.xp_earned    || 0;
  const coinsEarned = result.coins_earned || 0;
  const levelUp     = result.levelup_coins > 0;
  const streak      = result.streak_days  || homeData?.user?.streak_days || 0;
  if (result.total_xp) updateXpUI(result.total_xp, streak, result.total_coins);
  // Popup de moedas
  if (coinsEarned > 0) {
    setTimeout(() => showXpPopup(`🪙 +${coinsEarned} moeda${coinsEarned !== 1 ? 's' : ''}${levelUp ? ' (level up!)' : ''}`), 800);
  }
  document.getElementById('completionView').innerHTML = `
    <div class="completion-icon">${passed ? '🏆' : '📚'}</div>
    <div class="completion-title">${passed ? 'Lição concluída!' : 'Continue praticando!'}</div>
    <div class="completion-sub">${escapeHtml(currentLesson.title)}</div>
    <div class="completion-stats">
      <div class="cstat ${sc >= 70 ? 'gold' : ''}"><div class="cstat-val">${sc}%</div><div class="cstat-lbl">Melhor nota</div></div>
      ${xpTotal > 0 ? `<div class="cstat gold"><div class="cstat-val">+${xpTotal}</div><div class="cstat-lbl">XP ganho</div></div>` : ''}
      ${coinsEarned > 0 ? `<div class="cstat gold"><div class="cstat-val" style="color:#f59e0b;">+${coinsEarned}</div><div class="cstat-lbl">${levelUp ? 'MOEDAS (LEVEL UP!)' : 'MOEDAS GANHAS'}</div></div>` : ''}
    </div>
    ${passed
      ? '<div class="completion-pass">✓ Você atingiu a pontuação mínima! A próxima lição foi desbloqueada.</div>'
      : '<div class="completion-fail">Você precisa de 70% ou mais para desbloquear a próxima lição. Tente novamente!</div>'}
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
      <button class="btn-continue" style="background:var(--cream);color:var(--ink);border:1.5px solid var(--border);" onclick="retryLesson()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.53"/></svg>
        Tentar novamente
      </button>
      <button class="btn-continue" onclick="backToHome()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        Voltar ao curso
      </button>
    </div>`;
}

function retryLesson() {
  stopMic();
  clearLessonDraft();
  answers = {}; selectedOption = null; speakingAnswer = ''; currentExIdx = 0;
  currentLesson.exercises = currentLesson.exercises.map(e => ({ ...e, answered: null }));
  document.getElementById('completionView').style.display = 'none';
  document.getElementById('exerciseView').style.display   = 'block';
  document.body.classList.add('exercise-mode');
  document.getElementById('topbarTitle').textContent      = currentLesson.title;
  renderExercise();
}

// ── Fullscreen ────────────────────────────────────────────────────────────────
const _fsIconExpand   = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
const _fsIconCollapse = '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>';

function toggleFullscreen() {
  if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(() => {}); localStorage.setItem('ee_fullscreen', '1'); }
  else { document.exitFullscreen(); localStorage.setItem('ee_fullscreen', '0'); }
}
document.addEventListener('fullscreenchange', () => {
  const icon = document.getElementById('fsIcon'), btn = document.getElementById('btnFullscreen');
  if (document.fullscreenElement) { if (icon) icon.innerHTML = _fsIconCollapse; if (btn) btn.style.borderColor = 'var(--accent,#4f46e5)'; }
  else { if (icon) icon.innerHTML = _fsIconExpand; if (btn) btn.style.borderColor = ''; localStorage.setItem('ee_fullscreen', '0'); }
});

// ── Misc ──────────────────────────────────────────────────────────────────────
function doLogout() { saveLessonDraft(); localStorage.removeItem('ee_session'); window.location.href = '../index.html'; }

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
// Fechar sidebar ao navegar (mobile)
document.addEventListener('click', e => {
  if (e.target.closest('.nav-item') && window.innerWidth <= 900) closeMobileSidebar();
});

// ══════════════════════════════════════════════════════════════════════════════
// MODAL DE CONFIGURAÇÕES
// ══════════════════════════════════════════════════════════════════════════════

const CFG_DEFAULTS = {
  sound: true, volumeGeral: 80, feedback: true, narration: true, volumeNarration: 90,
  mic: false, micDevice: '', micSensitivity: 50,
  animations: true, zoom: 100
};
let cfgData = { ...CFG_DEFAULTS };
let cfgDirty = false;
let cfgMicStream = null, cfgAudioCtx = null, cfgAnalyser = null, cfgVuTimer = null;

const AVATARS = ['🦊','🐼','🐸','🦁','🐯','🐧','🦄','🐙','🦋','🐬','🦅','🐺','🦊','🌟','🔥','🎯'];

// ── Abrir / Fechar ────────────────────────────────────────────────────────────
function openSettings() {
  const backdrop = document.getElementById('cfgBackdrop');
  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
  cfgLoadSettings();
  cfgCheckNotifStatus();
  document.getElementById('cfgResolutionLabel').textContent = `${window.innerWidth} × ${window.innerHeight} px`;
}

function closeSettings() {
  const backdrop = document.getElementById('cfgBackdrop');
  backdrop.classList.remove('open');
  document.body.style.overflow = '';
  cfgStopMic();
}

function cfgBackdropClick(e) {
  if (e.target === document.getElementById('cfgBackdrop')) closeSettings();
}

// Fechar com ESC
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && document.getElementById('cfgBackdrop')?.classList.contains('open')) closeSettings();
});

// ── Carregar / Aplicar ────────────────────────────────────────────────────────
function cfgLoadSettings() {
  try { const s = JSON.parse(localStorage.getItem('ee_settings') || '{}'); cfgData = { ...CFG_DEFAULTS, ...s }; } catch(e) {}
  cfgApplyToUI();
}

function cfgApplyToUI() {
  document.getElementById('cfgToggleSound').checked      = cfgData.sound;
  document.getElementById('cfgVolumeGeral').value        = cfgData.volumeGeral;
  document.getElementById('cfgVolGeralVal').textContent  = cfgData.volumeGeral + '%';
  document.getElementById('cfgToggleFeedback').checked   = cfgData.feedback;
  document.getElementById('cfgToggleNarration').checked  = cfgData.narration;
  document.getElementById('cfgVolumeNarration').value    = cfgData.volumeNarration;
  document.getElementById('cfgVolNarVal').textContent    = cfgData.volumeNarration + '%';
  document.getElementById('cfgToggleMic').checked        = cfgData.mic;
  document.getElementById('cfgMicSensitivity').value     = cfgData.micSensitivity;
  document.getElementById('cfgMicSensVal').textContent   = cfgData.micSensitivity + '%';
  document.getElementById('cfgToggleAnimations').checked = cfgData.animations;
  cfgSetZoom(cfgData.zoom, false);
  if (cfgData.mic) cfgInitMic();
  // Fullscreen label
  const lbl = document.getElementById('cfgFullscreenLabel');
  if (lbl) lbl.textContent = document.fullscreenElement ? 'Sair' : 'Ativar';
  const btnFs = document.getElementById('cfgBtnFullscreen');
  if (btnFs) btnFs.classList.toggle('active', Boolean(document.fullscreenElement));
  cfgDirty = false;
  document.getElementById('cfgSaveBar').classList.remove('visible');
}

function cfgOnChange() {
  cfgDirty = true;
  document.getElementById('cfgSaveBar').classList.add('visible');
}

function cfgUpdateSlider(id, valId) {
  document.getElementById(valId).textContent = document.getElementById(id).value + '%';
}

// ── Salvar / Descartar / Redefinir ────────────────────────────────────────────
function cfgSave() {
  cfgData.sound           = document.getElementById('cfgToggleSound').checked;
  cfgData.volumeGeral     = +document.getElementById('cfgVolumeGeral').value;
  cfgData.feedback        = document.getElementById('cfgToggleFeedback').checked;
  cfgData.narration       = document.getElementById('cfgToggleNarration').checked;
  cfgData.volumeNarration = +document.getElementById('cfgVolumeNarration').value;
  cfgData.mic             = document.getElementById('cfgToggleMic').checked;
  cfgData.micDevice       = document.getElementById('cfgMicSelect').value;
  cfgData.micSensitivity  = +document.getElementById('cfgMicSensitivity').value;
  cfgData.animations      = document.getElementById('cfgToggleAnimations').checked;

  localStorage.setItem('ee_settings', JSON.stringify(cfgData));

  // Aplica animações
  document.documentElement.style.setProperty('--anim-speed', cfgData.animations ? '1' : '0');

  cfgDirty = false;
  document.getElementById('cfgSaveBar').classList.remove('visible');
  showCfgToast('Configurações salvas!');
}

function cfgDiscard() {
  cfgLoadSettings();
  cfgDirty = false;
  document.getElementById('cfgSaveBar').classList.remove('visible');
  showCfgToast('Alterações descartadas.');
}

function cfgReset() {
  if (!confirm('Redefinir todas as configurações para o padrão?')) return;
  cfgData = { ...CFG_DEFAULTS };
  localStorage.setItem('ee_settings', JSON.stringify(cfgData));
  cfgApplyToUI();
  showCfgToast('Configurações redefinidas.');
}

// ── Mic ───────────────────────────────────────────────────────────────────────
function cfgOnMicToggle() {
  const on = document.getElementById('cfgToggleMic').checked;
  document.getElementById('cfgMicSelect').disabled = !on;
  if (on) { cfgInitMic(); } else { cfgStopMic(); }
  cfgOnChange();
}

function cfgOnMicDeviceChange() {
  cfgData.micDevice = document.getElementById('cfgMicSelect').value;
  if (cfgData.mic) { cfgStopMic(); cfgInitMic(); }
  cfgOnChange();
}

function cfgInitMic() {
  if (!navigator.mediaDevices?.getUserMedia) return;
  const statusEl = document.getElementById('cfgMicStatus');
  if (statusEl) { statusEl.textContent = 'Conectando...'; statusEl.className = 'mic-status waiting'; }

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    cfgMicStream = stream;
    cfgAudioCtx  = new (window.AudioContext || window.webkitAudioContext)();
    cfgAnalyser  = cfgAudioCtx.createAnalyser();
    const src = cfgAudioCtx.createMediaStreamSource(stream);
    src.connect(cfgAnalyser);
    cfgAnalyser.fftSize = 256;
    if (statusEl) { statusEl.textContent = 'Ativo'; statusEl.className = 'mic-status active'; }

    // Populate device list
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const sel = document.getElementById('cfgMicSelect');
      if (!sel) return;
      sel.innerHTML = '';
      devices.filter(d => d.kind === 'audioinput').forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.deviceId;
        opt.textContent = d.label || 'Microfone';
        if (d.deviceId === cfgData.micDevice) opt.selected = true;
        sel.appendChild(opt);
      });
    }).catch(() => {});

    // VU meter
    const vuBar = document.getElementById('cfgVuBar');
    if (vuBar) {
      const data = new Uint8Array(cfgAnalyser.frequencyBinCount);
      cfgVuTimer = setInterval(() => {
        cfgAnalyser.getByteFrequencyData(data);
        const avg = data.reduce((a,b) => a+b, 0) / data.length;
        vuBar.style.width = Math.min(100, avg * 2) + '%';
      }, 80);
    }
  }).catch(() => {
    if (statusEl) { statusEl.textContent = 'Sem permissão'; statusEl.className = 'mic-status error'; }
  });
}

function cfgStopMic() {
  if (cfgVuTimer) { clearInterval(cfgVuTimer); cfgVuTimer = null; }
  if (cfgMicStream) { cfgMicStream.getTracks().forEach(t => t.stop()); cfgMicStream = null; }
  if (cfgAudioCtx)  { cfgAudioCtx.close().catch(() => {}); cfgAudioCtx = null; }
  cfgAnalyser = null;
  const statusEl = document.getElementById('cfgMicStatus');
  if (statusEl) { statusEl.textContent = 'Inativo'; statusEl.className = 'mic-status waiting'; }
  const vuBar = document.getElementById('cfgVuBar');
  if (vuBar) vuBar.style.width = '0%';
}

function cfgTestMic() {
  if (!cfgAnalyser) { showCfgToast('Ative o microfone primeiro.'); return; }
  showCfgToast('Microfone funcionando!');
}

// ── Zoom ──────────────────────────────────────────────────────────────────────
function cfgSetZoom(val, save = true) {
  cfgData.zoom = val;
  document.documentElement.style.fontSize = (val / 100) + 'rem';
  // Highlight active button
  document.querySelectorAll('.zoom-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.textContent) === val);
  });
  if (save) { cfgOnChange(); }
}

// ── Notificações ──────────────────────────────────────────────────────────────
function cfgCheckNotifStatus() {
  const btn = document.getElementById('cfgBtnNotif');
  if (!btn) return;
  if (!('Notification' in window)) {
    btn.textContent = 'Não suportado';
    btn.disabled = true;
    return;
  }
  if (Notification.permission === 'granted') {
    btn.textContent = '✓ Ativadas';
    btn.classList.add('active');
  } else if (Notification.permission === 'denied') {
    btn.textContent = 'Bloqueadas';
    btn.disabled = true;
  } else {
    btn.textContent = 'Ativar notificações';
  }
}

function cfgRequestNotifications() {
  if (!('Notification' in window)) return;
  Notification.requestPermission().then(p => {
    cfgCheckNotifStatus();
    if (p === 'granted') showCfgToast('Notificações ativadas!');
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showCfgToast(msg) {
  const toast = document.getElementById('cfgToast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('visible'), 2800);
}
