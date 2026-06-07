// =====================================================
// PHYSICS + PET EMOTION & DIALOGUE SYSTEM
// =====================================================

let petX = window.innerWidth - 180;
let petY = window.innerHeight - 180;
let petVx = 0;
let petVy = 0;
let petDragged = false;
let dOffsetX = 0, dOffsetY = 0, lX = 0, lY = 0;

// --- Emotion State ---
// Possible emotions: 'happy', 'sad', 'hungry', 'sleepy', 'excited', 'focused', 'loved', 'neutral'
let currentEmotion = 'neutral';
let lastClickTime = 0;
let clickCount = 0;
let idleTimer = 0;
let bubbleLocked = false; // prevent bubble spam

// =====================================================
// DIALOGUE POOLS (상황별 대사)
// =====================================================
const DIALOGUES = {
  focus_start: [
    "집중 시작! 같이 해보자! 🔥",
    "파이팅! 오늘도 최선을! 💪",
    "나도 응원할게! 집중! ✨",
    "자, 타이머 돌린다! 🍅",
    "이번 세션도 완주하자! 🎯",
  ],
  focus_end: [
    "대박! 해냈어! 🎉",
    "완벽한 집중이었어! 🏆",
    "수고했어! 이제 쉬어! 🍹",
    "역시 넌 최고야! 👏",
    "와 진짜 대단한걸? 🌟",
  ],
  break_start: [
    "잠깐 쉬어가자~ ☕",
    "5분이다! 스트레칭 해! 🤸",
    "물 한 잔 마시고 와~ 💧",
    "잠깐 눈 좀 쉬어줘! 👀",
    "나도 좀 쉬고싶었어~ 😌",
  ],
  long_break_start: [
    "드디어 긴 휴식! 🎊",
    "4세션 완료! 진짜 최고! 🏅",
    "이제 30분 푹 쉬어! 🛋️",
    "오늘 정말 열심히 했다! ✨",
  ],
  idle_short: [
    "...심심하다 🥱",
    "나 여기 있어! 👀",
    "뭐해? 집중 안 해? 🤔",
    "타이머 누르면 같이 달릴게! 🏃",
  ],
  idle_long: [
    "배고파... 🥺",
    "나 혼자 너무 오래됐어... 😢",
    "주인님 어디가요...? 😿",
    "물도 안 줬잖아 ㅠㅠ 💧",
  ],
  pet_click: [
    "헤헤 간지러워! 😆",
    "더 해줘~ 💕",
    "좋아좋아! 🥰",
    "앗, 깜짝이야! 😮",
    "기분 좋다~ ✨",
    "아이구 좋아라~ 🍅",
  ],
  pet_feed: [
    "냠냠! 맛있다! 😋",
    "오예! 비료야! 🌱",
    "이게 제일 좋아! 🍽️",
    "배부르다~ 😊",
  ],
  pet_drag: [
    "야호! 날아가! 🚀",
    "위잉~~ 🌀",
    "wheeeee!! 🎢",
    "나 잡아봐라! 🏃",
  ],
  happy: [
    "오늘 기분 최고야! ☀️",
    "행복해~ 🌈",
    "너랑 있으면 좋아! 💖",
  ],
  sad: [
    "나 좀 돌봐줘... 😢",
    "애정도가 떨어지고 있어 💔",
    "쓰다듬어줘... 🥺",
  ],
  hungry: [
    "배고파! 비료 줘! 🌱",
    "목말라! 물 줘! 💧",
    "영양이 부족해... 😵",
  ],
  focused: [
    "집중 중... 방해 금지! 🤫",
    "같이 달리는 중! 💨",
    "파이팅!! 🔥",
  ],
  loved: [
    "나 지금 너무 행복해! 🥰",
    "애정도 만땅! 💖",
    "이게 바로 행복이지~ ✨",
  ],
  sleepy: [
    "으으... 졸려... 😴",
    "zzzZZZ... 💤",
    "잠깐 눈 좀 감아도 돼? 🌙",
  ],
};

function pickDialogue(pool) {
  const arr = DIALOGUES[pool];
  if (!arr || arr.length === 0) return "🍅";
  return arr[Math.floor(Math.random() * arr.length)];
}

