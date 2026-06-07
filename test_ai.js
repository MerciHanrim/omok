/* ============================================================
   test_ai.js — 오목 AI 단위테스트 (4단계 b: 알파베타 + 이중위협 평가)
   ★ omok-ai.js(순수 로직 모듈)를 require. script.js와 omok-ai.js는
     같은 AI 로직을 미러하므로, 이 테스트가 곧 양쪽의 검증이다.

   설계 철학 (한림 결정, 측정 후 정직하게 재구성):
     처음엔 "(a)는 못 막고 (b)는 막는 함정수"를 찾으려 했으나, 측정 결과
       · 순수 이중위협은 (a)도 막는다(교점이 한 수 평가로도 고득점).
       · (a)가 교점을 포기하는 건 상대에게 '선수 카운터'가 있을 때인데,
         그 카운터는 대체로 정당한 수다 → 억지 함정은 가짜 테스트가 된다.
     그래서 테스트 목표를 둘로 나눈다:
       1) 평가함수 테스트 — 보드 평가가 '옳은 방향'인지 직접 검증.
       2) 미니맥스 테스트 — (b)가 실제로 잘하는 것:
          즉승 / 즉패 방어 / 탐욕수 회피 / 금수 회피.
   실행: node test_ai.js
   ============================================================ */
'use strict';
const E = require('./omok-ai.js');
const {
  newBoard, put, name, parse, _getBoard, _setRenju, _setLevel, _getLevel,
  BLACK, WHITE, AI_LEVELS,
  evalBoard, threatBonus, aiPick, aiPickDepth, isForbiddenMove,
} = E;

let pass = 0, fail = 0;
function ok(cond, label) {
  if (cond) { pass++; console.log('  PASS  ' + label); }
  else { fail++; console.log('  FAIL  ' + label); }
}
function setBoard(blacks, whites) {
  newBoard(); _setRenju(false);
  (blacks || []).forEach(s => put(s, BLACK));
  (whites || []).forEach(s => put(s, WHITE));
}
function pickName(picker, side) {
  const mv = picker(side);
  return mv ? name(mv[0], mv[1]) : '(none)';
}
function evalAfter(coord, side, viewSide) {
  const [r, c] = parse(coord);
  const b = _getBoard();
  const prev = b[r][c];
  b[r][c] = side;
  const v = evalBoard(viewSide);
  b[r][c] = prev;
  return v;
}
// 백이 whiteMv를 둔 뒤, 흑이 한 수로 '열린3 2개(이중위협)'를 만들 자리가
// 남아있지 않으면 true(=유효 방어). 현재 보드를 변경했다가 되돌린다.
function whiteBreaksDouble(whiteMv) {
  if (!whiteMv) return false;
  const { lineInfo, isOpenThree, DIRS, genCandidates } = E;
  const b = _getBoard();
  const [wr, wc] = whiteMv;
  b[wr][wc] = WHITE;
  let stillDouble = false;
  for (const [r, c] of genCandidates()) {
    if (b[r][c]) continue;
    b[r][c] = BLACK;
    let cnt = 0;
    for (const [dr, dc] of DIRS) {
      const inf = lineInfo(r, c, dr, dc, BLACK);
      if (inf.len === 3 && inf.openEnds === 2 && isOpenThree(r, c, dr, dc, BLACK)) cnt++;
    }
    b[r][c] = null;
    if (cnt >= 2) { stillDouble = true; break; }
  }
  b[wr][wc] = null;
  return !stillDouble;
}

