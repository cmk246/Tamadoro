let timerInterval = null;
let tickCount = 0;

function handleTimerTick() {
  if (appState.timeLeft > 0) {
    appState.timeLeft--;
    tickCount++;
    
    if (appState.timerMode === 'long_break' && appState.longBreakLockTimeLeft > 0) {
      appState.longBreakLockTimeLeft--;
    }
    
    // --- Automation & Decay System ---
    const isMythic = typeof hasInventoryGrade === 'function' && hasInventoryGrade('UR');
    const isLegendary = typeof hasInventoryGrade === 'function' && hasInventoryGrade('S');
    const isHero = typeof hasInventoryGrade === 'function' && hasInventoryGrade('A');

    // 1. Decay (Skip if UR-grade exists or cheat is active)
    if (!isMythic && !window._cheatDecayDisabled) {
      if (tickCount % 40 === 0) { // Every 40s
        appState.hunger = Math.max(0, appState.hunger - 1);
        appState.thirst = Math.max(0, appState.thirst - 1);
      }
      if (tickCount % 120 === 0) { // Every 2 min
        appState.affection = Math.max(0, appState.affection - 1);
      }
    }

    // 2. S-Grade Automation: Auto Water & Food
    if (isLegendary) {
      appState.hunger = 100;
      appState.thirst = 100;
    }

    // 3. A-Grade Automation: Auto Petting during breaks
    if (isHero && (appState.timerMode === 'break' || appState.timerMode === 'long_break')) {
      if (tickCount % 10 === 0) {
        appState.affection = Math.min(100, appState.affection + 1);
      }
    }

    // Update UI every tick to reflect stat changes if any
    if (typeof updateAllUI === 'function') {
        // We don't want to call full updateAllUI every sec (expensive)
        // Just update status bars
        const bars = { 'affection': 'red', 'hunger': 'sky', 'thirst': 'blue' };
        Object.keys(bars).forEach(k => {
          const text = document.getElementById(`${k}-text`);
          const bar = document.getElementById(`${k}-bar`);
          if(text) text.textContent = appState[k] + '%';
          if(bar) bar.style.width = appState[k] + '%';
        });
    }

    updateTimerUI();
  } else {
    completeSessionCycle();
  }
}

function completeSessionCycle() {
  clearInterval(timerInterval);
  timerInterval = null;
  appState.timerActive = false;
  tickCount = 0;

  if (appState.timerMode === 'focus') {
    appState.consecutiveSuccess++;
    appState.todayFocusMinutes += 25; // Track stats
    
    // Calculate Rewards with Bonuses
    const collMult = typeof getCollectionBonusMultiplier === 'function' ? getCollectionBonusMultiplier() : 1;
    const equipMult = typeof getEquippedBonusMultiplier === 'function' ? getEquippedBonusMultiplier() : 1;
    
    const baseLeaves = 50;
    const finalLeaves = Math.floor(baseLeaves * collMult);
    appState.leaves += finalLeaves;
    
    const baseAffection = 5;
    const finalAffection = Math.min(100, appState.affection + Math.floor(baseAffection * equipMult));
    appState.affection = finalAffection;

    if (appState.consecutiveSuccess >= 4) {
      appState.timerMode = 'long_break';
      appState.timeLeft = 30 * 60;
      appState.longBreakLockTimeLeft = 15 * 60;
    } else {
      appState.timerMode = 'break';
      appState.timeLeft = 5 * 60;
    }
    
    playChime(true);
    if (typeof petReact === 'function') petReact(appState.consecutiveSuccess >= 4 ? 'long_break' : 'focus_end');
    showCustomAlert("🍅 집중 완료", `성공적으로 세션을 마쳤습니다!\n보상: 🍃 +${finalLeaves} / 💖 애정도 상승\n(현재 패시브 보너스: x${collMult.toFixed(2)})`, "🎉");
  } else {
    // Break or long_break finished → go back to focus
    const wasLongBreak = appState.timerMode === 'long_break';
    appState.timerMode = 'focus';
    appState.timeLeft = 25 * 60;
    // Reset streak only after the long break is fully completed
    if (wasLongBreak) {
      appState.consecutiveSuccess = 0;
    }
    playChime(false);
    if (typeof petReact === 'function') petReact('break_start');
    showCustomAlert("⏰ 휴식 완료", "다시 집중 세션을 시작하겠습니다. 착석해 주세요!", "🌱");
  }
  
  saveDatabase();
  updateTimerUI();
  if (typeof updateStatsUI === 'function') updateStatsUI();
}

function startTimer() {
  initAudio();
  if (appState.timerActive) return;
  appState.timerActive = true;
  saveDatabase();
  timerInterval = setInterval(handleTimerTick, 1000);
  updateTimerUI();
  if (typeof petReact === 'function') petReact('focus_start');
  else speakBubble("집중 시작! 화이팅! 🔥");
}

function pauseTimer() {
  if (!appState.timerActive) return;
  clearInterval(timerInterval);
  timerInterval = null;
  appState.timerActive = false;
  saveDatabase();
  updateTimerUI();
  speakBubble("잠시 일시 정지... ⏸️");
}

