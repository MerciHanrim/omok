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
  newBoard, put, name, parse, _getBoard, _setRenju,
  BLACK, WHITE,
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
  const a = pickName(aiPick, WHITE), b = pickName(aiPickDepth, WHITE);
  ok(a === 'H8' && b === 'H8', `3-2 순수 이중위협 교점 방어 (a=${a}, b=${b})`);
}

console.log('======================================================');
console.log(' 오목 AI 단위테스트 — (b) 미니맥스 + 이중위협 평가');
console.log('======================================================');
group_eval();
group_minimax();
group_regression();
console.log('\n------------------------------------------------------');
console.log(` 결과: ${pass} PASS / ${fail} FAIL  (총 ${pass + fail})`);
console.log('------------------------------------------------------');
process.exit(fail ? 1 : 0);
