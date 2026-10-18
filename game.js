// ============================================
// 검 강화하기 게임 - 메인 로직
// ============================================

// 강화 확률 테이블
const ENHANCEMENT_TABLE = {
    0: { success: 100, destroy: 0, maintain: 0, downgrade: 0, cost: 0 },
    1: { success: 85, destroy: 0, maintain: 10, downgrade: 5, cost: 1000 },
    2: { success: 80, destroy: 0, maintain: 15, downgrade: 5, cost: 2000 },
    3: { success: 75, destroy: 0, maintain: 15, downgrade: 10, cost: 3000 },
    4: { success: 70, destroy: 0, maintain: 15, downgrade: 15, cost: 4000 },
    5: { success: 65, destroy: 5, maintain: 15, downgrade: 15, cost: 5000 },
    6: { success: 60, destroy: 5, maintain: 15, downgrade: 20, cost: 6000 },
    7: { success: 55, destroy: 10, maintain: 15, downgrade: 20, cost: 7000 },
    8: { success: 50, destroy: 10, maintain: 15, downgrade: 25, cost: 8000 },
    9: { success: 45, destroy: 15, maintain: 15, downgrade: 25, cost: 9000 },
    10: { success: 40, destroy: 15, maintain: 15, downgrade: 30, cost: 10000 },
    11: { success: 35, destroy: 20, maintain: 15, downgrade: 30, cost: 11000 },
    12: { success: 30, destroy: 25, maintain: 15, downgrade: 30, cost: 12000 },
    13: { success: 28, destroy: 27, maintain: 15, downgrade: 30, cost: 13000 },
    14: { success: 25, destroy: 30, maintain: 15, downgrade: 30, cost: 14000 },
    15: { success: 20, destroy: 35, maintain: 15, downgrade: 30, cost: 15000 }
};

// 속성 정보
const ATTRIBUTES = [
    { id: 'fire', name: '불🔥', color: '#ff4444' },
    { id: 'water', name: '물💧', color: '#4444ff' },
    { id: 'dark', name: '어둠🌑', color: '#332244' },
    { id: 'poison', name: '독☠️', color: '#44ff44' },
    { id: 'ice', name: '얼음❄️', color: '#44ffff' },
    { id: 'heaven', name: '천✨', color: '#ffff44' },
    { id: 'evil', name: '악😈', color: '#aa0000' },
    { id: 'mech', name: '기계⚙️', color: '#888888' },
    { id: 'grass', name: '풀🌿', color: '#228822' }
];

const ATTRIBUTE_EMOJIS = {
    fire: '🔥',
    water: '💧',
    dark: '🌑',
    poison: '☠️',
    ice: '❄️',
    heaven: '✨',
    evil: '😈',
    mech: '⚙️',
    grass: '🌿'
};

// 룰렛 보상
const ROULETTE_REWARDS = [
    { name: '골드 1000', value: 1000, type: 'gold', weight: 20 },
    { name: '골드 5000', value: 5000, type: 'gold', weight: 15 },
    { name: '골드 10000', value: 10000, type: 'gold', weight: 10 },
    { name: '확정권', value: 1, type: 'guarantee', weight: 8 },
    { name: '방지권', value: 1, type: 'protect', weight: 7 },
    { name: '머니 1', value: 1, type: 'money', weight: 5 },
    { name: '꽝', value: 0, type: 'lose', weight: 35 }
];

// 전역 게임 상태
let GameState = {
    playerName: '플레이어',
    gold: 50000,
    money: 0,
    currentSword: {
        id: 0,
        enhancement: 0,
        attribute: null,
        acquiredDate: new Date().toISOString()
    },
    inventory: [],
    collection: {}, // 도감
    items: {
        guarantee: {}, // level별 개수
        protect: {}
    },
    lastAttendance: null,
    totalEnhancements: 0,
    enhanceHistory: []
};

// ============================================
// 유틸리티 함수
// ============================================

