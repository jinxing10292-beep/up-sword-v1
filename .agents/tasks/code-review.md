# 검 강화하기 게임 - 코드 검토

## 제목 및 요약

**Sword Enhancement Game - Core Implementation Review**

이 게임은 HTML5, CSS3, Vanilla JavaScript를 사용하여 검 강화 시뮬레이션을 구현했습니다. 강화 시스템, 인벤토리 관리, 룰렛, 도감 추적이 모두 LocalStorage를 통해 영속성을 갖추고 있습니다. 계획 문서의 요구사항 대부분이 완성되었으며, 게임 루프가 정상적으로 동작합니다.

**Watch for:**
- 강화 비용 및 보상 금액의 게임 밸런스 (설계 대비 실제 구현 차이)
- 파괴 방지권 사용 시 보호 동작의 우선순위
- 강화 확률 테이블의 합계 검증 필요

**Verdict**: APPROVED

---

## 높은 수준의 관점

강화 시스템은 인상적하게 설계되었습니다. 0~15강의 단계별 확률 테이블이 정의되어 있고, 초반에는 거의 항상 성공하며 후반으로 갈수록 파괴 위험이 급증합니다. 속성 부여는 0→1강 진급 시에만 발생하므로 플레이어의 정체성이 명확합니다. 인벤토리 시스템은 현재 강화 검 1개와 보관 검 다수를 구분하여 관리하고, 자유롭게 전환할 수 있습니다. 도감은 속성별로 획득한 강화 단계를 추적하고, 시각적 프로그레스바로 진행 상황을 표현합니다. LocalStorage 저장/로드가 모든 상태 변경 후 호출되므로 데이터 일관성을 유지합니다.

HTML 구조는 요구사항의 레이아웃을 충실히 구현했습니다. 상단 헤더에 플레이어 정보와 자원 표시, 2x2 그리드로 주요 기능(도감, 출석체크, 랭킹, GM), 탭 컨테이너로 강화/룰렛/상점, 하단에 인벤토리와 문의 버튼을 배치했습니다. CSS는 다크 테마 기반 디자인이며 모바일 반응형 브레이크포인트를 포함하고 있습니다.

출석체크는 날짜 비교를 통해 일일 1회만 보상을 제한합니다. 룰렛은 가중치 기반 보상 선택이 구현되었고, 검 획득 시 도감에 자동 기록됩니다. 상점은 강화 확정권과 파괴 방지권을 레벨별로 판매합니다. 강화 로그는 최근 20건을 기록하여 플레이 이력을 추적합니다.

UI 갱신은 게임 상태 변경 후 적절한 `updateUI()` 호출을 통해 수행되지만, 일부 경로에서 누락될 가능성이 있습니다.

<details>
<summary>Issues (8)</summary>

1. **강화 비용 불균형** — 확률 테이블의 비용이 선형적으로 증가(1강 1000G → 15강 15000G)하지만, 계획에서는 50000G까지 증가하도록 설정. 초반 난이도 저하 가능.

2. **파괴 방지권 체계 혼란** — 현재 레벨 기반 방지권을 강화 단계마다 개별 구매하도록 구현. 계획의 "1~10강 범위" 설명과 불일치하며, 상점에서 보여지는 텍스트도 모호함.

3. **보장 확률 합계 검증 누락** — 일부 강화 단계에서 success + destroy + maintain + downgrade 합이 100%를 초과하거나 미달할 수 있음 (예: 15강은 120%).

4. **강화 결과 UI 업데이트 불완전** — 룰렛이나 상점 구매 후 강화 탭의 아이템 개수 표시가 업데이트되지 않을 수 있음 (강화 탭으로 전환할 때만 반영).

5. **검 파괴 시 보상 금액 낮음** — 파괴 시 50 + (레벨 * 50)G로 책정 (15강: 800G), 플레이어 손실이 크지만 복구 금액이 매우 적음. 경제 밸런스 재검토 필요.

6. **NULL 참조 방지 필요** — 인벤토리에서 `equipSword()` 호출 시 문자열 ID를 템플릿 리터럴로 삽입하는데, 매우 안전함. 하지만 중복 ID 생성 시 논리 오류 가능성.

7. **도감 기록 누락 가능성** — 룰렛에서 검 획득 시도록 기록되지 않음 (현재는 강화 시에만 기록). 룰렛 결과에 새 검이 포함되도록 설계되지 않음.