function skipTimer() {
  if (appState.timerMode === 'long_break' && appState.longBreakLockTimeLeft > 0) {
    showCustomAlert("🔒 스킵 불가", "뇌 휴식 보장을 위해 15분간은 스킵할 수 없습니다.", "🛡️");
    return;
  }
  const wasLongBreak = appState.timerMode === 'long_break';
  clearInterval(timerInterval);
  timerInterval = null;
  appState.timerActive = false;
  appState.timerMode = 'focus';
  appState.timeLeft = 25 * 60;
  if (wasLongBreak) appState.consecutiveSuccess = 0;
  saveDatabase();
  updateTimerUI();
  speakBubble("휴식 스킵! 다음 세션으로 복구 완료.");
}

function updateTimerUI() {
  const mins = Math.floor(appState.timeLeft / 60);
  const secs = appState.timeLeft % 60;
  const timeString = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  
  const clocks = ['timer-clock', 'timer-clock-digital', 'timer-clock-liquid'];
  clocks.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.textContent = timeString;
  });

  const total = appState.timerMode === 'focus' ? (25 * 60) : (appState.timerMode === 'break' ? (5 * 60) : (30 * 60));
  const pct = appState.timeLeft / total; // 1 to 0
  
  // FIX 5: Accurate SVG Math. Circumference of r=110 is 2 * PI * 110 ≈ 691.15
  const ring = document.getElementById('timer-progress-ring');
  if(ring) ring.style.strokeDashoffset = 691.15 * (1 - pct);

  const wave = document.getElementById('timer-liquid-wave');
  if(wave) wave.style.height = (pct * 100) + '%';

  const isFocus = appState.timerMode === 'focus';
  const stateText = isFocus ? "Focus" : (appState.timerMode === 'break' ? "Break" : "Long Break");
  
  const labels = ['timer-state-label', 'timer-state-label-digital', 'timer-state-label-liquid'];
  labels.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
      el.textContent = stateText;
      el.className = `text-sm font-bold ${isFocus ? 'text-red-500' : 'text-emerald-500'} uppercase tracking-widest mt-2`;
    }
  });

  if(ring) ring.setAttribute('stroke', isFocus ? '#ef4444' : '#10b981');
  if(wave) wave.className = `absolute bottom-0 left-0 right-0 transition-all duration-1000 ${isFocus ? 'bg-red-400/90' : 'bg-emerald-400/90'}`;

  const badge = document.getElementById('char-status-badge');
  if(badge) {
    if (isFocus) {
      badge.className = "bg-red-500/10 text-red-700 border border-red-500/20 text-xs font-extrabold px-3 py-1 rounded-full shadow-sm";
      badge.textContent = "🎯 집중 세션";
    } else {
      badge.className = "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-xs font-extrabold px-3 py-1 rounded-full shadow-sm";
      badge.textContent = appState.timerMode === 'break' ? "🍹 단기 휴식" : "🏆 완전 휴식";
    }
  }

  // Update streaks
  const circles = document.getElementById('streak-circles');
  if(circles) {
    for (let i = 0; i < 4; i++) {
      if (i < appState.consecutiveSuccess) {
        circles.children[i].className = "w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600 shadow-sm animate-pulse";
      } else {
        circles.children[i].className = "w-2.5 h-2.5 rounded-full bg-stone-200 border border-stone-300";
      }
    }
  }

  // Focus active hides widgets
  if (appState.timerActive && isFocus) {
    document.body.classList.add('focus-active');
  } else {
    document.body.classList.remove('focus-active');
  }

  // Skip logic
  const skipBtn = document.getElementById('btn-timer-skip');
  const shieldAlert = document.getElementById('longbreak-shield-alert');
  if (appState.timerMode === 'long_break') {
    if(skipBtn) skipBtn.classList.remove('hidden');
    if (appState.longBreakLockTimeLeft > 0) {
      if(shieldAlert) shieldAlert.classList.remove('hidden');
      const lockMins = Math.floor(appState.longBreakLockTimeLeft / 60);
      const lockSecs = appState.longBreakLockTimeLeft % 60;
      if(document.getElementById('longbreak-shield-timer')) document.getElementById('longbreak-shield-timer').textContent = `${String(lockMins).padStart(2, '0')}:${String(lockSecs).padStart(2, '0')} 후 스킵 해금`;
      if(skipBtn) { skipBtn.disabled = true; skipBtn.classList.add('opacity-50'); }
    } else {
      if(shieldAlert) shieldAlert.classList.add('hidden');
      if(skipBtn) { skipBtn.disabled = false; skipBtn.classList.remove('opacity-50'); }
    }
  } else {
    if(skipBtn) skipBtn.classList.add('hidden');
    if(shieldAlert) shieldAlert.classList.add('hidden');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-timer-start')?.addEventListener('click', startTimer);
  document.getElementById('btn-timer-pause')?.addEventListener('click', pauseTimer);
  document.getElementById('btn-timer-skip')?.addEventListener('click', skipTimer);
});