function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getAttributeName(attribute) {
    if (!attribute) return '속성 없음';
    const attr = ATTRIBUTES.find(a => a.id === attribute);
    return attr ? attr.name : '속성 없음';
}

function getAttributeEmoji(attribute) {
    return ATTRIBUTE_EMOJIS[attribute] || '';
}

function random(max) {
    return Math.floor(Math.random() * max);
}

function getRandomAttribute() {
    return ATTRIBUTES[random(ATTRIBUTES.length)].id;
}

// ============================================
// 저장/로드 시스템
// ============================================

function saveGame() {
    localStorage.setItem('swordGameState', JSON.stringify(GameState));
}

function loadGame() {
    const saved = localStorage.getItem('swordGameState');
    if (saved) {
        GameState = JSON.parse(saved);
    } else {
        GameState.currentSword = newSword(0, null);
        saveGame();
    }
}

function resetGame() {
    GameState = {
        playerName: '플레이어',
        gold: 50000,
        money: 0,
        currentSword: newSword(0, null),
        inventory: [],
        collection: {},
        items: {
            guarantee: {},
            protect: {}
        },
        lastAttendance: null,
        totalEnhancements: 0,
        enhanceHistory: []
    };
    saveGame();
}

// ============================================
// 검 생성
// ============================================

function newSword(enhancement = 0, attribute = null) {
    if (enhancement === 0) {
        attribute = null;
    } else if (!attribute) {
        attribute = getRandomAttribute();
    }

    return {
        id: generateUniqueId(),
        enhancement,
        attribute,
        acquiredDate: new Date().toISOString()
    };
}

// ============================================
// 강화 시스템
// ============================================

function enhance(useGuarantee = false, useProtection = false) {
    const sword = GameState.currentSword;
    
    if (sword.enhancement >= 15) {
        showNotification('이미 최대 강화(15강)입니다!', 'warning');
        return null;
    }

    const cost = ENHANCEMENT_TABLE[sword.enhancement].cost;
    if (GameState.gold < cost) {
        showNotification('골드가 부족합니다!', 'error');
        return null;
    }

    // 확정권 확인
    const guaranteeKey = sword.enhancement + 1;
    const hasGuarantee = useGuarantee && (GameState.items.guarantee[guaranteeKey] > 0);
    const hasProtect = useProtection && (GameState.items.protect[sword.enhancement] > 0);

    let result;
    if (hasGuarantee) {
        result = 'success';
        GameState.items.guarantee[guaranteeKey]--;
    } else {
        const rand = Math.random() * 100;
        const table = ENHANCEMENT_TABLE[sword.enhancement];
        
        if (rand < table.success) {
            result = 'success';
        } else if (rand < table.success + table.destroy) {
            result = 'destroy';
        } else if (rand < table.success + table.destroy + table.maintain) {
            result = 'maintain';
        } else {
            result = 'downgrade';
        }
    }

    // 파괴 방지권 적용
    if ((result === 'destroy' || result === 'downgrade') && hasProtect) {
        result = 'maintain';
        GameState.items.protect[sword.enhancement]--;
    }

    // 비용 차감
    GameState.gold -= cost;
    GameState.totalEnhancements++;

    const oldLevel = sword.enhancement;
    const oldAttribute = sword.attribute;
    let newLevel = oldLevel;
    let newAttribute = oldAttribute;

    // 결과 처리
    if (result === 'success') {
        newLevel = oldLevel + 1;
        if (oldLevel === 0) {
            newAttribute = getRandomAttribute();
            recordCollection(newAttribute, newLevel);
        } else if (oldLevel > 0) {
            recordCollection(oldAttribute, newLevel);
        }
        showNotification(`성공! ${oldLevel}강 → ${newLevel}강!`, 'success');
    } else if (result === 'destroy') {
        const reward = 50 + (oldLevel * 50);
        GameState.gold += reward;
        newLevel = -1;
        showNotification(`파괴! ${reward}G 보상 획득!`, 'error');
    } else if (result === 'maintain') {
        showNotification('유지되었습니다.', 'warning');
    } else if (result === 'downgrade') {
        newLevel = Math.max(0, oldLevel - 1);
        showNotification(`하락! ${oldLevel}강 → ${newLevel}강`, 'warning');
    }

    // 상태 업데이트
    if (result === 'destroy') {
        GameState.currentSword = newSword(0, null);
    } else {
        sword.enhancement = newLevel;
        sword.attribute = newAttribute;
    }

    // 강화 기록
    GameState.enhanceHistory.unshift({
        timestamp: new Date().toISOString(),
        oldLevel,
        newLevel,
        result,
        itemsUsed: { guarantee: hasGuarantee, protect: hasProtect }
    });

    if (GameState.enhanceHistory.length > 20) {
        GameState.enhanceHistory.pop();
    }

    saveGame();
    return { result, oldLevel, newLevel };
}

