/* ============================================================
   오목(Omok) — 2단계: 기보 + i18n(7개 언어) + 승리 연출 다듬기
   1단계 핵심(좌표계/착수/5목/무르기/승리)에 다음을 더함:
   - i18n 7개 언어 (ko/en/zh-Hans/zh-Hant/ja/de/fr) — 장기 t() 패턴 차용
   - 기보: 좌표 한 칸씩 기록 (열=A~O, 행=1~15). 장기 movelog 2열 구조 차용
   - 승리 연출: 텍스트 자연 연결 + 오버레이 투명도 ↓ (루미 피드백 2026-06-06)
   - 돌: 루미 제작 백자/먹빛 조약돌 PNG 적용 완료 (assets/stones/, §3.5).
     검은 배경으로 생성돼 본체만 원형 투명 추출 + CSS drop-shadow로 접지감.
   ============================================================ */
(() => {
  'use strict';

  // ── 상수 ──────────────────────────────────────────────
  const SIZE = 15;
  const WIN = 5;
  const BLACK = 'black';
  const WHITE = 'white';
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
  const STAR_POINTS = [
    [3, 3], [3, 7], [3, 11],
    [7, 3], [7, 7], [7, 11],
    [11, 3], [11, 7], [11, 11],
  ];
  // 열 라벨: A~O (15개). I를 건너뛰는 바둑 관례도 있으나 오목은 단순 A~O로.
  const COL_LABELS = 'ABCDEFGHIJKLMNO';

  // ── i18n ──────────────────────────────────────────────
  // 장기 패턴: 키별 문자열 또는 (args)=>string. t()가 현재 언어→en 폴백.
  // 보드·기보 좌표는 라틴/숫자라 언어 무관. UI 텍스트만 번역.
  const I18N = {
    ko: {
      sub: 'OMOK · 오목',
      langLabel: '언어', bgLabel: '바둑판 배경',
      themeSansu: '산수화', themeWood: '원목', themeSipjang: '십장생', themePaper: '한지',
      black: '흑', white: '백', turnSuffix: '차례',
      pickMsg: '빈 자리를 눌러 돌을 놓으세요',
      undo: '무르기', reset: '처음부터',
      movelogTitle: '기 보', movelogEmpty: '아직 둔 수가 없습니다',
      win: (s) => `${s} 승리`,
      winSub: (s) => `${s} 조약돌이 다섯 줄을 완성했습니다`,
      stoneBlack: '먹빛', stoneWhite: '백자',
      winHint: '다시 두려면 ‘처음부터’를 누르세요',
      forbidden: '33 금수입니다. 흑은 열린 3을 둘 이상 만들 수 없습니다',
      ruleLabel: '룰', ruleFree: '자유룰', ruleRenju: '33 금수',
    },
    en: {
      sub: 'OMOK · Five in a Row',
      langLabel: 'Language', bgLabel: 'Board',
      themeSansu: 'Landscape', themeWood: 'Wood', themeSipjang: 'Sipjangsaeng', themePaper: 'Hanji',
      black: 'Black', white: 'White', turnSuffix: 'to move',
      pickMsg: 'Tap an empty point to place a stone',
      undo: 'Undo', reset: 'Restart',
      movelogTitle: 'Moves', movelogEmpty: 'No moves yet',
      win: (s) => `${s} wins`,
      winSub: (s) => `${s} completed a row of five`,
      stoneBlack: 'Ink', stoneWhite: 'Porcelain',
      winHint: 'Press “Restart” to play again',
      forbidden: 'Forbidden (double-three). Black cannot make two open threes at once',
      ruleLabel: 'Rule', ruleFree: 'Free', ruleRenju: 'Renju (3-3)',
    },
    'zh-Hans': {
      sub: 'OMOK · 五子棋',
      langLabel: '语言', bgLabel: '棋盘',
      themeSansu: '山水画', themeWood: '原木', themeSipjang: '十长生', themePaper: '韩纸',
      black: '黑', white: '白', turnSuffix: '行棋',
      pickMsg: '点击空交叉点落子',
      undo: '悔棋', reset: '重新开始',
      movelogTitle: '棋 谱', movelogEmpty: '尚无棋步',
      win: (s) => `${s}方胜`,
      winSub: (s) => `${s}连成五子`,
      stoneBlack: '墨色', stoneWhite: '白瓷',
      winHint: '按“重新开始”再下一局',
      forbidden: '禁手（双三）。黑方不可同时形成两个活三',
      ruleLabel: '规则', ruleFree: '自由规则', ruleRenju: '禁手（三三）',
    },
    'zh-Hant': {
      sub: 'OMOK · 五子棋',
      langLabel: '語言', bgLabel: '棋盤',
      themeSansu: '山水畫', themeWood: '原木', themeSipjang: '十長生', themePaper: '韓紙',
      black: '黑', white: '白', turnSuffix: '行棋',
      pickMsg: '點擊空交叉點落子',
      undo: '悔棋', reset: '重新開始',
      movelogTitle: '棋 譜', movelogEmpty: '尚無棋步',
      win: (s) => `${s}方勝`,
      winSub: (s) => `${s}連成五子`,
      stoneBlack: '墨色', stoneWhite: '白瓷',
      winHint: '按「重新開始」再下一局',
      forbidden: '禁手（雙三）。黑方不可同時形成兩個活三',
      ruleLabel: '規則', ruleFree: '自由規則', ruleRenju: '禁手（三三）',
    },
    ja: {
      sub: 'OMOK · 五目並べ',
      langLabel: '言語', bgLabel: '盤',
      themeSansu: '山水画', themeWood: '木目', themeSipjang: '十長生', themePaper: '韓紙',
      black: '黒', white: '白', turnSuffix: 'の番',
      pickMsg: '空いた交点を押して石を置きます',
      undo: '待った', reset: '最初から',
      movelogTitle: '棋 譜', movelogEmpty: 'まだ手がありません',
      win: (s) => `${s}の勝ち`,
      winSub: (s) => `${s}が五つ並べました`,
      stoneBlack: '墨', stoneWhite: '白磁',
      winHint: '「最初から」を押すともう一局',
      forbidden: '禁じ手（三々）。黒は活三を同時に二つ作れません',
      ruleLabel: 'ルール', ruleFree: '自由', ruleRenju: '三々禁止',
    },
    de: {
      sub: 'OMOK · Fünf in einer Reihe',
      langLabel: 'Sprache', bgLabel: 'Brett',
      themeSansu: 'Landschaft', themeWood: 'Holz', themeSipjang: 'Sipjangsaeng', themePaper: 'Hanji',
      black: 'Schwarz', white: 'Weiß', turnSuffix: 'am Zug',
      pickMsg: 'Tippe auf einen leeren Punkt, um zu setzen',
      undo: 'Zurück', reset: 'Neu starten',
      movelogTitle: 'Züge', movelogEmpty: 'Noch keine Züge',
      win: (s) => `${s} gewinnt`,
      winSub: (s) => `${s} hat fünf in einer Reihe`,
      stoneBlack: 'Tusche', stoneWhite: 'Porzellan',
      winHint: '„Neu starten“ für eine neue Partie',
      forbidden: 'Verboten (Doppel-Drei). Schwarz darf nicht zwei offene Dreien zugleich bilden',
      ruleLabel: 'Regel', ruleFree: 'Frei', ruleRenju: 'Renju (3-3)',
    },
    fr: {
      sub: 'OMOK · Cinq en ligne',
      langLabel: 'Langue', bgLabel: 'Plateau',
      themeSansu: 'Paysage', themeWood: 'Bois', themeSipjang: 'Sipjangsaeng', themePaper: 'Hanji',
      black: 'Noir', white: 'Blanc', turnSuffix: 'au trait',
      pickMsg: 'Touchez un point vide pour poser une pierre',
      undo: 'Annuler', reset: 'Recommencer',
      movelogTitle: 'Coups', movelogEmpty: 'Aucun coup pour l’instant',
      win: (s) => `${s} gagne`,
      winSub: (s) => `${s} a aligné cinq pierres`,
      stoneBlack: 'Encre', stoneWhite: 'Porcelaine',
      winHint: 'Appuyez sur « Recommencer » pour rejouer',
      forbidden: 'Interdit (double trois). Noir ne peut former deux trois ouverts à la fois',
      ruleLabel: 'Règle', ruleFree: 'Libre', ruleRenju: 'Renju (3-3)',
    },
  };

  let lang = 'ko';
  function t(key, ...args) {
    let v = (I18N[lang] && I18N[lang][key]);
    if (v == null && lang !== 'en') v = (I18N.en && I18N.en[key]);
    if (v == null) return key;
    return (typeof v === 'function') ? v(...args) : v;
  }
  // 돌 색 이름 (승리 문구용) — 흑=먹빛/백=백자
  function stoneName(side) { return side === BLACK ? t('stoneBlack') : t('stoneWhite'); }
  function sideName(side) { return side === BLACK ? t('black') : t('white'); }

  // ── DOM ───────────────────────────────────────────────
  const frame      = document.getElementById('frame');
  const grid       = document.getElementById('grid');
  const stonesLayer= document.getElementById('stones');
  const hitLayer   = document.getElementById('hitLayer');
  const status     = document.getElementById('status');
  const turnLabel  = document.getElementById('turnLabel');
  const turnSuffix = document.getElementById('turnSuffix');
  const msg        = document.getElementById('msg');
  const winOverlay = document.getElementById('winOverlay');
  const winTitle   = document.getElementById('winTitle');
  const winSubLine = document.getElementById('winSubLine');
  const winHint    = document.getElementById('winHint');
  const movelog    = document.getElementById('movelog');
  const movelogTitle = document.getElementById('movelogTitle');
  const subLabel   = document.getElementById('subLabel');
  const undoBtn    = document.getElementById('undoBtn');
  const resetBtn   = document.getElementById('resetBtn');

  // ── 게임 상태 ──────────────────────────────────────────
  let board, turn, moveLog, gameOver;
  let renjuMode = false;   // 33 금수 룰. 기본 OFF(자유룰). 설정에서 토글.

  // ── AI 대전 상태 (4단계 a: 평가함수 + 1수 탐색) ──────────
  // ★ 메뉴는 (c)에서 만든다(핸드오버 결정). 지금은 URL 파라미터로만 켬:
  //    ?ai=white  → 사람=흑, AI=백 (기본 테스트용)
  //    ?ai=black  → 사람=백, AI=흑 (AI가 선; 금수 회피 동작 확인용)
  //    파라미터 없으면 aiSide=null → 기존 로컬 2인 그대로(내부 테스트 모드).
  //    ?debug=1 은 (c) 메뉴 단계에서 2인 모드 진입용으로 예약(지금은 미사용).
  let aiSide = null;       // BLACK / WHITE / null(2인)
  let aiThinking = false;  // AI 계산 중 사람 입력·중복 트리거 방지 플래그
  (function readAiParam() {
    const p = new URLSearchParams(location.search).get('ai');
    if (p === 'black') aiSide = BLACK;
    else if (p === 'white') aiSide = WHITE;
  })();

  function newGame() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    turn = BLACK;
    moveLog = [];
    gameOver = false;
    aiThinking = false;
    winOverlay.classList.remove('show');
    render();
    updateStatus();
    renderMovelog();
    // AI가 흑(선)이면 첫 수를 둔다
    if (aiSide === BLACK) aiMove();
  }

  // ── 좌표계 (1단계 그대로) ───────────────────────────────
  function posToXY(r, c) {
    return { x: (c / (SIZE - 1)) * 100, y: (r / (SIZE - 1)) * 100 };
  }
  // 교차점 → 기보 좌표 문자열 (열=A~O, 행=1~15). 화면 위쪽이 1행.
  function coordName(r, c) { return COL_LABELS[c] + (r + 1); }

  function sizeBoard() {
    const w = frame.clientWidth;
    if (w <= 0) return;
    frame.style.height = w + 'px';   // 정사각
    const pad = w * 0.06;
    const inner = w - 2 * pad;
    for (const el of [grid, stonesLayer, hitLayer]) {
      el.style.left = pad + 'px';
      el.style.top = pad + 'px';
      el.style.width = inner + 'px';
      el.style.height = inner + 'px';
    }
  }

  function drawGrid() {
    grid.innerHTML = '';
    const W = 100, H = 100;
    const cw = W / (SIZE - 1), ch = H / (SIZE - 1);
    grid.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const ns = 'http://www.w3.org/2000/svg';
    for (let r = 0; r < SIZE; r++) {
      const ln = document.createElementNS(ns, 'line');
      ln.setAttribute('x1', 0); ln.setAttribute('x2', W);
      ln.setAttribute('y1', r * ch); ln.setAttribute('y2', r * ch);
      if (r === 0 || r === SIZE - 1) ln.setAttribute('class', 'edge');
      grid.appendChild(ln);
    }
    for (let c = 0; c < SIZE; c++) {
      const ln = document.createElementNS(ns, 'line');
      ln.setAttribute('y1', 0); ln.setAttribute('y2', H);
      ln.setAttribute('x1', c * cw); ln.setAttribute('x2', c * cw);
      if (c === 0 || c === SIZE - 1) ln.setAttribute('class', 'edge');
      grid.appendChild(ln);
    }
    for (const [r, c] of STAR_POINTS) {
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('class', 'star');
      dot.setAttribute('cx', c * cw); dot.setAttribute('cy', r * ch);
      dot.setAttribute('r', 0.9);
      grid.appendChild(dot);
    }
    // 좌표축 라벨 — 위(열 A~O) + 왼쪽(행 1~15). 격자 바깥(음수)에 은은히.
    // overflow:visible 이라 음수 좌표도 보임. 산수화 위 정보량 최소화 위해 2면만.
    for (let c = 0; c < SIZE; c++) {
      const tx = document.createElementNS(ns, 'text');
      tx.setAttribute('class', 'axis-label');
      tx.setAttribute('x', c * cw);
      tx.setAttribute('y', -3.2);              // 격자 위쪽 바깥
      tx.setAttribute('text-anchor', 'middle');
      tx.textContent = COL_LABELS[c];
      grid.appendChild(tx);
    }
    for (let r = 0; r < SIZE; r++) {
      const tx = document.createElementNS(ns, 'text');
      tx.setAttribute('class', 'axis-label');
      tx.setAttribute('x', -3.2);              // 격자 왼쪽 바깥
      tx.setAttribute('y', r * ch);
      tx.setAttribute('text-anchor', 'middle');
      tx.setAttribute('dominant-baseline', 'central');
      tx.textContent = (r + 1);
      grid.appendChild(tx);
    }
  }

  function render() {
    sizeBoard();
    drawGrid();
    stonesLayer.innerHTML = '';
    hitLayer.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!board[r][c]) continue;
        const { x, y } = posToXY(r, c);
        const el = document.createElement('div');
        el.className = `stone ${board[r][c]}`;
        el.style.left = x + '%'; el.style.top = y + '%';
        stonesLayer.appendChild(el);
      }
    }
    if (moveLog.length) {
      const last = moveLog[moveLog.length - 1];
      const { x, y } = posToXY(last.r, last.c);
      const mk = document.createElement('div');
      mk.className = 'last-mark';
      mk.style.left = x + '%'; mk.style.top = y + '%';
      stonesLayer.appendChild(mk);
    }
    if (!gameOver) {
      for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
          if (board[r][c]) continue;
          const { x, y } = posToXY(r, c);
          const hit = document.createElement('div');
          hit.className = `hit next-${turn}`;
          hit.style.left = x + '%'; hit.style.top = y + '%';
          hit.addEventListener('click', () => onPlace(r, c));
          hitLayer.appendChild(hit);
        }
      }
    }
  }

  // ── 착수 ───────────────────────────────────────────────
  function onPlace(r, c) {
    if (gameOver || board[r][c]) return;
    // AI 대전 중 AI 차례면 사람 입력 무시(AI 계산 중 포함)
    if (aiSide && (turn === aiSide || aiThinking)) return;
    // 33 금수: 룰 ON + 흑 차례 + 금수 자리면 착수 차단 + 안내 (미리보기 ✕ 없음)
    if (renjuMode && turn === BLACK && isForbiddenMove(r, c, BLACK)) {
      msg.textContent = t('forbidden');
      status.classList.add('warn');
      setTimeout(() => status.classList.remove('warn'), 900);
      return;
    }
    board[r][c] = turn;
    moveLog.push({ r, c, side: turn });
    if (checkWin(r, c, turn)) {
      render(); renderMovelog(); endGame(turn);
      return;
    }
    turn = (turn === BLACK) ? WHITE : BLACK;
    render(); updateStatus(); renderMovelog();
    // 사람이 두고 나서 AI 차례면 AI가 응수
    if (aiSide && turn === aiSide && !gameOver) aiMove();
  }

  // ── 5목 판정 (1단계 그대로 — 마지막 돌 4방향) ────────────
  function checkWin(r, c, side) {
    for (const [dr, dc] of DIRS) {
      const n = 1 + countDir(r, c, dr, dc, side) + countDir(r, c, -dr, -dc, side);
      if (n >= WIN) return true;
    }
    return false;
  }
  function countDir(r, c, dr, dc, side) {
    let n = 0, rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === side) {
      n++; rr += dr; cc += dc;
    }
    return n;
  }

  // ── 33 금수 판정 (3단계 · 렌주룰. 흑에만, 설정 ON일 때) ──────
  // ★ 순수 판정: isForbiddenMove(r,c,side) 하나로 착수·AI·미리보기 공용.
  //   33 = 한 수로 '열린 3'을 둘 이상 만드는 자리. 흑만 금지.
  //   열린3 = 한 수 더 두면 '열린 4'(양끝 열린 4)가 되는 3 (연속/띈3 모두).
  //   패턴매칭이 아니라 가상 착수 시뮬레이션으로 판정(띈3·경계 정확).
  function inB(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

  // (r,c)에 side가 놓인 board에서 (dr,dc) 라인의 연속 길이 + 양끝 열림 수
  function lineInfo(r, c, dr, dc, side) {
    let len = 1;
    let rr = r + dr, cc = c + dc;
    while (inB(rr, cc) && board[rr][cc] === side) { len++; rr += dr; cc += dc; }
    const endPlus = inB(rr, cc) && board[rr][cc] === null;
    let r2 = r - dr, c2 = c - dc;
    while (inB(r2, c2) && board[r2][c2] === side) { len++; r2 -= dr; c2 -= dc; }
    const endMinus = inB(r2, c2) && board[r2][c2] === null;
    return { len, openEnds: (endPlus ? 1 : 0) + (endMinus ? 1 : 0) };
  }
  // (r,c)에 side를 둔 상태에서 이 방향이 '열린 4'인가 (연속4 + 양끝 열림)
  function makesOpenFour(r, c, dr, dc, side) {
    const info = lineInfo(r, c, dr, dc, side);
    return info.len === 4 && info.openEnds === 2;
  }
  // (r,c)에 side를 둔 상태에서 이 방향이 '열린 3'인가
  // = 근처 빈칸에 한 점 더 두면 그 방향 열린4가 생기는가
  function isOpenThree(r, c, dr, dc, side) {
    for (let k = -4; k <= 4; k++) {
      if (k === 0) continue;
      const nr = r + dr * k, nc = c + dc * k;
      if (!inB(nr, nc) || board[nr][nc] !== null) continue;
      board[nr][nc] = side;
      const open4 = makesOpenFour(nr, nc, dr, dc, side);
      board[nr][nc] = null;
      if (open4) return true;
    }
    return false;
  }
  // ★ 공개: (r,c)에 side를 두는 게 33 금수인가? (흑 + 룰 ON일 때만 의미)
  function isForbiddenMove(r, c, side) {
    if (board[r][c] !== null) return false;
    board[r][c] = side;
    // 즉시 5목이면 승리 우선 — 금수 아님
    let win = false;
    for (const [dr, dc] of DIRS) {
      if (lineInfo(r, c, dr, dc, side).len >= WIN) { win = true; break; }
    }
    if (win) { board[r][c] = null; return false; }
    let openThrees = 0;
    for (const [dr, dc] of DIRS) {
      if (isOpenThree(r, c, dr, dc, side)) openThrees++;
    }
    board[r][c] = null;
    return openThrees >= 2;
  }

  /* ============================================================
     ── AI 대전 엔진 — 4단계 (a): 평가함수 + 1수 탐색 ──────────
     목표: "그냥 두면 막고, 이길 자리 있으면 이기는" 가장 단순한 상대.
     미니맥스/깊이 확장은 (b), 난이도·blunder는 (c)에서.

     설계 요약:
       1) genCandidates : 기존 돌 반경 R 안의 빈칸만 후보로 (탐색량 관리)
       2) scoreLine     : 한 방향 (연속길이 + 양끝 열림) → 점수
       3) evalMove      : 한 자리에 side가 두면 4방향 합산 점수 (공격가치)
       4) aiPick        : ① 즉시 5목 → ② 상대 즉승 막기 → ③ 공·수 종합 최고점
     ★ 평가는 lineInfo(기존 함수)를 그대로 재사용 — 33 판정과 같은 재료.
     ============================================================ */

  // 후보 탐색 반경 — 기존 돌에서 이 칸 수 이내의 빈칸만 본다.
  // 1~2칸이면 오목에선 충분(멀리 떨어진 수는 거의 무의미). 탐색량 ↓.
  const AI_RADIUS = 2;

  // 라인 점수표 — (연속 길이, 열린 끝 개수) → 가중치.
  //  열린4(__4__)는 사실상 승리 예약, 닫힌4·열린3은 강한 위협.
  //  값은 (b) 미니맥스 붙이기 전 1수 비교용 상대값. 절대 크기보다 '간격'이 중요.
  function scoreLine(len, openEnds) {
    if (len >= WIN) return 1000000;          // 5목 = 승리
    if (len === 4) {
      if (openEnds === 2) return 100000;     // 열린4 — 막아도 다른 쪽으로 5
      if (openEnds === 1) return 10000;      // 닫힌4 — 한 수면 5 (반드시 대응)
      return 0;                              // 양끝 막힌 4 — 가치 없음
    }
    if (len === 3) {
      if (openEnds === 2) return 5000;       // 열린3 — 방치 시 열린4로
      if (openEnds === 1) return 500;        // 닫힌3
      return 0;
    }
    if (len === 2) {
      if (openEnds === 2) return 200;        // 열린2
      if (openEnds === 1) return 30;
      return 0;
    }
    if (len === 1) return openEnds === 2 ? 10 : 2;
    return 0;
  }

  // (r,c)에 side를 두면 생기는 4방향 라인 점수의 합 = 그 수의 '공격 가치'.
  // 가상 착수 후 lineInfo로 측정하고 원상복구(부작용 없음).
  function evalMove(r, c, side) {
    board[r][c] = side;
    let s = 0;
    for (const [dr, dc] of DIRS) {
      const info = lineInfo(r, c, dr, dc, side);
      s += scoreLine(info.len, info.openEnds);
    }
    board[r][c] = null;
    return s;
  }

  // 후보 생성 — 돌이 하나라도 있으면 그 주변 반경 R의 빈칸만.
  // 빈 판이면 천원(중앙) 하나만 반환(첫 수 고정).
  function genCandidates() {
    const cands = [];
    let any = false;
    const mark = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!board[r][c]) continue;
        any = true;
        for (let dr = -AI_RADIUS; dr <= AI_RADIUS; dr++) {
          for (let dc = -AI_RADIUS; dc <= AI_RADIUS; dc++) {
            const nr = r + dr, nc = c + dc;
            if (inB(nr, nc) && !board[nr][nc] && !mark[nr][nc]) {
              mark[nr][nc] = true;
              cands.push([nr, nc]);
            }
          }
        }
      }
    }
    if (!any) {
      const m = Math.floor(SIZE / 2);
      return [[m, m]];   // 천원 H8
    }
    return cands;
  }

  // 즉시 5목이 되는 자리인가 (그 수 하나로 게임 끝)
  function isWinningMove(r, c, side) {
    board[r][c] = side;
    const win = checkWin(r, c, side);
    board[r][c] = null;
    return win;
  }

  // ★ AI 한 수 선택 — (a) 단계 의사결정.
  //   ① 내가 두면 즉시 5목 → 그 자리(이기는 수 최우선)
  //   ② 상대가 다음에 두면 즉시 5목인 자리 → 막기(지는 수 차단)
  //   ③ 아니면 (내 공격가치 + 상대 둘 때 위협가치)가 최대인 자리
  //   흑+renjuMode면 금수 자리는 후보에서 제외(둘 수 없으니).
  function aiPick(side) {
    const opp = (side === BLACK) ? WHITE : BLACK;
    let cands = genCandidates();
    // 흑이고 33룰이면 금수 자리 제거 (단, 즉시 5목은 isForbiddenMove가 이미 허용)
    if (side === BLACK && renjuMode) {
      cands = cands.filter(([r, c]) => !isForbiddenMove(r, c, BLACK));
    }
    if (!cands.length) return null;

    // ① 즉승
    for (const [r, c] of cands) {
      if (isWinningMove(r, c, side)) return [r, c];
    }
    // ② 상대 즉승 차단 — 상대가 둘 수 있는 5목 자리를 내가 먼저 막는다
    for (const [r, c] of cands) {
      if (isWinningMove(r, c, opp)) return [r, c];
    }
    // ③ 공·수 종합 점수. 같은 자리에 '내가 두는 가치'와
    //    '상대가 거기 둘 때의 위협(=막을 가치)'을 더해 비교.
    //    상대 위협은 살짝 깎아(0.9) 동점 시 공격을 약간 선호.
    let best = null, bestScore = -Infinity;
    for (const [r, c] of cands) {
      const atk = evalMove(r, c, side);
      const def = evalMove(r, c, opp) * 0.9;
      const total = atk + def;
      if (total > bestScore) { bestScore = total; best = [r, c]; }
    }
    return best;
  }

  // AI 착수 실행 — 사람 onPlace와 같은 경로를 타되, 차례·종료를 직접 처리.
  // setTimeout으로 살짝 늦춰 "두는 느낌" + 렌더 반영 시간 확보.
  function aiMove() {
    if (gameOver || turn !== aiSide) return;
    aiThinking = true;
    updateStatus();   // "두는 중" 표시(아래 updateStatus에서 분기)
    setTimeout(() => {
      if (gameOver || turn !== aiSide) { aiThinking = false; return; }
      const mv = aiPick(aiSide);
      aiThinking = false;
      if (!mv) { return; }            // 둘 곳 없음(무승부 상황) — (b)에서 처리
      const [r, c] = mv;
      board[r][c] = turn;
      moveLog.push({ r, c, side: turn });
      if (checkWin(r, c, turn)) {
        render(); renderMovelog(); endGame(turn);
        return;
      }
      turn = (turn === BLACK) ? WHITE : BLACK;
      render(); updateStatus(); renderMovelog();
    }, 350);
  }

  // ── 무르기 ─────────────────────────────────────────────
  function undo() {
    if (!moveLog.length) return;
    if (aiThinking) return;   // AI 계산 중엔 무르기 잠금
    function pop1() {
      const last = moveLog.pop();
      board[last.r][last.c] = null;
      turn = last.side;
    }
    pop1();
    // AI 대전 중이면 한 번 더 물러 '사람 차례'로 되돌린다.
    // (마지막이 AI 수일 때 사람 수까지 함께 취소 → 같은 국면서 다시 두게)
    if (aiSide && moveLog.length && turn === aiSide) pop1();
    gameOver = false;
    winOverlay.classList.remove('show');
    render(); updateStatus(); renderMovelog();
  }

  // ── 기보 렌더 (장기 movelog 2열 구조 차용) ───────────────
  // 한 줄 = [수번호] [흑 좌표] [백 좌표]. 흑이 항상 먼저(홀수 수).
  function renderMovelog() {
    if (!moveLog.length) {
      movelog.innerHTML = `<div class="empty">${t('movelogEmpty')}</div>`;
      return;
    }
    let rows = '';
    for (let i = 0; i < moveLog.length; i += 2) {
      const bm = moveLog[i];        // 흑
      const wm = moveLog[i + 1];    // 백 (있을 수도 없을 수도)
      const no = (i / 2) + 1;
      rows += `<li><span class="mv-no">${no}</span>` +
        `<span class="mv-cell mv-black">${coordName(bm.r, bm.c)}</span>` +
        `<span class="mv-cell mv-white">${wm ? coordName(wm.r, wm.c) : ''}</span></li>`;
    }
    movelog.innerHTML = rows;
    movelog.scrollTop = movelog.scrollHeight;
  }

  // ── 승리 / 종료 (루미 피드백 반영) ──────────────────────
  // 텍스트: "흑 승리" + "먹빛 조약돌이 다섯 줄을 완성했습니다" (자연 연결)
  function endGame(winner) {
    gameOver = true;
    winTitle.textContent = t('win', sideName(winner));
    winSubLine.textContent = t('winSub', stoneName(winner));
    winHint.textContent = t('winHint');
    winOverlay.classList.add('show');
    // 상태창도 종료 상태로 (1단계 미해결분 — 승리 시 "차례" 잔류 수정)
    msg.textContent = t('win', sideName(winner));
    render();
  }

  // ── 상태 표시 ──────────────────────────────────────────
  function updateStatus() {
    const isBlack = (turn === BLACK);
    turnLabel.textContent = sideName(turn);
    turnSuffix.textContent = t('turnSuffix');
    status.classList.toggle('turn-black', isBlack);
    status.classList.toggle('turn-white', !isBlack);
    // AI 차례(계산 중 포함)면 "생각 중" 톤, 아니면 평소 안내.
    // ★ (c)에서 'thinking' i18n 키 7개 언어로 정식 추가 예정. 지금은 임시.
    if (aiSide && turn === aiSide) {
      msg.textContent = (lang === 'ko') ? '두는 중…' : '…';
    } else {
      msg.textContent = t('pickMsg');
    }
  }

  // ── 언어 전환 (장기 setLang 패턴) ───────────────────────
  const LANG_LIST = [
    { id: 'langKo', code: 'ko' }, { id: 'langEn', code: 'en' },
    { id: 'langZhHans', code: 'zh-Hans' }, { id: 'langZhHant', code: 'zh-Hant' },
    { id: 'langJa', code: 'ja' }, { id: 'langDe', code: 'de' }, { id: 'langFr', code: 'fr' },
  ];
  function setLang(code, clickedId) {
    lang = code;
    document.documentElement.setAttribute('lang', code);
    for (const l of LANG_LIST) {
      document.getElementById(l.id).classList.toggle('active', l.id === clickedId);
    }
    applyStaticTexts();
    // 게임 끝난 상태면 승리 문구도 다시 그림
    if (gameOver && moveLog.length) {
      const winner = moveLog[moveLog.length - 1].side;
      winTitle.textContent = t('win', sideName(winner));
      winSubLine.textContent = t('winSub', stoneName(winner));
      winHint.textContent = t('winHint');
      msg.textContent = t('win', sideName(winner));
    } else {
      updateStatus();
    }
    renderMovelog();
  }
  // 언어와 무관하게 항상 다시 칠하는 정적 텍스트들
  function applyStaticTexts() {
    subLabel.textContent = t('sub');
    document.getElementById('settingsLangLabel').textContent = t('langLabel');
    document.getElementById('settingsBgLabel').textContent = t('bgLabel');
    document.getElementById('bgSansuHwa').textContent = t('themeSansu');
    document.getElementById('bgWood').textContent = t('themeWood');
    document.getElementById('bgSipjangsaeng').textContent = t('themeSipjang');
    document.getElementById('bgPaper').textContent = t('themePaper');
    undoBtn.textContent = t('undo');
    resetBtn.textContent = t('reset');
    movelogTitle.textContent = t('movelogTitle');
    document.getElementById('settingsRuleLabel').textContent = t('ruleLabel');
    document.getElementById('ruleFree').textContent = t('ruleFree');
    document.getElementById('ruleRenju').textContent = t('ruleRenju');
  }
  for (const l of LANG_LIST) {
    document.getElementById(l.id).addEventListener('click', () => setLang(l.code, l.id));
  }

  // ── 배경 테마 ──────────────────────────────────────────
  const BG_LIST = [
    { id: 'bgSansuHwa', cls: '' }, { id: 'bgWood', cls: 'bg-wood' },
    { id: 'bgSipjangsaeng', cls: 'bg-sipjangsaeng' }, { id: 'bgPaper', cls: 'bg-paper' },
  ];
  function setBg(cls, clickedId) {
    frame.classList.remove('bg-wood', 'bg-sipjangsaeng', 'bg-paper');
    if (cls) frame.classList.add(cls);
    for (const b of BG_LIST) {
      document.getElementById(b.id).classList.toggle('active', b.id === clickedId);
    }
  }
  for (const b of BG_LIST) {
    document.getElementById(b.id).addEventListener('click', () => setBg(b.cls, b.id));
  }

  // ── 33 금수 룰 토글 (기본 자유룰) ───────────────────────
  function setRule(renju) {
    renjuMode = renju;
    document.getElementById('ruleFree').classList.toggle('active', !renju);
    document.getElementById('ruleRenju').classList.toggle('active', renju);
    // 룰 바꾸면 현재 차례 안내 갱신 (금수 경고 잔상 제거)
    if (!gameOver) updateStatus();
  }
  document.getElementById('ruleFree').addEventListener('click', () => setRule(false));
  document.getElementById('ruleRenju').addEventListener('click', () => setRule(true));

  // ── 설정 드롭다운 ──────────────────────────────────────
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsDropdown = document.getElementById('settingsDropdown');
  const settingsBackdrop = document.getElementById('settingsBackdrop');
  function toggleSettings(open) {
    settingsDropdown.classList.toggle('open', open);
    settingsBackdrop.classList.toggle('open', open);
  }
  settingsBtn.addEventListener('click', () =>
    toggleSettings(!settingsDropdown.classList.contains('open')));
  settingsBackdrop.addEventListener('click', () => toggleSettings(false));

  // ── 이벤트 ─────────────────────────────────────────────
  undoBtn.addEventListener('click', undo);
  resetBtn.addEventListener('click', newGame);
  window.addEventListener('resize', render);

  // ── 시작 ───────────────────────────────────────────────
  // 기본 언어 버튼 활성화 + 정적 텍스트
  document.getElementById('langKo').classList.add('active');
  applyStaticTexts();
  newGame();
})();