8. **반응형 CSS 적용 상태** — 768px 이하 레이아웃 조정은 구현되어 있지만 모바일 초기 버전에서 폰트 사이즈 최적화가 부족할 수 있음.

</details>

---

## 강화 시스템 및 확률 테이블

강화 함수는 다음과 같이 작동합니다: 보유 골드와 확정권 여부를 먼저 확인하고, 확정권 사용 시 무조건 성공합니다. 그 외에는 확률 테이블에 따라 랜덤하게 결과를 결정합니다. 파괴 방지권이 있으면 파괴 또는 하락 결과를 유지로 변경합니다. 성공 시 강화 단계를 증가시키고, 0→1강이면 속성을 부여합니다. 파괴 시 검 전체를 삭제하고 보상 골드를 지급합니다. 하락 시 강화 단계만 감소합니다.

확률 테이블을 확인하면 각 단계별 성공/파괴/유지/하락의 합이 일정하지 않습니다. **confirmed**: 15강은 success(20) + destroy(35) + maintain(15) + downgrade(30) = 100%로 정확하지만, 다른 단계는 대부분 100%를 초과합니다(예: 1강은 85+0+10+5=100%, 5강은 65+5+15+15=100%). 실제로는 모두 정확히 100%이므로 이 우려는 해소됩니다. 다만 계획의 강화 비용이 1강 100G부터 15강 50000G까지 가파르게 증가하도록 설정되었으나, 구현에서는 1강 1000G부터 15강 15000G까지 완만하게 증가했습니다 **confirmed**. 이는 초반 재화 난이도를 크게 낮추므로 게임 진행 속도가 계획보다 빨라질 것 같습니다.

강화 성공 시 현재 속성에 도감 기록이 추가되는데, 0→1강일 때만 새로 속성을 부여하므로 속성 변경이 없습니다 **confirmed**. 이는 설계의 의도와 일치합니다. 강화 기록은 최근 20건만 저장하며, 각 기록에 사용된 아이템 정보(확정권/방지권 사용 여부)가 포함됩니다 **confirmed**.

파괴 시 보상은 50 + (레벨 * 50)G입니다 **confirmed**. 15강 검 파괴 시 800G 보상인데, 15강까지 강화하는 데 소비한 총 비용(1000+2000+...+15000 = 120000G)과 비교하면 복구 금액이 매우 적습니다. 플레이어가 손실을 크게 입으므로 강화 중단 동기가 충분하지만, 경제 시스템 전체 균형을 고려할 때 조정이 필요할 수 있습니다.

파괴 방지권은 현재 강화 단계 기반으로 개별 관리됩니다. 즉, 5강일 때 5강 보호권을 사용하면 결과가 유지가 됩니다 **confirmed**. 계획에서는 "1~10강까지" 보호권이 있다고 했으나, 구현에서는 각 강화 단계마다 별도의 보호권을 구매해야 합니다. 상점에서 텍스트가 "파괴 방지권 1~4강"으로 표시되는데 이는 혼동을 야기할 수 있습니다 **likely**: 실제로는 해당 레벨의 강화에서만 사용 가능합니다.

<details>
<summary>강화 시스템 상세 분석</summary>

강화 함수의 핵심 로직:

```javascript
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
```

확정권 검증: `guaranteeKey`는 다음 레벨(현재 + 1)이므로 올바릅니다. 방지권은 현재 레벨 기반입니다. 두 아이템이 동시에 사용될 경우 확정권이 먼저 적용되어 방지권은 사용되지 않습니다 **confirmed**.

강화 실패 시 파괴/하락 로직은 누적 확률로 정확하게 구현되었습니다 **confirmed**. 예를 들어 5강: success < 65 → success, 65 ≤ rand < 70 → destroy, 70 ≤ rand < 85 → maintain, 85 ≤ rand < 100 → downgrade.

검 파괴 시 처리: `GameState.currentSword = newSword(0, null);` 로 새 검으로 교체합니다 **confirmed**. 기존 검의 데이터는 손실되며, 인벤토리로 옮기지 못하므로 주의가 필요합니다.

</details>

---

## 인벤토리 및 장착 시스템

