// ── Configurações — English Essential ────────────────────────────────────────

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPABASE_URL  = 'https://jhpqdxqsgnyqtzqvggvx.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpocHFkeHFzZ255cXR6cXZnZ3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwOTEyMjksImV4cCI6MjA5NTY2NzIyOX0.xGC_jijXKpRAdhuyyTMQxS8qkca0Dap_Wcs3_8xKvcw';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Sessão ────────────────────────────────────────────────────────────────────
let session = null;
const initials = n => (n||'??').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();

try { session = JSON.parse(localStorage.getItem('ee_session')); } catch(e) {}
if (!session) { window.location.href = '../index.html'; }
else {
  renderSidebarProfile(session);
  const roleLabels = { admin:'Administrador', teacher:'Professor', student:'Aluno' };
  const rolePanels = { admin:'Painel do administrador', teacher:'Painel do professor', student:'Painel do aluno' };
  const homeLinks  = { student:'../dashboard-aluno/index.html', teacher:'../dashboard-professor/index.html', admin:'../dashboard-professor/index.html' };
  document.getElementById('sidebarRoleLabel').textContent = roleLabels[session.role] || 'Usuário';
  document.getElementById('sidebarRole').textContent      = rolePanels[session.role] || 'Painel';
  document.getElementById('sidebarRole').textContent      = rolePanels[session.role] || 'Painel';
  const navHome = document.getElementById('navHome');
  if (navHome) navHome.href = homeLinks[session.role] || '../index.html';
  // Carrega XP e habilidades para alunos
  if (session.role === 'student') loadSidebarStats();
}

function renderSidebarProfile(profile) {
  const avatar      = document.getElementById('sidebarAvatar');
  const name        = document.getElementById('sidebarName');
  const displayName = profile?.display_name || profile?.full_name || 'Usuário';
  avatar.textContent = profile?.avatar_url || initials(profile?.full_name || displayName);
  avatar.classList.toggle('has-custom-avatar', Boolean(profile?.avatar_url));
  name.textContent   = displayName;
}

function doLogout() { localStorage.removeItem('ee_session'); window.location.href = '../index.html'; }

// ── Configurações padrão ──────────────────────────────────────────────────────
const DEFAULTS = {
  sound: true, volumeGeral: 80, feedback: true, narration: true, volumeNarration: 90,
  mic: false, micDevice: '', micSensitivity: 50,
  animations: true, zoom: 100, darkBlue: false
};
let cfg   = { ...DEFAULTS };
let dirty = false;

// ── Carregar / aplicar ────────────────────────────────────────────────────────
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('ee_settings') || '{}');
    cfg = { ...DEFAULTS, ...saved };
  } catch(e) {}
  applyToUI();
}

function applyToUI() {
  document.getElementById('toggleSound').checked      = cfg.sound;
  document.getElementById('volumeGeral').value        = cfg.volumeGeral;
  document.getElementById('volGeralVal').textContent  = cfg.volumeGeral + '%';
  document.getElementById('toggleFeedback').checked   = cfg.feedback;
  document.getElementById('toggleNarration').checked  = cfg.narration;
  document.getElementById('volumeNarration').value    = cfg.volumeNarration;
  document.getElementById('volNarVal').textContent    = cfg.volumeNarration + '%';
  document.getElementById('toggleMic').checked        = cfg.mic;
  document.getElementById('micSensitivity').value     = cfg.micSensitivity;
  document.getElementById('micSensVal').textContent   = cfg.micSensitivity + '%';
  document.getElementById('toggleAnimations').checked = cfg.animations;
  document.getElementById('toggleDarkBlue').checked   = cfg.darkBlue;
  applyDarkBlue(cfg.darkBlue);
  setZoom(cfg.zoom, false);
  document.getElementById('resolutionLabel').textContent = `${window.innerWidth} × ${window.innerHeight} px`;
  if (cfg.mic) initMic();
  checkNotifStatus();
}

document.addEventListener('DOMContentLoaded', loadSettings);
window.addEventListener('resize', () => {
  document.getElementById('resolutionLabel').textContent = `${window.innerWidth} × ${window.innerHeight} px`;
});