// =====================================================
// EMOTION ENGINE
// =====================================================
function computeEmotion() {
  if (!window.appState) return 'neutral';
  const { affection, hunger, thirst, timerActive, timerMode } = appState;

  if (timerActive && timerMode === 'focus') return 'focused';
  if (affection >= 90) return 'loved';
  if (affection <= 20) return 'sad';
  if (hunger <= 25 || thirst <= 25) return 'hungry';
  if (affection >= 70 && hunger >= 60 && thirst >= 60) return 'happy';
  if (idleTimer > 300) return 'sleepy'; // 5분 이상 방치
  return 'neutral';
}

// =====================================================
// FACE EXPRESSIONS  — matched to character sheet
// =====================================================

// Eye helper: builds the standard big kawaii eye pair
function eyeHTML(opts = {}) {
  const {
    cy = 124, rx = 10, ry = 12,
    squint = false,       // half-lid (sick/sleepy left style)
    wink = false,         // curved closed eye
    angry = false,        // angled brow-lid
    starL = false,        // sparkle/star left eye
    starR = false,        // sparkle/star right eye
    tearsL = false,       // tear drop left
    tearsR = false,       // tear drop right
    shineSize = 5,
  } = opts;

  function buildEye(side) {
    const cx = side === 'L' ? 82 : 118;
    const shx = side === 'L' ? cx + 5  : cx + 5;
    const shy = cy - 7;
    const sh2x = side === 'L' ? cx - 4 : cx - 4;
    const isStar = (side === 'L' && starL) || (side === 'R' && starR);
    const isWink = (side === 'L' && wink);
    const isSquint = (side === 'L' && squint) || (side === 'R' && squint);
    const isAngry = (side === 'L' && angry) || (side === 'R' && angry);
    const hasTear = (side === 'L' && tearsL) || (side === 'R' && tearsR);

    let eyeShape = '';
    if (isWink) {
      // Closed curved arc
      eyeShape = `<path d="M${cx-9},${cy} Q${cx},${cy-8} ${cx+9},${cy}" fill="none" stroke="#1a0a00" stroke-width="2.8" stroke-linecap="round"/>`;
    } else if (isSquint) {
      // Half-lid: clip top of eye with a rect
      eyeShape = `
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#eyeGrad)"/>
        <rect x="${cx-rx-1}" y="${cy-ry-1}" width="${(rx+1)*2}" height="${ry+2}" fill="url(#bodyGrad)" opacity="0.85"/>
        <ellipse cx="${shx}" cy="${shy}" rx="${shineSize}" ry="${shineSize+0.5}" fill="white" opacity="0.92"/>
        <circle cx="${sh2x}" cy="${cy+5}" r="2" fill="white" opacity="0.5"/>
      `;
    } else if (isAngry) {
      // Angled top lid
      const dir = side === 'L' ? 1 : -1;
      eyeShape = `
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#eyeGrad)"/>
        <path d="M${cx-rx},${cy-ry*0.5} L${cx+rx},${cy-ry*(side==='L'?0.9:0.5)}" fill="url(#bodyGrad)" stroke="none"/>
        <polygon points="${cx-rx-1},${cy-ry*0.5-1} ${cx+rx+1},${cy-ry*(side==='L'?0.9:0.5)-1} ${cx+rx+1},${cy-ry-4} ${cx-rx-1},${cy-ry-4}" fill="url(#bodyGrad)"/>
        <ellipse cx="${shx}" cy="${shy}" rx="${shineSize}" ry="${shineSize+0.5}" fill="white" opacity="0.92"/>
      `;
    } else if (isStar) {
      // Sparkling star eye (surprised)
      eyeShape = `
        <ellipse cx="${cx}" cy="${cy}" rx="${rx+1}" ry="${ry+1}" fill="url(#eyeGrad)"/>
        <text x="${cx}" y="${cy+4}" font-size="12" text-anchor="middle" fill="#fde68a" font-weight="bold">✦</text>
        <ellipse cx="${shx}" cy="${shy}" rx="${shineSize}" ry="${shineSize+0.5}" fill="white" opacity="0.95"/>
      `;
    } else {
      // Normal big eye
      eyeShape = `
        <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#eyeGrad)"/>
        <ellipse cx="${shx}" cy="${shy}" rx="${shineSize}" ry="${shineSize+0.5}" fill="white" opacity="0.92"/>
        <circle cx="${sh2x}" cy="${cy+5}" r="2" fill="white" opacity="0.5"/>
      `;
    }

    const tear = hasTear
      ? `<ellipse cx="${cx+2}" cy="${cy+ry+5}" rx="3" ry="5" fill="#93c5fd" opacity="0.85"/>`
      : '';

    return eyeShape + tear;
  }

  return `<g id="eyes">
    <ellipse cx="82"  cy="${cy}" rx="${rx+3}" ry="${ry+2}" fill="white" opacity="0.10"/>
    <ellipse cx="118" cy="${cy}" rx="${rx+3}" ry="${ry+2}" fill="white" opacity="0.10"/>
    ${buildEye('L')}
    ${buildEye('R')}
  </g>`;
}

