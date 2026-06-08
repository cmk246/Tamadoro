
// --- Taskbar & Minimize Logic ---
function initTaskbar() {
  const taskbar = document.getElementById('taskbar');
  if (!taskbar) return;

  const widgets = [
    { id: 'widget-timer', icon: '<i class="fa-solid fa-clock"></i>', name: 'Timer' },
    { id: 'widget-status', icon: '<i class="fa-solid fa-heart-pulse"></i>', name: 'Status' },
    { id: 'widget-character', icon: '<i class="fa-solid fa-face-smile"></i>', name: 'Characters' },
    { id: 'widget-todo', icon: '<i class="fa-solid fa-list-check"></i>', name: 'Todo' },
    { id: 'widget-music', icon: '<i class="fa-solid fa-headphones"></i>', name: 'Music' },
    { id: 'widget-stats', icon: '<i class="fa-solid fa-chart-column"></i>', name: 'Stats' },
    { id: 'widget-store', icon: '<i class="fa-solid fa-store"></i>', name: 'Store' },
    { id: 'widget-emotion', icon: '<i class="fa-solid fa-masks-theater"></i>', name: '표정 컨트롤' },
  ];

  widgets.forEach(w => {
    const el = document.getElementById(w.id);
    if (!el) return;

    // Remove old minimize button if exists
    const oldBtn = el.querySelector('.btn-minimize');
    if (oldBtn) oldBtn.remove();

    if (w.id === 'widget-timer') {
      const btn = document.createElement('button');
      btn.className = 'btn-minimize absolute top-6 right-6 text-stone-300 hover:text-stone-600 transition-colors z-50 pointer-events-auto text-xl';
      btn.innerHTML = '<i class="fa-solid fa-minus"></i>';
      btn.onclick = () => minimizeWidget(w.id, w.icon, w.name);
      el.appendChild(btn);
    } else {
      const handle = el.querySelector('.drag-handle');
      if (handle) {
        handle.classList.add('relative');
        const btn = document.createElement('button');
        btn.className = 'btn-minimize absolute right-4 top-1 text-stone-400 hover:text-stone-600 transition-colors z-50 pointer-events-auto text-xs';
        btn.innerHTML = '<i class="fa-solid fa-minus"></i>';
        
        btn.onmousedown = (e) => e.stopPropagation();
        btn.onclick = () => minimizeWidget(w.id, w.icon, w.name);
        handle.appendChild(btn);
      }
    }
    
    if (appState.minimized && appState.minimized.includes(w.id)) {
        minimizeWidget(w.id, w.icon, w.name, false);
    }
  });
}

function minimizeWidget(id, icon, name, doAnimate = true) {
  const el = document.getElementById(id);
  const taskbar = document.getElementById('taskbar');
  if (!el || !taskbar) return;

  if (doAnimate) {
    el.style.transform = 'scale(0.8) translateY(50px)';
    el.style.opacity = '0';
    setTimeout(() => { el.style.display = 'none'; }, 300);
  } else {
    el.style.display = 'none';
  }

  if (!appState.minimized) appState.minimized = [];
  if (!appState.minimized.includes(id)) {
    appState.minimized.push(id);
    saveDatabase();
  }

  if (taskbar.querySelector(`[data-widget-id="${id}"]`)) return;

  const tbIcon = document.createElement('button');
  tbIcon.dataset.widgetId = id;
  tbIcon.className = 'w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 border border-stone-200 flex items-center justify-center text-stone-600 shadow-sm transition-all hover:-translate-y-1 group relative';
  tbIcon.innerHTML = icon + `<span class="absolute -top-8 bg-stone-800 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">${name}</span>`;
  
  tbIcon.onclick = () => restoreWidget(id, tbIcon);
  taskbar.appendChild(tbIcon);
}

function restoreWidget(id, tbIcon) {
  const el = document.getElementById(id);
  if (!el) return;

  el.style.display = (id === 'widget-status' || id === 'widget-character') ? 'block' : 'flex';
  void el.offsetWidth;
  el.style.transform = 'none';
  el.style.opacity = '1';
  tbIcon.remove();

  if (appState.minimized) {
    appState.minimized = appState.minimized.filter(mId => mId !== id);
    saveDatabase();
  }
}

