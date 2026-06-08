const DB_SESSION_KEY = "DAMADORO_SPLIT_V2";

let appState = {
  timerActive: false,
  timerMode: 'focus', // 'focus', 'break', 'long_break'
  timeLeft: 25 * 60,
  consecutiveSuccess: 0,
  longBreakLockTimeLeft: 0,
  todayFocusMinutes: 0,

  focusScene: 'default',
  bgImageUrl: '',
  enableParticles: true,
  enableNoise: true,
  enableWeather: 'none',
  enableTimeSync: false,
  enablePet: true,
  
  timerSkin: 'classic',
  timerLayout: 'ring',
  timerFont: "'Outfit', sans-serif",
  timerScale: 10,
  uiOpacity: 85,
  youtubeId: 'jfKfPfyJRdk',
  
  petCustomColorBody: null,
  petCustomColorAccent: null,
  selectedCharId: 'tomato_cherry',
  
  todos: [],
  minimized: ['widget-status', 'widget-store', 'widget-todo', 'widget-music', 'widget-stats'],
  leaves: 150,
  inventory: {},
  equippedItem: null,
  affection: 50,
  hunger: 80,
  thirst: 90,
  widgetLayouts: {}
};

const CHARACTERS = {
  tomato_cherry: { color: '#ef4444', accent: '#b91c1c', name: '방울토마토' },
  tomato_green: { color: '#22c55e', accent: '#15803d', name: '풋토마토' },
  tomato_black: { color: '#1e293b', accent: '#0f172a', name: '흑토마토' },
  tomato_purple: { color: '#8b5cf6', accent: '#6d28d9', name: '보라토마토' },
  tomato_gold: { color: '#fbbf24', accent: '#d97706', name: '황금토마토' }
};

function loadDatabase() {
  try {
    const raw = localStorage.getItem(DB_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      appState = { ...appState, ...parsed };
    }
  } catch(e) { console.error("Load failed", e); }
}

function saveDatabase() {
  localStorage.setItem(DB_SESSION_KEY, JSON.stringify(appState));
}

// Audio Engine
let audioCtx = null;
let mainGainNode = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    mainGainNode = audioCtx.createGain();
    mainGainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    mainGainNode.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playThumpSound(volume = 0.3, pitch = 150) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.1, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(mainGainNode);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.18);
  } catch (e) {}
}

function playChime(success = true) {
  initAudio();
  try {
    const now = audioCtx.currentTime;
    const scale = success ? [523.25, 659.25, 783.99, 1046.50] : [440, 349.23];
    scale.forEach((f, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + (idx * 0.1));
      gain.gain.setValueAtTime(0.12, now + (idx * 0.1));
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8 + (idx * 0.15));
      osc.connect(gain);
      gain.connect(mainGainNode);
      osc.start(now + (idx * 0.1));
      osc.stop(now + 1.2 + (idx * 0.15));
    });
  } catch (e) {}
}

function showCustomAlert(title, desc, emoji = "📢") {
  initAudio();
  document.getElementById('alert-emoji').textContent = emoji;
  document.getElementById('alert-title').textContent = title;
  document.getElementById('alert-desc').textContent = desc;
  const modal = document.getElementById('custom-alert');
  const box = document.getElementById('custom-alert-box');
  if(modal) modal.classList.remove('hidden');
  setTimeout(() => { if(box) box.classList.add('scale-100'); }, 10);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-alert-confirm')?.addEventListener('click', () => {
    const modal = document.getElementById('custom-alert');
    const box = document.getElementById('custom-alert-box');
    if(box) box.classList.remove('scale-100');
    setTimeout(() => { if(modal) modal.classList.add('hidden'); }, 100);
  });
});
