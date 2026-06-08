// =====================================================
// DAMADORO — INTERACTION EXPANSION MODULE v2.0
// 1. 볼따구 물리 인터랙션 (Cheek Physics)
// 2. 미니게임 시스템 (Break-time Minigame)
// 3. 감정/표정 확장 (15종 Emotion States)
// 4. 선물 주기 인터랙션 (Gift Drag & Drop)
// =====================================================

// =====================================================
// SECTION 1: 볼따구 물리 인터랙션
// =====================================================

const CheekPhysics = (() => {
  // SVG 내 볼따구 영역 정의 (viewBox 기준 좌표)
  const CHEEKS = [
    { id: 'cheek-left',  cx: 68,  cy: 138, rx: 18, ry: 14, side: 'L' },
    { id: 'cheek-right', cx: 132, cy: 138, rx: 18, ry: 14, side: 'R' }
  ];

  // 각 볼따구별 물리 상태
  const state = {
    L: { dragX: 0, dragY: 0, velX: 0, velY: 0, isDragging: false, stretchFactor: 0 },
    R: { dragX: 0, dragY: 0, velX: 0, velY: 0, isDragging: false, stretchFactor: 0 }
  };

  let activeCheek = null;
  let dragStartSVG = { x: 0, y: 0 };
  let animFrame = null;
  const MAX_STRETCH = 28;
  const SPRING_K = 0.18;
  const DAMPING = 0.72;

  function getSVGPoint(svg, clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function playStretchSound(stretch) {
    if (typeof initAudio !== 'function' || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const freq = 180 + stretch * 4;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 0.6, now + 0.08);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain); gain.connect(mainGainNode);
      osc.start(now); osc.stop(now + 0.12);
    } catch(e) {}
  }

  function playReleaseSound(velocity) {
    if (typeof initAudio !== 'function' || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const mag = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
      // 띠용- 부르르릉- 사운드
      [0, 0.04, 0.09, 0.16].forEach((t, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const baseFreq = 320 - i * 40;
        osc.type = i % 2 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(baseFreq + mag * 3, now + t);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, now + t + 0.18);
        gain.gain.setValueAtTime(Math.min(0.18, 0.08 + mag * 0.01), now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.22);
        osc.connect(gain); gain.connect(mainGainNode);
        osc.start(now + t); osc.stop(now + t + 0.25);
      });
    } catch(e) {}
  }

  function updateCheekSVG(side, dx, dy, stretch) {
    const cheekId = side === 'L' ? 'cheek-left' : 'cheek-right';
    const cheek = CHEEKS.find(c => c.side === side);
    const el = document.getElementById(cheekId);
    if (!el || !cheek) return;

    const distort = Math.min(stretch / MAX_STRETCH, 1);
    const scaleX = 1 + distort * 0.55;
    const scaleY = 1 - distort * 0.22;
    const tx = dx * 0.55;
    const ty = dy * 0.45;

    el.setAttribute('transform',
      `translate(${cheek.cx + tx}, ${cheek.cy + ty}) scale(${scaleX}, ${scaleY}) translate(${-cheek.cx}, ${-cheek.cy})`
    );

    // 색상도 당길수록 더 진하게
    const red = Math.floor(252 - distort * 60);
    el.setAttribute('fill', `rgb(${red}, ${Math.floor(165 - distort * 40)}, ${Math.floor(165 - distort * 40)})`);
    el.setAttribute('opacity', (0.55 + distort * 0.3).toFixed(2));
  }

  function physicsLoop() {
    let needsFrame = false;
    ['L', 'R'].forEach(side => {
      const s = state[side];
      if (s.isDragging) { needsFrame = true; return; }

      // 스프링 복원
      s.velX += -s.dragX * SPRING_K;
      s.velY += -s.dragY * SPRING_K;
      s.velX *= DAMPING;
      s.velY *= DAMPING;
      s.dragX += s.velX;
      s.dragY += s.velY;

      const stretch = Math.sqrt(s.dragX ** 2 + s.dragY ** 2);
      s.stretchFactor = stretch;

      if (stretch > 0.3) {
        updateCheekSVG(side, s.dragX, s.dragY, stretch);
        needsFrame = true;
      } else {
        s.dragX = 0; s.dragY = 0; s.velX = 0; s.velY = 0;
        updateCheekSVG(side, 0, 0, 0);
      }
    });

    if (needsFrame) animFrame = requestAnimationFrame(physicsLoop);
    else animFrame = null;
  }

  function init() {
    const svg = document.getElementById('damadoro-svg');
    if (!svg) return;

    // SVG에 볼따구 엘리먼트 삽입 (blush-layer 위에)
    const blush = document.getElementById('blush-layer');
    if (blush) {
      CHEEKS.forEach(c => {
        const existing = document.getElementById(c.id);
        if (existing) return;
        const el = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        el.id = c.id;
        el.setAttribute('cx', c.cx);
        el.setAttribute('cy', c.cy);
        el.setAttribute('rx', c.rx);
        el.setAttribute('ry', c.ry);
        el.setAttribute('fill', '#fca5a5');
        el.setAttribute('opacity', '0.55');
        el.style.cursor = 'grab';
        el.style.pointerEvents = 'all';
        blush.appendChild(el);
      });
    }

    const petEl = document.getElementById('desktop-pet');
    if (!petEl) return;
    petEl.style.pointerEvents = 'all';

    // SVG must use inline style (not CSS class) so child elements can override with pointer-events:all
    svg.style.pointerEvents = 'none';

    // 볼따구 마우스다운
    CHEEKS.forEach(cheek => {
      const el = document.getElementById(cheek.id);
      if (!el) return;
      el.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        if (typeof initAudio === 'function') initAudio();
        activeCheek = cheek.side;
        state[cheek.side].isDragging = true;
        const svgPt = getSVGPoint(svg, e.clientX, e.clientY);
        dragStartSVG = { x: svgPt.x, y: svgPt.y };
        el.style.cursor = 'grabbing';
        if (!animFrame) animFrame = requestAnimationFrame(physicsLoop);
      }, true); // capture:true → fires before petEl's bubble-phase handler
    });

    window.addEventListener('mousemove', (e) => {
      if (!activeCheek) return;
      const s = state[activeCheek];
      if (!s.isDragging) return;

      const svgPt = getSVGPoint(svg, e.clientX, e.clientY);
      let dx = svgPt.x - dragStartSVG.x;
      let dy = svgPt.y - dragStartSVG.y;
      const dist = Math.sqrt(dx**2 + dy**2);
      if (dist > MAX_STRETCH) {
        dx = dx / dist * MAX_STRETCH;
        dy = dy / dist * MAX_STRETCH;
      }
      s.dragX = dx; s.dragY = dy;
      s.stretchFactor = Math.sqrt(dx**2 + dy**2);
      updateCheekSVG(activeCheek, dx, dy, s.stretchFactor);

      // 쭈욱 늘리는 사운드
      if (s.stretchFactor > 5 && Math.random() < 0.08) {
        playStretchSound(s.stretchFactor);
      }
    });

    window.addEventListener('mouseup', () => {
      if (!activeCheek) return;
      const s = state[activeCheek];
      if (!s.isDragging) return;

      const vel = { x: s.velX, y: s.velY };
      const stretch = s.stretchFactor;
      s.isDragging = false;

      CHEEKS.forEach(c => {
        const el = document.getElementById(c.id);
        if (el) el.style.cursor = 'grab';
      });

      // 탄성 되돌아오기 + 소리
      if (stretch > 3) {
        playReleaseSound({ x: s.dragX, y: s.dragY });
        s.velX = -s.dragX * 0.35;
        s.velY = -s.dragY * 0.35;

        // 애정도 소량 상승
        if (window.appState) {
          appState.affection = Math.min(100, appState.affection + 2);
          if (typeof saveDatabase === 'function') saveDatabase();
          if (typeof updateAllUI === 'function') updateAllUI();
        }

        // 표정 반응
        if (typeof applyExpression === 'function') applyExpression('cheek_pulled');
        if (typeof speakBubble === 'function') {
          const msgs = ['앗!! 늘어나잖아! 😤', '으아 야야야! 😵', '그만해! 간지러워! 🤪', '헤헤... 사실 좋아 💕'];
          speakBubble(msgs[Math.floor(Math.random() * msgs.length)], 2500);
        }
        spawnCheekParticles(activeCheek);
      }

      activeCheek = null;
      if (!animFrame) animFrame = requestAnimationFrame(physicsLoop);
    });
  }

  function spawnCheekParticles(side) {
    const petEl = document.getElementById('desktop-pet');
    if (!petEl) return;
    const rect = petEl.getBoundingClientRect();
    const baseX = side === 'L' ? rect.left + rect.width * 0.25 : rect.left + rect.width * 0.75;
    const baseY = rect.top + rect.height * 0.62;

    ['✨','💢','⭐','💫'].forEach((emoji, i) => {
      const p = document.createElement('div');
      p.style.cssText = `position:fixed;left:${baseX}px;top:${baseY}px;font-size:${12+i*3}px;pointer-events:none;z-index:9999;transition:all 0.6s cubic-bezier(0.34,1.56,0.64,1);opacity:1;`;
      p.textContent = emoji;
      document.body.appendChild(p);
      setTimeout(() => {
        p.style.transform = `translate(${(Math.random()-0.5)*50}px,${-30-Math.random()*30}px) rotate(${(Math.random()-0.5)*60}deg)`;
        p.style.opacity = '0';
      }, 20);
      setTimeout(() => p.remove(), 700);
    });
  }

  return { init };
})();


