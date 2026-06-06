/* ============================================================
   omok-ai.js — 오목 AI 순수 로직 (Node 테스트/진단 공용 모듈)
   ★ script.js의 AI 결정 로직을 1:1 미러. script.js 수정 시 동기화.
     (script.js는 IIFE+document 의존이라 직접 require 불가하므로 미러 유지)
   ============================================================ */
'use strict';


// ── 상수 (script.js와 동일) [SYNC] ───────────────────────
const SIZE = 15, WIN = 5;
const BLACK = 'black', WHITE = 'white';
const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
const AI_RADIUS = 2;
const SEARCH_DEPTH = 4, SEARCH_WIDTH = 12, WIN_SCORE = 10000000;
// 이중위협 보너스 [SYNC with script.js]
const TH_OPEN4 = 30000, TH_CLOSE4 = 12000, TH_OPEN3 = 5000, TH_DBL3 = 50000, TH_MULTI4 = 80000;

// ── 보드/룰 상태 (모듈 전역, script.js의 board/renjuMode 대응) ──
let board = null;
let renjuMode = false;

// 난이도 프리셋 + blunder [SYNC with script.js]
const AI_LEVELS = {
  beginner: { thinkMin: 250, thinkMax: 550, blunder: 0.20 },
  friend:   { thinkMin: 350, thinkMax: 700, blunder: 0.10 },
  seasoned: { thinkMin: 400, thinkMax: 800, blunder: 0.05 },
  master:   { thinkMin: 450, thinkMax: 900, blunder: 0    },
};
let aiLevel = 'master';

