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

    // 1. Decay (Skip if UR-grade exists)
    if (!isMythic) {
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

    // Update status bars every tick
    if (typeof updateAllUI === 'function') {
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
    appState.todayFocusMinutes += 25;
    
    // Calculate Rewards with Bonuses
    const collMult = typeof getCollectionBonusMultiplier === 'function' ? getCollectionBonusMultiplier() : 1;
    const equipMult = typeof getEquippedBonusMultiplier === 'function' ? getEquippedBonusMultiplier() : 1;
    
    // ★ 연속 성공 보너스: 1연속=x1.0, 2연속=x1.3, 3연속=x1.6, 4연속=x2.0
    const streakBonus = 1 + (appState.consecutiveSuccess - 1) * 0.33;
    const baseLeaves = 50;
    const finalLeaves = Math.floor(baseLeaves * collMult * streakBonus);
    appState.leaves += finalLeaves;
    
    const baseAffection = 5;
    const finalAffection = Math.min(100, appState.affection + Math.floor(baseAffection * equipMult));
    appState.affection = finalAffection;

    const isLongBreakNext = appState.consecutiveSuccess >= 4;
    if (isLongBreakNext) {
      appState.timerMode = 'long_break';
      appState.timeLeft = 30 * 60;
      appState.longBreakLockTimeLeft = 15 * 60;
    } else {
      appState.timerMode = 'break';
      appState.timeLeft = 5 * 60;
    }
    
    playChime(true);
    if (typeof petReact === 'function') petReact(isLongBreakNext ? 'long_break' : 'focus_end');
    showCustomAlert(
      "🍅 집중 완료",
      `세션 성공! ${appState.consecutiveSuccess}연속 🔥\n보상: 🍃 +${finalLeaves} (연속보너스 x${streakBonus.toFixed(2)}) / 💖 애정도 상승\n패시브 보너스: x${collMult.toFixed(2)}`,
      "🎉"
    );
  } else {
    // Break or long_break finished → go back to focus
    const wasLongBreak = appState.timerMode === 'long_break';
    appState.timerMode = 'focus';
    appState.timeLeft = 25 * 60;
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

  // ★ 자동으로 다음 타이머 시작 (알림 확인 후 바로 시작)
  setTimeout(() => {
    autoStartNextSession();
  }, 1500);
}

// ★ 자동 다음 세션 시작
function autoStartNextSession() {
  if (appState.timerActive) return; // 이미 실행 중이면 스킵
  appState.timerActive = true;
  tickCount = 0;
  saveDatabase();
  timerInterval = setInterval(handleTimerTick, 1000);
  updateTimerUI();
  if (appState.timerMode === 'focus') {
    if (typeof petReact === 'function') petReact('focus_start');
    else if (typeof speakBubble === 'function') speakBubble("집중 시작! 화이팅! 🔥");
  } else {
    if (typeof speakBubble === 'function') speakBubble("휴식 타이머 자동 시작! 😌");
  }
}

function startTimer() {
  initAudio();
  if (appState.timerActive) return;
  appState.timerActive = true;
  tickCount = 0;
  saveDatabase();
  timerInterval = setInterval(handleTimerTick, 1000);
  updateTimerUI();
  if (typeof petReact === 'function') petReact('focus_start');
  else if (typeof speakBubble === 'function') speakBubble("집중 시작! 화이팅! 🔥");
}

// ★ PAUSE → 포기(실패) 처리
function pauseTimer() {
  if (!appState.timerActive) return;

  // 집중 세션 중에만 포기 처리 (휴식 중 정지는 그냥 멈춤)
  if (appState.timerMode === 'focus') {
    clearInterval(timerInterval);
    timerInterval = null;
    appState.timerActive = false;
    tickCount = 0;

    // 실패 패널티: 연속 스트릭 초기화
    const lostStreak = appState.consecutiveSuccess;
    appState.consecutiveSuccess = 0;
    appState.timerMode = 'focus';
    appState.timeLeft = 25 * 60;

    saveDatabase();
    updateTimerUI();

    playChime(false);
    if (typeof petReact === 'function') {
      // 임시로 sad 표정 트리거
      if (typeof applyExpression === 'function') applyExpression('sad');
    }
    if (typeof speakBubble === 'function') speakBubble("포기하면 안 되는데... 😢");

    const penaltyMsg = lostStreak > 0
      ? `연속 ${lostStreak}회 스트릭이 사라졌습니다 💔\n처음부터 다시 시작해요!`
      : "세션을 포기했습니다. 다시 도전해봐요!";
    showCustomAlert("❌ 세션 포기", penaltyMsg, "😞");
  } else {
    // 휴식 중 정지: 타이머만 멈춤 (패널티 없음)
    clearInterval(timerInterval);
    timerInterval = null;
    appState.timerActive = false;
    saveDatabase();
    updateTimerUI();
    if (typeof speakBubble === 'function') speakBubble("휴식 타이머 일시정지 ⏸️");
  }
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
  tickCount = 0;
  saveDatabase();
  updateTimerUI();
  if (typeof speakBubble === 'function') speakBubble("휴식 스킵! 다음 세션으로 복구 완료.");
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
  const pct = appState.timeLeft / total;
  
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

  // ★ 버튼 UI: 집중 중이면 PAUSE → "포기" 표시
  const pauseBtn = document.getElementById('btn-timer-pause');
  if (pauseBtn) {
    if (isFocus && appState.timerActive) {
      pauseBtn.innerHTML = '<i class="fa-solid fa-flag"></i> 포기';
      pauseBtn.className = 'bg-red-100 hover:bg-red-200 text-red-600 font-extrabold py-4 px-10 rounded-[20px] text-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95';
    } else {
      pauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> PAUSE';
      pauseBtn.className = 'bg-stone-100 hover:bg-stone-200 text-stone-600 font-extrabold py-4 px-10 rounded-[20px] text-xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95';
    }
  }

  // ★ START 버튼: 타이머 실행 중이면 숨김
  const startBtn = document.getElementById('btn-timer-start');
  if (startBtn) {
    startBtn.style.display = appState.timerActive ? 'none' : '';
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
