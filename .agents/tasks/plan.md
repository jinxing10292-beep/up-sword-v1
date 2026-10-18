# 검 강화하기 게임 구현 계획

## 프로젝트 개요
HTML5, CSS3, Vanilla JavaScript를 사용한 브라우저 기반 검 강화 게임. LocalStorage를 사용하여 게임 데이터를 저장하고, 향후 Supabase를 통한 DB 연동 예정.

---

## 1단계: 데이터 모델 설계 (game.js)

### 1.1 게임 상태 관리 구조
게임 전체 상태를 하나의 글로벌 객체로 관리. 이는 저장/로드 시 LocalStorage와 직접 연동됨.

**주요 구조:**
```javascript
GameState = {
  player: {
    name: "Player",
    gold: 100000,
    money: 10
  },
  currentSword: {
    id: 0,
    enhancement: 0,
    attribute: null // 'fire', 'water', 'dark', 'poison', 'ice', 'heaven', 'evil', 'mech', 'grass'
  },
  inventory: [
    { id, enhancement, attribute, acquiredDate }
  ],
  swordDex: [
    { attribute, count, firstAcquired }
  ],
  lastCheckIn: null, // timestamp
  shop: {
    // 상점 구매 기록
  },
  totalGamesPlayed: 0
}
```

**파일:** game.js (DataModel 클래스)
**검증:** 구조 정의만으로 나중 단계에서 함수 구현 시 검증

---

## 2단계: 강화 시스템 핵심 (game.js)

### 2.1 강화 확률 테이블 정의
각 강화 단계별 성공/파괴/유지/하락 확률을 정의. 게임 밸런스의 핵심.

**구조:**
```javascript
ENHANCEMENT_TABLE = {
  1: { success: 85, destroy: 0, maintain: 10, downgrade: 5, cost: 100 },
  2: { success: 80, destroy: 0, maintain: 15, downgrade: 5, cost: 200 },
  // ... 15강까지
  15: { success: 30, destroy: 20, maintain: 20, downgrade: 30, cost: 50000 }
}
```

- **success**: 강화 성공 확률 (%)
- **destroy**: 검 파괴 확률 (%)
- **maintain**: 강화 단계 유지 확률 (%)
- **downgrade**: 강화 단계 하락 확률 (%)
- **cost**: 필요 골드

설계 원칙:
- 초반(1-5강): 높은 성공률(80-85%), 파괴 위험 없음
- 중반(6-10강): 중간 성공률(60-75%), 낮은 파괴율(5-10%)
- 후반(11-15강): 낮은 성공률(30-50%), 높은 파괴율(15-30%)

**파일:** game.js (상수 정의)
**검증:** 배열 구조 일관성, 확률 합 검증(나중 테스트 단계)

---

## 3단계: 강화 엔진 (game.js)

### 3.1 enhance() 함수
강화 시도 시 호출. 확률에 따라 성공/파괴/유지/하락 결정.

**입력:**
- currentSword (검 객체)
- useGuarantee (확정권 사용 여부)
- useProtection (파괴 방지권 사용 여부)

**출력:**
```javascript
{
  result: 'success' | 'destroy' | 'maintain' | 'downgrade',
  oldEnhancement: number,
  newEnhancement: number,
  goldUsed: number,
  itemsUsed: { guarantee: boolean, protection: boolean }
}
```

**로직:**
1. 확정권 사용 시 무조건 성공
2. 실패(파괴/하락) 시 파괴 방지권 있으면 유지로 변경
3. 성공 시 속성 부여 (0강→1강일 때만 9개 속성 중 랜덤)
4. 파괴 시 검 삭제, 보상 골드 지급
5. 하락 시 강화 단계만 감소

**파일:** game.js (EnhancementEngine 클래스)
**검증:** 단위 테스트 (확률 분포, 아이템 효과 확인)

---

## 4단계: 인벤토리 시스템 (game.js)

### 4.1 인벤토리 관리
강화 탭의 검과 보관된 검 간 전환.

