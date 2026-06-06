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

  function newGame() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    turn = BLACK;
    moveLog = [];
    gameOver = false;
    winOverlay.classList.remove('show');
    render();
    updateStatus();
    renderMovelog();
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

  // ── 무르기 ─────────────────────────────────────────────
  function undo() {
    if (!moveLog.length) return;
    const last = moveLog.pop();
    board[last.r][last.c] = null;
    turn = last.side;
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
    msg.textContent = t('pickMsg');
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
