const ITEMS = {
  glasses_c: { id: 'glasses_c', name: '[방울토마토]의 미니 안경', grade: 'C', target: 'tomato_cherry', bonus: 1 },
  glasses_b: { id: 'glasses_b', name: '[방울토마토]의 스마트 안경', grade: 'B', target: 'tomato_cherry', bonus: 5 },
  glasses_a: { id: 'glasses_a', name: '[방울토마토]의 홀로그램 선글라스', grade: 'A', target: 'tomato_cherry', bonus: 15 },
  glasses_s: { id: 'glasses_s', name: '[방울토마토]의 차원 도약 안경', grade: 'S', target: 'tomato_cherry', bonus: 40 },
  glasses_ur: { id: 'glasses_ur', name: '[방울토마토]의 진리 탐구 단안경', grade: 'UR', target: 'tomato_cherry', bonus: 120 },

  straw_hat_c: { id: 'straw_hat_c', name: '[풋토마토]의 허름한 모자', grade: 'C', target: 'tomato_green', bonus: 1 },
  straw_hat_b: { id: 'straw_hat_b', name: '[풋토마토]의 수확기 밀짚모자', grade: 'B', target: 'tomato_green', bonus: 5 },
  straw_hat_a: { id: 'straw_hat_a', name: '[풋토마토]의 페도라 중절모', grade: 'A', target: 'tomato_green', bonus: 15 },
  straw_hat_s: { id: 'straw_hat_s', name: '[풋토마토]의 대지 수호 모자', grade: 'S', target: 'tomato_green', bonus: 40 },
  straw_hat_ur: { id: 'straw_hat_ur', name: '[풋토마토]의 마스터 숲의 왕관', grade: 'UR', target: 'tomato_green', bonus: 120 },

  sun_glasses_c: { id: 'sun_glasses_c', name: '[흑토마토]의 레트로 안경', grade: 'C', target: 'tomato_black', bonus: 1 },
  sun_glasses_b: { id: 'sun_glasses_b', name: '[흑토마토]의 아웃도어 고글', grade: 'B', target: 'tomato_black', bonus: 5 },
  sun_glasses_a: { id: 'sun_glasses_a', name: '[흑토마토]의 도심 스트릿 고글', grade: 'A', target: 'tomato_black', bonus: 15 },
  sun_glasses_s: { id: 'sun_glasses_s', name: '[흑토마토]의 홀로그램 선글래스', grade: 'S', target: 'tomato_black', bonus: 40 },
  sun_glasses_ur: { id: 'sun_glasses_ur', name: '[흑토마토]의 차원해커 스카우터', grade: 'UR', target: 'tomato_black', bonus: 120 }
};