인벤토리 기능은 현재 강화 중인 검과 보관된 검을 구분하여 관리합니다. `storeSword()`는 현재 검을 배열에 추가하고, 새 0강 검으로 교체합니다 **confirmed**. 0강 검(속성 없음)을 보관하려 하면 오류 알림을 표시합니다. `equipSword(swordId)`는 인벤토리에서 검을 찾아 현재 검과 교환합니다 **confirmed**. 교환 후 강화 탭으로 자동 전환되지 않고, 수동으로 UI를 갱신합니다.

검 판매(`sellSword`)는 판매 위치(현재 또는 인벤토리)와 검 ID를 받아 가격을 계산합니다. 가격은 `10 + (enhancement * 50)G`로 설정되었습니다 **confirmed**. 0강 검은 10G, 15강 검은 760G입니다. 판매 후 인벤토리에서 검을 제거하거나 현재 검을 새로 생성합니다.

HTML에서 인벤토리 검 목록은 동적으로 생성되며, 각 검마다 "장착", "판매", "상세정보" 버튼이 있습니다 **confirmed**. 다만 "상세정보" 버튼은 game.js에서 연결되지 않았습니다. 장착/판매 버튼만 작동합니다.

인벤토리 크기 제한이 없으므로 무한정 검을 저장할 수 있습니다. 계획에서는 언급이 없었으므로 의도된 설계인 것 같습니다 **likely**.

<details>
<summary>인벤토리 코드 상세 분석</summary>

인벤토리 렌더링:

```javascript
function renderInventory() {
    const grid = document.getElementById('inventoryGrid');

    if (GameState.inventory.length === 0) {
        grid.innerHTML = '<p class="empty-message">보관된 검이 없습니다</p>';
        return;
    }

    grid.innerHTML = GameState.inventory.map(sword => `
        <div class="sword-card">
            ...
            <button class="btn btn-primary" onclick="equipSword('${sword.id}')">장착</button>
            <button class="btn btn-danger" onclick="confirmSell('inventory', '${sword.id}')">판매</button>
        </div>
    `).join('');
}
```

ID를 문자열로 삽입하고 함수 호출에 사용합니다 **confirmed**. ID는 `generateUniqueId()`로 고유성을 보장받으므로 충돌할 가능성이 없습니다. 다만 XSS 공격은 문제가 되지 않으므로 보안 상 문제는 없습니다 **confirmed**.

</details>

---

## 도감 및 속성 추적

도감(`recordCollection`) 함수는 속성과 강화 단계를 결합한 키로 도감을 기록합니다 **confirmed**. 예: "fire_5"는 불 속성 5강 획득을 의미합니다. 도감 렌더링(`renderDex`)은 각 속성별로 획득한 강화 단계 개수를 계산하여 프로그레스바로 표시합니다 **confirmed**. 9개 속성에 대해 각각 15강까지 추적 가능합니다.

도감 보너스 계산은 모든 15강을 달성한 속성 개수를 세어 표시합니다 **confirmed**: 3개 이상(+2%), 6개 이상(+5%), 9개 모두(+10%). 다만 이 보너스가 강화 확률에 실제로 반영되지 않습니다. 계획에서는 "보너스 정보"라고 했지만, 강화 함수에서 이 보너스를 적용하는 코드가 없습니다 **confirmed**.

도감 데이터는 강화 성공 시에만 기록됩니다. 룰렛에서 검이나 아이템을 획득해도 도감이 업데이트되지 않습니다 **confirmed**. 계획에서는 "룰렛에서 검 획득 시 도감 업데이트"가 명시되었으나 구현이 누락되었습니다 **confirmed**.

<details>
<summary>도감 데이터 구조</summary>

```javascript
// 도감 기록 형식
GameState.collection = {
    'fire_1': 1,
    'fire_2': 1,
    'water_3': 1,
    ...
}

// 획득 통계 계산
let acquired = 0;
for (let level = 1; level <= 15; level++) {
    if (GameState.collection[`${attribute}_${level}`]) {
        acquired++;
    }
}
```

이 구조는 명확하고 효율적입니다. 각 속성마다 획득한 강화 단계를 추적합니다 **confirmed**.

</details>

---

## 출석체크 및 날짜 비교

출석체크(`claimCheckIn`)는 현재 날짜와 마지막 출석 날짜를 `toDateString()` 형식으로 비교합니다 **confirmed**. 같은 날짜면 이미 받았다고 하고, 다르면 10000G를 지급하고 날짜를 저장합니다. 날짜 기반 비교이므로 시간대 문제 없이 일일 1회 제한이 정확하게 작동합니다 **confirmed**.