**주요 함수:**
- `storeCurrentSword()`: 현재 검을 인벤토리로 이동
- `equipSword(inventoryId)`: 인벤토리의 검을 현재 강화 검으로 설정
- `sellSword(swordId, location)`: 검 판매 (현재 또는 인벤토리)
- `getSwordValue(enhancement)`: 강화 단계별 판매 가격 계산

**판매 가격 공식:**
```
basePrice = 10 (0강)
pricePerEnhancement = 50
totalPrice = basePrice + (enhancement * pricePerEnhancement)
```

**파일:** game.js (InventoryManager 클래스)
**검증:** 현재 검과 인벤토리 검의 전환 동작 확인

---

## 5단계: 도감 시스템 (game.js)

### 5.1 도감 데이터 관리
획득한 검의 속성별 통계.

**주요 함수:**
- `recordSwordAcquisition(attribute)`: 검 획득 기록
- `getDexCompletion()`: 속성별 획득 통계
- `getCompletionBonus()`: 특정 속성 달성 시 확률 보너스 계산

**보너스 로직 (예시):**
- 3개 속성 달성: 강화 성공률 +2%
- 6개 속성 달성: 강화 성공률 +5%
- 9개 속성 달성: 강화 성공률 +10%

**파일:** game.js (SwordDexManager 클래스)
**검증:** 도감 기록 추가/조회 동작 확인

---

## 6단계: 출석체크 (game.js)

### 6.1 출석체크 로직
매일 1만 골드 지급.

**주요 함수:**
- `claimCheckIn()`: 출석체크 시도
  - 마지막 출석체크 날짜와 오늘 날짜 비교
  - 같은 날이 아니면 1만 골드 지급 및 날짜 저장
  - 최대 1일 1회만 가능

**파일:** game.js (CheckInManager 클래스)
**검증:** 날짜 변경에 따른 중복 지급 방지 확인

---

## 7단계: 상점 시스템 (game.js)

### 7.1 상점 아이템 정의
```javascript
SHOP_ITEMS = {
  guarantee: {
    1: { cost: 500, currency: 'gold', level: 1 },
    // ... 15강까지
    15: { cost: 50000, currency: 'gold', level: 15 }
  },
  protection: {
    1: { cost: 300, currency: 'gold', level: 1 },
    // ... 10강까지
    10: { cost: 30000, currency: 'gold', level: 10 }
  },
  premiumItems: {
    // 머니로만 구매 가능
  }
}
```

### 7.2 구매 함수
- `buyGuarantee(level)`: 강화 확정권 구매
- `buyProtection(level)`: 파괴 방지권 구매
- `buyPremium(itemId)`: 프리미엄 아이템 구매

**파일:** game.js (ShopManager 클래스)
**검증:** 재화 차감 및 아이템 추가 확인

---

## 8단계: 룰렛 시스템 (game.js)

### 8.1 룰렛 보상 테이블
```javascript
ROULETTE_REWARDS = [
  { name: 'gold_1000', value: 1000, type: 'gold', weight: 30 },
  { name: 'gold_5000', value: 5000, type: 'gold', weight: 20 },
  { name: 'sword_common', value: newSword(), type: 'sword', weight: 30 },
  { name: 'money_1', value: 1, type: 'money', weight: 10 },
  { name: 'guarantee_5', itemId: 'guarantee_5', weight: 5 },
  { name: 'lose', value: 0, type: 'none', weight: 5 }
]
```

### 8.2 룰렛 스핀 함수
- `spinRoulette(spins)`: N회 스핀 (1회 비용: 1 머니)
  - 가중치 기반 랜덤 보상 선택
  - 검 획득 시 도감 업데이트
  - 결과 반환

**파일:** game.js (RouletteManager 클래스)
**검증:** 가중치 분포 테스트, 보상 지급 확인

---

## 9단계: 저장/로드 시스템 (game.js)