// Blush cheek helper
function blushHTML(opts = {}) {
  const { opacity = 0.45, cy = 138, color = '#fca5a5' } = opts;
  return `<g id="blush-layer">
    <ellipse cx="68"  cy="${cy}" rx="11" ry="7" fill="${color}" opacity="${opacity}"/>
    <ellipse cx="132" cy="${cy}" rx="11" ry="7" fill="${color}" opacity="${opacity}"/>
  </g>`;
}

// Mouth paths (matched to character sheet)
const MOUTHS = {
  smile:      "M88,144 Q100,154 112,144",   // happy curve
  neutral:    "M90,146 L110,146",            // flat line
  openSmall:  "M90,144 Q100,150 110,144",    // small smile
  openWide:   "M88,142 Q100,156 112,142",    // big smile
  sad:        "M90,150 Q100,143 110,150",    // frown
  hungry:     "M88,144 Q100,158 112,144",    // open hungry — wide with inner
  sleepyMouth:"M90,146 Q100,152 110,146",    // slight open
  surprisedM: "M93,146 Q100,154 107,146",    // small O
};

// Brow helper (for angry/excited)
function browHTML(emotion) {
  if (emotion === 'excited') {
    return `<path d="M72,108 Q82,103 89,108" fill="none" stroke="#1a0a00" stroke-width="2" stroke-linecap="round"/>
            <path d="M111,108 Q118,103 128,108" fill="none" stroke="#1a0a00" stroke-width="2" stroke-linecap="round"/>`;
  }
  return '';
}

// Extras (ZZZ, sparkles, sweat)
function extrasHTML(emotion) {
  if (emotion === 'sleepy') {
    return `<text x="130" y="100" font-size="9"  fill="#94a3b8" opacity="0.7">z</text>
            <text x="138" y="90"  font-size="12" fill="#94a3b8" opacity="0.8">z</text>
            <text x="147" y="78"  font-size="15" fill="#cbd5e1" opacity="0.9">Z</text>`;
  }
  if (emotion === 'excited') {
    return `<text x="52" y="95" font-size="11" fill="#fbbf24">✦</text>
            <text x="142" y="95" font-size="11" fill="#fbbf24">✦</text>`;
  }
  if (emotion === 'surprised') {
    return `<text x="52" y="105" font-size="10" fill="#fbbf24">✦</text>
            <text x="145" y="108" font-size="10" fill="#fbbf24">★</text>`;
  }
  return '';
}