/* ── 그룹 1: 평가함수 — 위협을 점수로 옳게 보는가 ───────────── */
function group_eval() {
  console.log('\n[그룹 1] 평가함수 — 위협을 점수로 옳게 보는가');

  setBoard([], ['H7', 'H8', 'H9']);
  const tOpen = threatBonus(WHITE);
  setBoard(['H6'], ['H7', 'H8', 'H9']);
  const tClosed = threatBonus(WHITE);
  ok(tOpen > tClosed, `1-1 열린4 잠재 > 닫힌4 잠재 (${tOpen} > ${tClosed})`);

  setBoard(['F8', 'G8', 'H6', 'H7'], ['B2']);
  const tDouble = threatBonus(BLACK);
  setBoard(['F8', 'G8'], ['B2']);
  const tSingle = threatBonus(BLACK);
  ok(tDouble > tSingle, `1-2 이중 열린3 잠재 > 단일 열린3 (${tDouble} > ${tSingle})`);

  setBoard(['F8', 'G8', 'H6', 'H7'], ['B2']);
  const defended = evalAfter('H8', WHITE, WHITE);
  setBoard(['F8', 'G8', 'H6', 'H7'], ['B2', 'B3']);
  const neglected = evalAfter('H8', BLACK, WHITE);
  ok(defended > neglected,
    `1-3 이중위협 방어 > 방치 (백 관점: 방어 ${defended} > 방치 ${neglected})`);
  ok(neglected < -40000,
    `1-4 이중위협 방치는 크게 나쁨 (백 관점 ${neglected} < -40000)`);
}

/* ── 그룹 2: 미니맥스 — (b)가 잘하는 것 ──────────────────────── */
function group_minimax() {
  console.log('\n[그룹 2] 미니맥스 — 즉승 / 즉패방어 / 탐욕수회피 / 금수회피');

  setBoard([], ['H7', 'H8', 'H9', 'H10']);
  const w = pickName(aiPickDepth, WHITE);
  ok(['H6', 'H11'].includes(w), `2-1 즉승 선택 → ${w}`);

  setBoard(['D4', 'D5', 'D6', 'D7'], ['K10']);
  const d = pickName(aiPickDepth, WHITE);
  ok(['D3', 'D8'].includes(d), `2-2 즉패 방어 → ${d}`);

  setBoard(['J4', 'J5', 'J6', 'J7'], ['F7', 'F8', 'F9', 'F10']);
  const ww = pickName(aiPickDepth, WHITE);
  ok(['F6', 'F11'].includes(ww), `2-3 즉승 우선(막기보다 이기기) → ${ww}`);

  setBoard(['G5', 'G6', 'G7', 'G8'], ['L7', 'L8']);
  const g = pickName(aiPickDepth, WHITE);
  ok(['G4', 'G9'].includes(g), `2-4 탐욕수 회피(즉패 방어 우선) → ${g}`);

  newBoard(); _setRenju(true);
  ['F8', 'G8', 'H6', 'H7'].forEach(s => put(s, BLACK));
  put('B2', WHITE);
  const isForb = isForbiddenMove(parse('H8')[0], parse('H8')[1], BLACK);
  const pick = aiPickDepth(BLACK);
  const pickN = pick ? name(pick[0], pick[1]) : '(none)';
  ok(isForb && pickN !== 'H8', `2-5 금수 회피(흑 renju) → H8 금수=${isForb}, AI=${pickN}`);
  _setRenju(false);
}

/* ── 그룹 3: 회귀 — 기본기 유지 ──────────────────────────────── */
function group_regression() {
  console.log('\n[그룹 3] 회귀 — (a)/(b) 공통 기본기 유지');
  newBoard(); _setRenju(false);
  const first = pickName(aiPickDepth, WHITE);
  ok(first === 'H8', `3-1 빈 판 첫 수 = 천원 H8 → ${first}`);
  setBoard(['F8', 'G8', 'H6', 'H7'], ['B2']);
  // 깊이가 깊어지면 미니맥스가 교점(H8)이 아닌 등가 방어(끝막기 H5 등)를
  // 고를 수 있다 — 둘 다 흑 이중위협을 깨면 정답. 좌표 고정 대신 '방어 성공'을 본다.
  const bMv = aiPickDepth(WHITE);
  const bName = bMv ? name(bMv[0], bMv[1]) : '(none)';
  const breaksDouble = whiteBreaksDouble(bMv);
  ok(breaksDouble, `3-2 (b) 이중위협 유효 방어 (선택=${bName}, 위협 깨짐=${breaksDouble})`);
}