// --- Drag and Drop Engine ---
function makeDraggable(elementId, handleQuery = null) {
  const el = document.getElementById(elementId);
  if (!el) return;
  
  let isDragging = false;
  let startX, startY, initTop, initLeft;

  const onMouseDown = (e) => {
    if (handleQuery && !e.target.closest(handleQuery)) {
      if (elementId !== 'widget-timer') return;
    }
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select') || e.target.closest('iframe')) return;
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = el.getBoundingClientRect();
    el.style.transform = 'none';
    el.style.bottom = 'auto';
    el.style.right = 'auto';
    el.style.margin = '0';
    el.style.top = rect.top + 'px';
    el.style.left = rect.left + 'px';
    
    initTop = rect.top;
    initLeft = rect.left;
    document.body.style.userSelect = 'none';
  };

  el.addEventListener('mousedown', onMouseDown);
  
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const newTop = initTop + (e.clientY - startY);
    const newLeft = initLeft + (e.clientX - startX);
    
    // 헤더(56px) 아래로만 이동 가능
    el.style.top = Math.max(56, newTop) + 'px';
    el.style.left = Math.max(0, Math.min(window.innerWidth - 100, newLeft)) + 'px';
});
  
  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      document.body.style.userSelect = '';
      if (!appState.widgetLayouts[elementId]) appState.widgetLayouts[elementId] = {};
      appState.widgetLayouts[elementId].top = el.style.top;
      appState.widgetLayouts[elementId].left = el.style.left;
      saveDatabase();
    }
  });
}

function restoreLayouts() {
  Object.keys(appState.widgetLayouts).forEach(id => {
    const el = document.getElementById(id);
    const layout = appState.widgetLayouts[id];
    if (el && layout && layout.top && layout.left) {
      el.style.transform = 'none';
      el.style.bottom = 'auto';
      el.style.right = 'auto';
      el.style.margin = '0';
      el.style.top = layout.top;
      el.style.left = layout.left;
    }
  });
}

// --- Visual Effects & Settings Sync ---
function applySettings() {
  const bg = document.getElementById('custom-bg-layer');
  if(bg) {
    bg.style.backgroundImage = appState.bgImageUrl ? `url('${appState.bgImageUrl}')` : "none";
    bg.style.opacity = appState.bgImageUrl ? "1" : "0";
  }
  
  const noise = document.getElementById('noise-filter');
  if (noise) noise.style.display = appState.enableNoise ? 'block' : 'none';
  
  document.querySelectorAll('.particle').forEach(p => p.style.display = appState.enableParticles ? 'block' : 'none');
  
  document.documentElement.style.setProperty('--timer-scale', (appState.timerScale/10).toFixed(1));
  document.documentElement.style.setProperty('--timer-font', appState.timerFont);
  document.documentElement.style.setProperty('--ui-opacity', (appState.uiOpacity/100).toFixed(2));

  const ytIframe = document.getElementById('youtube-iframe');
  const ytIdSpan = document.getElementById('current-youtube-id');
  if (ytIframe && appState.youtubeId) {
    const currentSrc = ytIframe.src;
    const newSrc = `https://www.youtube-nocookie.com/embed/${appState.youtubeId}?controls=1&fs=0&modestbranding=1`;
    if (!currentSrc.includes(appState.youtubeId)) ytIframe.src = newSrc;
    if (ytIdSpan) ytIdSpan.textContent = appState.youtubeId;
  }

  const layouts = ['ring', 'digital', 'liquid'];
  layouts.forEach(l => {
    const view = document.getElementById('timer-view-' + l);
    if(view) {
      if (appState.timerLayout === l) view.classList.remove('hidden');
      else view.classList.add('hidden');
    }
  });

  const wo = document.getElementById('weather-overlay');
  if(wo) {
    wo.innerHTML = '';
    if(appState.enableWeather !== 'none') {
      for(let i=0; i<50; i++) {
        let el = document.createElement('div');
        el.className = 'weather-' + appState.enableWeather;
        el.style.left = (Math.random()*100)+'%';
        el.style.animationDuration = appState.enableWeather==='rain' ? (0.5+Math.random()*0.5)+'s' : (3+Math.random()*5)+'s';
        el.style.animationDelay = (Math.random()*5)+'s';
        wo.appendChild(el);
      }
    }
  }

  const to = document.getElementById('time-overlay');
  if(to) {
    if(appState.enableTimeSync) {
      const h = new Date().getHours();
      if(h >= 19 || h < 6) { to.style.background = 'linear-gradient(to bottom, rgba(10,10,30,0.6), rgba(0,0,10,0.8))'; to.style.mixBlendMode='multiply'; }
      else if(h >= 17 && h < 19) { to.style.background = 'linear-gradient(to bottom, rgba(255,100,50,0.3), rgba(150,50,50,0.4))'; to.style.mixBlendMode='multiply'; }
      else to.style.background = 'none';
    } else to.style.background = 'none';
  }
}