function recordCollection(attribute, level) {
    if (!attribute) return;
    const key = `${attribute}_${level}`;
    if (!GameState.collection[key]) {
        GameState.collection[key] = 1;
    }
}

// ============================================
// 인벤토리 관리
// ============================================

function storeSword() {
    const sword = GameState.currentSword;
    if (sword.enhancement === -1) {
        showNotification('파괴된 검을 보관할 수 없습니다!', 'error');
        return;
    }
    GameState.inventory.push({ ...sword });
    GameState.currentSword = newSword(0, null);
    saveGame();
    updateUI();
    showNotification('검을 보관했습니다!', 'success');
}

function equipSword(swordId) {
    const index = GameState.inventory.findIndex(s => s.id === swordId);
    if (index === -1) {
        showNotification('검을 찾을 수 없습니다!', 'error');
        return;
    }
    
    const equipped = GameState.inventory[index];
    GameState.inventory[index] = GameState.currentSword;
    GameState.currentSword = equipped;
    
    saveGame();
    updateUI();
    switchTab('enhance');
    showNotification('검을 장착했습니다!', 'success');
}

function sellSword(location, swordId = null) {
    let sword;
    let index;

    if (location === 'current') {
        sword = GameState.currentSword;
    } else {
        index = GameState.inventory.findIndex(s => s.id === swordId);
        if (index === -1) {
            showNotification('검을 찾을 수 없습니다!', 'error');
            return;
        }
        sword = GameState.inventory[index];
    }

    const value = 10 + (sword.enhancement * 50);
    GameState.gold += value;

    if (location === 'current') {
        GameState.currentSword = newSword(0, null);
    } else {
        GameState.inventory.splice(index, 1);
    }

    saveGame();
    updateUI();
    showNotification(`${value}G를 획득했습니다!`, 'success');
}

// ============================================
// 출석체크
// ============================================

function claimCheckIn() {
    const today = new Date().toDateString();
    const last = GameState.lastAttendance;

    if (last === today) {
        showNotification('이미 오늘 보상을 받았습니다!', 'warning');
        return false;
    }

    GameState.lastAttendance = today;
    GameState.gold += 10000;
    saveGame();
    updateUI();
    showNotification('10,000G를 획득했습니다!', 'success');
    return true;
}

function updateCheckInInfo() {
    const today = new Date().toDateString();
    const last = GameState.lastAttendance;
    const infoEl = document.getElementById('checkInInfo');

    if (last === today) {
        infoEl.innerHTML = '<p>오늘 이미 받으셨습니다. 내일 다시 방문해주세요!</p>';
        document.getElementById('checkInBtn2').disabled = true;
    } else {
        infoEl.innerHTML = '<p>오늘의 보상을 받을 수 있습니다!</p>';
        document.getElementById('checkInBtn2').disabled = false;
    }
}

// ============================================
// 룰렛
// ============================================