// ── Detectar / salvar / descartar ─────────────────────────────────────────────
function onSettingChange() {
  dirty = true;
  document.getElementById('saveBar').style.display = 'flex';
}

function updateSlider(id, valId) {
  document.getElementById(valId).textContent = document.getElementById(id).value + '%';
}

function saveSettings() {
  cfg.sound           = document.getElementById('toggleSound').checked;
  cfg.volumeGeral     = +document.getElementById('volumeGeral').value;
  cfg.feedback        = document.getElementById('toggleFeedback').checked;
  cfg.narration       = document.getElementById('toggleNarration').checked;
  cfg.volumeNarration = +document.getElementById('volumeNarration').value;
  cfg.mic             = document.getElementById('toggleMic').checked;
  cfg.micDevice       = document.getElementById('micSelect').value;
  cfg.micSensitivity  = +document.getElementById('micSensitivity').value;
  cfg.animations      = document.getElementById('toggleAnimations').checked;
  cfg.darkBlue        = document.getElementById('toggleDarkBlue').checked;
  applyDarkBlue(cfg.darkBlue);
  localStorage.setItem('ee_settings', JSON.stringify(cfg));
  dirty = false;
  document.getElementById('saveBar').style.display = 'none';
  showToast('✓ Configurações salvas!');
  applyAnimations();
}

function discardChanges() {
  dirty = false;
  document.getElementById('saveBar').style.display = 'none';
  loadSettings();
}

function resetSettings() {
  if (!confirm('Redefinir todas as configurações para o padrão?')) return;
  cfg = { ...DEFAULTS };
  localStorage.removeItem('ee_settings');
  dirty = false;
  document.getElementById('saveBar').style.display = 'none';
  applyToUI();
  showToast('Configurações redefinidas.');
}

function showToast(msg) {
  const el = document.getElementById('saveToast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function applyAnimations() {
  document.documentElement.style.setProperty('--transition-speed', cfg.animations ? '0.15s' : '0s');
}

// ── Dark Blue Theme ───────────────────────────────────────────────────────────
function applyDarkBlue(on) {
  const r = document.documentElement;
  if (on) {
    r.style.setProperty('--bg',           '#0a0f1e');
    r.style.setProperty('--bg-card',      '#0f1729');
    r.style.setProperty('--bg-card2',     '#131d35');
    r.style.setProperty('--bg-input',     '#131d35');
    r.style.setProperty('--white',        '#e2e8f0');
    r.style.setProperty('--white-soft',   '#cbd5e1');
    r.style.setProperty('--white-muted',  '#64748b');
    r.style.setProperty('--border',       'rgba(59,130,246,0.15)');
    r.style.setProperty('--border-hover', 'rgba(59,130,246,0.35)');
    r.classList.add('dark-blue');
  } else {
    ['--bg','--bg-card','--bg-card2','--bg-input','--white','--white-soft','--white-muted','--border','--border-hover'].forEach(v =>
      r.style.removeProperty(v)
    );
    r.classList.remove('dark-blue');
  }
}

// ── Tela cheia ────────────────────────────────────────────────────────────────
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
    localStorage.setItem('ee_fullscreen', '1');
    document.getElementById('fullscreenLabel').textContent = 'Sair';
    document.getElementById('btnFullscreen').classList.add('active');
  } else {
    document.exitFullscreen();
    localStorage.setItem('ee_fullscreen', '0');
    document.getElementById('fullscreenLabel').textContent = 'Ativar';
    document.getElementById('btnFullscreen').classList.remove('active');
  }
}
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    localStorage.setItem('ee_fullscreen', '0');
    document.getElementById('fullscreenLabel').textContent = 'Ativar';
    document.getElementById('btnFullscreen').classList.remove('active');
  }
});

// ── Zoom ──────────────────────────────────────────────────────────────────────
function setZoom(val, mark = true) {
  cfg.zoom = val;
  document.body.style.zoom = val + '%';
  document.querySelectorAll('.zoom-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.textContent) === val);
  });
  if (mark) onSettingChange();
}