window.setFocusScene = function(scene) {
  appState.focusScene = scene;
  const overlay = document.getElementById('focus-overlay');
  if(overlay) overlay.className = 'focus-overlay focus-mode-bg ' + (scene !== 'default' ? 'scene-'+scene : '');
  saveDatabase();
  speakBubble(`배경 테마 변경 완료! 🖼️`);
};

window.setTimerSkin = function(skin) {
  appState.timerSkin = skin;
  const container = document.getElementById('timer-view-ring');
  const ring = document.getElementById('timer-progress-ring');
  if(!container || !ring) return;
  
  container.className = "relative w-72 h-72 flex items-center justify-center";
  ring.style.filter = '';
  document.body.style.setProperty('--timer-glow', 'transparent');
  
  if (skin === 'neon') {
    container.classList.add('timer-theme-neon');
    document.body.style.setProperty('--timer-glow', '#6366f1');
    ring.style.filter = `drop-shadow(0 0 8px #6366f1)`;
  } else if (skin === 'forest') container.classList.add('timer-theme-forest');
  else if (skin === 'gold') container.classList.add('timer-theme-gold');
  
  saveDatabase();
  updateTimerUI();
};

function updateStatsUI() {
  const statEl = document.getElementById('stat-today-time');
  const barEl = document.getElementById('stat-bar-today');
  if(statEl) statEl.textContent = appState.todayFocusMinutes + "분";
  if(barEl) barEl.style.height = Math.min(100, (appState.todayFocusMinutes/100)*100) + '%';
}

function renderTodos() {
  const list = document.getElementById('todo-list');
  if(!list) return;
  list.innerHTML='';
  appState.todos.forEach((t,i) => {
    const li = document.createElement('li'); 
    li.className = "flex items-center gap-2 bg-stone-100/50 px-2 py-1.5 rounded-lg border border-stone-200 pointer-events-auto";
    li.innerHTML = `<input type="checkbox" ${t.done?'checked':''} class="w-3 h-3 cursor-pointer" onchange="appState.todos[${i}].done=!appState.todos[${i}].done; saveDatabase(); renderTodos();">
                    <span class="flex-1 text-[10px] font-bold ${t.done?'line-through text-stone-400':''}">${t.text}</span>
                    <button onclick="appState.todos.splice(${i},1); saveDatabase(); renderTodos();" class="text-stone-400 hover:text-red-500"><i class="fa-solid fa-trash text-[9px]"></i></button>`;
    list.appendChild(li);
  });
}

function updatePetVisuals() {
  const body = document.getElementById('tomato-body');
  const nameLabel = document.getElementById('current-partner-name');
  if (!body) return;

  const charData = CHARACTERS[appState.selectedCharId] || CHARACTERS.tomato_cherry;
  const bodyColor = appState.petCustomColorBody || charData.color;
  const accentColor = appState.petCustomColorAccent || charData.accent;

  body.setAttribute('fill', bodyColor);
  body.setAttribute('stroke', accentColor);
  if (nameLabel) nameLabel.textContent = `${charData.name}의 상태`;
}

function syncInputsWithState() {
  const map = {
    'god-bg-url': 'bgImageUrl', 'god-select-timer-layout': 'timerLayout', 'god-select-font': 'timerFont',
    'god-range-scale': 'timerScale', 'god-range-opacity': 'uiOpacity', 'god-select-weather': 'enableWeather'
  };
  Object.keys(map).forEach(id => {
    const el = document.getElementById(id);
    if(el && appState[map[id]] !== undefined) el.value = appState[map[id]];
  });
  const toggles = { 'god-toggle-particles': 'enableParticles', 'god-toggle-noise': 'enableNoise', 'god-toggle-timesync': 'enableTimeSync' };
  Object.keys(toggles).forEach(id => {
    const el = document.getElementById(id);
    if(el && appState[toggles[id]] !== undefined) el.checked = appState[toggles[id]];
  });
  updatePetVisuals();
}