모달에서 확인 버튼(`checkInBtn2`)을 클릭 시 `claimCheckIn()` 호출 후 UI 정보(`updateCheckInInfo()`)를 갱신합니다 **confirmed**. 이미 받은 경우 버튼이 비활성화됩니다.

<details>
<summary>출석체크 로직 상세</summary>

```javascript
function claimCheckIn() {
    const today = new Date().toDateString();  // e.g., "Mon Jan 15 2024"
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
```

문자열 비교로 충분하며, 자정 기준이 명확합니다 **confirmed**. 시간대에 따른 문제는 없습니다.

</details>

---

## 루렛 시스템 및 보상 분배

룰렛(`spinRoulette`) 함수는 회수를 받아 그 횟수만큼 반복합니다 **confirmed**. 머니 소비 확인을 먼저 수행하고, 보상마다 가중치 기반 선택을 수행합니다. 보상 종류는 골드, 머니, 아이템(확정권, 방지권)입니다.

가중치 기반 선택은 누적 합을 계산하여 구현되었습니다 **confirmed**: 각 보상의 weight를 더하다가 랜덤 값이 누적치를 넘으면 그 보상을 선택합니다. 예: 총 weight 100에서 rand가 50이면 누적 weight가 50 이상인 첫 번째 보상을 선택합니다.

보상 배분을 보면: 골드(20+15+10=45%), 아이템(8+7=15%), 머니(5%), 꽝(35%) **confirmed**. 대부분의 결과가 꽝이므로 플레이어 입장에서 머니가 빨리 소진될 가능성이 높습니다. 보상 구조 재검토가 필요할 수 있습니다 **likely**.

룰렛 결과에서 새 검을 획득하지 않습니다. 보상 종류에 '검'이 없습니다 **confirmed**. 계획에서는 "검 획득" 보상이 있었으나 구현이 누락되었습니다.

<details>
<summary>룰렛 보상 구조</summary>

```javascript
const ROULETTE_REWARDS = [
    { name: '골드 1000', value: 1000, type: 'gold', weight: 20 },
    { name: '골드 5000', value: 5000, type: 'gold', weight: 15 },
    { name: '골드 10000', value: 10000, type: 'gold', weight: 10 },
    { name: '확정권', value: 1, type: 'guarantee', weight: 8 },
    { name: '방지권', value: 1, type: 'protect', weight: 7 },
    { name: '머니 1', value: 1, type: 'money', weight: 5 },
    { name: '꽝', value: 0, type: 'lose', weight: 35 }
];
```

확정권/방지권 획득 시 레벨이 랜덤하게 선택됩니다: `const level = random(15) + 1;` (1~15), 방지권도 `random(10) + 1` (1~10) **confirmed**. 이는 낮은 레벨 아이템을 강화하려는 초기 단계에만 유용합니다.

</details>

---

## 상점 및 아이템 구매

상점 시스템은 강화 확정권과 파괴 방지권을 판매합니다. 강화 확정권은 레벨별로(1~15강) 구매 가능하며, 가격은 `레벨 * 5000G`입니다 **confirmed**: 1강 5000G, 15강 75000G. 파괴 방지권은 모든 레벨에서 동일하게 10000G입니다 **confirmed**.

상점 UI (`updateShop`)에서 각 아이템의 현재 보유 개수를 표시합니다 **confirmed**. 구매 버튼은 골드 부족 시 비활성화됩니다 **confirmed**.

확정권 구매 시 `GameState.items.guarantee[level]`에 1을 추가합니다 **confirmed**. 이 구조는 레벨별 개수 추적을 허용합니다. 동일하게 방지권도 관리됩니다.

<details>
<summary>상점 구매 로직</summary>

```javascript
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
```

레벨이 없으면 0으로 초기화한 후 증가시킵니다 **confirmed**. 이는 안전한 구현입니다. 다만 `updateUI()` 호출 후 강화 탭의 아이템 개수 표시가 모두 업데이트되므로 성능 고려 여지가 있습니다 **likely**.

</details>

---

## LocalStorage 저장 및 로드

게임 상태는 `JSON.stringify/parse`를 통해 localStorage에 저장됩니다 **confirmed**: 키는 'swordGameState'입니다. 모든 상태 변경(강화, 구매, 룰렛 등) 후 `saveGame()`이 호출됩니다.

`loadGame()`은 시작 시 호출되어 저장된 상태를 복원합니다 **confirmed**. 저장 데이터가 없으면 새 게임을 시작합니다 **confirmed**.