function applyExpression(emotion) {
  const eyeGroup = document.getElementById('eyes');
  const mouth    = document.getElementById('mouth');
  const blushLayer = document.getElementById('blush-layer');
  const svg = document.getElementById('damadoro-svg');

  // Remove old extras
  document.getElementById('emotion-extras')?.remove();

  // Build expression parts
  let eyeOpts = {};
  let mouthPath = MOUTHS.smile;
  let blushOpts = {};
  let browsHTML = '';

  switch (emotion) {
    case 'happy':
      eyeOpts  = { cy: 124 };
      mouthPath = MOUTHS.openWide;
      blushOpts = { opacity: 0.55 };
      break;
    case 'neutral':
      eyeOpts  = { cy: 124 };
      mouthPath = MOUTHS.neutral;
      blushOpts = { opacity: 0.3 };
      break;
    case 'hungry':
      eyeOpts  = { cy: 126, rx: 11, ry: 13 }; // slightly bigger, drowsy left
      mouthPath = MOUTHS.hungry;
      blushOpts = { opacity: 0.2 };
      break;
    case 'sleepy':
      eyeOpts  = { cy: 127, squint: true };
      mouthPath = MOUTHS.sleepyMouth;
      blushOpts = { opacity: 0.25 };
      break;
    case 'sad':
      eyeOpts  = { cy: 126, tearsL: true, tearsR: true, shineSize: 4 };
      mouthPath = MOUTHS.sad;
      blushOpts = { opacity: 0.25, color: '#93c5fd' };
      break;
    case 'excited':
      eyeOpts  = { cy: 122, rx: 9, ry: 11, wink: true };  // one eye wink
      mouthPath = MOUTHS.openWide;
      blushOpts = { opacity: 0.6, color: '#f87171' };
      browsHTML = browHTML('excited');
      break;
    case 'surprised':
      eyeOpts  = { cy: 122, rx: 11, ry: 14, starL: true, starR: true, tearsR: true };
      mouthPath = MOUTHS.surprisedM;
      blushOpts = { opacity: 0.55, color: '#fca5a5' };
      break;
    case 'loved':
      // Heart eyes handled separately
      eyeOpts  = { cy: 124 };
      mouthPath = MOUTHS.openWide;
      blushOpts = { opacity: 0.65, color: '#f87171' };
      break;
    case 'focused':
      eyeOpts  = { cy: 124, rx: 8, ry: 13 }; // narrower, intense
      mouthPath = MOUTHS.openSmall;
      blushOpts = { opacity: 0.15 };
      break;
    default: // neutral fallback
      eyeOpts  = { cy: 124 };
      mouthPath = MOUTHS.openSmall;
      blushOpts = { opacity: 0.35 };
  }

  // Apply blush
  if (blushLayer) {
    blushLayer.innerHTML = `
      <ellipse cx="68"  cy="138" rx="11" ry="7" fill="${blushOpts.color || '#fca5a5'}" opacity="${blushOpts.opacity ?? 0.45}"/>
      <ellipse cx="132" cy="138" rx="11" ry="7" fill="${blushOpts.color || '#fca5a5'}" opacity="${blushOpts.opacity ?? 0.45}"/>
    `;
  }

  // Apply eyes
  if (eyeGroup) {
    if (emotion === 'loved') {
      eyeGroup.innerHTML = `
        <text x="82"  y="131" font-size="20" text-anchor="middle">❤️</text>
        <text x="118" y="131" font-size="20" text-anchor="middle">❤️</text>
      `;
    } else {
      eyeGroup.innerHTML = eyeHTML(eyeOpts).replace('<g id="eyes">', '').replace('</g>', '');
    }
  }

  // Apply mouth
  if (mouth) {
    mouth.setAttribute('d', mouthPath);
    // Open mouth for hungry gets a fill
    if (emotion === 'hungry') {
      mouth.setAttribute('fill', '#dc2626');
      mouth.setAttribute('stroke', '#1e293b');
    } else {
      mouth.setAttribute('fill', 'none');
      mouth.setAttribute('stroke', '#1e293b');
    }
  }

  // Apply extras (zzz, sparkles, etc.)
  if (svg) {
    const extras = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    extras.id = 'emotion-extras';
    extras.innerHTML = extrasHTML(emotion) + browsHTML;
    svg.appendChild(extras);
  }
}