function renderCharacterGrid() {
  const grid = document.getElementById('character-grid');
  if (!grid) return;
  grid.innerHTML = '';

  Object.keys(CHARACTERS).forEach(id => {
    const char = CHARACTERS[id];
    const isSelected = appState.selectedCharId === id;
    const card = document.createElement('div');
    card.className = `p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 ${isSelected ? 'border-indigo-500 bg-indigo-50/50' : 'border-stone-100 bg-white/50'}`;
    const emojis = { tomato_cherry: '🔴', tomato_green: '🟢', tomato_black: '⚫', tomato_purple: '🟣', tomato_gold: '🟡' };
    card.innerHTML = `<span class="text-2xl mb-1">${emojis[id] || '🍅'}</span><span class="text-[10px] font-bold text-stone-700">${char.name}</span>`;
    card.onclick = () => selectCharacter(id);
    grid.appendChild(card);
  });
}

function selectCharacter(id) {
  appState.selectedCharId = id;
  appState.petCustomColorBody = null;
  appState.petCustomColorAccent = null;
  saveDatabase();
  renderCharacterGrid();
  updatePetVisuals();
  const char = CHARACTERS[id];
  showCustomAlert("🍅 친구 교체", `${char.name}(으)로 파트너를 변경했습니다!`, "✨");
  speakBubble(`안녕! 나는 ${char.name}야! 잘 부탁해! 🍅`);
}