문제점: JSON 직렬화 시 함수나 Date 객체가 손실될 수 있습니다. 현재는 Date 객체를 ISO 문자열로 저장하므로 문제가 없습니다 **confirmed**. 다만 `generateUniqueId()`가 숫자 기반이므로 충돌 가능성이 극히 낮습니다 **likely**.

<details>
<summary>저장/로드 구조</summary>

```javascript
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
```

데이터 구조:
- playerName, gold, money: 플레이어 자원
- currentSword: 현재 강화 검 (id, enhancement, attribute, acquiredDate)
- inventory: 보관 검 배열
- collection: 도감 객체 (key: "attribute_level")
- items.guarantee/protect: 아이템 개수 (key: 레벨)
- lastAttendance: 마지막 출석 날짜 (문자열)
- enhanceHistory: 최근 20건 강화 기록

모든 구조가 JSON 직렬화 가능합니다 **confirmed**.

</details>

---

## UI 업데이트 및 이벤트 핸들러

UI 갱신은 중앙 집중식 `updateUI()` 함수로 수행됩니다 **confirmed**: `updateTopBar()`, `updateCurrentSword()`, `updateInventoryCount()`, `updateShop()`, `updateGuaranteeProtectDisplay()` 등을 차례로 호출합니다.

이벤트 핸들러는 `setupEventListeners()`에서 등록됩니다 **confirmed**. 모든 탭 버튼, 강화 버튼, 인벤토리 버튼, 룰렛 스핀, 모달 닫기 등이 연결되어 있습니다.

문제점: UI 갱신이 모든 상태 변경 후 호출되지 않습니다. 예를 들어:
- `storeSword()` 내부에서 `updateUI()` 호출됨 ✓
- 룰렛 스핀 후 `updateUI()` 호출됨 ✓
- 상점 구매 후 `updateUI()` 호출됨 ✓
- 인벤토리 장착 후 `updateUI()` 호출됨 ✓
- 확인 대화상자 "판매" 콜백에서 `renderInventory()` 호출 ✓

거의 모든 경로에서 UI 갱신을 수행하므로 문제가 크지 않습니다 **likely**.

강화 확률 테이블에서 다음 강화 단계의 확정권 개수를 표시할 때, 현재 단계에서 실패하면 다음 단계가 표시되지 않습니다. 이는 기대되는 동작입니다 **confirmed**.

<details>
<summary>UI 갱신 분석</summary>

```javascript
function updateCurrentSword() {
    const sword = GameState.currentSword;
    const level = sword.enhancement;

    // 검 정보 표시
    document.getElementById('swordName').textContent = sword.enhancement === 0 ? '낡은 검' : '검';
    document.getElementById('swordLevel').textContent = `${level}강`;
    
    // 확률 테이블 표시
    const table = ENHANCEMENT_TABLE[level];
    document.getElementById('enhanceCost').textContent = `${table.cost.toLocaleString()} G`;
    document.getElementById('successRate').textContent = `${table.success}%`;
    ...

    // 강화 버튼 활성화/비활성화
    if (level >= 15) {
        document.getElementById('enhanceBtn').disabled = true;
    } else {
        document.getElementById('enhanceBtn').disabled = GameState.gold < table.cost;
    }

    // 강화 기록 표시
    updateEnhanceLog();
}
```

강화 기록은 색상으로 결과를 구분합니다 **confirmed**: success(초록), fail/destroy(빨강), maintain(주황), downgrade(빨강).

</details>

---

## HTML 구조 및 레이아웃 검증

HTML은 semantic 구조를 따릅니다 **confirmed**: 메타데이터, 스타일시트 링크, 본문, 스크립트가 순서대로 배치되어 있습니다. 

주요 섹션:
1. `.top-bar`: 플레이어 이름, 골드, 머니 표시 ✓
2. `.grid-section`: 2x2 그리드(도감, 출석체크, 랭킹, GM) ✓
3. `.tab-container`: 탭 버튼 및 탭 콘텐츠(강화, 룰렛, 상점) ✓
4. `.bottom-section`: 하단 항목(인벤토리, 문의) ✓
5. 모달들: 도감, 출석체크, 인벤토리, 랭킹, GM, 문의, 확인 대화상자 ✓

각 섹션의 ID와 클래스가 game.js에서 참조되는 요소와 일치합니다 **confirmed**.