// =====================================================
// SECTION 2: 감정/표정 확장 (15종)
// =====================================================

// 기존 applyExpression을 확장 버전으로 교체
const EXTENDED_EMOTIONS = {
  // 기존 8종 유지 + 신규 7종 추가
  neutral:     { mouth: "M90,146 L110,146",           eyes: {},              blush: { op: 0.3 } },
  happy:       { mouth: "M88,142 Q100,156 112,142",    eyes: {},              blush: { op: 0.55 } },
  sad:         { mouth: "M90,150 Q100,143 110,150",    eyes: { tears: true }, blush: { op: 0.2, color: '#93c5fd' } },
  hungry:      { mouth: "M88,144 Q100,158 112,144",    eyes: {},              blush: { op: 0.15 } },
  sleepy:      { mouth: "M90,146 Q100,152 110,146",    eyes: { squint: true },blush: { op: 0.2 } },
  excited:     { mouth: "M88,142 Q100,156 112,142",    eyes: { wink: true },  blush: { op: 0.65 } },
  focused:     { mouth: "M90,144 Q100,150 110,144",    eyes: { intense: true },blush: { op: 0.1 } },
  loved:       { mouth: "M88,142 Q100,156 112,142",    eyes: { heart: true }, blush: { op: 0.7, color: '#f87171' } },
  // 신규 추가
  surprised:   { mouth: "M95,144 Q100,152 105,144",    eyes: { wide: true },  blush: { op: 0.5 } },
  angry:       { mouth: "M90,150 Q100,143 110,150",    eyes: { angry: true }, blush: { op: 0.0 } },
  shy:         { mouth: "M92,145 Q100,151 108,145",    eyes: { shy: true },   blush: { op: 0.8, color: '#fda4af' } },
  cheek_pulled:{ mouth: "M86,148 Q100,158 114,148",    eyes: { squish: true },blush: { op: 0.9, color: '#f87171' } },
  gift_happy:  { mouth: "M85,141 Q100,158 115,141",    eyes: { star: true },  blush: { op: 0.75, color: '#fbbf24' } },
  sick:        { mouth: "M92,148 Q100,144 108,148",    eyes: { half: true },  blush: { op: 0.15, color: '#a3e635' } },
  determined:  { mouth: "M90,146 Q100,148 110,146",    eyes: { fierce: true },blush: { op: 0.0 } },
};