### 9.1 LocalStorage 연동
- `saveGame()`: 전체 GameState를 JSON으로 변환하여 저장
- `loadGame()`: LocalStorage에서 GameState 로드
- `resetGame()`: 게임 초기화
- `exportGame()`: 게임 데이터 백업용 JSON 내보내기

**저장 키:** `swordGameState`

**파일:** game.js (SaveManager 클래스)
**검증:** 저장/로드 후 데이터 일관성 확인

---

## 10단계: UI 상태 업데이트 (game.js)

### 10.1 UI 갱신 함수
게임 상태 변화 시 DOM 업데이트.

**주요 함수:**
- `updateTopBar()`: 유저명, 골드, 머니 표시
- `updateCurrentSword()`: 현재 강화 중인 검 정보 업데이트
- `updateInventory()`: 인벤토리 UI 갱신
- `updateDex()`: 도감 UI 갱신
- `showNotification(message, type)`: 토스트 메시지

**파일:** game.js (UIManager 클래스)
**검증:** 상태 변경 후 UI 동기화 확인

---

## 11단계: HTML 구조 (index.html)

### 11.1 레이아웃 구조
```
[상단 박스] - 유저명, 골드, 머니
[2x2 그리드] - 도감, 출석체크, 랭킹, GM
[탭 컨테이너]
  - 강화 탭 (왼쪽)
  - 룰렛 탭 (오른쪽)
[하단 박스] - 인벤토리, 문의
[모달/팝업] - 상점, 상세 정보 등
```

### 11.2 주요 요소 ID
- `#top-bar`: 유저정보 (gold, money 표시)
- `#grid-section`: 2x2 그리드 (dex, checkin, ranking, gm)
- `#tabs`: 탭 컨테이너 (강화/룰렛)
- `#enhance-tab`: 강화 페이지
- `#roulette-tab`: 룰렛 페이지
- `#inventory-section`: 인벤토리
- `#notification-container`: 토스트 메시지

### 11.3 각 섹션 상세 HTML
**강화 탭:**
- 검 이미지 (attribute별 다른 이미지 또는 색상)
- 현재 강화 단계 표시
- 강화 비용, 성공 확률, 파괴 확률 표시
- "강화하기" 버튼
- "보관하기" 버튼
- "판매하기" 버튼
- 보유 아이템 (확정권, 방지권) 개수 표시

**룰렛 탭:**
- 룰렛 휠 시각화 (CSS 회전 애니메이션)
- 스핀 버튼 (1회, 10회)
- 보상 결과 표시
- 룰렛 비용 안내 (1 머니/회)

**인벤토리:**
- 보관된 검 목록 (그리드 형태, 5개 열)
- 각 검: 이미지, 강화 단계, 속성, 장착 버튼, 판매 버튼

**도감:**
- 속성별 획득 현황 (프로그레스 바)
- 도감 채우기 보너스 정보

**파일:** index.html
**검증:** 브라우저에서 열어 구조 확인

---

## 12단계: CSS 스타일 (style.css)

### 12.1 레이아웃 CSS
- Flexbox 기반 반응형 설계
- 모바일 화면에서 스택 형 레이아웃 (768px 이하)

### 12.2 주요 스타일 클래스
- `.container`: 최대 너비 제한, 중앙 정렬
- `.box`: 테두리, 패딩, 그림자
- `.grid-2x2`: CSS Grid (2x2)
- `.tab-content`: 탭 숨기기/보이기
- `.sword-card`: 검 카드 (이미지, 정보)
- `.button`: 기본 버튼 스타일
- `.button-primary`: 강조 버튼
- `.button-danger`: 삭제/위험 액션
- `.notification`: 토스트 메시지 애니메이션

### 12.3 검 속성별 색상 테마
```css
.attribute-fire { --accent-color: #ff4444; }
.attribute-water { --accent-color: #4444ff; }
.attribute-dark { --accent-color: #332244; }
.attribute-poison { --accent-color: #44ff44; }
.attribute-ice { --accent-color: #44ffff; }
.attribute-heaven { --accent-color: #ffff44; }
.attribute-evil { --accent-color: #aa0000; }
.attribute-mech { --accent-color: #888888; }
.attribute-grass { --accent-color: #228822; }
```