/* ── 그룹 4: 실기 회귀 — 후수 백에게 진 기보의 패배 지점 ──────────
   무르기 없이 명인(흑·선공)이 후수(백)에게 진 실제 기보(2026-06-07).
   패인: 12수 흑 차례에 명인이 K6을 둬 백 대각 이중위협
     G6-H7-I8-J9-K10을 허용 → 13수에 백 즉승 2개(F5,K10)로 패배.
   측정: 깊이 2는 K6(패배수), 깊이 3부터 I9(대각 차단). → SEARCH_DEPTH=4 근거. */
function group_realgame_regression() {
  console.log('\n[그룹 4] 실기 회귀 — 대각 이중위협 방어 (depth 검증선)');
  _setLevel('master');  // 회귀는 명인 기준(blunder 0)으로 결정론 보장
  const blacks11 = ['H8','G9','F7','F8','E7','F6','G7','I6','D11','H6','L7'];
  const whites11 = ['H9','G8','I7','I8','H10','F9','H7','E10','J7','K7','G6'];
  setBoard(blacks11, whites11);
  const mv = aiPickDepth(BLACK);
  const got = mv ? name(mv[0], mv[1]) : '(none)';
  ok(got !== 'K6', `4-1 master 12수: 패배수 K6 회피 → ${got}`);
  ok(got === 'I9', `4-2 master 12수: 대각 이중위협 차단 I9 선택 → ${got}`);
}

/* ── 그룹 5: 5단계 blunder 난이도 — 약하되 고장나지 않았는가 ──────
   blunder는 '최선 수읽기 포기'일 뿐 즉승/즉패차단은 항상 유지(한림 확정). */