// =====================================================
// EMOTION TICK (매 5초마다 감정 업데이트)
// =====================================================
let emotionTickInterval = null;
function startEmotionTick() {
  if (emotionTickInterval) return;
  emotionTickInterval = setInterval(() => {
    idleTimer += 5;
    const newEmotion = computeEmotion();
    if (newEmotion !== currentEmotion) {
      currentEmotion = newEmotion;
      applyExpression(currentEmotion);
    }

    // 방치 대화 트리거
    if (idleTimer === 60 && !bubbleLocked) {
      speakBubble(pickDialogue('idle_short'));
    } else if (idleTimer === 180 && !bubbleLocked) {
      speakBubble(pickDialogue('idle_long'));
    } else if (idleTimer > 300 && idleTimer % 120 === 0 && !bubbleLocked) {
      speakBubble(pickDialogue('sleepy'));
    }

    // 감정 기반 랜덤 대사 (60~90초마다)
    if (idleTimer % (60 + Math.floor(Math.random() * 30)) === 0 && !bubbleLocked) {
      const pool = DIALOGUES[currentEmotion];
      if (pool) speakBubble(pickDialogue(currentEmotion));
    }
  }, 5000);
}

function resetIdleTimer() {
  idleTimer = 0;
}

// =====================================================
// SPEECH BUBBLE (개선: 타이핑 애니메이션)
// =====================================================
let bubbleTimeout = null;
function speakBubble(msg, duration = 3000) {
  const bubble = document.getElementById('char-speech-bubble');
  if (!bubble) return;

  if (bubbleTimeout) clearTimeout(bubbleTimeout);
  bubble.textContent = msg;
  bubble.style.opacity = '1';
  bubble.style.transform = 'translateX(-50%) scale(1)';

  bubbleTimeout = setTimeout(() => {
    bubble.style.opacity = '0';
    bubble.style.transform = 'translateX(-50%) scale(0.9)';
    bubbleLocked = false;
  }, duration);
}

// =====================================================
// PHYSICS LOOP
// =====================================================
function loopPhysics() {
  const petEl = document.getElementById('desktop-pet');
  if (!petEl) return;

  if (!petDragged) {
    petVy += 0.6;
    petVx *= 0.98;
    petVy *= 0.98;
    petX += petVx;
    petY += petVy;

    const floorY = window.innerHeight - 150;
    const rightWallX = window.innerWidth - 150;

    if (petY >= floorY) {
      petY = floorY;
      if (Math.abs(petVy) > 1.5) {
        petVy = -petVy * 0.45;
        playThumpSound(Math.min(0.3, Math.abs(petVy) / 20), 120);
      } else petVy = 0;
    }
    if (petX <= 0)          { petX = 0;         petVx = -petVx * 0.45; playThumpSound(0.15, 200); }
    if (petX >= rightWallX) { petX = rightWallX; petVx = -petVx * 0.45; playThumpSound(0.15, 200); }
  }

  petEl.style.left = petX + 'px';
  petEl.style.top  = petY + 'px';
  requestAnimationFrame(loopPhysics);
}

// =====================================================
// INTERACTION HANDLERS
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
  const petEl = document.getElementById('desktop-pet');
  if (!petEl) return;

  // --- 드래그 ---
  petEl.addEventListener('mousedown', e => {
    initAudio();
    resetIdleTimer();
    petDragged = true;
    dOffsetX = e.clientX - petX;
    dOffsetY = e.clientY - petY;
    lX = petX; lY = petY;
    petVx = 0; petVy = 0;
    bubbleLocked = true;
    speakBubble(pickDialogue('pet_drag'));
    petEl.style.filter = 'drop-shadow(0 0 12px rgba(239,68,68,0.6))';
  });

  window.addEventListener('mousemove', e => {
    if (!petDragged) return;
    petX = e.clientX - dOffsetX;
    petY = e.clientY - dOffsetY;
    petVx = petX - lX;
    petVy = petY - lY;
    lX = petX; lY = petY;
  });

  window.addEventListener('mouseup', () => {
    if (petDragged) {
      petDragged = false;
      petEl.style.filter = '';
      playThumpSound(0.25, 180);
      bubbleLocked = false;
    }
  });

  // --- 클릭: 쓰다듬기 ---
  petEl.addEventListener('click', e => {
    e.stopPropagation();
    initAudio();
    resetIdleTimer();

    const now = Date.now();
    // 더블클릭 감지 (300ms 이내 2번)
    if (now - lastClickTime < 300) {
      clickCount++;
    } else {
      clickCount = 1;
    }
    lastClickTime = now;

    if (clickCount >= 2) {
      // 더블클릭 → 먹이주기
      clickCount = 0;
      if (window.appState) {
        appState.hunger = Math.min(100, appState.hunger + 15);
        appState.thirst = Math.min(100, appState.thirst + 15);
        if (typeof saveDatabase === 'function') saveDatabase();
        if (typeof updateAllUI === 'function') updateAllUI();
      }
      speakBubble(pickDialogue('pet_feed'));
      // 먹이 파티클 이펙트
      spawnFeedParticles();
      playChime && playChime(true);
    } else {
      // 단일 클릭 → 쓰다듬기
      if (window.appState) {
        appState.affection = Math.min(100, appState.affection + 3);
        if (typeof saveDatabase === 'function') saveDatabase();
        if (typeof updateAllUI === 'function') updateAllUI();
      }
      speakBubble(pickDialogue('pet_click'));
      // 하트 파티클
      spawnHeartParticles();
      playThumpSound(0.1, 400);

      // 바운스 애니메이션
      petEl.style.transform = 'scale(1.15)';
      setTimeout(() => { petEl.style.transform = 'scale(1)'; }, 150);
    }

    currentEmotion = computeEmotion();
    applyExpression(currentEmotion);
  });

  // 초기 감정 적용
  setTimeout(() => {
    currentEmotion = computeEmotion();
    applyExpression(currentEmotion);
    startEmotionTick();
  }, 500);
});