function spinRoulette(times = 1) {
    if (GameState.money < times) {
        showNotification('머니가 부족합니다!', 'error');
        return [];
    }

    GameState.money -= times;
    const results = [];

    for (let i = 0; i < times; i++) {
        const totalWeight = ROULETTE_REWARDS.reduce((sum, r) => sum + r.weight, 0);
        let rand = Math.random() * totalWeight;
        
        let reward = ROULETTE_REWARDS[0];
        for (const r of ROULETTE_REWARDS) {
            rand -= r.weight;
            if (rand <= 0) {
                reward = r;
                break;
            }
        }

        if (reward.type === 'gold') {
            GameState.gold += reward.value;
        } else if (reward.type === 'money') {
            GameState.money += reward.value;
        } else if (reward.type === 'guarantee') {
            const level = random(15) + 1;
            if (!GameState.items.guarantee[level]) {
                GameState.items.guarantee[level] = 0;
            }
            GameState.items.guarantee[level]++;
        } else if (reward.type === 'protect') {
            const level = random(10) + 1;
            if (!GameState.items.protect[level]) {
                GameState.items.protect[level] = 0;
            }
            GameState.items.protect[level]++;
        }

        results.push(reward);
    }

    saveGame();
    return results;
}

// ============================================
// 상점
// ============================================

function buyGuarantee(level) {
    const cost = level * 5000;
    if (GameState.gold < cost) {
        showNotification('골드가 부족합니다!', 'error');
        return false;
    }

    GameState.gold -= cost;
    if (!GameState.items.guarantee[level]) {
        GameState.items.guarantee[level] = 0;
    }
    GameState.items.guarantee[level]++;
    saveGame();
    updateUI();
    showNotification(`강화 확정권 ${level}강을 구매했습니다!`, 'success');
    return true;
}

function buyProtect(level) {
    const cost = 10000;
    if (GameState.gold < cost) {
        showNotification('골드가 부족합니다!', 'error');
        return false;
    }

    GameState.gold -= cost;
    if (!GameState.items.protect[level]) {
        GameState.items.protect[level] = 0;
    }
    GameState.items.protect[level]++;
    saveGame();
    updateUI();
    showNotification('파괴 방지권을 구매했습니다!', 'success');
    return true;
}

// ============================================
// UI 업데이트
// ============================================

function updateUI() {
    updateTopBar();
    updateCurrentSword();
    updateInventoryCount();
    updateShop();
    updateGuaranteeProtectDisplay();
}

function updateTopBar() {
    document.getElementById('playerName').textContent = GameState.playerName;
    document.getElementById('goldAmount').textContent = GameState.gold.toLocaleString();
    document.getElementById('moneyAmount').textContent = GameState.money.toLocaleString();
}

function updateCurrentSword() {
    const sword = GameState.currentSword;
    const level = sword.enhancement;

    document.getElementById('swordName').textContent = sword.enhancement === 0 ? '낡은 검' : '검';
    document.getElementById('swordLevel').textContent = `${level}강`;
    
    const attributeEl = document.getElementById('swordAttribute');
    if (sword.attribute) {
        attributeEl.textContent = `[${getAttributeName(sword.attribute)}]`;
    } else {
        attributeEl.textContent = '';
    }

    const table = ENHANCEMENT_TABLE[level];
    document.getElementById('enhanceCost').textContent = `${table.cost.toLocaleString()} G`;
    document.getElementById('successRate').textContent = `${table.success}%`;
    document.getElementById('destroyRate').textContent = `${table.destroy}%`;
    document.getElementById('maintainRate').textContent = `${table.maintain}%`;
    document.getElementById('downgradeRate').textContent = `${table.downgrade}%`;

    if (level >= 15) {
        document.getElementById('enhanceBtn').disabled = true;
        document.getElementById('enhanceBtn').textContent = '최대 강화됨';
    } else {
        document.getElementById('enhanceBtn').disabled = GameState.gold < table.cost;
        document.getElementById('enhanceBtn').textContent = '강화하기';
    }

    // 강화 기록 표시
    updateEnhanceLog();
}