### 12.4 반응형 디자인
- 모바일(< 600px): 1열 레이아웃
- 태블릿(600px - 1000px): 2열 레이아웃
- 데스크톱(> 1000px): 기본 3-4열 레이아웃

**파일:** style.css
**검증:** Chrome DevTools 반응형 보기에서 각 화면 크기 확인

---

## 13단계: 강화 페이지 상호작용 (game.js)

### 13.1 강화 버튼 클릭 핸들러
```
1. 재화 확인 (골드 충분한가?)
2. 선택 팝업 표시 (확정권/방지권 사용?)
3. enhance() 함수 호출
4. 결과 애니메이션 표시
5. GameState 업데이트
6. saveGame() 호출
7. updateCurrentSword() 호출
8. showNotification() 호출
```

### 13.2 강화 결과 UI
- **성공:** 단계 증가 애니메이션, 초록색 배경, 사운드 (선택사항)
- **파괴:** 검 파괴 애니메이션, 빨간색 배경, 보상 골드 표시
- **유지:** 회색 배경, "유지됨" 메시지
- **하락:** 주황색 배경, 단계 감소 표시

**파일:** game.js + style.css
**검증:** 각 결과 유형별 UI 동작 확인

---

## 14단계: 룰렛 페이지 상호작용 (game.js)

### 14.1 룰렛 스핀 애니메이션
- CSS `@keyframes` 사용하여 휠 회전 애니메이션
- 회전 후 특정 섹터에 멈추기
- 보상 결과 팝업 표시

### 14.2 스핀 버튼 핸들러
```
1. 머니 확인
2. 스핀 횟수 입력 (1 또는 10)
3. spinRoulette() 호출
4. 결과 배열 반환
5. 각 결과마다 애니메이션 표시 (딜레이)
6. 도감 업데이트
7. saveGame() 호출
```

**파일:** game.js + style.css
**검증:** 룰렛 회전 애니메이션 및 보상 지급 확인

---

## 15단계: 인벤토리 페이지 상호작용 (game.js)

### 15.1 인벤토리 렌더링
- 보관된 검 목록 표시
- 각 검마다 "장착", "판매", "상세정보" 버튼

### 15.2 장착 버튼
```
1. equipSword(inventoryId) 호출
2. 현재 검을 인벤토리로 이동
3. 선택한 검을 현재 강화 검으로 설정
4. GameState 업데이트
5. saveGame() 호출
6. 현재 강화 탭으로 자동 전환
7. updateCurrentSword() 호출
```

### 15.3 판매 버튼
```
1. 확인 팝업 표시
2. sellSword() 호출
3. 골드 지급
4. GameState 업데이트
5. saveGame() 호출
6. updateInventory() 호출
```

**파일:** game.js + style.css
**검증:** 장착/판매 기능 동작 확인

---

## 16단계: 상점 페이지 상호작용 (game.js)

### 16.1 상점 UI 구성
- 골드 상품: 강화 확정권(1-15강), 파괴 방지권(1-10강)
- 머니 상품: (추가 아이템 구성 대기)
- 탭으로 골드/머니 상품 분리

### 16.2 구매 버튼 핸들러
```
1. 재화 확인
2. 구매 확인 팝업
3. buyGuarantee() 또는 buyProtection() 호출
4. 아이템 추가
5. 재화 차감
6. GameState 업데이트
7. saveGame() 호출
8. showNotification() 호출
```

**파일:** game.js + style.css
**검증:** 구매 기능 및 재화 차감 확인

---

## 17단계: 도감 페이지 (game.js)

### 17.1 도감 UI 표시
- 9개 속성 각각에 대해:
  - 속성 아이콘/색상
  - 획득 개수 표시
  - 프로그레스 바 (목표: 10개 획득)
  - 보너스 정보