// =====================================================
// PARTICLE EFFECTS
// =====================================================
function spawnHeartParticles() {
  const petEl = document.getElementById('desktop-pet');
  if (!petEl) return;
  const rect = petEl.getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    const p = document.createElement('div');
    p.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width/2 + (Math.random()-0.5)*40}px;
      top: ${rect.top + rect.height/2}px;
      font-size: ${10 + Math.random()*10}px;
      pointer-events: none;
      z-index: 9999;
      transition: all 0.8s ease-out;
      opacity: 1;
    `;
    p.textContent = ['💕','❤️','💖','💗','✨'][Math.floor(Math.random()*5)];
    document.body.appendChild(p);
    setTimeout(() => {
      p.style.transform = `translateY(-${40 + Math.random()*30}px) translateX(${(Math.random()-0.5)*30}px)`;
      p.style.opacity = '0';
    }, 50);
    setTimeout(() => p.remove(), 900);
  }
}

function spawnFeedParticles() {
  const petEl = document.getElementById('desktop-pet');
  if (!petEl) return;
  const rect = petEl.getBoundingClientRect();
  for (let i = 0; i < 5; i++) {
    const p = document.createElement('div');
    p.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width/2 + (Math.random()-0.5)*40}px;
      top: ${rect.top + rect.height/2}px;
      font-size: ${10 + Math.random()*10}px;
      pointer-events: none;
      z-index: 9999;
      transition: all 0.8s ease-out;
      opacity: 1;
    `;
    p.textContent = ['🌱','💧','🍃','⭐','✨'][Math.floor(Math.random()*5)];
    document.body.appendChild(p);
    setTimeout(() => {
      p.style.transform = `translateY(-${50 + Math.random()*30}px) translateX(${(Math.random()-0.5)*40}px)`;
      p.style.opacity = '0';
    }, 50);
    setTimeout(() => p.remove(), 900);
  }
}

// =====================================================
// PUBLIC: 타이머에서 감정 트리거 호출용
// =====================================================
window.petReact = function(event) {
  resetIdleTimer();
  bubbleLocked = true;
  let msg = '';
  switch(event) {
    case 'focus_start':    msg = pickDialogue('focus_start');      currentEmotion = 'focused'; break;
    case 'focus_end':      msg = pickDialogue('focus_end');        currentEmotion = 'excited'; break;
    case 'break_start':    msg = pickDialogue('break_start');      currentEmotion = 'happy';   break;
    case 'long_break':     msg = pickDialogue('long_break_start'); currentEmotion = 'loved';   break;
    default:               msg = pickDialogue('neutral');          currentEmotion = 'neutral';
  }
  speakBubble(msg, 4000);
  applyExpression(currentEmotion);
  setTimeout(() => { bubbleLocked = false; }, 4500);
};