// ── Microfone ─────────────────────────────────────────────────────────────────
let micStream = null, audioCtx = null, analyser = null, vuTimer = null;

function onMicToggle() {
  const on = document.getElementById('toggleMic').checked;
  onSettingChange();
  if (on) initMic(); else stopMic();
}

async function initMic() {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    await loadMicDevices();
    startVU();
    document.getElementById('micStatus').textContent = 'Ativo';
    document.getElementById('micStatus').className   = 'mic-status ok';
    document.getElementById('micSelect').disabled    = false;
  } catch(e) {
    document.getElementById('toggleMic').checked     = false;
    document.getElementById('micStatus').textContent = 'Sem permissão';
    document.getElementById('micStatus').className   = 'mic-status error';
    alert('Permissão de microfone negada. Autorize o acesso nas configurações do navegador.');
  }
}

function stopMic() {
  if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
  if (audioCtx)  { audioCtx.close(); audioCtx = null; }
  if (vuTimer)   { cancelAnimationFrame(vuTimer); vuTimer = null; }
  document.getElementById('vuFill').style.width    = '0%';
  document.getElementById('micStatus').textContent = 'Inativo';
  document.getElementById('micStatus').className   = 'mic-status waiting';
  document.getElementById('micSelect').disabled    = true;
  document.getElementById('micSelect').innerHTML   = '<option value="">Ative o microfone primeiro</option>';
}

async function loadMicDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const mics    = devices.filter(d => d.kind === 'audioinput');
  const sel     = document.getElementById('micSelect');
  sel.innerHTML = mics.map((d, i) =>
    `<option value="${d.deviceId}">${d.label || 'Microfone ' + (i+1)}</option>`
  ).join('');
  if (cfg.micDevice) sel.value = cfg.micDevice;
}

function onMicDeviceChange() {
  if (micStream) { stopMic(); initMic(); }
  onSettingChange();
}

function startVU() {
  audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
  analyser  = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  const src = audioCtx.createMediaStreamSource(micStream);
  src.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  function tick() {
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((a,b) => a+b, 0) / data.length;
    const pct = Math.min(100, (avg / 128) * 100 * 1.5);
    document.getElementById('vuFill').style.width = pct + '%';
    vuTimer = requestAnimationFrame(tick);
  }
  tick();
}

async function testMic() {
  const btn = document.getElementById('btnTestMic');
  if (!document.getElementById('toggleMic').checked) {
    alert('Ative o microfone primeiro para testar.'); return;
  }
  btn.classList.add('active');
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Gravando...`;
  const chunks   = [];
  const recorder = new MediaRecorder(micStream);
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    const blob  = new Blob(chunks, { type: 'audio/webm' });
    const audio = new Audio(URL.createObjectURL(blob));
    audio.play();
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg> Testar`;
    btn.classList.remove('active');
  };
  recorder.start();
  setTimeout(() => recorder.stop(), 3000);
}

// ── Notificações ──────────────────────────────────────────────────────────────
function checkNotifStatus() {
  const lbl = document.getElementById('notifLabel');
  if (!('Notification' in window)) { lbl.textContent = 'Não suportado'; return; }
  if (Notification.permission === 'granted') lbl.textContent = '✓ Autorizado';
  if (Notification.permission === 'denied')  lbl.textContent = 'Bloqueado';
  if (Notification.permission === 'default') lbl.textContent = 'Solicitar permissão';
}

async function requestNotifications() {
  if (!('Notification' in window)) { alert('Navegador não suporta notificações.'); return; }
  const perm = await Notification.requestPermission();
  checkNotifStatus();
  if (perm === 'granted') showToast('✓ Notificações autorizadas!');
}