function updateEnhanceLog() {
    const logEl = document.getElementById('enhanceLog');
    const history = GameState.enhanceHistory;

    if (history.length === 0) {
        logEl.innerHTML = '<p class="log-empty">강화 기록이 없습니다</p>';
        return;
    }

    logEl.innerHTML = history.map(h => {
        let className = 'log-entry';
        let resultText = '';

        if (h.result === 'success') {
            resultText = `✓ ${h.oldLevel}강 → ${h.newLevel}강 성공`;
        } else if (h.result === 'destroy') {
            className += ' fail';
            resultText = `✗ ${h.oldLevel}강 파괴!`;
        } else if (h.result === 'maintain') {
            className += ' maintain';
            resultText = `- ${h.oldLevel}강 유지`;
        } else if (h.result === 'downgrade') {
            className += ' fail';
            resultText = `↓ ${h.oldLevel}강 → ${h.newLevel}강 하락`;
        }

        return `<div class="${className}">${resultText}</div>`;
    }).join('');
}

function updateGuaranteeProtectDisplay() {
    const sword = GameState.currentSword;
    const nextLevel = sword.enhancement + 1;
    const currentLevel = sword.enhancement;

    const guaranteeCount = GameState.items.guarantee[nextLevel] || 0;
    const protectCount = GameState.items.protect[currentLevel] || 0;

    document.getElementById('guaranteeCount').textContent = guaranteeCount;
    document.getElementById('protectCount').textContent = protectCount;

    document.getElementById('useGuarantee').disabled = guaranteeCount === 0;
    document.getElementById('useProtect').disabled = protectCount === 0;
}

function updateInventoryCount() {
    document.getElementById('moneyForRoulette').textContent = GameState.money;
}

// ============================================
// 인벤토리 UI
// ============================================

function renderInventory() {
    const grid = document.getElementById('inventoryGrid');

    if (GameState.inventory.length === 0) {
        grid.innerHTML = '<p class="empty-message">보관된 검이 없습니다</p>';
        return;
    }

    grid.innerHTML = GameState.inventory.map(sword => `
        <div class="sword-card">
            <div class="sword-card-image">🗡️</div>
            <div class="sword-card-name">검</div>
            <div class="sword-card-level">${sword.enhancement}강</div>
            <div class="sword-card-attribute">${getAttributeName(sword.attribute)}</div>
            <div class="sword-card-actions">
                <button class="btn btn-primary" onclick="equipSword('${sword.id}')">장착</button>
                <button class="btn btn-danger" onclick="confirmSell('inventory', '${sword.id}')">판매</button>
            </div>
        </div>
    `).join('');
}

// ============================================
// 도감 UI
// ============================================

function renderDex() {
    const grid = document.getElementById('dexGrid');
    
    grid.innerHTML = ATTRIBUTES.map(attr => {
        let acquired = 0;
        for (let level = 1; level <= 15; level++) {
            if (GameState.collection[`${attr.id}_${level}`]) {
                acquired++;
            }
        }

        const percentage = Math.min(100, (acquired / 15) * 100);
        
        return `
            <div class="dex-item">
                <div class="dex-attribute">${getAttributeEmoji(attr.id)}</div>
                <div class="dex-name">${attr.name}</div>
                <div class="dex-progress">
                    <div class="dex-progress-bar" style="width: ${percentage}%">
                        ${acquired > 0 ? acquired : ''}
                    </div>
                </div>
                <div class="dex-count">${acquired}/15</div>
            </div>
        `;
    }).join('');

    // 보너스 정보
    const completionInfo = document.getElementById('completionInfo');
    let completed = 0;
    for (const attr of ATTRIBUTES) {
        let acquired = 0;
        for (let level = 1; level <= 15; level++) {
            if (GameState.collection[`${attr.id}_${level}`]) {
                acquired++;
            }
        }
        if (acquired === 15) completed++;
    }

    if (completed > 0) {
        let bonus = '';
        if (completed >= 3) bonus += '<p class="completion-bonus">3개 속성 달성: 강화 성공률 +2%</p>';
        if (completed >= 6) bonus += '<p class="completion-bonus">6개 속성 달성: 강화 성공률 +5%</p>';
        if (completed === 9) bonus += '<p class="completion-bonus">🎉 모든 속성 달성: 강화 성공률 +10%</p>';
        
        completionInfo.innerHTML = `<h3>도감 보너스</h3>${bonus}`;
    } else {
        completionInfo.innerHTML = '<p>속성을 모두 모아 보너스를 얻으세요!</p>';
    }
}