function applyExpressionExtended(emotion) {
  const cfg = EXTENDED_EMOTIONS[emotion] || EXTENDED_EMOTIONS.neutral;
  const eyeGroup = document.getElementById('eyes');
  const mouth = document.getElementById('mouth');
  const blushLayer = document.getElementById('blush-layer');
  const svg = document.getElementById('damadoro-svg');

  // 이전 extras 제거
  document.getElementById('emotion-extras')?.remove();

  // 입 모양
  if (mouth) {
    mouth.setAttribute('d', cfg.mouth);
    mouth.setAttribute('fill', emotion === 'hungry' ? '#dc2626' : 'none');
    mouth.setAttribute('stroke', '#1e293b');
    mouth.setAttribute('stroke-width', emotion === 'cheek_pulled' ? '3.5' : '2.8');
  }

  // 볼 블러시
  if (blushLayer) {
    const color = cfg.blush.color || '#fca5a5';
    const op = cfg.blush.op ?? 0.45;
    blushLayer.innerHTML = `
      <ellipse cx="68"  cy="138" rx="11" ry="7" fill="${color}" opacity="${op}"/>
      <ellipse cx="132" cy="138" rx="11" ry="7" fill="${color}" opacity="${op}"/>
    `;
  }

  // 눈 표현
  if (eyeGroup) {
    const e = cfg.eyes;
    if (e.heart) {
      eyeGroup.innerHTML = `
        <text x="82"  y="131" font-size="20" text-anchor="middle">❤️</text>
        <text x="118" y="131" font-size="20" text-anchor="middle">❤️</text>
      `;
    } else if (e.star) {
      eyeGroup.innerHTML = `
        <text x="82"  y="131" font-size="18" text-anchor="middle">⭐</text>
        <text x="118" y="131" font-size="18" text-anchor="middle">⭐</text>
      `;
    } else if (e.wide) {
      eyeGroup.innerHTML = `
        <ellipse cx="82"  cy="124" rx="13" ry="15" fill="url(#eyeGrad)"/>
        <ellipse cx="118" cy="124" rx="13" ry="15" fill="url(#eyeGrad)"/>
        <ellipse cx="87"  cy="117" rx="6"  ry="6.5" fill="white" opacity="0.95"/>
        <ellipse cx="123" cy="117" rx="6"  ry="6.5" fill="white" opacity="0.95"/>
        <circle  cx="78"  cy="129" r="2.5" fill="white" opacity="0.6"/>
        <circle  cx="114" cy="129" r="2.5" fill="white" opacity="0.6"/>
      `;
    } else if (e.wink) {
      eyeGroup.innerHTML = `
        <path d="M73,124 Q82,116 91,124" fill="none" stroke="#1a0a00" stroke-width="2.8" stroke-linecap="round"/>
        <ellipse cx="118" cy="124" rx="10" ry="12" fill="url(#eyeGrad)"/>
        <ellipse cx="123" cy="117" rx="5"  ry="5.5" fill="white" opacity="0.92"/>
      `;
    } else if (e.squint) {
      eyeGroup.innerHTML = `
        <ellipse cx="82"  cy="127" rx="10" ry="6" fill="url(#eyeGrad)"/>
        <ellipse cx="118" cy="127" rx="10" ry="6" fill="url(#eyeGrad)"/>
        <ellipse cx="87"  cy="123" rx="4"  ry="3" fill="white" opacity="0.8"/>
        <ellipse cx="123" cy="123" rx="4"  ry="3" fill="white" opacity="0.8"/>
      `;
    } else if (e.squish) {
      // 볼따구 당길 때 — 눈이 찌그러짐
      eyeGroup.innerHTML = `
        <ellipse cx="82"  cy="128" rx="12" ry="8"  fill="url(#eyeGrad)"/>
        <ellipse cx="118" cy="128" rx="12" ry="8"  fill="url(#eyeGrad)"/>
        <ellipse cx="88"  cy="124" rx="5"  ry="3.5" fill="white" opacity="0.92"/>
        <ellipse cx="124" cy="124" rx="5"  ry="3.5" fill="white" opacity="0.92"/>
        <!-- 꿈틀 눈썹 -->
        <path d="M72,116 Q82,111 90,116" fill="none" stroke="#1a0a00" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M110,116 Q118,111 128,116" fill="none" stroke="#1a0a00" stroke-width="2.5" stroke-linecap="round"/>
      `;
    } else if (e.angry) {
      eyeGroup.innerHTML = `
        <ellipse cx="82"  cy="126" rx="10" ry="11" fill="url(#eyeGrad)"/>
        <ellipse cx="118" cy="126" rx="10" ry="11" fill="url(#eyeGrad)"/>
        <path d="M72,114 L92,118" stroke="#1a0a00" stroke-width="3" stroke-linecap="round"/>
        <path d="M108,118 L128,114" stroke="#1a0a00" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="87" cy="120" rx="4" ry="4.5" fill="white" opacity="0.85"/>
        <ellipse cx="123" cy="120" rx="4" ry="4.5" fill="white" opacity="0.85"/>
      `;
    } else if (e.shy) {
      eyeGroup.innerHTML = `
        <path d="M73,124 Q82,117 91,124" fill="none" stroke="#1a0a00" stroke-width="2.8" stroke-linecap="round"/>
        <path d="M109,124 Q118,117 127,124" fill="none" stroke="#1a0a00" stroke-width="2.8" stroke-linecap="round"/>
      `;
    } else if (e.half) {
      eyeGroup.innerHTML = `
        <ellipse cx="82"  cy="128" rx="10" ry="7" fill="url(#eyeGrad)"/>
        <ellipse cx="118" cy="128" rx="10" ry="7" fill="url(#eyeGrad)"/>
        <rect x="72" y="119" width="20" height="9" fill="#fef9c3" opacity="0.7" rx="2"/>
        <rect x="108" y="119" width="20" height="9" fill="#fef9c3" opacity="0.7" rx="2"/>
        <ellipse cx="87"  cy="125" rx="3.5" ry="3" fill="white" opacity="0.8"/>
        <ellipse cx="123" cy="125" rx="3.5" ry="3" fill="white" opacity="0.8"/>
      `;
    } else if (e.fierce) {
      eyeGroup.innerHTML = `
        <ellipse cx="82"  cy="124" rx="9" ry="13" fill="url(#eyeGrad)"/>
        <ellipse cx="118" cy="124" rx="9" ry="13" fill="url(#eyeGrad)"/>
        <ellipse cx="87"  cy="117" rx="4.5" ry="5" fill="white" opacity="0.95"/>
        <ellipse cx="123" cy="117" rx="4.5" ry="5" fill="white" opacity="0.95"/>
        <path d="M73,112 L91,116" stroke="#1a0a00" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M109,116 L127,112" stroke="#1a0a00" stroke-width="2.2" stroke-linecap="round"/>
      `;
    } else if (e.intense) {
      eyeGroup.innerHTML = `
        <ellipse cx="82"  cy="124" rx="8" ry="13" fill="url(#eyeGrad)"/>
        <ellipse cx="118" cy="124" rx="8" ry="13" fill="url(#eyeGrad)"/>
        <ellipse cx="86"  cy="117" rx="4" ry="5"  fill="white" opacity="0.95"/>
        <ellipse cx="122" cy="117" rx="4" ry="5"  fill="white" opacity="0.95"/>
      `;
    } else if (e.tears) {
      eyeGroup.innerHTML = `
        <ellipse cx="82"  cy="124" rx="10" ry="12" fill="url(#eyeGrad)"/>
        <ellipse cx="118" cy="124" rx="10" ry="12" fill="url(#eyeGrad)"/>
        <ellipse cx="87"  cy="117" rx="5"  ry="5.5" fill="white" opacity="0.88"/>
        <ellipse cx="123" cy="117" rx="5"  ry="5.5" fill="white" opacity="0.88"/>
        <ellipse cx="84"  cy="138" rx="3"  ry="5.5" fill="#93c5fd" opacity="0.9"/>
        <ellipse cx="120" cy="138" rx="3"  ry="5.5" fill="#93c5fd" opacity="0.9"/>
        <path d="M83,143 Q84,148 82,152" fill="none" stroke="#bfdbfe" stroke-width="2" stroke-linecap="round"/>
        <path d="M119,143 Q120,148 118,152" fill="none" stroke="#bfdbfe" stroke-width="2" stroke-linecap="round"/>
      `;
    } else {
      // 기본 눈 (normal/happy/hungry 등)
      eyeGroup.innerHTML = `
        <ellipse cx="82"  cy="124" rx="10" ry="12" fill="url(#eyeGrad)"/>
        <ellipse cx="118" cy="124" rx="10" ry="12" fill="url(#eyeGrad)"/>
        <ellipse cx="87"  cy="117" rx="5"  ry="5.5" fill="white" opacity="0.92"/>
        <ellipse cx="123" cy="117" rx="5"  ry="5.5" fill="white" opacity="0.92"/>
        <circle  cx="78"  cy="129" r="2"             fill="white" opacity="0.55"/>
        <circle  cx="114" cy="129" r="2"             fill="white" opacity="0.55"/>
      `;
    }
  }

  // extras (ZZZ, 스파클 등)
  if (svg) {
    const extras = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    extras.id = 'emotion-extras';
    let html = '';
    if (emotion === 'sleepy') {
      html = `<text x="130" y="100" font-size="9" fill="#94a3b8" opacity="0.7">z</text>
              <text x="138" y="90" font-size="12" fill="#94a3b8" opacity="0.8">z</text>
              <text x="147" y="78" font-size="15" fill="#cbd5e1" opacity="0.9">Z</text>`;
    } else if (emotion === 'excited' || emotion === 'surprised') {
      html = `<text x="52" y="95" font-size="12" fill="#fbbf24">✦</text>
              <text x="144" y="98" font-size="12" fill="#fbbf24">✦</text>`;
    } else if (emotion === 'sick') {
      html = `<text x="90" y="100" font-size="11" fill="#a3e635" opacity="0.8">~</text>
              <text x="102" y="93" font-size="14" fill="#84cc16" opacity="0.9">~</text>`;
    } else if (emotion === 'angry') {
      html = `<text x="55" y="100" font-size="14" fill="#ef4444">💢</text>`;
    } else if (emotion === 'gift_happy') {
      html = `<text x="48" y="95" font-size="11" fill="#fbbf24">★</text>
              <text x="143" y="90" font-size="14" fill="#fbbf24">✨</text>
              <text x="95" y="75" font-size="10" fill="#fbbf24">✦</text>`;
    }
    extras.innerHTML = html;
    svg.appendChild(extras);
  }

  // 현재 감정 상태 업데이트 (physics.js 전역 변수와 동기화)
  if (typeof currentEmotion !== 'undefined') {
    try { currentEmotion = emotion; } catch(e) {}
  }
  window._currentEmotion = emotion;
}