// ── Sidebar XP / Radar (alunos) ───────────────────────────────────────────────
async function loadSidebarStats() {
  try {
    const { data } = await db.rpc('get_student_home', { p_caller_id: session.id });
    if (data?.user) {
      const xp     = data.user.total_xp || 0;
      const streak = data.user.streak_days || 0;
      const level  = Math.floor(xp / 1000) + 1;
      const xpInLvl = xp % 1000;
      document.getElementById('sidebarLevel').textContent  = 'Nível ' + level;
      document.getElementById('sidebarXpNext').textContent = xpInLvl + ' / 1000 XP';
      document.getElementById('sidebarXpBar').style.width  = ((xpInLvl / 1000) * 100) + '%';
      document.getElementById('sidebarStreak').textContent = streak;
    }
    const { data: skills } = await db.rpc('get_skill_stats', { p_caller_id: session.id });
    if (skills) drawRadarChart({
      speaking:  Number(skills.speaking  || 0),
      listening: Number(skills.listening || 0),
      writing:   Number(skills.writing   || 0),
      reading:   Number(skills.reading   || 0),
    });
  } catch(e) {}
}

function drawRadarChart(stats) {
  const canvas = document.getElementById('skillRadar');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = 220, H = 190, cx = 110, cy = 95, r = 60;
  const accent = '#2563eb';
  const labels = ['S', 'L', 'W', 'R'];
  const vals   = [stats.speaking, stats.listening, stats.writing, stats.reading];
  const angles = [-Math.PI/2, 0, Math.PI/2, Math.PI];
  ctx.clearRect(0, 0, W, H);
  [0.25, 0.5, 0.75, 1].forEach(t => {
    ctx.beginPath();
    angles.forEach((a, i) => { const x = cx + r*t*Math.cos(a), y = cy + r*t*Math.sin(a); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
    ctx.closePath(); ctx.strokeStyle='rgba(37,99,235,.12)'; ctx.lineWidth=1; ctx.stroke();
  });
  angles.forEach(a => { ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a)); ctx.strokeStyle='rgba(37,99,235,.18)'; ctx.lineWidth=1; ctx.stroke(); });
  ctx.beginPath();
  angles.forEach((a,i) => { const v=vals[i]/100, x=cx+r*v*Math.cos(a), y=cy+r*v*Math.sin(a); i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
  ctx.closePath(); ctx.fillStyle='rgba(37,99,235,.22)'; ctx.fill(); ctx.strokeStyle=accent; ctx.lineWidth=2; ctx.stroke();
  angles.forEach((a,i) => { const v=vals[i]/100; ctx.beginPath(); ctx.arc(cx+r*v*Math.cos(a),cy+r*v*Math.sin(a),3.5,0,Math.PI*2); ctx.fillStyle=accent; ctx.fill(); });
  const offsets = [[0,-10],[10,4],[0,12],[-10,4]];
  ctx.font = '11px "DM Sans", sans-serif';
  angles.forEach((a,i) => {
    const lx=cx+(r+10)*Math.cos(a)+offsets[i][0], ly=cy+(r+10)*Math.sin(a)+offsets[i][1];
    ctx.textAlign=i===1?'left':i===3?'right':'center'; ctx.fillStyle='#1a1a2e'; ctx.fillText(labels[i],lx,ly);
  });
}

// ── Personalização do perfil (alunos) ─────────────────────────────────────────
async function saveDisplayName() {
  if (!session || session.role !== 'student') return;
  const val = document.getElementById('displayNameInput')?.value?.trim();
  if (!val) return;
  const { error } = await db.rpc('update_student_profile', {
    p_caller_id:    session.id,
    p_display_name: val,
    p_avatar_url:   session.avatar_url || null
  });
  if (!error) {
    session.display_name = val;
    localStorage.setItem('ee_session', JSON.stringify(session));
    renderSidebarProfile(session);
    showToast('✓ Nome atualizado!');
  }
}

async function saveAvatar(emoji) {
  if (!session || session.role !== 'student') return;
  document.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
  document.querySelector(`[data-avatar="${emoji}"]`)?.classList.add('selected');
  const { error } = await db.rpc('update_student_profile', {
    p_caller_id:    session.id,
    p_display_name: session.display_name || session.full_name || null,
    p_avatar_url:   emoji
  });
  if (!error) {
    session.avatar_url = emoji;
    localStorage.setItem('ee_session', JSON.stringify(session));
    renderSidebarProfile(session);
    showToast('✓ Avatar salvo!');
  }
}