// ============================================
// 상점 UI
// ============================================

function updateShop() {
    const goldShop = document.getElementById('goldShop');
    const moneyShop = document.getElementById('moneyShop');

    // 골드 상품
    let goldHTML = '';
    for (let level = 1; level <= 15; level++) {
        const cost = level * 5000;
        const count = GameState.items.guarantee[level] || 0;
        goldHTML += `
            <div class="shop-item">
                <div class="shop-item-info">
                    <div class="shop-item-name">강화 확정권 ${level}강</div>
                    <div class="shop-item-price">${cost.toLocaleString()} G</div>
                </div>
                <div class="shop-item-actions">
                    <span class="shop-quantity">${count}</span>
                    <button class="btn btn-primary" onclick="buyGuarantee(${level})" ${GameState.gold < cost ? 'disabled' : ''}>구매</button>
                </div>
            </div>
        `;
    }

    for (let level = 1; level <= 10; level++) {
        const cost = 10000;
        const count = GameState.items.protect[level] || 0;
        goldHTML += `
            <div class="shop-item">
                <div class="shop-item-info">
                    <div class="shop-item-name">파괴 방지권 ${level}~${level + 4}강</div>
                    <div class="shop-item-price">${cost.toLocaleString()} G</div>
                </div>
                <div class="shop-item-actions">
                    <span class="shop-quantity">${count}</span>
                    <button class="btn btn-primary" onclick="buyProtect(${level})" ${GameState.gold < cost ? 'disabled' : ''}>구매</button>
                </div>
            </div>
        `;
    }

    goldShop.innerHTML = goldHTML || '<p class="empty-message">상품이 없습니다</p>';

    // 머니 상품 (추후 확장)
    moneyShop.innerHTML = '<p class="empty-message">준비 중인 상품입니다</p>';
}

// ============================================
// 룰렛 결과 표시
// ============================================

function displayRouletteResults(results) {
    const resultsEl = document.getElementById('rouletteResults');
    resultsEl.innerHTML = results.map(r => {
        let text = '';
        if (r.type === 'gold') {
            text = `💰 ${r.value.toLocaleString()} G`;
        } else if (r.type === 'money') {
            text = `💎 ${r.value} 머니`;
        } else if (r.type === 'guarantee') {
            text = '✓ 강화 확정권';
        } else if (r.type === 'protect') {
            text = '🛡️ 파괴 방지권';
        } else {
            text = '꽝';
        }
        return `<div class="result-item">${text}</div>`;
    }).join('');
}

// ============================================
// 알림 시스템
// ============================================

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// 모달 시스템
// ============================================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

function setupModalClose(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeModal(modalId));
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal(modalId);
        }
    });
}

// ============================================
// 탭 전환
// ============================================

function switchTab(tabName) {
    // 버튼 활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        }
    });

    // 컨텐츠 활성화
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    let tabId = '';
    if (tabName === 'enhance') tabId = 'enhanceTab';
    else if (tabName === 'roulette') tabId = 'rouletteTab';
    else if (tabName === 'shop') tabId = 'shopTab';

    const tab = document.getElementById(tabId);
    if (tab) {
        tab.classList.add('active');
    }
}

// ============================================
// 확인 대화상자
// ============================================

let confirmCallback = null;