const GRADES = {
  C: { label: '일반', prob: 0.75, bg: 'bg-stone-100 text-stone-700 border-stone-200' },
  B: { label: '희귀', prob: 0.20, bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  A: { label: '영웅', prob: 0.04, bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  S: { label: '전설', prob: 0.009, bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  UR: { label: '신화', prob: 0.001, bg: 'bg-red-50 text-red-700 border-red-200' }
};

function executeGachaDrop() {
  const rand = Math.random();
  let selectedGrade = 'C';
  if (rand < 0.001) selectedGrade = 'UR';
  else if (rand < 0.01) selectedGrade = 'S';
  else if (rand < 0.05) selectedGrade = 'A';
  else if (rand < 0.25) selectedGrade = 'B';
  else selectedGrade = 'C';

  const candidates = Object.values(ITEMS).filter(item => item.grade === selectedGrade);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

document.addEventListener('DOMContentLoaded', () => {
  // Gacha Tabs
  document.getElementById('tab-btn-gacha')?.addEventListener('click', () => switchStoreTab('gacha'));
  document.getElementById('tab-btn-inventory')?.addEventListener('click', () => switchStoreTab('inventory'));
  document.getElementById('tab-btn-book')?.addEventListener('click', () => switchStoreTab('book'));

  document.getElementById('btn-pull-single')?.addEventListener('click', () => {
    const price = 30;
    if (appState.leaves < price) {
      showCustomAlert("🍃 잎사귀 부족", "뽑기 1회에는 30개의 잎사귀가 소요됩니다.", "❌");
      return;
    }
    appState.leaves -= price;
    saveDatabase();
    if(typeof updateAllUI === 'function') updateAllUI();
    runGachaDrawVisuals(1);
  });

  document.getElementById('btn-pull-multi')?.addEventListener('click', () => {
    const price = 300;
    if (appState.leaves < price) {
      showCustomAlert("🍃 잎사귀 부족", "연속 뽑기에는 300개의 잎사귀가 소요됩니다.", "❌");
      return;
    }
    appState.leaves -= price;
    saveDatabase();
    if(typeof updateAllUI === 'function') updateAllUI();
    runGachaDrawVisuals(11);
  });

  document.getElementById('btn-equip-item')?.addEventListener('click', () => {
    if (!currentSelectedItemId) return;
    appState.equippedItem = currentSelectedItemId;
    saveDatabase();
    if(typeof updateAllUI === 'function') updateAllUI();
    drawEquippedItemSVG(currentSelectedItemId);
    showCustomAlert("🎯 아이템 장착 성공", `${ITEMS[currentSelectedItemId].name}를 파트너 캐릭터에게 입혔습니다!`, "🎯");
  });

  document.getElementById('btn-merge-item')?.addEventListener('click', () => {
    if (!currentSelectedItemId) return;
    const item = ITEMS[currentSelectedItemId];
    const count = appState.inventory[currentSelectedItemId] || 0;
    if (count < 5) return;

    appState.inventory[currentSelectedItemId] -= 5;
    const nextMap = { 'C': 'B', 'B': 'A', 'A': 'S', 'S': 'UR' };
    const nextGrade = nextMap[item.grade];

    const pool = Object.values(ITEMS).filter(i => i.grade === nextGrade);
    const output = pool[Math.floor(Math.random() * pool.length)];

    appState.inventory[output.id] = (appState.inventory[output.id] || 0) + 1;
    saveDatabase();
    if(typeof updateAllUI === 'function') updateAllUI();
    renderInventory();
    selectInventoryItem(output.id);

    playChime(true);
    showCustomAlert("✨ 제련 완성!", `하위 장비 5개를 소모하여, 신비로운 상급 등급의 [${output.name}]을 합성해 냈습니다!`, "🛠️");
  });
});

function switchStoreTab(tab) {
  const tabs = ['gacha', 'inventory', 'book'];
  tabs.forEach(t => {
    const btn = document.getElementById('tab-btn-' + t);
    const panel = document.getElementById('panel-' + t);
    if(btn && panel) {
      if(t === tab) {
        btn.className = "flex-1 py-1.5 font-black text-stone-700 rounded-lg bg-white shadow-sm transition-all";
        panel.classList.remove('hidden');
      } else {
        btn.className = "flex-1 py-1.5 font-bold text-stone-500 rounded-lg hover:text-stone-700 transition-all";
        panel.classList.add('hidden');
      }
    }
  });
  if(tab === 'inventory') renderInventory();
  if(tab === 'book') renderCollectionBook();
}

function runGachaDrawVisuals(pullCount) {
  const animBox = document.getElementById('gacha-animation-box');
  const waitText = document.getElementById('gacha-waiting-text');
  const resultList = document.getElementById('gacha-result-list');
  const boxIcon = document.getElementById('gacha-box-icon');
  const boxText = document.getElementById('gacha-box-text');

  if(waitText) waitText.classList.add('hidden');
  if(resultList) resultList.classList.add('hidden');
  if(animBox) animBox.classList.remove('hidden');

  let counter = 0;
  const icons = ['🔴', '🟢', '⚫', '🎁', '📦'];
  const interval = setInterval(() => {
    if(boxIcon) boxIcon.textContent = icons[counter % icons.length];
    if(boxText) boxText.textContent = `가동률 [${Math.floor((counter/12)*100)}%]`;
    counter++;
    if (counter > 12) {
      clearInterval(interval);
      
      const results = [];
      for (let i = 0; i < pullCount; i++) {
        const drop = executeGachaDrop();
        results.push(drop);
        if(!appState.inventory) appState.inventory = {};
        appState.inventory[drop.id] = (appState.inventory[drop.id] || 0) + 1;
      }

      saveDatabase();

      if(animBox) animBox.classList.add('hidden');
      if(resultList) {
        resultList.classList.remove('hidden');
        resultList.innerHTML = '';
        results.forEach(item => {
          const gradeMeta = GRADES[item.grade];
          const div = document.createElement('div');
          div.className = `${gradeMeta.bg} border text-[9px] p-1.5 rounded-lg flex flex-col items-center justify-center min-w-[70px] shadow-sm transform hover:scale-105 transition-transform cursor-pointer`;
          
          let emoji = '📦';
          if (item.id.includes('glasses')) emoji = '👓';
          if (item.id.includes('straw_hat')) emoji = '👒';
          if (item.id.includes('sun_glasses')) emoji = '🕶️';

          div.innerHTML = `
            <span class="text-base">${emoji}</span>
            <span class="font-extrabold text-center leading-tight mt-0.5 break-keep">${item.name}</span>
            <span class="text-[7px] font-black opacity-85">${item.grade}</span>
          `;
          resultList.appendChild(div);
        });
      }

      playChime(true);
      if(typeof updateAllUI === 'function') updateAllUI();
      if(typeof speakBubble === 'function') speakBubble(`오예! 대박 캡슐 드롭 성공! 가방을 확인해봐!`);
    }
  }, 100);
}

let currentSelectedItemId = null;

function renderInventory() {
  const grid = document.getElementById('inventory-grid');
  if(!grid) return;
  grid.innerHTML = '';

  const keys = Object.keys(appState.inventory || {}).filter(k => appState.inventory[k] > 0);
  if (keys.length === 0) {
    grid.innerHTML = `<div class="col-span-3 text-center py-6 text-stone-400 text-[10px]">보관함이 비어있습니다.</div>`;
    clearSelectedItemSection();
    return;
  }

  keys.forEach(id => {
    const item = ITEMS[id];
    const count = appState.inventory[id];
    const gradeMeta = GRADES[item.grade];
    
    let emoji = '📦';
    if (item.id.includes('glasses')) emoji = '👓';
    if (item.id.includes('straw_hat')) emoji = '👒';
    if (item.id.includes('sun_glasses')) emoji = '🕶️';

    const card = document.createElement('div');
    const isSelected = currentSelectedItemId === id;
    
    card.className = `${gradeMeta.bg} border-2 ${isSelected ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-stone-200'} p-1.5 rounded-xl flex flex-col items-center justify-center cursor-pointer relative select-none`;
    card.innerHTML = `
      <span class="text-xl">${emoji}</span>
      <span class="text-[8px] font-bold text-center mt-0.5 break-keep">${item.name}</span>
      <span class="absolute top-0.5 right-1 bg-stone-900 text-white text-[8px] px-1 rounded-full">${count}</span>
    `;
    card.addEventListener('click', () => selectInventoryItem(id));
    grid.appendChild(card);
  });
}

function selectInventoryItem(id) {
  currentSelectedItemId = id;
  renderInventory();

  const item = ITEMS[id];
  const count = appState.inventory[id];
  const gradeMeta = GRADES[item.grade];

  const rBadge = document.getElementById('selected-item-rarity');
  const iName = document.getElementById('selected-item-name');
  const iDesc = document.getElementById('selected-item-desc');
  
  const btnEquip = document.getElementById('btn-equip-item');
  const btnMerge = document.getElementById('btn-merge-item');

  if(rBadge) {
    rBadge.className = `text-[8px] font-black uppercase tracking-wider px-1 py-0.2 rounded-md ${gradeMeta.bg} border inline-block`;
    rBadge.textContent = `${gradeMeta.label} (${item.grade})`;
  }
  
  if(iName) iName.innerHTML = `${item.name} <span class="text-[9px] text-stone-400">(${count}개 소지)</span>`;
  
  if(iDesc) {
    const synName = CHARACTERS[item.target]?.name || "전체";
    iDesc.innerHTML = `효과: 호감도 상승량 배율 +${item.bonus * 10}% / 시너지: <span class="font-extrabold text-red-500">${synName}</span> (전용 장착 시 효과 2배!)`;
  }

  if(btnEquip) btnEquip.disabled = false;
  if(btnMerge) {
    if (count >= 5 && item.grade !== 'UR') {
      btnMerge.disabled = false;
      btnMerge.textContent = `🔥 5합 합성`;
    } else {
      btnMerge.disabled = true;
      btnMerge.textContent = item.grade === 'UR' ? '⚙️ 합성 한계' : '🔒 5개 필요';
    }
  }
}

function clearSelectedItemSection() {
  currentSelectedItemId = null;
  const rBadge = document.getElementById('selected-item-rarity');
  if(rBadge) rBadge.className = 'hidden';
  if(document.getElementById('selected-item-name')) document.getElementById('selected-item-name').textContent = '소지품 장비를 클릭해 주세요.';
  if(document.getElementById('selected-item-desc')) document.getElementById('selected-item-desc').textContent = '';
  if(document.getElementById('btn-equip-item')) document.getElementById('btn-equip-item').disabled = true;
  if(document.getElementById('btn-merge-item')) document.getElementById('btn-merge-item').disabled = true;
}

function drawEquippedItemSVG(itemId) {
  const layer = document.getElementById('equipped-item-layer');
  if(!layer) return;
  layer.innerHTML = '';
  if (!itemId) return;

  if (itemId.includes('glasses') || itemId.includes('sun_glasses')) {
    layer.innerHTML = `
      <rect x="50" y="105" width="100" height="6" rx="2" fill="#1e293b" opacity="0.9" />
      <circle cx="78" cy="110" r="16" fill="none" stroke="#1e293b" stroke-width="4" />
      <circle cx="122" cy="110" r="16" fill="none" stroke="#1e293b" stroke-width="4" />
      <path d="M72,102 L82,112" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.6" />
      <path d="M116,102 L126,112" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.6" />
    `;
  } else if (itemId.includes('straw_hat')) {
    layer.innerHTML = `
      <ellipse cx="100" cy="70" rx="68" ry="12" fill="#f59e0b" stroke="#d97706" stroke-width="2" />
      <path d="M60,70 L65,40 C68,32 132,32 135,40 L140,70" fill="#d97706" stroke="#b45309" stroke-width="2" />
      <rect x="63" y="58" width="74" height="8" fill="#dc2626" />
    `;
  }
}

function renderCollectionBook() {
  const container = document.getElementById('book-list-container');
  if(!container) return;
  container.innerHTML = '';

  let collectedCount = 0;
  const total = Object.keys(ITEMS).length;

  Object.keys(ITEMS).forEach(id => {
    const item = ITEMS[id];
    const isCol = (appState.inventory && appState.inventory[id] > 0) || appState.equippedItem === id;
    if (isCol) collectedCount++;

    const gradeMeta = GRADES[item.grade];
    const card = document.createElement('div');
    
    let emoji = '📦';
    if (item.id.includes('glasses')) emoji = '👓';
    if (item.id.includes('straw_hat')) emoji = '👒';
    if (item.id.includes('sun_glasses')) emoji = '🕶️';

    card.className = `border rounded-lg p-1.5 text-center flex flex-col items-center justify-center ${isCol ? gradeMeta.bg + ' opacity-100' : 'bg-stone-100 opacity-30 border-stone-200'}`;
    card.innerHTML = `
      <span class="text-lg">${emoji}</span>
      <span class="text-[7px] font-bold text-stone-700 text-center mt-0.5 break-keep">${item.name}</span>
    `;
    container.appendChild(card);
  });

  const pct = Math.round((collectedCount / total) * 100);
  const passiveMult = getCollectionBonusMultiplier();

  if(document.getElementById('book-progress-bar')) document.getElementById('book-progress-bar').style.width = `${pct}%`;
  if(document.getElementById('book-progress-percent')) {
    document.getElementById('book-progress-percent').innerHTML = `달성도: ${pct}% <span class="ml-2 text-indigo-600">[패시브 보너스: x${passiveMult.toFixed(2)}]</span>`;
  }
  if(document.getElementById('book-progress-fraction')) document.getElementById('book-progress-fraction').textContent = `${collectedCount} / ${total}`;
}

// --- Automation & Bonus Helpers ---
function hasInventoryGrade(grade) {
  if (!appState.inventory) return false;
  return Object.keys(appState.inventory).some(id => {
    const item = ITEMS[id];
    return item && item.grade === grade && appState.inventory[id] > 0;
  });
}

function getCollectionBonusMultiplier() {
  let collectedCount = 0;
  Object.keys(ITEMS).forEach(id => {
    if ((appState.inventory && appState.inventory[id] > 0) || appState.equippedItem === id) {
      collectedCount++;
    }
  });
  return 1 + (collectedCount * 0.05);
}

function getEquippedBonusMultiplier() {
  if (!appState.equippedItem) return 1;
  const item = ITEMS[appState.equippedItem];
  if (!item) return 1;

  let multiplier = 1 + (item.bonus * 0.1); 
  if (item.target === appState.selectedCharId) {
    multiplier *= 2; 
  }
  return multiplier;
}