// 기존 applyExpression 오버라이드
window.applyExpression = applyExpressionExtended;
window._applyExpressionExtended = applyExpressionExtended;


// =====================================================
// SECTION 3: 미니게임 시스템 (휴식 시간 전용)
// =====================================================

const Minigame = (() => {
  let gameActive = false;
  let score = 0;
  let timeLeft = 0;
  let gameTimer = null;
  let spawnTimer = null;
  let targets = [];
  let gameType = 'whack'; // 'whack' | 'catch'
  let leafReward = 0;

  const GAME_DURATION = 20; // 20초

  function canPlay() {
    // 휴식 모드이면 타이머 실행 여부와 무관하게 허용
    return window.appState &&
      (appState.timerMode === 'break' || appState.timerMode === 'long_break');
  }

  function openModal() {
    const modal = document.getElementById('minigame-modal');
    if (modal) {
      modal.classList.remove('hidden');
      showLobby();
    }
  }

  function closeModal() {
    const modal = document.getElementById('minigame-modal');
    if (modal) modal.classList.add('hidden');
    stopGame();
  }

  function showLobby() {
    document.getElementById('mg-lobby').classList.remove('hidden');
    document.getElementById('mg-game').classList.add('hidden');
    document.getElementById('mg-result').classList.add('hidden');
    // 휴식 시간 아닐 때 경고 표시
    const warning = document.getElementById('mg-break-warning');
    if (warning) {
      const isBreak = window.appState &&
        (appState.timerMode === 'break' || appState.timerMode === 'long_break');
      warning.classList.toggle('hidden', isBreak);
    }
  }

  function startGame(type) {
    gameType = type;
    window._lastGameType = type; // Fix: save for 다시 하기 button
    score = 0;
    timeLeft = GAME_DURATION;
    targets = [];
    leafReward = 0;

    document.getElementById('mg-lobby').classList.add('hidden');
    document.getElementById('mg-result').classList.add('hidden');
    document.getElementById('mg-game').classList.remove('hidden');
    document.getElementById('mg-score').textContent = '0';
    document.getElementById('mg-time').textContent = GAME_DURATION;
    document.getElementById('mg-type-label').textContent = type === 'whack' ? '🍅 두더지잡기 모드' : '💧 물방울 받기 모드';

    const canvas = document.getElementById('mg-canvas');
    if (!canvas) return;

    gameActive = true;
    renderGame();

    gameTimer = setInterval(() => {
      timeLeft--;
      document.getElementById('mg-time').textContent = timeLeft;
      if (timeLeft <= 0) endGame();
    }, 1000);

    const spawnInterval = type === 'whack' ? 800 : 600;
    spawnTimer = setInterval(() => spawnTarget(canvas), spawnInterval);
  }

  function spawnTarget(canvas) {
    if (!gameActive) return;
    const rect = canvas.getBoundingClientRect();
    const margin = 30;
    const x = margin + Math.random() * (rect.width - margin * 2);
    const y = margin + Math.random() * (rect.height - margin * 2);
    const target = {
      id: Date.now() + Math.random(),
      x, y,
      r: gameType === 'whack' ? 28 : 20,
      life: 1.0,
      decay: gameType === 'whack' ? 0.025 : 0.018,
      emoji: gameType === 'whack'
        ? ['🍅','🍃','⭐'][Math.floor(Math.random()*3)]
        : ['💧','🌊','💦'][Math.floor(Math.random()*3)],
      points: gameType === 'whack' ? 10 : 8,
      hit: false
    };
    targets.push(target);
  }

  function renderGame() {
    if (!gameActive) return;
    const canvas = document.getElementById('mg-canvas');
    if (!canvas) return;

    // targets 업데이트
    targets = targets.filter(t => {
      t.life -= t.decay;
      return t.life > 0 && !t.hit;
    });

    // 타겟 DOM 업데이트
    const existing = new Set(Array.from(canvas.querySelectorAll('.mg-target')).map(el => el.dataset.id));
    const active = new Set(targets.map(t => String(t.id)));

    // 제거
    canvas.querySelectorAll('.mg-target').forEach(el => {
      if (!active.has(el.dataset.id)) el.remove();
    });

    // 추가/업데이트
    targets.forEach(t => {
      let el = canvas.querySelector(`[data-id="${t.id}"]`);
      if (!el) {
        el = document.createElement('div');
        el.className = 'mg-target';
        el.dataset.id = t.id;
        el.style.cssText = `position:absolute;width:${t.r*2}px;height:${t.r*2}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${t.r}px;cursor:pointer;transform:translate(-50%,-50%);transition:transform 0.1s;user-select:none;`;
        el.textContent = t.emoji;
        el.addEventListener('mousedown', (e) => {
          e.stopPropagation();
          hitTarget(t, el);
        });
        canvas.appendChild(el);
      }
      el.style.left = t.x + 'px';
      el.style.top  = t.y + 'px';
      el.style.opacity = Math.max(0.3, t.life);
      el.style.transform = `translate(-50%,-50%) scale(${0.5 + t.life * 0.5})`;
    });

    if (gameActive) requestAnimationFrame(renderGame);
  }

  function hitTarget(target, el) {
    if (target.hit) return;
    target.hit = true;
    score += target.points;
    document.getElementById('mg-score').textContent = score;

    // 히트 이펙트
    el.style.transform = 'translate(-50%,-50%) scale(1.5)';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 200);

    // 사운드
    if (typeof playThumpSound === 'function') playThumpSound(0.15, 350);

    // 스코어 팝업
    const popup = document.createElement('div');
    popup.textContent = `+${target.points}`;
    popup.style.cssText = `position:absolute;left:${target.x}px;top:${target.y - 20}px;color:#ef4444;font-weight:900;font-size:14px;pointer-events:none;transition:all 0.5s ease-out;transform:translate(-50%,-50%);`;
    document.getElementById('mg-canvas').appendChild(popup);
    setTimeout(() => { popup.style.transform='translate(-50%,-80px)'; popup.style.opacity='0'; }, 10);
    setTimeout(() => popup.remove(), 520);
  }

  function endGame() {
    gameActive = false;
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    targets = [];

    document.getElementById('mg-game').classList.add('hidden');
    document.getElementById('mg-result').classList.remove('hidden');

    // 점수 → 잎사귀 보상 환산
    leafReward = Math.floor(score / 10);
    document.getElementById('mg-final-score').textContent = score;
    document.getElementById('mg-leaf-reward').textContent = leafReward;

    // 등급 판정
    let grade = 'C';
    let gradeMsg = '더 연습해봐요!';
    if (score >= 200) { grade = 'S'; gradeMsg = '전설적인 실력! 🏆'; }
    else if (score >= 120) { grade = 'A'; gradeMsg = '대단해요! 거의 완벽! ⭐'; }
    else if (score >= 70) { grade = 'B'; gradeMsg = '잘했어요! 꽤 빠른데? 👍'; }
    document.getElementById('mg-grade').textContent = grade;
    document.getElementById('mg-grade-msg').textContent = gradeMsg;

    // 애정도 보너스
    if (window.appState) {
      appState.leaves += leafReward;
      appState.affection = Math.min(100, appState.affection + Math.floor(score / 20));
      if (typeof saveDatabase === 'function') saveDatabase();
      if (typeof updateAllUI === 'function') updateAllUI();
    }

    // 펫 반응
    if (typeof applyExpressionExtended === 'function') applyExpressionExtended('excited');
    if (typeof speakBubble === 'function') speakBubble(`게임 결과: ${grade}등급! ${gradeMsg} 🎮`, 4000);
    if (typeof playChime === 'function') playChime(score > 50);
  }

  function stopGame() {
    gameActive = false;
    clearInterval(gameTimer);
    clearInterval(spawnTimer);
    targets = [];
    const canvas = document.getElementById('mg-canvas');
    if (canvas) canvas.innerHTML = '';
  }

  return { openModal, closeModal, startGame, canPlay };
})();