function showConfirm(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = onConfirm;
    openModal('confirmModal');
}

function confirmSell(location, swordId = null) {
    showConfirm('검 판매', '정말 판매하시겠습니까?', () => {
        sellSword(location, swordId);
        renderInventory();
    });
}

// ============================================
// 이벤트 핸들러 등록
// ============================================

function setupEventListeners() {
    // 탭 버튼
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // 강화 버튼
    document.getElementById('enhanceBtn').addEventListener('click', () => {
        const useGuarantee = document.getElementById('useGuarantee').checked;
        const useProtection = document.getElementById('useProtect').checked;
        
        enhance(useGuarantee, useProtection);
        updateCurrentSword();
        
        document.getElementById('useGuarantee').checked = false;
        document.getElementById('useProtect').checked = false;
    });

    // 보관 버튼
    document.getElementById('storeBtn').addEventListener('click', () => {
        if (GameState.currentSword.enhancement === 0 && !GameState.currentSword.attribute) {
            showNotification('낡은 검을 보관할 수 없습니다!', 'warning');
            return;
        }
        storeSword();
    });

    // 판매 버튼
    document.getElementById('sellBtn').addEventListener('click', () => {
        showConfirm('검 판매', '현재 검을 판매하시겠습니까?', () => {
            sellSword('current');
            updateCurrentSword();
        });
    });

    // 룰렛 스핀
    document.getElementById('spinOnceBtn').addEventListener('click', () => {
        if (GameState.money < 1) {
            showNotification('머니가 부족합니다!', 'error');
            return;
        }
        const results = spinRoulette(1);
        displayRouletteResults(results);
        updateUI();
    });

    document.getElementById('spinTenBtn').addEventListener('click', () => {
        if (GameState.money < 10) {
            showNotification('머니가 부족합니다!', 'error');
            return;
        }
        const results = spinRoulette(10);
        displayRouletteResults(results);
        updateUI();
    });

    // 2x2 그리드
    document.getElementById('dexBtn').addEventListener('click', () => {
        renderDex();
        openModal('dexModal');
    });

    document.getElementById('checkInBtn').addEventListener('click', () => {
        updateCheckInInfo();
        openModal('checkInModal');
    });

    document.getElementById('rankingBtn').addEventListener('click', () => {
        openModal('rankingModal');
    });

    document.getElementById('gmBtn').addEventListener('click', () => {
        openModal('gmModal');
    });

    // 하단 항목
    document.getElementById('inventoryBtn').addEventListener('click', () => {
        renderInventory();
        openModal('inventoryModal');
    });

    document.getElementById('contactBtn').addEventListener('click', () => {
        openModal('contactModal');
    });

    // 출석체크 보상 버튼
    document.getElementById('checkInBtn2').addEventListener('click', () => {
        if (claimCheckIn()) {
            updateCheckInInfo();
        }
    });

    // 문의 폼
    document.getElementById('contactForm').addEventListener('submit', (e) => {
        e.preventDefault();
        showNotification('문의가 접수되었습니다!', 'success');
        closeModal('contactModal');
        document.getElementById('contactForm').reset();
    });

    // 모달 닫기
    ['dexModal', 'checkInModal', 'inventoryModal', 'rankingModal', 'gmModal', 'contactModal', 'confirmModal'].forEach(id => {
        setupModalClose(id);
    });

    // 확인 모달 버튼
    document.getElementById('confirmOk').addEventListener('click', () => {
        if (confirmCallback) {
            confirmCallback();
        }
        closeModal('confirmModal');
    });

    document.getElementById('confirmCancel').addEventListener('click', () => {
        closeModal('confirmModal');
    });
}

// ============================================
// 초기화
// ============================================

function init() {
    loadGame();
    updateUI();
    setupEventListeners();
    renderDex();
    updateShop();
    
    console.log('게임이 초기화되었습니다!');
    console.log('GameState:', GameState);
}

// 게임 시작
document.addEventListener('DOMContentLoaded', init);
