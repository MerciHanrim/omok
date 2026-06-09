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
      sub: 'Gomoku · 오목',
      langLabel: '언어', bgLabel: '바둑판 배경',
      themeSansu: '산수화', themeWood: '원목', themeSipjang: '십장생', themePaper: '한지',
      black: '흑', white: '백', turnSuffix: '차례',
      pickMsg: '빈 자리를 눌러 돌을 놓으세요',
      aiThinking: '컴퓨터가 수를 고르고 있습니다…',
      undo: '무르기', reset: '처음부터',
      movelogTitle: '기 보', movelogEmpty: '아직 둔 수가 없습니다',
      win: (s) => `${s} 승리`,
      winSub: (s) => `${s} 조약돌이 다섯 줄을 완성했습니다`,
      stoneBlack: '먹빛', stoneWhite: '백자',
      winHint: '다시 두려면 ‘처음부터’를 누르세요',
      forbidden: '33 금수입니다. 흑은 열린 3을 둘 이상 만들 수 없습니다',
      ruleLabel: '룰', ruleFree: '자유룰', ruleRenju: '33 금수',
      // ── 메인 메뉴 (6단계) ──
      menuTitle: '오늘은 어떻게 두실까요?',
      modeCpu: '컴퓨터와 두기', modeCpuSub: '인공지능과 한 판',
      modeRules: '오목 규칙', modeRulesSub: '5목·33 금수 설명',
      modeSettings: '설정', modeSettingsSub: '언어·배경·좌표',
      modeComing: '준비 중입니다',
      levelPlayCpu: '컴퓨터와 두기',
      levelPickMsg: '상대를 고르세요 · 한 판이 끝나면 다시 고를 수 있습니다',
      lvBeginnerName: '초심자', lvBeginnerSub: '처음 배우는 분을 위한 상대',
      lvFriendName: '익숙한 벗', lvFriendSub: '가볍게 한 판',
      lvSeasonedName: '노련한 기객', lvSeasonedSub: '쉽게 빈틈을 보이지 않습니다',
      lvMasterName: '명인', lvMasterSub: '한 치의 빈틈도 없습니다',
      lvComingNote: '(준비 중 · 곧 만날 수 있습니다)',
      chooseSide: '어느 돌로 두실까요?',
      sideBlackName: '흑', sideBlackSub: '먹빛 · 선공',
      sideWhiteName: '백', sideWhiteSub: '백자 · 후공',
      sideRandomName: '무작위', sideRandomSub: '운에 맡기기',
      sideNote: '흑이 먼저 둡니다 · 한 판이 끝나면 다시 고를 수 있습니다',
      chooseRule: '어떤 룰로 두실까요?',
      ruleFreeName: '자유룰', ruleFreeSub: '먼저 5목을 만들면 승리',
      ruleRenjuName: '33 금수', ruleRenjuSub: '흑은 열린 3을 둘 이상 동시에 못 둠',
      ruleNote: '대국이 시작되면 룰은 고정됩니다',
      rulesTitle: '오목 규칙', rulesSubtitle: '대국을 시작하기 전에 알아두면 좋은 기본 규칙',
      rulesClose: '닫기',
      rulesSections: [
        { title: '오목이란', body: '가로·세로 15줄이 만나는 교차점에 흑과 백이 번갈아 돌을 놓습니다. 흑이 먼저 둡니다.' },
        { title: '승리 조건', body: '자신의 돌을 가로·세로·대각선 중 한 방향으로 다섯 개 연달아 놓으면 이깁니다.' },
        { title: '자유룰', body: '특별한 금지 없이 먼저 다섯을 만들면 이깁니다. 여섯 개 이상(장목)으로도 이길 수 있습니다.' },
        { title: '33 금수 (선택)', body: '흑에게만 적용되는 제약입니다. 한 수로 \'열린 3\'을 둘 이상 동시에 만드는 자리에는 둘 수 없습니다. 백에는 제약이 없습니다.' },
      ],
      aboutTitle: '소개',
      aboutClose: '닫기',
      aboutSourceLabel: '출처 ↗',
      aboutTagline: '정성을 담아 만들었습니다',
      aboutSections: [
        { title: '소개', body: '오목은 돌 다섯 개를 가로·세로·대각선 중 한 줄로 먼저 잇는 보드게임입니다. 흔히 Gomoku 또는 Five in a Row로도 알려져 있습니다.' },
        { title: '제작', body: 'Hanrim', link: { url: 'https://cozyshelter.tistory.com', label: 'Cozy Shelter' } },
        { title: '그래픽', body: '오목판 · 돌 디자인 · 이 프로젝트를 위해 제작' },
        { title: '사운드', items: [
          { label: '착수음', by: 'taure', url: 'https://pixabay.com/sound-effects/board-game-pieces-59039/' },
          { label: '승리', by: 'Sarah H', url: 'https://pixabay.com/users/astralsynthesizer-50776509/' },
          { label: '패배', by: 'Universfield', url: 'https://pixabay.com/users/universfield-28281460/' },
        ] },
        { title: 'AI 엔진', body: '직접 구현한 탐색 AI · Alpha-Beta Minimax · MIT', link: { url: 'https://github.com/MerciHanrim/omok', label: 'GitHub' } },
      ],
    },
    en: {
      sub: 'Gomoku · Five in a Row',
      langLabel: 'Language', bgLabel: 'Board',
      themeSansu: 'Landscape', themeWood: 'Wood', themeSipjang: 'Sipjangsaeng', themePaper: 'Hanji',
      black: 'Black', white: 'White', turnSuffix: 'to move',
      pickMsg: 'Tap an empty point to place a stone',
      aiThinking: 'The computer is choosing a move…',
      undo: 'Undo', reset: 'Restart',
      movelogTitle: 'Moves', movelogEmpty: 'No moves yet',
      win: (s) => `${s} wins`,
      winSub: (s) => `${s} completed a row of five`,
      stoneBlack: 'Ink', stoneWhite: 'Porcelain',
      winHint: 'Press “Restart” to play again',
      forbidden: 'Forbidden (double-three). Black cannot make two open threes at once',
      ruleLabel: 'Rule', ruleFree: 'Free', ruleRenju: 'Renju (3-3)',
      menuTitle: 'How would you like to play today?',
      modeCpu: 'Play vs Computer', modeCpuSub: 'A game against the AI',
      modeRules: 'Omok Rules', modeRulesSub: 'Five-in-a-row & 3-3',
      modeSettings: 'Settings', modeSettingsSub: 'Language, board, coordinates',
      modeComing: 'Coming soon',
      levelPlayCpu: 'Play vs Computer',
      levelPickMsg: 'Choose an opponent · you can pick again after each game',
      lvBeginnerName: 'Beginner', lvBeginnerSub: 'For those just starting out',
      lvFriendName: 'Familiar Friend', lvFriendSub: 'A casual game',
      lvSeasonedName: 'Seasoned Player', lvSeasonedSub: 'Rarely leaves an opening',
      lvMasterName: 'Master', lvMasterSub: 'Flawless, without a single gap',
      lvComingNote: '(coming soon)',
      chooseSide: 'Which stones will you play?',
      sideBlackName: 'Black', sideBlackSub: 'Ink · moves first',
      sideWhiteName: 'White', sideWhiteSub: 'Porcelain · moves second',
      sideRandomName: 'Random', sideRandomSub: 'Leave it to chance',
      sideNote: 'Black moves first · you can pick again after each game',
      chooseRule: 'Which rule set?',
      ruleFreeName: 'Free', ruleFreeSub: 'First to five in a row wins',
      ruleRenjuName: 'Renju (3-3)', ruleRenjuSub: 'Black cannot make two open threes at once',
      ruleNote: 'The rule is locked once the game begins',
      rulesTitle: 'Omok Rules', rulesSubtitle: 'A few basics worth knowing before you play',
      rulesClose: 'Close',
      rulesSections: [
        { title: 'What is Omok', body: 'Black and white take turns placing stones on the intersections of a 15x15 grid. Black goes first.' },
        { title: 'How to win', body: 'Line up five of your own stones in a row, horizontally, vertically, or diagonally.' },
        { title: 'Free rule', body: 'No restrictions; the first to make five wins. Six or more in a row also wins.' },
        { title: '3-3 rule (optional)', body: 'A restriction on Black only. Black may not play a move that creates two or more open threes at once. White has no restriction.' },
      ],
      aboutTitle: 'About',
      aboutClose: 'Close',
      aboutSourceLabel: 'Source ↗',
      aboutTagline: 'Made with care',
      aboutSections: [
        { title: 'About', body: 'Omok is a board game in which you race to line up five stones in a row, horizontally, vertically, or diagonally. It is also known as Gomoku or Five in a Row.' },
        { title: 'Made by', body: 'Hanrim', link: { url: 'https://cozyshelter.tistory.com', label: 'Cozy Shelter' } },
        { title: 'Graphics', body: 'Board & stone design · created for this project' },
        { title: 'Sound', items: [
          { label: 'Stone placement', by: 'taure', url: 'https://pixabay.com/sound-effects/board-game-pieces-59039/' },
          { label: 'Victory', by: 'Sarah H', url: 'https://pixabay.com/users/astralsynthesizer-50776509/' },
          { label: 'Defeat', by: 'Universfield', url: 'https://pixabay.com/users/universfield-28281460/' },
        ] },
        { title: 'AI engine', body: 'Self-built search AI · Alpha-Beta Minimax · MIT', link: { url: 'https://github.com/MerciHanrim/omok', label: 'GitHub' } },
      ],
    },
    'zh-Hans': {
      sub: 'Gomoku · 五子棋',
      langLabel: '语言', bgLabel: '棋盘',
      themeSansu: '山水画', themeWood: '原木', themeSipjang: '十长生', themePaper: '韩纸',
      black: '黑', white: '白', turnSuffix: '行棋',
      pickMsg: '点击空交叉点落子',
      aiThinking: '电脑正在思考落子…',
      undo: '悔棋', reset: '重新开始',
      movelogTitle: '棋 谱', movelogEmpty: '尚无棋步',
      win: (s) => `${s}方胜`,
      winSub: (s) => `${s}连成五子`,
      stoneBlack: '墨色', stoneWhite: '白瓷',
      winHint: '按“重新开始”再下一局',
      forbidden: '禁手（双三）。黑方不可同时形成两个活三',
      ruleLabel: '规则', ruleFree: '自由规则', ruleRenju: '禁手（三三）',
      menuTitle: '今天想怎么下？',
      modeCpu: '与电脑对弈', modeCpuSub: '与人工智能下一局',
      modeRules: '五子棋规则', modeRulesSub: '五连珠与禁手',
      modeSettings: '设置', modeSettingsSub: '语言·棋盘·坐标',
      modeComing: '敬请期待',
      levelPlayCpu: '与电脑对弈',
      levelPickMsg: '选择对手 · 每局结束后可重新选择',
      lvBeginnerName: '初学者', lvBeginnerSub: '为初学者准备的对手',
      lvFriendName: '熟悉的棋友', lvFriendSub: '轻松下一局',
      lvSeasonedName: '老练棋客', lvSeasonedSub: '不易露出破绽',
      lvMasterName: '名手', lvMasterSub: '滴水不漏',
      lvComingNote: '（敬请期待）',
      chooseSide: '执哪种棋子？',
      sideBlackName: '黑', sideBlackSub: '墨色 · 先手',
      sideWhiteName: '白', sideWhiteSub: '白瓷 · 后手',
      sideRandomName: '随机', sideRandomSub: '交给运气',
      sideNote: '黑方先行 · 每局结束后可重新选择',
      chooseRule: '用哪种规则？',
      ruleFreeName: '自由规则', ruleFreeSub: '先连成五子者胜',
      ruleRenjuName: '禁手（三三）', ruleRenjuSub: '黑方不可同时形成两个活三',
      ruleNote: '对局开始后规则将被锁定',
      rulesTitle: '五子棋规则', rulesSubtitle: '开始对局前值得了解的基本规则',
      rulesClose: '关闭',
      rulesSections: [
        { title: '什么是五子棋', body: '黑白双方在15×15棋盘的交叉点上轮流落子，黑方先行。' },
        { title: '胜负条件', body: '将自己的五颗棋子在横、竖或斜方向连成一线即获胜。' },
        { title: '自由规则', body: '没有特别禁制，先连成五子者胜。连成六子以上（长连）亦可获胜。' },
        { title: '禁手（三三，可选）', body: '仅对黑方的限制。黑方不可在一手内同时形成两个或以上的活三。白方无限制。' },
      ],
      aboutTitle: '关于',
      aboutClose: '关闭',
      aboutSourceLabel: '来源 ↗',
      aboutTagline: '用心制作',
      aboutSections: [
        { title: '关于', body: '五子棋是抢先将五颗棋子连成一线（横·竖·斜）的棋类游戏，也称为 Gomoku 或 Five in a Row。' },
        { title: '制作', body: 'Hanrim', link: { url: 'https://cozyshelter.tistory.com', label: 'Cozy Shelter' } },
        { title: '图像', body: '棋盘与棋子设计 · 为本项目制作' },
        { title: '音效', items: [
          { label: '落子音', by: 'taure', url: 'https://pixabay.com/sound-effects/board-game-pieces-59039/' },
          { label: '胜利', by: 'Sarah H', url: 'https://pixabay.com/users/astralsynthesizer-50776509/' },
          { label: '失败', by: 'Universfield', url: 'https://pixabay.com/users/universfield-28281460/' },
        ] },
        { title: 'AI 引擎', body: '自行实现的搜索 AI · Alpha-Beta Minimax · MIT', link: { url: 'https://github.com/MerciHanrim/omok', label: 'GitHub' } },
      ],
    },
    'zh-Hant': {
      sub: 'Gomoku · 五子棋',
      langLabel: '語言', bgLabel: '棋盤',
      themeSansu: '山水畫', themeWood: '原木', themeSipjang: '十長生', themePaper: '韓紙',
      black: '黑', white: '白', turnSuffix: '行棋',
      pickMsg: '點擊空交叉點落子',
      aiThinking: '電腦正在思考落子…',
      undo: '悔棋', reset: '重新開始',
      movelogTitle: '棋 譜', movelogEmpty: '尚無棋步',
      win: (s) => `${s}方勝`,
      winSub: (s) => `${s}連成五子`,
      stoneBlack: '墨色', stoneWhite: '白瓷',
      winHint: '按「重新開始」再下一局',
      forbidden: '禁手（雙三）。黑方不可同時形成兩個活三',
      ruleLabel: '規則', ruleFree: '自由規則', ruleRenju: '禁手（三三）',
      menuTitle: '今天想怎麼下？',
      modeCpu: '與電腦對弈', modeCpuSub: '與人工智慧下一局',
      modeRules: '五子棋規則', modeRulesSub: '五連珠與禁手',
      modeSettings: '設定', modeSettingsSub: '語言·棋盤·座標',
      modeComing: '敬請期待',
      levelPlayCpu: '與電腦對弈',
      levelPickMsg: '選擇對手 · 每局結束後可重新選擇',
      lvBeginnerName: '初學者', lvBeginnerSub: '為初學者準備的對手',
      lvFriendName: '熟悉的棋友', lvFriendSub: '輕鬆下一局',
      lvSeasonedName: '老練棋客', lvSeasonedSub: '不易露出破綻',
      lvMasterName: '名手', lvMasterSub: '滴水不漏',
      lvComingNote: '（敬請期待）',
      chooseSide: '執哪種棋子？',
      sideBlackName: '黑', sideBlackSub: '墨色 · 先手',
      sideWhiteName: '白', sideWhiteSub: '白瓷 · 後手',
      sideRandomName: '隨機', sideRandomSub: '交給運氣',
      sideNote: '黑方先行 · 每局結束後可重新選擇',
      chooseRule: '用哪種規則？',
      ruleFreeName: '自由規則', ruleFreeSub: '先連成五子者勝',
      ruleRenjuName: '禁手（三三）', ruleRenjuSub: '黑方不可同時形成兩個活三',
      ruleNote: '對局開始後規則將被鎖定',
      rulesTitle: '五子棋規則', rulesSubtitle: '開始對局前值得了解的基本規則',
      rulesClose: '關閉',
      rulesSections: [
        { title: '什麼是五子棋', body: '黑白雙方在15×15棋盤的交叉點上輪流落子，黑方先行。' },
        { title: '勝負條件', body: '將自己的五顆棋子在橫、豎或斜方向連成一線即獲勝。' },
        { title: '自由規則', body: '沒有特別禁制，先連成五子者勝。連成六子以上（長連）亦可獲勝。' },
        { title: '禁手（三三，可選）', body: '僅對黑方的限制。黑方不可在一手內同時形成兩個或以上的活三。白方無限制。' },
      ],
      aboutTitle: '關於',
      aboutClose: '關閉',
      aboutSourceLabel: '來源 ↗',
      aboutTagline: '用心製作',
      aboutSections: [
        { title: '關於', body: '五子棋是搶先將五顆棋子連成一線（橫·豎·斜）的棋類遊戲，也稱為 Gomoku 或 Five in a Row。' },
        { title: '製作', body: 'Hanrim', link: { url: 'https://cozyshelter.tistory.com', label: 'Cozy Shelter' } },
        { title: '圖像', body: '棋盤與棋子設計 · 為本專案製作' },
        { title: '音效', items: [
          { label: '落子音', by: 'taure', url: 'https://pixabay.com/sound-effects/board-game-pieces-59039/' },
          { label: '勝利', by: 'Sarah H', url: 'https://pixabay.com/users/astralsynthesizer-50776509/' },
          { label: '失敗', by: 'Universfield', url: 'https://pixabay.com/users/universfield-28281460/' },
        ] },
        { title: 'AI 引擎', body: '自行實作的搜尋 AI · Alpha-Beta Minimax · MIT', link: { url: 'https://github.com/MerciHanrim/omok', label: 'GitHub' } },
      ],
    },
    ja: {
      sub: 'Gomoku · 五目並べ',
      langLabel: '言語', bgLabel: '盤',
      themeSansu: '山水画', themeWood: '木目', themeSipjang: '十長生', themePaper: '韓紙',
      black: '黒', white: '白', turnSuffix: 'の番',
      pickMsg: '空いた交点を押して石を置きます',
      aiThinking: 'コンピューターが手を考えています…',
      undo: '待った', reset: '最初から',
      movelogTitle: '棋 譜', movelogEmpty: 'まだ手がありません',
      win: (s) => `${s}の勝ち`,
      winSub: (s) => `${s}が五つ並べました`,
      stoneBlack: '墨', stoneWhite: '白磁',
      winHint: '「最初から」を押すともう一局',
      forbidden: '禁じ手（三々）。黒は活三を同時に二つ作れません',
      ruleLabel: 'ルール', ruleFree: '自由', ruleRenju: '三々禁止',
      menuTitle: '今日はどう打ちましょうか？',
      modeCpu: 'コンピュータと対局', modeCpuSub: 'AIと一局',
      modeRules: '五目並べのルール', modeRulesSub: '五連と三々の説明',
      modeSettings: '設定', modeSettingsSub: '言語·盤·座標',
      modeComing: '準備中です',
      levelPlayCpu: 'コンピュータと対局',
      levelPickMsg: '相手を選んでください · 一局終わるたびに選び直せます',
      lvBeginnerName: '初心者', lvBeginnerSub: '初めての方のための相手',
      lvFriendName: '気軽な友', lvFriendSub: '軽く一局',
      lvSeasonedName: '老練な棋客', lvSeasonedSub: 'なかなか隙を見せません',
      lvMasterName: '名人', lvMasterSub: '一分の隙もありません',
      lvComingNote: '（準備中）',
      chooseSide: 'どの石で打ちますか？',
      sideBlackName: '黒', sideBlackSub: '墨 · 先手',
      sideWhiteName: '白', sideWhiteSub: '白磁 · 後手',
      sideRandomName: 'ランダム', sideRandomSub: '運に任せる',
      sideNote: '黒が先に打ちます · 一局終わるたびに選び直せます',
      chooseRule: 'どのルールで打ちますか？',
      ruleFreeName: '自由', ruleFreeSub: '先に五を作れば勝ち',
      ruleRenjuName: '三々禁止', ruleRenjuSub: '黒は活三を同時に二つ作れません',
      ruleNote: '対局が始まるとルールは固定されます',
      rulesTitle: '五目並べのルール', rulesSubtitle: '対局を始める前に知っておくとよい基本ルール',
      rulesClose: '閉じる',
      rulesSections: [
        { title: '五目並べとは', body: '黒と白が15×15の交点に交互に石を置きます。黒が先手です。' },
        { title: '勝利条件', body: '自分の石を縦・横・斜めのいずれかに五つ並べると勝ちです。' },
        { title: '自由ルール', body: '特別な禁じ手はなく、先に五つ並べれば勝ちです。六つ以上（長連）でも勝てます。' },
        { title: '三々禁止（任意）', body: '黒のみに適用される制約です。一手で活三を二つ以上同時に作る場所には打てません。白に制約はありません。' },
      ],
      aboutTitle: 'このゲームについて',
      aboutClose: '閉じる',
      aboutSourceLabel: '出典 ↗',
      aboutTagline: '心を込めて作りました',
      aboutSections: [
        { title: 'このゲームについて', body: '五目並べは、石を縦・横・斜めのいずれかに五つ先に並べるボードゲームです。Gomoku や Five in a Row とも呼ばれます。' },
        { title: '制作', body: 'Hanrim', link: { url: 'https://cozyshelter.tistory.com', label: 'Cozy Shelter' } },
        { title: 'グラフィック', body: '盤と石のデザイン · 本プロジェクトのために制作' },
        { title: 'サウンド', items: [
          { label: '着手音', by: 'taure', url: 'https://pixabay.com/sound-effects/board-game-pieces-59039/' },
          { label: '勝利', by: 'Sarah H', url: 'https://pixabay.com/users/astralsynthesizer-50776509/' },
          { label: '敗北', by: 'Universfield', url: 'https://pixabay.com/users/universfield-28281460/' },
        ] },
        { title: 'AIエンジン', body: '自作の探索AI · Alpha-Beta Minimax · MIT', link: { url: 'https://github.com/MerciHanrim/omok', label: 'GitHub' } },
      ],
    },
    de: {
      sub: 'Gomoku · Fünf in einer Reihe',
      langLabel: 'Sprache', bgLabel: 'Brett',
      themeSansu: 'Landschaft', themeWood: 'Holz', themeSipjang: 'Sipjangsaeng', themePaper: 'Hanji',
      black: 'Schwarz', white: 'Weiß', turnSuffix: 'am Zug',
      pickMsg: 'Tippe auf einen leeren Punkt, um zu setzen',
      aiThinking: 'Der Computer überlegt seinen Zug …',
      undo: 'Zurück', reset: 'Neu starten',
      movelogTitle: 'Züge', movelogEmpty: 'Noch keine Züge',
      win: (s) => `${s} gewinnt`,
      winSub: (s) => `${s} hat fünf in einer Reihe`,
      stoneBlack: 'Tusche', stoneWhite: 'Porzellan',
      winHint: '„Neu starten“ für eine neue Partie',
      forbidden: 'Verboten (Doppel-Drei). Schwarz darf nicht zwei offene Dreien zugleich bilden',
      ruleLabel: 'Regel', ruleFree: 'Frei', ruleRenju: 'Renju (3-3)',
      menuTitle: 'Wie möchten Sie heute spielen?',
      modeCpu: 'Gegen Computer', modeCpuSub: 'Eine Partie gegen die KI',
      modeRules: 'Omok-Regeln', modeRulesSub: 'Fünf in einer Reihe & 3-3',
      modeSettings: 'Einstellungen', modeSettingsSub: 'Sprache, Brett, Koordinaten',
      modeComing: 'Demnächst',
      levelPlayCpu: 'Gegen Computer',
      levelPickMsg: 'Wählen Sie einen Gegner · nach jeder Partie neu wählbar',
      lvBeginnerName: 'Anfänger', lvBeginnerSub: 'Für alle, die gerade beginnen',
      lvFriendName: 'Vertrauter Freund', lvFriendSub: 'Eine lockere Partie',
      lvSeasonedName: 'Erfahrener Spieler', lvSeasonedSub: 'Zeigt selten eine Blöße',
      lvMasterName: 'Meister', lvMasterSub: 'Makellos, ohne jede Lücke',
      lvComingNote: '(demnächst)',
      chooseSide: 'Mit welchen Steinen spielen Sie?',
      sideBlackName: 'Schwarz', sideBlackSub: 'Tusche · zieht zuerst',
      sideWhiteName: 'Weiß', sideWhiteSub: 'Porzellan · zieht als Zweiter',
      sideRandomName: 'Zufall', sideRandomSub: 'Dem Glück überlassen',
      sideNote: 'Schwarz zieht zuerst · nach jeder Partie neu wählbar',
      chooseRule: 'Welches Regelwerk?',
      ruleFreeName: 'Frei', ruleFreeSub: 'Wer zuerst fünf in einer Reihe hat, gewinnt',
      ruleRenjuName: 'Renju (3-3)', ruleRenjuSub: 'Schwarz darf nicht zwei offene Dreien zugleich bilden',
      ruleNote: 'Die Regel wird zu Spielbeginn festgelegt',
      rulesTitle: 'Omok-Regeln', rulesSubtitle: 'Einige Grundlagen vor dem Spiel',
      rulesClose: 'Schließen',
      rulesSections: [
        { title: 'Was ist Omok', body: 'Schwarz und Weiß setzen abwechselnd Steine auf die Schnittpunkte eines 15x15-Gitters. Schwarz beginnt.' },
        { title: 'Siegbedingung', body: 'Bringen Sie fünf eigene Steine waagerecht, senkrecht oder diagonal in eine Reihe.' },
        { title: 'Freie Regel', body: 'Keine Beschränkungen; wer zuerst fünf bildet, gewinnt. Auch sechs oder mehr (Langreihe) gewinnen.' },
        { title: '3-3-Regel (optional)', body: 'Eine Beschränkung nur für Schwarz. Schwarz darf keinen Zug machen, der zugleich zwei oder mehr offene Dreien bildet. Weiß ist nicht beschränkt.' },
      ],
      aboutTitle: 'Über',
      aboutClose: 'Schließen',
      aboutSourceLabel: 'Quelle ↗',
      aboutTagline: 'Mit Sorgfalt erstellt',
      aboutSections: [
        { title: 'Über', body: 'Omok ist ein Brettspiel, bei dem man als Erster fünf Steine in eine Reihe bringt – waagrecht, senkrecht oder diagonal. Auch bekannt als Gomoku oder Five in a Row.' },
        { title: 'Erstellt von', body: 'Hanrim', link: { url: 'https://cozyshelter.tistory.com', label: 'Cozy Shelter' } },
        { title: 'Grafik', body: 'Brett- & Steindesign · für dieses Projekt erstellt' },
        { title: 'Sound', items: [
          { label: 'Steinsetzung', by: 'taure', url: 'https://pixabay.com/sound-effects/board-game-pieces-59039/' },
          { label: 'Sieg', by: 'Sarah H', url: 'https://pixabay.com/users/astralsynthesizer-50776509/' },
          { label: 'Niederlage', by: 'Universfield', url: 'https://pixabay.com/users/universfield-28281460/' },
        ] },
        { title: 'KI-Engine', body: 'Selbst entwickelte Such-KI · Alpha-Beta Minimax · MIT', link: { url: 'https://github.com/MerciHanrim/omok', label: 'GitHub' } },
      ],
    },
    fr: {
      sub: 'Gomoku · Cinq en ligne',
      langLabel: 'Langue', bgLabel: 'Plateau',
      themeSansu: 'Paysage', themeWood: 'Bois', themeSipjang: 'Sipjangsaeng', themePaper: 'Hanji',
      black: 'Noir', white: 'Blanc', turnSuffix: 'au trait',
      pickMsg: 'Touchez un point vide pour poser une pierre',
      aiThinking: 'L’ordinateur réfléchit à son coup…',
      undo: 'Annuler', reset: 'Recommencer',
      movelogTitle: 'Coups', movelogEmpty: 'Aucun coup pour l’instant',
      win: (s) => `${s} gagne`,
      winSub: (s) => `${s} a aligné cinq pierres`,
      stoneBlack: 'Encre', stoneWhite: 'Porcelaine',
      winHint: 'Appuyez sur « Recommencer » pour rejouer',
      forbidden: 'Interdit (double trois). Noir ne peut former deux trois ouverts à la fois',
      ruleLabel: 'Règle', ruleFree: 'Libre', ruleRenju: 'Renju (3-3)',
      menuTitle: 'Comment voulez-vous jouer aujourd’hui ?',
      modeCpu: 'Jouer contre l’ordinateur', modeCpuSub: 'Une partie contre l’IA',
      modeRules: 'Règles de l’Omok', modeRulesSub: 'Cinq en ligne & 3-3',
      modeSettings: 'Réglages', modeSettingsSub: 'Langue, plateau, coordonnées',
      modeComing: 'Bientôt disponible',
      levelPlayCpu: 'Jouer contre l’ordinateur',
      levelPickMsg: 'Choisissez un adversaire · vous pourrez rechoisir après chaque partie',
      lvBeginnerName: 'Débutant', lvBeginnerSub: 'Pour ceux qui débutent',
      lvFriendName: 'Ami familier', lvFriendSub: 'Une partie décontractée',
      lvSeasonedName: 'Joueur aguerri', lvSeasonedSub: 'Laisse rarement une ouverture',
      lvMasterName: 'Maître', lvMasterSub: 'Sans la moindre faille',
      lvComingNote: '(bientôt disponible)',
      chooseSide: 'Avec quelles pierres jouez-vous ?',
      sideBlackName: 'Noir', sideBlackSub: 'Encre · joue en premier',
      sideWhiteName: 'Blanc', sideWhiteSub: 'Porcelaine · joue en second',
      sideRandomName: 'Aléatoire', sideRandomSub: 'Laisser au hasard',
      sideNote: 'Noir joue en premier · vous pourrez rechoisir après chaque partie',
      chooseRule: 'Quel jeu de règles ?',
      ruleFreeName: 'Libre', ruleFreeSub: 'Le premier à aligner cinq gagne',
      ruleRenjuName: 'Renju (3-3)', ruleRenjuSub: 'Noir ne peut former deux trois ouverts à la fois',
      ruleNote: 'La règle est figée au début de la partie',
      rulesTitle: 'Règles de l’Omok', rulesSubtitle: 'Quelques bases utiles avant de jouer',
      rulesClose: 'Fermer',
      rulesSections: [
        { title: 'Qu’est-ce que l’Omok', body: 'Noir et Blanc posent tour à tour des pierres sur les intersections d’une grille 15x15. Noir commence.' },
        { title: 'Condition de victoire', body: 'Alignez cinq de vos pierres horizontalement, verticalement ou en diagonale.' },
        { title: 'Règle libre', body: 'Aucune restriction ; le premier à aligner cinq gagne. Six ou plus (longue ligne) gagnent aussi.' },
        { title: 'Règle 3-3 (optionnelle)', body: 'Une restriction pour Noir uniquement. Noir ne peut jouer un coup créant deux trois ouverts ou plus à la fois. Blanc n’a aucune restriction.' },
      ],
      aboutTitle: 'À propos',
      aboutClose: 'Fermer',
      aboutSourceLabel: 'Source ↗',
      aboutTagline: 'Fait avec soin',
      aboutSections: [
        { title: 'À propos', body: 'L’Omok est un jeu de plateau où l’on cherche à aligner cinq pierres le premier, à l’horizontale, à la verticale ou en diagonale. Aussi connu sous le nom de Gomoku ou Five in a Row.' },
        { title: 'Réalisé par', body: 'Hanrim', link: { url: 'https://cozyshelter.tistory.com', label: 'Cozy Shelter' } },
        { title: 'Graphismes', body: 'Plateau & pierres · créés pour ce projet' },
        { title: 'Sons', items: [
          { label: 'Pose de pierre', by: 'taure', url: 'https://pixabay.com/sound-effects/board-game-pieces-59039/' },
          { label: 'Victoire', by: 'Sarah H', url: 'https://pixabay.com/users/astralsynthesizer-50776509/' },
          { label: 'Défaite', by: 'Universfield', url: 'https://pixabay.com/users/universfield-28281460/' },
        ] },
        { title: 'Moteur IA', body: 'IA de recherche maison · Alpha-Beta Minimax · MIT', link: { url: 'https://github.com/MerciHanrim/omok', label: 'GitHub' } },
      ],
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

  // ── 사운드 (§7 — 오목 전용 sfx. assets/sound/, 단수 폴더) ──
  // 착수음: 사람·AI 둘 다. 승/패음: endGame에서 사람 입장 기준 한 번.
  // 출처(→ ASSETS_LICENSE.md):
  //   omok_sfx_win  = Sarah H (astralsynthesizer), Pixabay
  //   omok_sfx_lose = Universfield, Pixabay
  // ★ 음소거 토글은 (c) 설정 메뉴에서 좌표 토글과 함께 넣을 예정. 지금은 소리만.
  const SFX = {
    move: new Audio('assets/sound/omok_sfx_move.mp3'),
    win:  new Audio('assets/sound/omok_sfx_win.mp3'),
    lose: new Audio('assets/sound/omok_sfx_lose.mp3'),
  };
  for (const a of Object.values(SFX)) a.preload = 'auto';

  // PC는 출력이 작게 들려 1.3배 증폭. 모바일은 그대로(증폭 없음).
  // audio.volume은 최대 1.0이라, 1.0 초과 증폭은 Web Audio GainNode로 처리.
  const _isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  let _audioCtx = null;
  if (!_isMobile && window.AudioContext) {
    try {
      _audioCtx = new AudioContext();
      for (const a of Object.values(SFX)) {
        a.crossOrigin = 'anonymous';
        const src = _audioCtx.createMediaElementSource(a);
        const gain = _audioCtx.createGain();
        gain.gain.value = 1.3;          // PC 1.3배
        src.connect(gain).connect(_audioCtx.destination);
      }
    } catch (_) { _audioCtx = null; }
  }

  // 재생 헬퍼 — 되감아 연타 대응. 파일 없음/자동재생 차단은 조용히 무시.
  function playSfx(name) {
    const a = SFX[name];
    if (!a) return;
    if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
    try { a.currentTime = 0; a.play().catch(() => {}); } catch (_) {}
  }

  // ── 게임 상태 ──────────────────────────────────────────
  let board, turn, moveLog, gameOver;
  let renjuMode = false;   // 33 금수 룰. 기본 OFF(자유룰). 설정에서 토글.

  // ── AI 대전 상태 (4단계 a: 평가함수 + 1수 탐색) ──────────
  // 6단계: 정식 진입은 메인 메뉴(아래). URL 파라미터는 개발용으로 유지:
  //    ?ai=white  → 메뉴 건너뛰고 사람=흑, AI=백 즉시 대국 (개발 테스트)
  //    ?ai=black  → 사람=백, AI=흑(선) 즉시 대국
  //    ?debug=1   → 로컬 2인 모드(aiSide=null) 즉시 시작 (국면 재현·금수 테스트)
  //    파라미터 없으면 → 메인 메뉴 표시(정식 흐름).
  let aiSide = null;       // BLACK / WHITE / null(2인)
  let aiThinking = false;  // AI 계산 중 사람 입력·중복 트리거 방지 플래그

  /* ── AI '생각 호흡' 프리셋 (난이도별 think 시간) ──────────────
     ★ 핵심: 계산 시간과 연출 시간을 분리한다(아래 aiMove 참조).
       오목 AI는 (a) 단계에선 계산이 매우 빨라(수 ms) 그냥 두면 돌이
       기계처럼 툭 튀어나온다. 그래서 매 수마다 thinkMin~thinkMax 사이
       무작위 '호흡 시간'을 목표로 잡고, 실제 계산에 쓴 시간을 뺀
       나머지만큼만 더 기다렸다가 착수한다(빠르면 호흡 채우고, 느리면
       호흡 안에 흡수). 장기의 think 호흡 철학(thinkMin/Max)을 계승.
     ★ 5단계(blunder 난이도) 연결 자리: 지금은 master만 쓰지만 4단계를
       미리 박아둔다. chooseLevel(id)에서 `aiLevel = id` 한 줄만 더하면
       난이도별로 호흡이 달라진다(초심자=짧게 … 명인=가장 차분하게).
       단위는 ms. measure not guess — 체감 보고 숫자만 조정. */
  // 난이도별 프리셋: think 호흡(ms) + blunder 확률 + blunder 윈도우.
  // ★ blunder = '최선(1등)을 포기하고 차선책을 두는' 확률(5단계).
  //   단 즉승/즉패차단은 blunder와 무관하게 항상 유지(aiPickDepth ①②).
  //   ★ 차선책 방식: 완전 무작위가 아니라 orderedCands(평가·정렬된 후보)의
  //     지정 구간 window=[lo,hi](0-기반, hi 포함)에서 무작위로 고른다.
  //     이래야 '판 흐름 안의 헐거운 수'가 되고, 전선 밖 외딴 착수(M4 같은)가
  //     안 나온다 — "약하다 ≠ 고장났다". (한림 결정)
  //   값/윈도우는 장기 난이도 인격 + 실기 진단 계승.
  const AI_LEVELS = {
    beginner: { thinkMin: 250, thinkMax: 550, blunder: 0.30, window: [2, 9] },  // 🌱 실수 자주
    friend:   { thinkMin: 350, thinkMax: 700, blunder: 0.15, window: [1, 6] },  // 🍃 가끔 헐거움
    seasoned: { thinkMin: 400, thinkMax: 800, blunder: 0.07, window: [1, 3] },  // 🎋 드물게 빈틈
    master:   { thinkMin: 450, thinkMax: 900, blunder: 0,    window: null   },  // 🏮 빈틈 없음
  };
  let aiLevel = 'master';  // chooseLevel(id)에서 세팅. 기본 명인.
  // 초반 blunder 면제: AI(side) 자신의 착수가 이 개수 이하인 동안 blunder 스킵.
  //   3 = AI의 1·2·3번째 수는 명인 정석, 4번째부터 난이도별 blunder.
  //   사람도 오목 초반 3수는 크게 안 틀린다 → '첫 수부터 약하게 둔' 티 방지.
  //   초반은 누가 둬도 천원 근처라 blunder 약화효과도 적다.
  const BLUNDER_FREE_MOVES = 3;
  let useMenu = true;      // 메뉴로 진입하는가 (URL 파라미터 있으면 false)
  (function readAiParam() {
    const params = new URLSearchParams(location.search);
    const p = params.get('ai');
    if (p === 'black') { aiSide = BLACK; useMenu = false; }
    else if (p === 'white') { aiSide = WHITE; useMenu = false; }
    else if (params.get('debug') === '1') { aiSide = null; useMenu = false; }
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
    playSfx('move');
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

  /* ============================================================
     ── AI 대전 엔진 — 4단계 (b): 알파베타 미니맥스 깊이 확장 ──────
     (a)의 약점: aiPick은 각 후보를 '한 수'로만 평가해서
       (내 공격 + 상대 위협×0.9) 최고점을 고른다. 그래서 상대가
       "이번 수는 위협이 아니지만 다음 수에 열린3 두 개가 동시에
       열리는" 자리를 두면 막을 이유를 못 본다 = 이중위협에 뚫림.
       (한림이 명인을 이긴 그 판이 바로 이 구멍을 찔렀다.)

     (b)의 해법: 평가함수(scoreLine/lineInfo)는 그대로 두고,
       그 위에 알파베타 탐색 한 겹만 얹는다. 한 수가 아니라
       '내가 두고 → 상대가 최선으로 응수하고 → 내가 또 두는'
       수읽기를 하므로, 한 수 뒤에 터지는 이중위협도 보인다.

     설계:
       1) evalBoard(side)  : 보드 전체를 side 관점 점수로(내 라인합 − 상대 라인합).
                             미니맥스 리프 평가. scoreLine/lineInfo 재사용.
       2) hasFiveOnBoard() : 현재 보드에 5목이 있나(탐색 중 종료 판정).
       3) orderedCands(side): genCandidates를 evalMove(공+수)로 정렬, 상위 N개만
                             (이동순서 — 알파베타 가지치기 효율 ↑, 분기 ↓).
       4) alphabeta(...)   : 음의 미니맥스 + 알파베타. 깊이 0이면 evalBoard.
       5) aiPickDepth(side): 새 진입점. ①즉승 ②상대즉승차단은 (a)처럼 즉시 처리
                             (탐색 낭비 방지), 나머지를 깊이 SEARCH_DEPTH로 탐색.
     ★ 호흡(aiMove)은 손대지 않는다 — aiPick 자리만 aiPickDepth로 바꾸면
       실제 계산이 길어져도 thinkMax 안에 흡수된다(설계상 이미 그렇게 돼 있음).
     ============================================================ */

  // 탐색 깊이. ★ 4 확정 (실기 검증).
  //   깊이 2는 "2수 뒤 이중위협 완성" 시퀀스를 못 읽어 방어를 놓친다 —
  //   무르기 없이 후수(백)에게 진 기보로 확인(12수 흑이 K6을 둬 백 대각
  //   이중위협 G6-H7-I8-J9-K10을 허용). 깊이 3부터 그 자리(I9)를 막고,
  //   깊이 4는 더 안전하며 중반 ~104ms로 thinkMin(450) 안에 흡수된다.
  //   평가함수(threatBonus)는 위협을 '인식'은 하나, 그 인식이 '방어 선택'으로
  //   이어지려면 미니맥스가 시퀀스를 읽을 깊이가 필요하다 — 그게 깊이 4.
  const SEARCH_DEPTH = 4;
  // 각 노드에서 탐색할 후보 상한(이동순서 상위 N). 오목 분기 억제 핵심.
  const SEARCH_WIDTH = 12;
  // evalBoard에서 5목은 압도적 큰 값으로(탐색 종료선 명확화).
  const WIN_SCORE = 10000000;

  /* ── 이중위협(threat) 보너스 — (b) 핵심 보강 ──────────────────
     문제: 깊이 2~6 알파베타로도 백이 자기 공격에 몰입해 상대의
       '다음 한 수로 완성되는 이중위협'을 방치했다(측정으로 확인).
       원인은 깊이가 아니라 평가 기준 — 놓인 돌의 라인 점수는 보는데
       '곧 만들 수 있는 위협 개수'를 점수로 못 봤다.
     해법: evalBoard에 "이 색이 지금 한 수로 만들 수 있는 위협 자리"를
       종류별로 세서 가산. 오목은 5목·열린4·이중위협이 사실상 전부라
       이 인식이 곧 핵심 규칙이다.
     ★ 값은 보수적으로 시작(한림 결정). 과하게 공격적이면 낮춘다.
       위계: 즉승/즉패차단 > 다중4 > 열린4 > 이중 열린3 > 닫힌4 > 열린3. */
  const TH_OPEN4   = 30000;  // 열린4 만드는 자리 1개당
  const TH_CLOSE4  = 12000;  // 닫힌4(선수 위협) 자리 1개당
  const TH_OPEN3   = 5000;   // 열린3 자리 1개당 (라인점수 5000과 동급 — 후보)
  const TH_DBL3    = 50000;  // 열린3 자리 2개 이상 → 추가(게임 방향을 바꾸는 위협)
  const TH_MULTI4  = 80000;  // 4류(열린4/닫힌4) 포함 다중 threat → 추가

  // 보드 전체를 side 관점에서 평가: (내 모든 라인 점수) − (상대 모든 라인 점수).
  // 한 칸 단위 evalMove와 달리, 놓인 모든 돌의 4방향 라인을 합산한다.
  // 같은 라인을 양끝 돌에서 중복 계산하지 않도록 '라인 시작점'에서만 센다
  //   (이전 칸이 같은 색이면 그 라인은 이미 셈 → 건너뜀).
  function evalBoardOneSide(side) {
    let s = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] !== side) continue;
        for (const [dr, dc] of DIRS) {
          const pr = r - dr, pc = c - dc;
          // 라인 시작점에서만 계산(앞 칸이 같은 색이면 중복 → skip)
          if (inB(pr, pc) && board[pr][pc] === side) continue;
          // 이 시작점에서 연속 길이 + 양끝 열림 측정
          let len = 1, rr = r + dr, cc = c + dc;
          while (inB(rr, cc) && board[rr][cc] === side) { len++; rr += dr; cc += dc; }
          const endFwd = inB(rr, cc) && board[rr][cc] === null;
          const br = r - dr, bc = c - dc;
          const endBack = inB(br, bc) && board[br][bc] === null;
          const openEnds = (endFwd ? 1 : 0) + (endBack ? 1 : 0);
          s += scoreLine(len, openEnds);
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

  // ★ side가 '지금 한 수로 만들 수 있는 위협 자리'를 종류별로 세서 보너스 점수.
  //   genCandidates 범위(돌 주변 빈칸)만 본다 — 멀리 떨어진 빈칸은 위협 불가.
  //   한 자리가 열린4/닫힌4/열린3 중 무엇을 만드는지 4방향 중 '최고 등급'으로 분류.
  //   흑+renju면 금수 자리는 둘 수 없으니 위협으로 세지 않는다.
  //   ※ 부작용 없음: 가상 착수 후 반드시 되돌린다.
  function threatBonus(side) {
    let open4 = 0, close4 = 0, open3 = 0;
    const cands = genCandidates();
    for (const [r, c] of cands) {
      if (side === BLACK && renjuMode && isForbiddenMove(r, c, BLACK)) continue;
      board[r][c] = side;
      // 이 자리가 즉시 5목이면 위협 보너스 대상이 아님(승부는 5목 점수가 처리)
      let isFive = false, best = 0;  // best: 3=열린4, 2=닫힌4, 1=열린3
      for (const [dr, dc] of DIRS) {
        const info = lineInfo(r, c, dr, dc, side);
        if (info.len >= WIN) { isFive = true; break; }
        if (info.len === 4) {
          if (info.openEnds === 2) best = Math.max(best, 3);
          else if (info.openEnds === 1) best = Math.max(best, 2);
        } else if (info.len === 3 && info.openEnds === 2) {
          // 진짜 열린3인지(한 수 더 두면 열린4) 확인 — isOpenThree 재사용
          if (isOpenThree(r, c, dr, dc, side)) best = Math.max(best, 1);
        }
      }
      board[r][c] = null;
      if (isFive) continue;
      if (best === 3) open4++;
      else if (best === 2) close4++;
      else if (best === 1) open3++;
    }
    let bonus = open4 * TH_OPEN4 + close4 * TH_CLOSE4 + open3 * TH_OPEN3;
    // 다중 위협 가산: 4류가 둘 이상이거나 4류+3류면 강력(상대가 한 번에 못 막음).
    const fours = open4 + close4;
    if (fours >= 2 || (fours >= 1 && open3 >= 1)) bonus += TH_MULTI4;
    // 열린3 2개 이상(4류 없이도) — 전형적 쌍삼 위협.
    else if (open3 >= 2) bonus += TH_DBL3;
    return bonus;
  }

  // 현재 보드에 5목(이상)이 있으면 그 색을 반환, 없으면 null.
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

  // 후보를 이동순서로 정렬해 상위 N개만. side가 둘 차례라는 전제.
  // 점수: evalMove(공격) + evalMove(상대 같은 자리 위협). 큰 순.
  // 흑+renju면 금수 자리 제외(둘 수 없으니 탐색에서도 뺀다).
  function orderedCands(side, width) {
    const opp = (side === BLACK) ? WHITE : BLACK;
    let cands = genCandidates();
    if (side === BLACK && renjuMode) {
      cands = cands.filter(([r, c]) => !isForbiddenMove(r, c, BLACK));
    }
    const scored = cands.map(([r, c]) => {
      const atk = evalMove(r, c, side);
      const def = evalMove(r, c, opp);
      return { r, c, key: atk + def };
    });
    scored.sort((a, b) => b.key - a.key);
    const lim = width || SEARCH_WIDTH;
    return scored.slice(0, lim).map(o => [o.r, o.c]);
  }

  // 음의 미니맥스 + 알파베타. toMove가 둘 차례. rootSide 관점 점수를 반환.
  //   depth==0 또는 5목 종료면 evalBoard(rootSide).
  // ★ 부작용 없음: board에 두고 재귀 후 반드시 되돌린다.
  function alphabeta(toMove, rootSide, depth, alpha, beta) {
    const five = fiveOnBoard();
    if (five) {
      // 이미 누군가 5목 — rootSide가 이겼으면 +, 졌으면 −. 빨리 이길수록 가치↑.
      const sign = (five === rootSide) ? 1 : -1;
      return sign * (WIN_SCORE + depth);   // depth 큰(=빨리 난) 승리 선호
    }
    if (depth === 0) return evalBoard(rootSide);

    const cands = orderedCands(toMove, SEARCH_WIDTH);
    if (!cands.length) return evalBoard(rootSide);

    const next = (toMove === BLACK) ? WHITE : BLACK;
    const maximizing = (toMove === rootSide);
    let best = maximizing ? -Infinity : Infinity;

    for (const [r, c] of cands) {
      board[r][c] = toMove;
      // 방금 둔 수로 5목이면 즉시 종료값(불필요한 재귀 차단)
      let val;
      if (checkWin(r, c, toMove)) {
        const sign = (toMove === rootSide) ? 1 : -1;
        val = sign * (WIN_SCORE + depth);
      } else {
        val = alphabeta(next, rootSide, depth - 1, alpha, beta);
      }
      board[r][c] = null;

      if (maximizing) {
        if (val > best) best = val;
        if (best > alpha) alpha = best;
      } else {
        if (val < best) best = val;
        if (best < beta) beta = best;
      }
      if (beta <= alpha) break;   // 가지치기
    }
    return best;
  }

  // ★ (b) AI 진입점 — 깊이 탐색으로 한 수 선택.
  //   ① 즉승 ② 상대 즉승 차단은 (a)처럼 즉시 처리(탐색 낭비 방지).
  //   그 외에는 후보마다 두고 alphabeta로 평가해 최고점.
  function aiPickDepth(side) {
    const opp = (side === BLACK) ? WHITE : BLACK;
    let cands = genCandidates();
    if (side === BLACK && renjuMode) {
      cands = cands.filter(([r, c]) => !isForbiddenMove(r, c, BLACK));
    }
    if (!cands.length) return null;

    // ① 즉승 — 그 자리에서 바로 5목
    for (const [r, c] of cands) {
      if (isWinningMove(r, c, side)) return [r, c];
    }
    // ② 상대 즉승 차단 — 상대가 다음에 5목 낼 자리를 선점
    for (const [r, c] of cands) {
      if (isWinningMove(r, c, opp)) return [r, c];
    }

    // ③ 깊이 탐색용 후보(이동순서로 평가·정렬). blunder도 이걸 재사용.
    const ordered = orderedCands(side, SEARCH_WIDTH);
    if (!ordered.length) return aiPick(side);   // 안전 폴백

    // ★ blunder 판정 (5단계 난이도) — 최선(1등)을 포기하고 '차선책'을 둔다.
    //   ①②(즉승/즉패차단)는 위에서 처리됐으니 여기 도달 = 코앞 승부는 없음.
    //   완전 무작위가 아니라 ordered의 윈도우 [lo,hi]에서만 뽑는다 →
    //   판 흐름 안의 헐거운 수가 되고 전선 밖 외딴 착수가 안 나온다.
    //   ★ 초반 면제: AI 자신의 착수가 BLUNDER_FREE_MOVES 이하면 blunder 스킵.
    //     AI 첫 3수는 정석(천원 근처), 4번째부터 헐거운 수 → '첫 수 티' 방지.
    //   명인(blunder 0)이면 이 분기는 절대 안 탄다.
    const lvl = AI_LEVELS[aiLevel] || AI_LEVELS.master;
    let myStones = 0;
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (board[r][c] === side) myStones++;
    if (myStones >= BLUNDER_FREE_MOVES &&
        lvl.blunder > 0 && lvl.window && Math.random() < lvl.blunder) {
      const lo = Math.min(lvl.window[0], ordered.length - 1);
      const hi = Math.min(lvl.window[1], ordered.length - 1);
      if (hi >= lo) {
        const pick = lo + Math.floor(Math.random() * (hi - lo + 1));
        return ordered[pick];
      }
    }

    const next = (side === BLACK) ? WHITE : BLACK;
    let best = null, bestScore = -Infinity;
    for (const [r, c] of ordered) {
      board[r][c] = side;
      let val;
      if (checkWin(r, c, side)) {
        val = WIN_SCORE + SEARCH_DEPTH;
      } else {
        val = alphabeta(next, side, SEARCH_DEPTH - 1, -Infinity, Infinity);
      }
      board[r][c] = null;
      if (val > bestScore) { bestScore = val; best = [r, c]; }
    }
    return best || aiPick(side);
  }

  // ★ AI '생각 호흡' — 계산 시간과 연출 시간을 분리한다.
  //   흐름: 차례 시작 → 상태창 "생각 중" + 입력 잠금
  //        → 실제 계산(aiPick, 매우 빠름) → 계산에 쓴 시간 측정
  //        → 목표 호흡(thinkMin~thinkMax 랜덤)에서 경과분을 뺀 나머지만 더 대기
  //        → 착수 → 상태창 복귀.
  //   이렇게 하면 ① 빨리 계산돼도 최소 호흡(thinkMin) 보장 → 기계처럼 안 튐
  //             ② (b) 미니맥스로 계산이 느려져도 호흡 안에 흡수 → 이중 지연 없음.
  //   ★ aiThinking 플래그는 호흡이 끝날 때까지 유지(이 동안 사람 입력·무르기 잠금).
  function aiMove() {
    if (gameOver || turn !== aiSide) return;
    aiThinking = true;
    updateStatus();   // "컴퓨터가 수를 고르고 있습니다…" (updateStatus에서 분기)

    // 1) 이번 수의 목표 호흡 시간(난이도 프리셋에서 무작위)
    const lv = AI_LEVELS[aiLevel] || AI_LEVELS.master;
    const targetDelay = lv.thinkMin + Math.random() * (lv.thinkMax - lv.thinkMin);

    // 2) 실제 계산을 먼저 끝내고, 거기 쓴 시간을 잰다.
    //    (계산은 동기지만 호흡 시작 시점을 기준으로 경과를 측정한다.)
    const startedAt = performance.now();
    const mv = aiPickDepth(aiSide);   // (b) 깊이 탐색. (a) aiPick은 폴백·blunder용으로 유지.
    const computeMs = performance.now() - startedAt;

    // 3) 남은 호흡만큼만 더 기다렸다가 착수(계산이 호흡보다 길었으면 즉시).
    const remaining = Math.max(0, targetDelay - computeMs);
    setTimeout(() => {
      // 대기 중 게임 상태가 바뀌었으면(무르기·재시작 등) 착수 취소.
      if (gameOver || turn !== aiSide) { aiThinking = false; return; }
      aiThinking = false;
      if (!mv) { updateStatus(); return; }  // 둘 곳 없음 — (b)에서 무승부 처리
      const [r, c] = mv;
      board[r][c] = turn;
      moveLog.push({ r, c, side: turn });
      playSfx('move');
      if (checkWin(r, c, turn)) {
        render(); renderMovelog(); endGame(turn);
        return;
      }
      turn = (turn === BLACK) ? WHITE : BLACK;
      render(); updateStatus(); renderMovelog();
    }, remaining);
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
    // 사운드: AI 대전에서 승자가 AI면 사람이 진 것 → lose. 그 외(사람 승/2인) → win.
    playSfx((aiSide && winner === aiSide) ? 'lose' : 'win');
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
    // AI 차례(생각 호흡 중 포함)면 "생각 중" 안내, 아니면 평소 착수 안내.
    if (aiSide && turn === aiSide) {
      msg.textContent = t('aiThinking');
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
    // 메뉴가 열려 있으면 현재 단계도 새 언어로 다시 그림
    if (typeof menuOpen !== 'undefined' && menuOpen) {
      if (levelStep.style.display !== 'none') {
        levelStepTitle.textContent = t('menuTitle');
        if (modeGrid.style.display !== 'none') renderModeGrid();
        else showLevelGrid();
      } else if (sideStep.style.display !== 'none') {
        showSideStep();
      } else if (ruleStep.style.display !== 'none') {
        showRuleStep();
      }
    }
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
    const aboutOv = document.getElementById('aboutOverlay');
    if (aboutOv && aboutOv.style.display !== 'none') renderAbout();
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

  /* ============================================================
     ── 메인 메뉴(시작 화면) — 6단계 1차. 장기 setup-overlay 계승 ──
     목적: 룰을 대국 전에 고정. 흐름: 모드+난이도 → 흑/백 → 룰 → 대국.
       · 난이도: 명인만 활성(현재 AI=단일 강도). 나머지 3개 회색(5단계에서 연결).
       · 로컬 2인: 메뉴 비노출. ?debug=1 또는 ?ai= 로만 진입(개발용).
     ============================================================ */
  const setupOverlay = document.getElementById('setupOverlay');
  const levelStep    = document.getElementById('levelStep');
  const sideStep     = document.getElementById('sideStep');
  const ruleStep     = document.getElementById('ruleStep');
  const modeGrid     = document.getElementById('modeGrid');
  const levelSubPanel= document.getElementById('levelSubPanel');
  const levelGrid    = document.getElementById('levelGrid');
  const sideGrid     = document.getElementById('sideGrid');
  const ruleGrid     = document.getElementById('ruleGrid');
  const levelStepTitle = document.getElementById('levelStepTitle');
  const levelPlayLabel = document.getElementById('levelPlayLabel');
  const levelNote      = document.getElementById('levelNote');
  const sideStepTitle  = document.getElementById('sideStepTitle');
  const sideNote       = document.getElementById('sideNote');
  const ruleStepTitle  = document.getElementById('ruleStepTitle');
  const ruleStepNote   = document.getElementById('ruleStepNote');

  // 메뉴에서 정해지는 대국 설정 (대국 시작 시 aiSide/renjuMode로 반영)
  let pendingSide = BLACK;   // 사람이 둘 색 (흑/백/무작위 해석 후 확정)
  let menuOpen = false;

  function showSetup() {
    menuOpen = true;
    setupOverlay.classList.add('show');
    showLevelStep();
  }
  function hideSetup() {
    menuOpen = false;
    setupOverlay.classList.remove('show');
  }

  // 1단계: 모드 메뉴 (난이도 서브패널은 숨김 상태로 시작)
  function showLevelStep() {
    levelStep.style.display = '';
    sideStep.style.display = 'none';
    ruleStep.style.display = 'none';
    modeGrid.style.display = '';
    levelSubPanel.style.display = 'none';
    levelStepTitle.textContent = t('menuTitle');
    renderModeGrid();
  }

  const MODE_LIST = [
    { id: 'cpu',      nameKey: 'modeCpu',      subKey: 'modeCpuSub',      active: true },
    { id: 'rules',    nameKey: 'modeRules',    subKey: 'modeRulesSub',    active: true },
    { id: 'settings', nameKey: 'modeSettings', subKey: 'modeSettingsSub', active: true },
  ];
  function renderModeGrid() {
    modeGrid.innerHTML = '';
    for (const m of MODE_LIST) {
      const card = document.createElement('div');
      card.className = 'mode-card' + (m.active ? '' : ' mode-coming');
      card.innerHTML =
        `<span class="mode-text"><span class="mode-name">${t(m.nameKey)}</span>` +
        `<span class="mode-sub">${t(m.subKey)}</span></span>`;
      card.onclick = (e) => { e.stopPropagation(); onModeSelect(m.id); };
      modeGrid.appendChild(card);
    }
  }
  function onModeSelect(id) {
    if (id === 'cpu') showLevelGrid();
    else if (id === 'rules') openRulesOverlay();
    else if (id === 'settings') toggleSettings(true);
  }

  // 난이도 서브패널 (컴퓨터와 두기 선택 후)
  function showLevelGrid() {
    modeGrid.style.display = 'none';
    levelSubPanel.style.display = '';
    levelPlayLabel.textContent = t('levelPlayCpu');
    levelNote.textContent = t('levelPickMsg');
    renderLevelGrid();
  }
  // 난이도 4종. ★ 5단계 완료: blunder 연결되어 4단계 모두 active.
  //   강도 손잡이는 AI_LEVELS[id].blunder (명인 0 → 초심자 0.20).
  const LEVEL_LIST = [
    { id: 'beginner', emoji: '🌱', nameKey: 'lvBeginnerName', subKey: 'lvBeginnerSub', active: true },
    { id: 'friend',   emoji: '🍃', nameKey: 'lvFriendName',   subKey: 'lvFriendSub',   active: true },
    { id: 'seasoned', emoji: '🎋', nameKey: 'lvSeasonedName', subKey: 'lvSeasonedSub', active: true },
    { id: 'master',   emoji: '🏮', nameKey: 'lvMasterName',   subKey: 'lvMasterSub',   active: true },
  ];
  let levelPicking = false;
  function renderLevelGrid() {
    levelGrid.innerHTML = '';
    for (const lv of LEVEL_LIST) {
      const card = document.createElement('div');
      card.className = 'level-card' + (lv.active ? '' : ' level-coming');
      const sub = lv.active ? t(lv.subKey) : (t(lv.subKey) + ' ' + t('lvComingNote'));
      card.innerHTML =
        `<div class="lv-emoji">${lv.emoji}</div>` +
        `<div class="lv-text"><div class="lv-name">${t(lv.nameKey)}</div>` +
        `<div class="lv-sub">${sub}</div></div>`;
      if (lv.active) {
        card.onclick = (e) => { e.stopPropagation(); chooseLevel(lv.id, card); };
      } else {
        card.onclick = (e) => { e.stopPropagation(); };  // 회색: 클릭 무시
      }
      levelGrid.appendChild(card);
    }
  }
  function chooseLevel(id, cardEl) {
    if (levelPicking) return;
    levelPicking = true;
    // 선택한 난이도를 AI 상태에 반영. 지금은 think 호흡만 난이도별로 갈리고,
    // 강도(blunder)는 5단계에서 여기 같은 자리에 연결한다(active:true 전환과 함께).
    aiLevel = id;
    for (const c of levelGrid.children) c.classList.remove('current');
    if (cardEl) cardEl.classList.add('current');
    setTimeout(() => { levelPicking = false; showSideStep(); }, 420);
  }

  // 2단계: 흑/백/무작위 선택
  function showSideStep() {
    levelStep.style.display = 'none';
    sideStep.style.display = '';
    ruleStep.style.display = 'none';
    sideStepTitle.textContent = t('chooseSide');
    sideNote.textContent = t('sideNote');
    renderSideGrid();
  }
  const SIDE_LIST = [
    { id: 'black',  cls: 'black', nameKey: 'sideBlackName',  subKey: 'sideBlackSub'  },
    { id: 'white',  cls: 'white', nameKey: 'sideWhiteName',  subKey: 'sideWhiteSub'  },
    { id: 'random', cls: 'rand',  nameKey: 'sideRandomName', subKey: 'sideRandomSub' },
  ];
  function renderSideGrid() {
    sideGrid.innerHTML = '';
    for (const s of SIDE_LIST) {
      const card = document.createElement('div');
      card.className = 'side-card';
      card.innerHTML =
        `<div class="sc-stone ${s.cls}"></div>` +
        `<div class="sc-name">${t(s.nameKey)}<span class="sc-sub">${t(s.subKey)}</span></div>`;
      card.onclick = (e) => { e.stopPropagation(); chooseSide(s.id); };
      sideGrid.appendChild(card);
    }
  }
  function chooseSide(id) {
    // 사람이 둘 색 확정. 무작위면 50:50.
    if (id === 'random') pendingSide = (Math.random() < 0.5) ? BLACK : WHITE;
    else pendingSide = (id === 'black') ? BLACK : WHITE;
    showRuleStep();
  }

  // 3단계: 룰 선택 → 대국 시작
  function showRuleStep() {
    levelStep.style.display = 'none';
    sideStep.style.display = 'none';
    ruleStep.style.display = '';
    ruleStepTitle.textContent = t('chooseRule');
    ruleStepNote.textContent = t('ruleNote');
    renderRuleGrid();
  }
  const RULE_LIST = [
    { id: 'free',  renju: false, nameKey: 'ruleFreeName',  subKey: 'ruleFreeSub'  },
    { id: 'renju', renju: true,  nameKey: 'ruleRenjuName', subKey: 'ruleRenjuSub' },
  ];
  function renderRuleGrid() {
    ruleGrid.innerHTML = '';
    for (const r of RULE_LIST) {
      const card = document.createElement('div');
      card.className = 'rule-card';
      card.innerHTML =
        `<div class="rc-name">${t(r.nameKey)}<span class="rc-sub">${t(r.subKey)}</span></div>`;
      card.onclick = (e) => { e.stopPropagation(); chooseRule(r.renju); };
      ruleGrid.appendChild(card);
    }
  }
  function chooseRule(renju) {
    // 메뉴 선택을 실제 게임 상태로 반영하고 대국 시작.
    aiSide = (pendingSide === BLACK) ? WHITE : BLACK;   // 사람 반대편이 AI
    setRule(renju);          // renjuMode + 설정⚙ 룰 버튼 동기화
    hideSetup();
    newGame();
  }

  // ── 규칙 오버레이 (모드 "오목 규칙") — 장기 rules-overlay 계승 ──
  const rulesOverlay = document.getElementById('rulesOverlay');
  const rulesBackdrop = document.getElementById('rulesBackdrop');
  const rulesBody = document.getElementById('rulesBody');
  const rulesClose = document.getElementById('rulesClose');
  function renderRules() {
    document.getElementById('rulesTitle').textContent = t('rulesTitle');
    const sub = document.getElementById('rulesSubtitle');
    if (sub) sub.textContent = t('rulesSubtitle');
    rulesClose.setAttribute('aria-label', t('rulesClose'));
    const sections = t('rulesSections') || [];
    rulesBody.innerHTML = '';
    sections.forEach((sec, i) => {
      const card = document.createElement('div');
      card.className = 'rules-section';
      card.innerHTML =
        `<span class="rules-num">${i + 1}</span>` +
        `<h3 class="rules-section-title">${sec.title}</h3>` +
        `<p class="rules-section-body">${sec.body}</p>`;
      rulesBody.appendChild(card);
    });
  }
  function openRulesOverlay() {
    renderRules();
    rulesOverlay.style.display = '';
    rulesBody.scrollTop = 0;
    document.addEventListener('keydown', rulesEsc);
  }
  function closeRulesOverlay() {
    rulesOverlay.style.display = 'none';
    document.removeEventListener('keydown', rulesEsc);
  }
  function rulesEsc(e) { if (e.key === 'Escape') closeRulesOverlay(); }
  rulesClose.onclick = closeRulesOverlay;
  rulesBackdrop.onclick = closeRulesOverlay;

  // ── About / Credits 오버레이 (설정 메뉴 하단에서 열림. 장기와 동일 양식) ──
  const ABOUT_VERSION = 'v1.0.0';
  const aboutOverlay = document.getElementById('aboutOverlay');
  const aboutBackdrop = document.getElementById('aboutBackdrop');
  const aboutBody = document.getElementById('aboutBody');
  const aboutCloseBtn = document.getElementById('aboutClose');
  const aboutBtn = document.getElementById('aboutBtn');
  function renderAbout() {
    if (!aboutBody) return;
    document.getElementById('aboutTitle').textContent = t('aboutTitle');
    aboutCloseBtn.setAttribute('aria-label', t('aboutClose'));
    const sections = t('aboutSections') || [];
    aboutBody.innerHTML = '';
    sections.forEach((sec) => {
      const card = document.createElement('div');
      card.className = 'rules-section about-section';
      const title = document.createElement('h3');
      title.className = 'rules-section-title';
      title.textContent = sec.title;
      card.appendChild(title);
      if (sec.body) {
        const body = document.createElement('p');
        body.className = 'rules-section-body';
        body.textContent = sec.body;
        card.appendChild(body);
      }
      // 출처 여럿(사운드): { label, by, url? }
      if (sec.items) {
        sec.items.forEach((it) => {
          const row = document.createElement('p');
          row.className = 'rules-section-body about-item';
          row.textContent = it.by ? `${it.label} · ${it.by}` : it.label;
          if (it.url) {
            const a = document.createElement('a');
            a.className = 'about-link about-item-link';
            a.href = it.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
            a.textContent = t('aboutSourceLabel') || 'Source ↗';
            row.appendChild(document.createTextNode(' '));
            row.appendChild(a);
          }
          card.appendChild(row);
        });
      }
      // 링크(제작·AI엔진)
      const links = sec.links ? sec.links : (sec.link ? [sec.link] : []);
      links.forEach((lk) => {
        const a = document.createElement('a');
        a.className = 'about-link';
        a.href = lk.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = lk.label;
        card.appendChild(a);
      });
      aboutBody.appendChild(card);
    });
    const footer = document.createElement('div');
    footer.className = 'about-footer';
    footer.textContent = ABOUT_VERSION + ' · ' + t('aboutTagline');
    aboutBody.appendChild(footer);
  }
  function openAboutOverlay() {
    renderAbout();
    aboutOverlay.style.display = '';
    aboutBody.scrollTop = 0;
    document.addEventListener('keydown', aboutEsc);
  }
  function closeAboutOverlay() {
    aboutOverlay.style.display = 'none';
    document.removeEventListener('keydown', aboutEsc);
  }
  function aboutEsc(e) { if (e.key === 'Escape') closeAboutOverlay(); }
  if (aboutCloseBtn) aboutCloseBtn.onclick = closeAboutOverlay;
  if (aboutBackdrop) aboutBackdrop.onclick = closeAboutOverlay;
  if (aboutBtn) aboutBtn.onclick = () => { toggleSettings(false); openAboutOverlay(); };


  // ── 이벤트 ─────────────────────────────────────────────
  undoBtn.addEventListener('click', undo);
  // "처음부터": 메뉴 모드면 메인 메뉴로 복귀(룰 다시 선택), 개발 모드면 즉시 새 게임.
  resetBtn.addEventListener('click', () => {
    if (useMenu) showSetup();
    else newGame();
  });
  window.addEventListener('resize', render);

  // ── 시작 ───────────────────────────────────────────────
  // 기본 언어 버튼 활성화 + 정적 텍스트
  document.getElementById('langKo').classList.add('active');
  applyStaticTexts();
  if (useMenu) {
    // 메뉴를 띄우고, 빈 보드를 뒤에 깔아둔다(렌더만, 대국은 메뉴 통과 후).
    newGame();
    showSetup();
  } else {
    // 개발 진입(?ai= / ?debug=1): 메뉴 건너뛰고 즉시 대국.
    hideSetup();
    newGame();
  }
})();