### 17.2 도감 데이터 갱신
- 강화 또는 룰렛에서 검 획득 시 자동 업데이트
- 도감 완성도 계산

**파일:** game.js + style.css
**검증:** 새 검 획득 후 도감 업데이트 확인

---

## 18단계: 출석체크 페이지 (game.js)

### 18.1 출석체크 UI
- 큰 버튼 ("오늘의 보상 받기")
- 마지막 출석 날짜 표시
- 다음 출석까지 남은 시간 표시 (선택사항)
- 보상 금액 (10,000 G)

### 18.2 버튼 클릭 핸들러
```
1. claimCheckIn() 호출
2. 성공 시:
   - 골드 추가
   - GameState 업데이트
   - saveGame() 호출
   - showNotification("1만 골드를 받았습니다!")
   - 버튼 비활성화
3. 실패 시:
   - showNotification("이미 오늘 보상을 받았습니다")
```

**파일:** game.js + style.css
**검증:** 출석체크 중복 방지 및 골드 지급 확인

---

## 19단계: 랭킹/GM 페이지 (HTML/CSS만)

### 19.1 랭킹 페이지
- UI만 구현 (DB 연동 예정)
- 플레이스홀더 데이터 표시:
  - 순위, 유저명, 최고 강화 레벨, 달성 시간

### 19.2 GM 페이지
- UI만 구현 (DB 연동 예정)
- 입력 필드:
  - 유저 ID 검색
  - 계정 상태 선택 (활성/정지)
  - 재화 변경 입력
  - 검 지급 입력
- 버튼: "적용하기" (비활성 상태)

**파일:** index.html + style.css
**검증:** 페이지 로드 확인 (기능은 나중 DB 연동)

---

## 20단계: 문의 페이지 (HTML/CSS만)

### 20.1 문의 페이지
- UI만 구현 (DB 연동 예정)
- 문의 폼:
  - 제목 입력
  - 내용 입력
  - 카테고리 선택 (버그, 피드백, 기타)
- 제출 버튼 (토스트 메시지: "문의가 접수되었습니다")

**파일:** index.html + style.css
**검증:** 페이지 로드 및 폼 표시 확인

---

## 21단계: 초기화 및 게임 시작 (game.js)

### 21.1 게임 초기화 함수 init()
```javascript
1. 저장된 게임 로드 (있으면)
2. 없으면 새 게임 시작
3. 모든 UI 업데이트 함수 호출
4. 이벤트 리스너 등록:
   - 강화 버튼
   - 룰렛 스핀
   - 탭 전환
   - 인벤토리 버튼들
   - 상점 구매 버튼
   - 출석체크 버튼
5. 금리 교환 이벤트 설정 (골드 10만 → 머니 1)
```

**파일:** game.js (init 함수)
**검증:** 게임 로드 후 모든 UI 표시 확인

---

## 22단계: 기본 검 생성 함수 (game.js)

### 22.1 newSword() 함수
```javascript
newSword(enhancement = 0, attribute = null) {
  if (enhancement === 0) {
    attribute = null; // 0강은 속성 없음
  } else if (!attribute) {
    // 1강 이상에서 속성 없으면 랜덤 부여
    const attributes = ['fire', 'water', 'dark', 'poison', 'ice', 'heaven', 'evil', 'mech', 'grass'];
    attribute = attributes[Math.floor(Math.random() * attributes.length)];
  }
  
  return {
    id: generateUniqueId(),
    enhancement,
    attribute,
    acquiredDate: new Date().toISOString()
  };
}
```

**파일:** game.js
**검증:** 생성된 검 객체 구조 확인

---

## 23단계: 골드-머니 교환 (game.js)

### 23.1 교환 함수
```javascript
exchangeGoldToMoney(amount = 100000) {
  if (GameState.player.gold < amount) {
    showNotification("골드가 부족합니다");
    return false;
  }
  
  GameState.player.gold -= amount;
  GameState.player.money += 1;
  saveGame();
  updateTopBar();
  showNotification("10만 골드를 1 머니로 교환했습니다");
  return true;
}
```