function newBoard() {
  board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
}
function inB(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

// ── 좌표 변환: "H8" ↔ [r,c]. 열=A..O, 행=1..15 (script.js 기보와 동일) ──
const COL_LABELS = 'ABCDEFGHIJKLMNO';
function parse(coord) {
  const col = COL_LABELS.indexOf(coord[0].toUpperCase());
  const row = parseInt(coord.slice(1), 10) - 1;   // 1-based → 0-based
  return [row, col];   // [r, c]
}
function name(r, c) { return COL_LABELS[c] + (r + 1); }
function put(coord, side) { const [r, c] = parse(coord); board[r][c] = side; }

// ── 엔진 로직 미러 (script.js와 1:1) [SYNC] ───────────────
function scoreLine(len, openEnds) {
  if (len >= WIN) return 1000000;
  if (len === 4) { if (openEnds === 2) return 100000; if (openEnds === 1) return 10000; return 0; }
  if (len === 3) { if (openEnds === 2) return 5000;   if (openEnds === 1) return 500;   return 0; }
  if (len === 2) { if (openEnds === 2) return 200;    if (openEnds === 1) return 30;    return 0; }
  if (len === 1) return openEnds === 2 ? 10 : 2;
  return 0;
}
function lineInfo(r, c, dr, dc, side) {
  let len = 1, rr = r + dr, cc = c + dc;
  while (inB(rr, cc) && board[rr][cc] === side) { len++; rr += dr; cc += dc; }
  const endPlus = inB(rr, cc) && board[rr][cc] === null;
  let r2 = r - dr, c2 = c - dc;
  while (inB(r2, c2) && board[r2][c2] === side) { len++; r2 -= dr; c2 -= dc; }
  const endMinus = inB(r2, c2) && board[r2][c2] === null;
  return { len, openEnds: (endPlus ? 1 : 0) + (endMinus ? 1 : 0) };
}
function makesOpenFour(r, c, dr, dc, side) {
  const info = lineInfo(r, c, dr, dc, side);
  return info.len === 4 && info.openEnds === 2;
}
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
function isForbiddenMove(r, c, side) {
  if (board[r][c] !== null) return false;
  board[r][c] = side;
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
            mark[nr][nc] = true; cands.push([nr, nc]);
          }
        }
      }
    }
  }
  if (!any) { const m = Math.floor(SIZE / 2); return [[m, m]]; }
  return cands;
}
function checkWin(r, c, side) {
  for (const [dr, dc] of DIRS) {
    const n = 1 + countDir(r, c, dr, dc, side) + countDir(r, c, -dr, -dc, side);
    if (n >= WIN) return true;
  }
  return false;
}
function countDir(r, c, dr, dc, side) {
  let n = 0, rr = r + dr, cc = c + dc;
  while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === side) { n++; rr += dr; cc += dc; }
  return n;
}
function isWinningMove(r, c, side) {
  board[r][c] = side;
  const w = checkWin(r, c, side);
  board[r][c] = null;
  return w;
}
function aiPick(side) {
  const opp = (side === BLACK) ? WHITE : BLACK;
  let cands = genCandidates();
  if (side === BLACK && renjuMode) cands = cands.filter(([r, c]) => !isForbiddenMove(r, c, BLACK));
  if (!cands.length) return null;
  for (const [r, c] of cands) if (isWinningMove(r, c, side)) return [r, c];
  for (const [r, c] of cands) if (isWinningMove(r, c, opp)) return [r, c];
  let best = null, bestScore = -Infinity;
  for (const [r, c] of cands) {
    const total = evalMove(r, c, side) + evalMove(r, c, opp) * 0.9;
    if (total > bestScore) { bestScore = total; best = [r, c]; }
  }
  return best;
}
// (b) 미니맥스 [SYNC]
function evalBoardOneSide(side) {
  let s = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== side) continue;
      for (const [dr, dc] of DIRS) {
        const pr = r - dr, pc = c - dc;
        if (inB(pr, pc) && board[pr][pc] === side) continue;
        let len = 1, rr = r + dr, cc = c + dc;
        while (inB(rr, cc) && board[rr][cc] === side) { len++; rr += dr; cc += dc; }
        const endFwd = inB(rr, cc) && board[rr][cc] === null;
        const br = r - dr, bc = c - dc;
        const endBack = inB(br, bc) && board[br][bc] === null;
        s += scoreLine(len, (endFwd ? 1 : 0) + (endBack ? 1 : 0));
      }
    }
  }
  return s;
}
function evalBoard(side) {
  const opp = (side === BLACK) ? WHITE : BLACK;
  return (evalBoardOneSide(side) + threatBonus(side))
       - (evalBoardOneSide(opp)  + threatBonus(opp));
}
function threatBonus(side) {
  let open4 = 0, close4 = 0, open3 = 0;
  const cands = genCandidates();
  for (const [r, c] of cands) {
    if (side === BLACK && renjuMode && isForbiddenMove(r, c, BLACK)) continue;
    board[r][c] = side;
    let isFive = false, best = 0;
    for (const [dr, dc] of DIRS) {
      const info = lineInfo(r, c, dr, dc, side);
      if (info.len >= WIN) { isFive = true; break; }
      if (info.len === 4) {
        if (info.openEnds === 2) best = Math.max(best, 3);
        else if (info.openEnds === 1) best = Math.max(best, 2);
      } else if (info.len === 3 && info.openEnds === 2) {
        if (isOpenThree(r, c, dr, dc, side)) best = Math.max(best, 1);
      }
    }
    board[r][c] = null;
    if (isFive) continue;
    if (best === 3) open4++; else if (best === 2) close4++; else if (best === 1) open3++;
  }
  let bonus = open4 * TH_OPEN4 + close4 * TH_CLOSE4 + open3 * TH_OPEN3;
  const fours = open4 + close4;
  if (fours >= 2 || (fours >= 1 && open3 >= 1)) bonus += TH_MULTI4;
  else if (open3 >= 2) bonus += TH_DBL3;
  return bonus;
}
function fiveOnBoard() {
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const side = board[r][c];
      if (!side) continue;
      for (const [dr, dc] of DIRS) {
        const pr = r - dr, pc = c - dc;
        if (inB(pr, pc) && board[pr][pc] === side) continue;
        let len = 1, rr = r + dr, cc = c + dc;
        while (inB(rr, cc) && board[rr][cc] === side) { len++; rr += dr; cc += dc; }
        if (len >= WIN) return side;
      }
    }
  }
  return null;
}
function orderedCands(side, width) {
  const opp = (side === BLACK) ? WHITE : BLACK;
  let cands = genCandidates();
  if (side === BLACK && renjuMode) cands = cands.filter(([r, c]) => !isForbiddenMove(r, c, BLACK));
  const scored = cands.map(([r, c]) => ({ r, c, key: evalMove(r, c, side) + evalMove(r, c, opp) }));
  scored.sort((a, b) => b.key - a.key);
  return scored.slice(0, width || SEARCH_WIDTH).map(o => [o.r, o.c]);
}
function alphabeta(toMove, rootSide, depth, alpha, beta) {
  const five = fiveOnBoard();
  if (five) { const sign = (five === rootSide) ? 1 : -1; return sign * (WIN_SCORE + depth); }
  if (depth === 0) return evalBoard(rootSide);
  const cands = orderedCands(toMove, SEARCH_WIDTH);
  if (!cands.length) return evalBoard(rootSide);
  const next = (toMove === BLACK) ? WHITE : BLACK;
  const maximizing = (toMove === rootSide);
  let best = maximizing ? -Infinity : Infinity;
  for (const [r, c] of cands) {
    board[r][c] = toMove;
    let val;
    if (checkWin(r, c, toMove)) { const sign = (toMove === rootSide) ? 1 : -1; val = sign * (WIN_SCORE + depth); }
    else val = alphabeta(next, rootSide, depth - 1, alpha, beta);
    board[r][c] = null;
    if (maximizing) { if (val > best) best = val; if (best > alpha) alpha = best; }
    else { if (val < best) best = val; if (best < beta) beta = best; }
    if (beta <= alpha) break;
  }
  return best;
}
function aiPickDepth(side) {
  const opp = (side === BLACK) ? WHITE : BLACK;
  let cands = genCandidates();
  if (side === BLACK && renjuMode) cands = cands.filter(([r, c]) => !isForbiddenMove(r, c, BLACK));
  if (!cands.length) return null;
  for (const [r, c] of cands) if (isWinningMove(r, c, side)) return [r, c];
  for (const [r, c] of cands) if (isWinningMove(r, c, opp)) return [r, c];
  // blunder 판정 [SYNC with script.js] — 즉승/즉패차단 후, 최선탐색 전.
  const lvl = AI_LEVELS[aiLevel] || AI_LEVELS.master;
  if (lvl.blunder > 0 && Math.random() < lvl.blunder) {
    return cands[Math.floor(Math.random() * cands.length)];
  }
  const ordered = orderedCands(side, SEARCH_WIDTH);
  if (!ordered.length) return aiPick(side);
  const next = (side === BLACK) ? WHITE : BLACK;
  let best = null, bestScore = -Infinity;
  for (const [r, c] of ordered) {
    board[r][c] = side;
    let val;
    if (checkWin(r, c, side)) val = WIN_SCORE + SEARCH_DEPTH;
    else val = alphabeta(next, side, SEARCH_DEPTH - 1, -Infinity, Infinity);
    board[r][c] = null;
    if (val > bestScore) { bestScore = val; best = [r, c]; }
  }
  return best || aiPick(side);
}


// ── 상태 접근자 + export ───────────────────────────────────
function _setBoard(b){ board=b; } function _getBoard(){ return board; }
function _setRenju(v){ renjuMode=v; }
function _setLevel(id){ aiLevel = id; } function _getLevel(){ return aiLevel; }
module.exports = {
  SIZE, WIN, BLACK, WHITE, DIRS, AI_RADIUS, SEARCH_DEPTH, SEARCH_WIDTH, WIN_SCORE,
  AI_LEVELS, COL_LABELS, newBoard, inB, parse, name, put,
  scoreLine, lineInfo, makesOpenFour, isOpenThree, isForbiddenMove,
  evalMove, genCandidates, checkWin, isWinningMove,
  aiPick, evalBoard, threatBonus, fiveOnBoard, orderedCands, alphabeta, aiPickDepth,
  _setBoard, _getBoard, _setRenju, _setLevel, _getLevel,
};