function group_blunder() {
  console.log('\n[그룹 5] 5단계 blunder — 약하되 고장나지 않았는가');
  const saved = _getLevel();

  _setLevel('master');
  setBoard(['F8', 'G8', 'H6', 'H7'], ['B2']);
  const ref = aiPickDepth(WHITE);
  let deterministic = true;
  for (let i = 0; i < 30; i++) {
    setBoard(['F8', 'G8', 'H6', 'H7'], ['B2']);
    const m = aiPickDepth(WHITE);
    if (!m || !ref || m[0] !== ref[0] || m[1] !== ref[1]) { deterministic = false; break; }
  }
  ok(deterministic, `5-1 명인(blunder 0) 결정론적 — 항상 ${ref ? name(ref[0], ref[1]) : '-'}`);

  _setLevel('beginner');
  let allWin = true;
  for (let i = 0; i < 200; i++) {
    setBoard([], ['H7', 'H8', 'H9', 'H10']);
    const m = aiPickDepth(WHITE);
    const n = m ? name(m[0], m[1]) : '-';
    if (n !== 'H6' && n !== 'H11') { allWin = false; break; }
  }
  ok(allWin, `5-2 초심자도 즉승 100% (blunder=${AI_LEVELS.beginner.blunder})`);

  let allBlock = true;
  for (let i = 0; i < 200; i++) {
    setBoard(['D4', 'D5', 'D6', 'D7'], ['K10']);
    const m = aiPickDepth(WHITE);
    const n = m ? name(m[0], m[1]) : '-';
    if (n !== 'D3' && n !== 'D8') { allBlock = false; break; }
  }
  ok(allBlock, `5-3 초심자도 즉패 차단 100%`);

  const L = AI_LEVELS;
  ok(L.beginner.blunder > L.friend.blunder &&
     L.friend.blunder > L.seasoned.blunder &&
     L.seasoned.blunder > L.master.blunder &&
     L.master.blunder === 0,
     `5-4 blunder 위계 초심자(${L.beginner.blunder})>중수(${L.friend.blunder})>고수(${L.seasoned.blunder})>명인(${L.master.blunder})`);

  _setLevel('master');
  // 백 돌 3개 이상이어야 초반 면제(AI 착수<3) 통과 → blunder 가능 구간.
  const b55 = [['H8', 'I8', 'J8', 'F5'], ['H9', 'I9', 'G6']];  // 백 3개
  setBoard(b55[0], b55[1]);
  const masterMove = aiPickDepth(WHITE);
  const mName = masterMove ? name(masterMove[0], masterMove[1]) : '-';
  _setLevel('beginner');
  let differed = false;
  for (let i = 0; i < 300; i++) {
    setBoard(b55[0], b55[1]);
    const m = aiPickDepth(WHITE);
    const n = m ? name(m[0], m[1]) : '-';
    if (n !== mName) { differed = true; break; }
  }
  ok(differed, `5-5 초심자 blunder 실제 발동(명인 최선=${mName}와 다른 수 관찰)`);

  // 5-6 ★ 차선책 검증: blunder가 발동해도 ordered 윈도우(상위권) 안에서만 뽑는다.
  //   = 전선 밖 외딴 착수(M4 같은) 방지. 초심자 200회 모두, 둔 수가
  //   명인 orderedCands 상위 10(윈도우 [2,9] 상한+여유) 안에 드는지 확인.
  const { orderedCands } = E;
  _setLevel('master');
  const board6 = [['H8', 'I7', 'J6', 'G9'], ['H9', 'G7', 'I8']];  // 중반 모양
  setBoard(board6[0], board6[1]);
  const top = orderedCands(BLACK, 12).map(([r, c]) => name(r, c));
  const allowed = new Set(top.slice(0, 10));  // 윈도우 [2,9] = 상위 10 안
  _setLevel('beginner');
  let allInWindow = true, sample = '';
  for (let i = 0; i < 200; i++) {
    setBoard(board6[0], board6[1]);
    const m = aiPickDepth(BLACK);
    const n = m ? name(m[0], m[1]) : '-';
    if (!allowed.has(n)) { allInWindow = false; sample = n; break; }
  }
  ok(allInWindow, `5-6 초심자 blunder도 상위권 내(외딴 착수 방지)${allInWindow ? '' : ` — 벗어남:${sample}`}`);

  // 5-7 ★ 초반 면제: AI 자신 착수 3 이하면 초심자여도 blunder 안 함.
  //   흑 H8 하나만 둔 상태에서 백 첫 수(AI 착수 0개) → 200회 모두 명인 최선.
  _setLevel('master');
  setBoard(['H8'], []);
  const firstBest = aiPickDepth(WHITE);
  const fbName = firstBest ? name(firstBest[0], firstBest[1]) : '-';
  _setLevel('beginner');
  let firstAlwaysBest = true, off = '';
  for (let i = 0; i < 200; i++) {
    setBoard(['H8'], []);
    const m = aiPickDepth(WHITE);
    const n = m ? name(m[0], m[1]) : '-';
    if (n !== fbName) { firstAlwaysBest = false; off = n; break; }
  }
  ok(firstAlwaysBest, `5-7 초반 면제(AI 착수<3) — 백 첫 수 항상 최선 ${fbName}${firstAlwaysBest ? '' : ` (벗어남:${off})`}`);

  _setLevel(saved);
}

console.log('======================================================');
console.log(' 오목 AI 단위테스트 — (b) 미니맥스 + 이중위협 평가');
console.log('======================================================');
group_eval();
group_minimax();
group_regression();
group_realgame_regression();
group_blunder();
console.log('\n------------------------------------------------------');
console.log(` 결과: ${pass} PASS / ${fail} FAIL  (총 ${pass + fail})`);
console.log('------------------------------------------------------');
process.exit(fail ? 1 : 0);