**파일:** game.js (PlayerManager 클래스)
**검증:** 교환 기능 동작 확인

---

## 24단계: 전체 통합 테스트 (모든 파일)

### 24.1 기본 게임 플로우
1. 게임 로드
2. 현재 검 강화 시도 (성공/실패 케이스 모두 테스트)
3. 검 보관
4. 인벤토리에서 다른 검 장착
5. 룰렛 스핀
6. 상점에서 아이템 구매
7. 출석체크 수령
8. 도감 확인
9. 페이지 새로고침 후 데이터 로드 확인

### 24.2 엣지 케이스
- 골드/머니 부족 시 동작
- 인벤토리 가득 찰 때 동작 (필요하면 제한 추가)
- 속성 보너스 계산 확인
- 파괴 방지권 사용 시 검 유지 확인

**파일:** 모든 파일
**검증:** 브라우저 콘솔에 에러 없이 모든 기능 동작 확인

---

## 설계 결정 사항

### 1. 데이터 저장 방식
**결정:** LocalStorage JSON 저장
**근거:** 초기 개발 단계에서 빠른 프로토타이핑 가능. 향후 Supabase 연동 시 백엔드 구조 별도 설계.

### 2. 강화 확률 밸런싱
**결정:** 초강 단계별 성공률 차등 설정 + 파괴/하락 확률 도입
**근거:** 게임 진행성 확보(초반 쉬움) + 후반 도전성(파괴 위험). 도감 보너스로 장기 플레이 유동성 제공.

### 3. 인벤토리 구조
**결정:** 현재 강화 검 1개 + 보관 검 다수
**근거:** 단순한 구조로 UI 복잡도 낮춤. "현재 강화 중인 검"과 "보관 검"의 구분 명확.

### 4. 속성 부여 시점
**결정:** 0강→1강 진급 시점에만 부여 (일회성)
**근거:** 속성이 검의 정체성. 강화 중 속성 변경되면 플레이어 혼동 가능.

### 5. UI 탭 구조
**결정:** 강화/룰렛 탭만 전환 (상점/도감/등은 모달 또는 별도 페이지)
**근aceae:** 모바일 화면에서 탭 수 제한으로 사용성 향상. (향후 조정 가능)

---

## 파일별 최종 구조

### index.html
- 시맨틱 HTML5
- 총 50-70줄 (모달 포함)
- 인라인 스타일 최소화

### style.css
- 총 300-400줄
- CSS 변수 활용 (--accent-color 등)
- 모바일 반응형 (3개 breakpoint)

### game.js
- 총 1500-2000줄
- 클래스 기반 설계 (DataModel, EnhancementEngine, InventoryManager 등 7-8개)
- 주요 함수: 50+개
- 전역 GameState 객체 1개

---

## 검증 체크리스트

- [ ] HTML 파일 로드 시 에러 없음
- [ ] CSS 반응형 화면에서 레이아웃 유지
- [ ] 게임 저장/로드 기능 정상
- [ ] 강화 시스템 확률 동작 확인 (100회 테스트)
- [ ] 인벤토리 장착/판매 기능 정상
- [ ] 도감 업데이트 정상
- [ ] 출석체크 중복 방지 정상
- [ ] 상점 구매 기능 정상
- [ ] 룰렛 스핀 애니메이션 부드러움
- [ ] 페이지 새로고침 후 모든 데이터 유지
- [ ] 콘솔에 JavaScript 에러 없음

---

## 향후 확장 (DB 연동)

1. **Supabase 연동**
   - 유저 인증 시스템
   - 게임 상태 서버 저장
   - 랭킹 조회 API
   - GM 패널 연동

2. **소셜 기능**
   - 친구 추가
   - 검 거래 시스템

3. **이벤트 시스템**
   - 한정 이벤트
   - 시즈널 보너스