// 전역으로 노출 (인라인 onclick에서 접근 가능하게)
window.Minigame = Minigame;


// =====================================================
// SECTION 4: 선물/아이템 직접 주기 인터랙션
// =====================================================

const GiftSystem = (() => {
  let dragging = false;
  let dragEl = null;
  let itemId = null;
  let originPos = null;

  function init() {
    // 인벤토리 아이템에 드래그 가능 표시 추가
    // renderInventory 이후 호출되어야 함 → MutationObserver 활용
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;

    const observer = new MutationObserver(() => attachDragToItems());
    observer.observe(grid, { childList: true, subtree: true });
    attachDragToItems();
  }

  function attachDragToItems() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.querySelectorAll('.inv-draggable').forEach(el => el.classList.remove('inv-draggable'));

    grid.querySelectorAll('[data-item-id]').forEach(el => {
      el.classList.add('inv-draggable');
      el.style.cursor = 'grab';

      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startDrag(e, el.dataset.itemId);
      });
    });
  }

  function startDrag(e, id) {
    if (typeof initAudio === 'function') initAudio();
    itemId = id;
    dragging = true;

    const item = window.ITEMS && ITEMS[id];
    if (!item) return;

    dragEl = document.createElement('div');
    let emoji = '📦';
    if (id.includes('glasses')) emoji = '👓';
    if (id.includes('straw_hat')) emoji = '👒';
    if (id.includes('sun_glasses')) emoji = '🕶️';

    dragEl.style.cssText = `
      position:fixed;left:${e.clientX - 24}px;top:${e.clientY - 24}px;
      width:48px;height:48px;font-size:32px;
      display:flex;align-items:center;justify-content:center;
      pointer-events:none;z-index:99999;
      border-radius:50%;background:rgba(255,255,255,0.9);
      box-shadow:0 4px 16px rgba(0,0,0,0.2);
      transition:transform 0.1s;transform:scale(1.1);
    `;
    dragEl.textContent = emoji;
    document.body.appendChild(dragEl);

    originPos = { x: e.clientX, y: e.clientY };

    // 힌트 표시
    showGiftHint(true);
  }

  window.addEventListener('mousemove', (e) => {
    if (!dragging || !dragEl) return;
    dragEl.style.left = (e.clientX - 24) + 'px';
    dragEl.style.top  = (e.clientY - 24) + 'px';

    // 펫 위에 올라오면 하이라이트
    const petEl = document.getElementById('desktop-pet');
    if (petEl) {
      const rect = petEl.getBoundingClientRect();
      const over = e.clientX >= rect.left && e.clientX <= rect.right &&
                   e.clientY >= rect.top  && e.clientY <= rect.bottom;
      petEl.style.filter = over ? 'drop-shadow(0 0 16px rgba(251,191,36,0.9))' : '';
      if (over && typeof applyExpressionExtended === 'function') {
        applyExpressionExtended('surprised');
      }
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (!dragging) return;
    dragging = false;
    showGiftHint(false);

    const petEl = document.getElementById('desktop-pet');
    if (petEl) {
      petEl.style.filter = '';
      const rect = petEl.getBoundingClientRect();
      const dropped = e.clientX >= rect.left && e.clientX <= rect.right &&
                      e.clientY >= rect.top  && e.clientY <= rect.bottom;

      if (dropped && itemId) {
        deliverGift(itemId);
      } else {
        // 취소 애니메이션
        if (dragEl) {
          dragEl.style.transition = 'all 0.3s ease-in';
          dragEl.style.transform = 'scale(0)';
          dragEl.style.opacity = '0';
        }
      }
    }

    setTimeout(() => {
      if (dragEl) { dragEl.remove(); dragEl = null; }
    }, 350);
    itemId = null;
  });

  function deliverGift(id) {
    const item = window.ITEMS && ITEMS[id];
    if (!item) return;

    // 선물 이펙트
    spawnGiftParticles();
    if (typeof playChime === 'function') playChime(true);

    // 즉시 장착
    if (window.appState) {
      appState.equippedItem = id;
      appState.affection = Math.min(100, appState.affection + 15);
      if (typeof saveDatabase === 'function') saveDatabase();
      if (typeof updateAllUI === 'function') updateAllUI();
      if (typeof drawEquippedItemSVG === 'function') drawEquippedItemSVG(id);
    }

    // 표정 & 대사
    if (typeof applyExpressionExtended === 'function') applyExpressionExtended('gift_happy');
    if (typeof speakBubble === 'function') {
      const char = window.CHARACTERS && CHARACTERS[appState?.selectedCharId];
      const synergy = item.target === appState?.selectedCharId;
      const msgs = synergy
        ? [`내 전용 아이템이잖아!! 최고!!!! 🎉`, `완벽한 선물이야! 애정도 폭발! 💖`, `어떻게 알았어?! 너무 좋아!!!! ⭐`]
        : [`고마워! 이거 입을게! 🥰`, `오! 선물이야? 착용해 볼게! ✨`, `와 고마워! 기분 최고야! 💕`];
      speakBubble(msgs[Math.floor(Math.random() * msgs.length)], 3500);
    }

    if (typeof showCustomAlert === 'function') {
      const synergy = item.target === appState?.selectedCharId;
      showCustomAlert(
        synergy ? '💖 전용 아이템 시너지!!' : '🎁 선물 성공!',
        `${item.name}을(를) 직접 선물했습니다!\n💖 애정도 +15${synergy ? '\n⚡ 전용 시너지 보너스 발동!' : ''}`,
        synergy ? '🌟' : '🎀'
      );
    }
  }

  function showGiftHint(show) {
    let hint = document.getElementById('gift-drag-hint');
    if (show) {
      if (!hint) {
        hint = document.createElement('div');
        hint.id = 'gift-drag-hint';
        hint.style.cssText = `
          position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
          background:rgba(251,191,36,0.95);color:#1a0a00;
          font-size:11px;font-weight:900;padding:8px 16px;border-radius:99px;
          z-index:9998;pointer-events:none;
          box-shadow:0 4px 16px rgba(251,191,36,0.4);
          animation: hintPulse 0.8s ease-in-out infinite alternate;
        `;
        hint.textContent = '🍅 토마토에게 드래그해서 선물하기!';
        document.body.appendChild(hint);

        // 애니메이션 추가
        if (!document.getElementById('hint-style')) {
          const style = document.createElement('style');
          style.id = 'hint-style';
          style.textContent = `@keyframes hintPulse { from { transform:translateX(-50%) scale(1); } to { transform:translateX(-50%) scale(1.05); } }`;
          document.head.appendChild(style);
        }
      }
    } else {
      if (hint) { hint.style.opacity = '0'; setTimeout(() => hint?.remove(), 300); }
    }
  }

  function spawnGiftParticles() {
    const petEl = document.getElementById('desktop-pet');
    if (!petEl) return;
    const rect = petEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    ['🎁','✨','💖','⭐','🌟','💫','🎀','💕'].forEach((emoji, i) => {
      const p = document.createElement('div');
      const angle = (i / 8) * Math.PI * 2;
      const dist = 40 + Math.random() * 30;
      p.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;font-size:${14+Math.random()*10}px;pointer-events:none;z-index:9999;transition:all 0.8s cubic-bezier(0.34,1.56,0.64,1);opacity:1;`;
      p.textContent = emoji;
      document.body.appendChild(p);
      setTimeout(() => {
        p.style.transform = `translate(${Math.cos(angle)*dist}px, ${Math.sin(angle)*dist - 40}px) scale(1.5)`;
        p.style.opacity = '0';
      }, 20 + i * 30);
      setTimeout(() => p.remove(), 900 + i * 30);
    });
  }

  return { init };
})();


// =====================================================
// DOM 주입: 미니게임 모달 & 게임 버튼
// =====================================================

function injectGameUI() {
  // 미니게임 버튼 (헤더에 추가) - 셀렉터 강건하게 수정
  if (!document.getElementById('btn-open-minigame')) {
    const btn = document.createElement('button');
    btn.id = 'btn-open-minigame';
    btn.className = 'bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-full shadow-lg shadow-emerald-500/30 transition-all flex items-center gap-1.5 hover:scale-105';
    btn.innerHTML = '<i class="fa-solid fa-gamepad"></i> 미니게임';
    btn.onclick = () => window.Minigame.openModal();

    // 헤더 오른쪽 영역에 삽입 (다양한 셀렉터 시도)
    const headerRight = document.querySelector('header .flex.items-center.gap-3:last-child')
      || document.querySelector('header .flex.items-center.gap-3')
      || document.querySelector('header');
    if (headerRight) headerRight.insertBefore(btn, headerRight.firstChild);
    else document.body.appendChild(btn); // 최후 fallback
  }

  // 인벤토리 아이템에 data-item-id 부여 패치
  // renderInventory 원본을 감싸서 확장
  if (typeof renderInventory === 'function' && !window._renderInventoryPatched) {
    window._renderInventoryPatched = true;
    const originalRender = window.renderInventory;
    window.renderInventory = function() {
      originalRender();
      // 각 카드에 data-item-id 부여
      const grid = document.getElementById('inventory-grid');
      if (!grid) return;
      const keys = Object.keys(appState.inventory || {}).filter(k => appState.inventory[k] > 0);
      const cards = grid.querySelectorAll(':scope > div');
      keys.forEach((id, i) => {
        if (cards[i]) cards[i].dataset.itemId = id;
      });
      GiftSystem.init();
    };
  }

  // 미니게임 모달 주입
  if (!document.getElementById('minigame-modal')) {
    const modal = document.createElement('div');
    modal.id = 'minigame-modal';
    modal.className = 'fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 hidden';
    modal.innerHTML = `
      <div class="bg-white rounded-3xl shadow-2xl w-[380px] max-h-[90vh] overflow-hidden flex flex-col" style="border:2px solid rgba(255,255,255,0.6);">
        <!-- Header -->
        <div class="bg-gradient-to-r from-emerald-500 to-indigo-500 p-4 flex justify-between items-center">
          <h2 class="text-white font-black text-sm flex items-center gap-2">🎮 휴식 시간 미니게임</h2>
          <button onclick="window.Minigame.closeModal()" class="text-white/80 hover:text-white text-xl transition-colors">✕</button>
        </div>

        <!-- Lobby -->
        <div id="mg-lobby" class="p-5 flex flex-col gap-3">
          <div id="mg-break-warning" class="hidden bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[10px] font-bold text-amber-700 text-center">
            ⚠️ 휴식 시간에만 점수가 기록됩니다. 지금은 연습 모드예요!
          </div>
          <p class="text-xs font-bold text-stone-500 text-center mb-2">미니게임으로 추가 잎사귀를 획득하세요! 🍃</p>
          <button onclick="window.Minigame.startGame('whack')" class="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl text-sm flex flex-col items-center gap-1 transition-all hover:scale-[1.02] shadow-lg shadow-red-500/30">
            <span class="text-2xl">🍅</span>
            <span>두더지잡기 모드</span>
            <span class="text-[10px] opacity-80">나타나는 토마토를 빠르게 클릭!</span>
          </button>
          <button onclick="window.Minigame.startGame('catch')" class="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black py-4 rounded-2xl text-sm flex flex-col items-center gap-1 transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/30">
            <span class="text-2xl">💧</span>
            <span>물방울 받기 모드</span>
            <span class="text-[10px] opacity-80">사라지기 전에 물방울을 클릭!</span>
          </button>
          <p class="text-[9px] text-stone-400 text-center mt-1">* 획득 점수의 1/10 만큼 🍃 잎사귀로 환산됩니다</p>
        </div>

        <!-- Game Screen -->
        <div id="mg-game" class="hidden flex flex-col" style="height:360px;">
          <div class="flex justify-between items-center px-4 py-2 bg-stone-50 border-b border-stone-100">
            <span id="mg-type-label" class="text-[10px] font-black text-stone-600"></span>
            <div class="flex gap-4 text-[11px] font-black">
              <span class="text-red-500">⭐ <span id="mg-score">0</span></span>
              <span class="text-indigo-500">⏱ <span id="mg-time">20</span>s</span>
            </div>
          </div>
          <div id="mg-canvas" class="flex-1 relative overflow-hidden bg-gradient-to-br from-stone-50 to-stone-100 cursor-crosshair select-none" style="border-radius:0 0 20px 20px;">
            <div class="absolute inset-0 flex items-center justify-center text-stone-200 font-black text-6xl pointer-events-none select-none">🍅</div>
          </div>
        </div>

        <!-- Result Screen -->
        <div id="mg-result" class="hidden p-5 flex flex-col items-center gap-3 text-center">
          <div class="text-5xl mb-1">🏆</div>
          <div id="mg-grade" class="text-4xl font-black text-indigo-600">A</div>
          <div id="mg-grade-msg" class="text-xs font-bold text-stone-500"></div>
          <div class="bg-stone-50 rounded-2xl p-3 w-full grid grid-cols-2 gap-2 text-center">
            <div><div class="text-[10px] text-stone-400 font-bold">최종 점수</div><div id="mg-final-score" class="text-xl font-black text-stone-700"></div></div>
            <div><div class="text-[10px] text-stone-400 font-bold">획득 잎사귀</div><div id="mg-leaf-reward" class="text-xl font-black text-emerald-600"></div></div>
          </div>
          <div class="flex gap-2 w-full">
            <button onclick="window.Minigame.startGame(window._lastGameType||'whack')" class="flex-1 bg-emerald-500 text-white font-black py-2 rounded-xl text-xs hover:bg-emerald-600 transition-colors">🔄 다시 하기</button>
            <button onclick="window.Minigame.closeModal()" class="flex-1 bg-stone-200 text-stone-600 font-black py-2 rounded-xl text-xs hover:bg-stone-300 transition-colors">✅ 완료</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
}


// =====================================================
// INIT: DOMContentLoaded 이후 모든 시스템 초기화
// =====================================================

function initInteractionExpansion() {
  CheekPhysics.init();
  injectGameUI();
  GiftSystem.init();

  // 감정 시스템 확장: 새로운 감정 추가 대사
  if (typeof DIALOGUES !== 'undefined') {
    DIALOGUES.cheek_pulled = ['야야야!! 🤪', '으아 늘어나잖아!! 😤', '그만해 간지러워!! 💢', '헤헤 사실 좋아... 💕'];
    DIALOGUES.gift_happy   = ['선물이다!!!! 🎁', '진짜진짜 고마워!!! 💖', '이거 완전 내 취향이야!! ⭐'];
    DIALOGUES.surprised    = ['앗! 깜짝이야! 😲', '뭔가 왔어?! 👀', '오오오!!!! ✨'];
    DIALOGUES.shy          = ['...부끄러워 >//< 💕', '그렇게 보지 마... 🫣', '으읏 얼굴 빨개지잖아 🍅'];
    DIALOGUES.angry        = ['으으으!! 😤', '지금 화났어! 💢', '그러면 안 되잖아!! 🔥'];
    DIALOGUES.determined   = ['이번엔 꼭 해낼 거야! 💪', '집중!! 나만 믿어!! 🎯', '같이 달리자!! 🏃'];
  }

  console.log('[Damadoro] Interaction Expansion Module v2.0 loaded ✅');
  console.log('  ✓ 볼따구 물리 인터랙션');
  console.log('  ✓ 미니게임 시스템 (두더지잡기 / 물방울)');
  console.log('  ✓ 감정 표정 15종 확장');
  console.log('  ✓ 선물 드래그 & 드롭 시스템');
}

// 자동 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInteractionExpansion);
} else {
  // 이미 로드됨 — 약간 지연 후 실행
  setTimeout(initInteractionExpansion, 500);
}