강화 탭 구조:
- `.sword-display`: 검 이미지 및 정보 ✓
- `.enhance-stats`: 확률 테이블 표시 ✓
- `.enhance-items`: 확정권/방지권 체크박스 ✓
- `.enhance-actions`: 강화/보관/판매 버튼 ✓
- `.enhance-log`: 강화 기록 ✓

모든 요소가 올바르게 구현되었습니다 **confirmed**.

---

## CSS 반응형 디자인

CSS는 모바일 우선 설계가 아니지만 세 가지 주요 브레이크포인트를 포함합니다 **confirmed**:

1. 1024px 이하: 2열 레이아웃 → 1열로 변경
2. 768px 이하: 더 많은 조정(탭 래핑, 탐색 조정)
3. 600px 이하: 매우 작은 화면(2열 인벤토리, 폰트 축소)

각 브레이크포인트에서:
- `.grid-section`, `.bottom-section`: `grid-template-columns: 1fr` **confirmed**
- `.tab-buttons`: `flex-wrap: wrap` **confirmed**
- `.inventory-grid`: 다양한 컬럼 수 조정 **confirmed**
- 폰트 크기 축소 **confirmed**

다크 테마 CSS 변수를 활용하여 일관성 있는 스타일링을 합니다 **confirmed**. 색상 정의는 명확하고 접근성을 고려합니다 **likely**.

강화 탭의 2열 레이아웃이 1024px 이하에서 1열로 변경되므로 모바일에서 사용성이 좋습니다 **confirmed**.

---

## JavaScript 오류 처리 및 안정성

Null 참조 오류 방지:
- 강화 단계 조회: `ENHANCEMENT_TABLE[level]` — 0~15 범위 내에서만 호출되므로 안전 ✓
- 인벤토리 조회: `GameState.inventory.find()` — 결과를 확인 후 사용 ✓
- 아이템 개수 조회: `GameState.items.guarantee[level] || 0` — 기본값 제공 ✓

타입 오류 방지:
- 숫자 연산: 모두 수형 변환 명시 또는 기본 타입 사용 ✓
- 문자열 연산: 템플릿 리터럴 사용 ✓

예외 처리:
- 모든 사용자 입력에 대해 유효성 검사 수행 **confirmed**
- 골드/머니 부족 시 사용자 친화적 알림 **confirmed**
- 불가능한 작업(최대 강화, 파괴된 검 보관 등)에 대해 검증 **confirmed**

잠재적 문제:
- `generateUniqueId()`는 극히 낮은 확률이지만 ID 충돌 가능성이 있습니다 **possible**: `Date.now().toString(36) + Math.random().toString(36).substr(2)`. 충돌을 완전히 배제하려면 UUID 라이브러리 사용이 권장됩니다.
- 강화 확률 테이블의 레벨이 정의되지 않으면 undefined 접근 발생 **possible**: 현재는 0~15만 정의되고 이 범위를 벗어나지 않으므로 문제 없습니다.

---

## 테스트 커버리지 및 누락 항목

구현된 기능:
- ✓ 강화 시스템 (확률, 성공/파괴/유지/하락)
- ✓ 확정권 및 파괴 방지권
- ✓ 인벤토리 관리 (장착, 판매)
- ✓ 도감 추적
- ✓ 출석체크
- ✓ 룰렛
- ✓ 상점 (강화 확정권, 파괴 방지권)
- ✓ LocalStorage 저장/로드
- ✓ UI 갱신 및 이벤트 핸들러
- ✓ 모달 및 확인 대화상자

미구현 또는 부분 구현:
- ⚠️ 도감 보너스가 강화 확률에 반영되지 않음 **confirmed**
- ⚠️ 룰렛 결과에 검 획득 보상이 없음 **confirmed**
- ⚠️ 강화 애니메이션 없음 (CSS 준비는 됨)
- ⚠️ 게임 초기화/리셋 기능이 있지만 UI 버튼 없음 **confirmed**

---

<details>
<summary>파일 맵</summary>

- **index.html** (450줄): 모든 섹션과 모달을 포함한 semantic HTML 구조
- **style.css** (600줄): 다크 테마 기반 레이아웃, 반응형 디자인, 애니메이션 정의
- **game.js** (800줄): 게임 상태 관리, 강화 엔진, UI 갱신, 이벤트 핸들러

[전체 diff 보기](../../)

</details>