function updatePerksUI() {
  const container = document.getElementById('active-perks-container');
  if (!container) return;
  container.innerHTML = '';
  const perks = [
    { grade: 'A', label: '🖐️ 자동 쓰다듬기', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    { grade: 'S', label: '💧 자동 급수/급식', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { grade: 'UR', label: '🛡️ 애정도 방벽', color: 'bg-red-100 text-red-700 border-red-200' }
  ];
  perks.forEach(p => {
    if (typeof hasInventoryGrade === 'function' && hasInventoryGrade(p.grade)) {
      const badge = document.createElement('span');
      badge.className = `text-[8px] font-black px-1.5 py-0.5 rounded-md border ${p.color}`;
      badge.textContent = p.label;
      container.appendChild(badge);
    }
  });
}

function updateAllUI() {
  updateTimerUI();
  updatePetVisuals();
  if(typeof updateStatsUI === 'function') updateStatsUI();
  if(typeof renderTodos === 'function') renderTodos();
  if(typeof renderInventory === 'function') renderInventory();
  if(typeof renderCollectionBook === 'function') renderCollectionBook();
  if(typeof renderCharacterGrid === 'function') renderCharacterGrid();
  updatePerksUI();
  
  const leafCount = document.getElementById('leaf-count');
  if(leafCount) leafCount.textContent = appState.leaves;

  const bars = { 'affection': 'red', 'hunger': 'sky', 'thirst': 'blue' };
  Object.keys(bars).forEach(k => {
    const text = document.getElementById(`${k}-text`);
    const bar = document.getElementById(`${k}-bar`);
    if(text) text.textContent = appState[k] + '%';
    if(bar) bar.style.width = appState[k] + '%';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-god-mode')?.addEventListener('click', () => document.getElementById('god-mode-modal').classList.remove('translate-x-full'));
  document.getElementById('btn-close-god-mode')?.addEventListener('click', () => document.getElementById('god-mode-modal').classList.add('translate-x-full'));

  document.getElementById('btn-apply-bg')?.addEventListener('click', () => {
    appState.bgImageUrl = document.getElementById('god-bg-url').value; saveDatabase(); applySettings();
  });
  document.getElementById('god-select-timer-layout')?.addEventListener('change', e => { appState.timerLayout=e.target.value; saveDatabase(); applySettings(); });
  document.getElementById('god-select-font')?.addEventListener('change', e => { appState.timerFont=e.target.value; saveDatabase(); applySettings(); });
  document.getElementById('god-range-scale')?.addEventListener('input', e => { appState.timerScale=e.target.value; applySettings(); saveDatabase(); });
  document.getElementById('god-range-opacity')?.addEventListener('input', e => { appState.uiOpacity=e.target.value; applySettings(); saveDatabase(); });
  document.getElementById('god-select-weather')?.addEventListener('change', e => { appState.enableWeather=e.target.value; saveDatabase(); applySettings(); });
  
  ['particles', 'noise', 'timesync'].forEach(k => {
    document.getElementById('god-toggle-'+k)?.addEventListener('change', e => {
      if(k==='timesync') appState.enableTimeSync=e.target.checked;
      else appState['enable'+k.charAt(0).toUpperCase()+k.slice(1)]=e.target.checked;
      saveDatabase(); applySettings();
    });
  });

  document.getElementById('btn-apply-youtube')?.addEventListener('click', () => {
    let url = document.getElementById('god-youtube-url').value.trim();
    if (!url) return;
    let videoId = null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|v\/|live\/|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (match && match[1]) videoId = match[1];
    else if (/^[a-zA-Z0-9_-]{11}$/.test(url)) videoId = url;
    
    if (videoId) {
      appState.youtubeId = videoId; saveDatabase(); applySettings();
      document.getElementById('god-youtube-url').value = '';
      showCustomAlert("🎵 음악 변경", "유튜브 플레이어가 업데이트 되었습니다.", "🎧");
    } else showCustomAlert("❌ 링크 오류", "올바른 유튜브 영상 링크를 입력해주세요.", "⚠️");
  });

  document.getElementById('btn-apply-color')?.addEventListener('click', () => {
    appState.petCustomColorBody=document.getElementById('god-color-body').value; appState.petCustomColorAccent=document.getElementById('god-color-accent').value; saveDatabase(); updatePetVisuals();
  });
  document.getElementById('btn-reset-color')?.addEventListener('click', () => {
    appState.petCustomColorBody=null; appState.petCustomColorAccent=null; saveDatabase(); updatePetVisuals();
  });

  document.getElementById('btn-add-todo')?.addEventListener('click', () => {
    const v = document.getElementById('todo-input').value.trim();
    if(v) { appState.todos.push({text:v, done:false}); document.getElementById('todo-input').value=''; saveDatabase(); renderTodos(); }
  });

  document.getElementById('cheat-add-leaves')?.addEventListener('click', () => { appState.leaves += 1000; saveDatabase(); updateAllUI(); speakBubble("잎사귀가 쏟아진다! 💸"); });
  document.getElementById('cheat-fast-timer')?.addEventListener('click', () => { appState.timeLeft = 10; saveDatabase(); updateTimerUI(); speakBubble("시간아 달려라! 🏃"); });
  document.getElementById('cheat-max-stats')?.addEventListener('click', () => { appState.affection = 100; appState.hunger = 100; appState.thirst = 100; saveDatabase(); updateAllUI(); speakBubble("완벽한 상태야! ✨"); });
  
  document.getElementById('cheat-add-session')?.addEventListener('click', () => {
    appState.consecutiveSuccess = Math.min(appState.consecutiveSuccess + 1, 4);
    saveDatabase();
    updateTimerUI();
    speakBubble("세션 스트릭 추가! 🔥");
  });

  document.getElementById('cheat-complete-collection')?.addEventListener('click', () => {
    if (!appState.inventory) appState.inventory = {};
    Object.keys(ITEMS).forEach(id => {
      if (!appState.inventory[id]) appState.inventory[id] = 1;
    });
    saveDatabase();
    updateAllUI();
    speakBubble("모든 아이템을 획득했어! 📖");
  });

  let _decayDisabled = false;
  document.getElementById('cheat-toggle-decay')?.addEventListener('click', (e) => {
    _decayDisabled = !_decayDisabled;
    window._cheatDecayDisabled = _decayDisabled; // Share with timer.js
    const btn = e.target;
    btn.textContent = _decayDisabled ? "🔓 스탯 감소 해제" : "🔒 스탯 감소 잠금";
    btn.classList.toggle('bg-stone-700');
    btn.classList.toggle('bg-emerald-700');
    speakBubble(_decayDisabled ? "이제 스탯이 떨어지지 않아! 🔒" : "다시 스탯이 떨어지기 시작해! ⚠️");
  });

  document.getElementById('cheat-reset-db')?.addEventListener('click', () => { if(confirm("모든 데이터를 초기화하시겠습니까?")) { localStorage.clear(); location.reload(); } });

  // Global Keydown for Modals
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.getElementById('god-mode-modal')?.classList.add('translate-x-full');
      const customAlert = document.getElementById('custom-alert');
      if (customAlert && !customAlert.classList.contains('hidden')) {
        document.getElementById('btn-alert-confirm')?.click();
      }
      if (typeof window.Minigame?.closeModal === 'function') {
        window.Minigame.closeModal();
      }
    }
  });
});