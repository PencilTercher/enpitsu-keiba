// えんぴつ先生AI 独立マスター＆掛け合わせ演算ファイル（特殊短縮名・外国人騎手・個別場所/馬場補正完全対応版）
const MASTER_AI_CONFIG = {
  styleScores: {
    "逃げ": { paceMatch: "スロー", bonus: 25, base: 62 },
    "先行": { paceMatch: "スロー", bonus: 20, base: 67 },
    "差し": { paceMatch: "ハイ",   bonus: 25, base: 67 },
    "追込": { paceMatch: "ハイ",   bonus: 30, base: 57 }
  },
  fitScores: { "S": 26, "A": 14, "B": 0, "C": -14 },
  trackConditionEffect: {
    "良":   { "逃げ": 2,  "先行": 2,  "差し": 3,  "追込": 3 },
    "稍重": { "逃げ": 5,  "先行": 4,  "差し": 0,  "追込": -3 },
    "重":   { "逃げ": 10, "先行": 7,  "差し": -5, "追込": -10 },
    "不良": { "逃げ": 14, "先行": 9,  "差し": -8, "追込": -15 }
  },
  stanceWeights: {
    "solid":   { scoreWeight: 0.90, evWeight: 0.10 },
    "balance": { scoreWeight: 0.60, evWeight: 0.40 },
    "value":   { scoreWeight: 0.25, evWeight: 0.75 }
  }
};

const MASTER_STORAGE_KEY = 'enpitsu_keiba_data_v16';

function loadHorseDbFromStorage() {
  try {
    const mainRaw = localStorage.getItem(MASTER_STORAGE_KEY);
    if (mainRaw) {
      const parsed = JSON.parse(mainRaw);
      if (Array.isArray(parsed?.horsesDb)) return parsed.horsesDb;
    }
  } catch (e) {}

  try {
    const legacyRaw = localStorage.getItem('enpitsu_horse_db');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  return [];
}

function loadJockeyDbFromStorage() {
  try {
    const mainRaw = localStorage.getItem(MASTER_STORAGE_KEY);
    if (mainRaw) {
      const parsed = JSON.parse(mainRaw);
      if (Array.isArray(parsed?.jockeysDb)) return parsed.jockeysDb;
    }
  } catch (e) {}

  try {
    const legacyRaw = localStorage.getItem('enpitsu_jockey_db');
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}

  return [];
}

// 「京都:+4, 中山:-3」や「重:+6, 良:-2」、あるいは単一数値 "+5" / "-3" を現在の条件向けに数値化
function parseConditionalMod(rawMod, targetKey) {
  if (rawMod === null || rawMod === undefined || rawMod === "") return 0;

  if (typeof rawMod === "number") {
    return Number.isFinite(rawMod) ? rawMod : 0;
  }

  const text = String(rawMod).trim();
  if (!text) return 0;

  // 数値単体（例: "+5", "-3", "4"）が指定されている場合
  if (/^[+-]?\d+(\.\d+)?$/.test(text)) {
    const num = Number(text);
    return Number.isFinite(num) ? num : 0;
  }

  if (!targetKey) return 0;

  const cleanTarget = String(targetKey).trim();
  const tokens = text.split(/[、,\/／\s]+/).map(t => t.trim()).filter(Boolean);
  let sum = 0;

  for (const token of tokens) {
    // 例: "京都:+4", "京都:4", "京都-3", "稍重(+2)"
    const match = token.match(/^([^\s:：()（）+-]+)\s*[:：()（）]?\s*([+-]?\d+(?:\.\d+)?)\s*\)?$/);
    if (match) {
      const label = match[1].trim();
      const val = Number(match[2]);
      if (Number.isFinite(val) && (label === cleanTarget || cleanTarget.includes(label) || label.includes(cleanTarget))) {
        sum += val;
      }
    }
  }

  return sum;
}

// 🐎「馬」個別データの取得
function getHorseMasterData(horseName) {
  const emptyData = { bonus: 0, placeMod: "", condMod: "", note: "" };
  if (!horseName) return emptyData;

  const db = loadHorseDbFromStorage();
  const cleanName = horseName.trim();
  const found = db.find(d => d && d.name && d.name.trim() === cleanName);

  if (found) {
    return {
      ...emptyData,
      ...found,
      bonus: Number(found.bonus) || 0,
      placeMod: found.placeMod ?? "",
      condMod: found.condMod ?? "",
      note: found.note ?? ""
    };
  }
  return emptyData;
}

// 🏇「鞍上」個別データの取得（特殊短縮名・外国人騎手＋管理画面マスター対応）
function getJockeyMasterData(jockeyInput) {
  if (!jockeyInput) {
    return { bonus: 0, placeMod: 0, condMod: 0, dist: "", gate: "", place: "", name: "未指定" };
  }

  const cleanInput = jockeyInput.trim();
  const db = loadJockeyDbFromStorage().map(d => ({
    ...d,
    bonus: Number(d?.bonus) || 0,
    placeMod: Number(d?.placeMod) || 0,
    condMod: Number(d?.condMod) || 0
  }));

  // まずユーザー登録マスター（enpitsu_keiba_data_v16 / enpitsu_jockey_db）から検索
  const userFound = db.find(d => d.name && (d.name.trim() === cleanInput || d.name.includes(cleanInput) || cleanInput.includes(d.name.trim())));
  if (userFound) {
    return userFound;
  }

  // ① 特殊な短縮名・外国人騎手のマッピング辞書
  const specialMapping = {
    "ルメー": { name: "ルメール", dist: "全般得意", gate: "枠不問", place: "東京・中山", bonus: 8, placeMod: 0, condMod: 0 },
    "ルメール": { name: "ルメール", dist: "全般得意", gate: "枠不問", place: "東京・中山", bonus: 8, placeMod: 0, condMod: 0 },
    "マーカ": { name: "マーカンド", dist: "中距離", gate: "積極策", place: "中山・東京", bonus: 5, placeMod: 0, condMod: 0 },
    "マーカンド": { name: "マーカンド", dist: "中距離", gate: "積極策", place: "中山・東京", bonus: 5, placeMod: 0, condMod: 0 },
    "Ｃデム": { name: "C.デムーロ", dist: "中マイル", gate: "勝負強さ抜群", place: "阪神・京都", bonus: 7, placeMod: 0, condMod: 0 },
    "デムーロ": { name: "M.デムーロ", dist: "中距離", gate: "イン突き", place: "中山・阪神", bonus: 6, placeMod: 0, condMod: 0 },
    "川田": { name: "川田将雅", dist: "マイル〜中距離", gate: "内枠・中枠巧者", place: "京都・阪神", bonus: 7, placeMod: 0, condMod: 0 },
    "戸崎": { name: "戸崎圭太", dist: "1600m〜1800m", gate: "先行好位", place: "東京・新潟", bonus: 4, placeMod: 0, condMod: 0 },
    "武豊": { name: "武豊", dist: "全般得意", gate: "自在", place: "京都・阪神", bonus: 6, placeMod: 0, condMod: 0 },
    "岩田望": { name: "岩田望来", dist: "中距離", gate: "先行粘り込み", place: "中京・阪神", bonus: 5, placeMod: 0, condMod: 0 },
    "西村淳": { name: "西村淳也", dist: "マイル", gate: "気迫の騎乗", place: "阪神・京都", bonus: 4, placeMod: 0, condMod: 0 },
    "池添": { name: "池添謙一", dist: "大駆け・G1男", gate: "イン強襲", place: "阪神・中山", bonus: 5, placeMod: 0, condMod: 0 },
    "荻野極": { name: "荻野極", dist: "中距離", gate: "粘り込み", place: "新潟・中京", bonus: 3, placeMod: 0, condMod: 0 },
    "津村": { name: "津村明秀", dist: "マイル", gate: "堅実", place: "中山・東京", bonus: 4, placeMod: 0, condMod: 0 },
    "吉田隼": { name: "吉田隼人", dist: "中長距離", gate: "先行", place: "函館・札幌", bonus: 4, placeMod: 0, condMod: 0 },
    "松若": { name: "松若風馬", dist: "中距離", gate: "差し", place: "阪神・中京", bonus: 3, placeMod: 0, condMod: 0 },
    "浜中": { name: "浜中俊", dist: "マイル", gate: "イン突き", place: "京都・阪神", bonus: 4, placeMod: 0, condMod: 0 },
    "今村": { name: "今村聖奈", dist: "軽量", gate: "積極的", place: "小倉・中京", bonus: 3, placeMod: 0, condMod: 0 },
    "三浦": { name: "三浦皇成", dist: "マイル", gate: "先行", place: "中山・東京", bonus: 4, placeMod: 0, condMod: 0 },
    "松山": { name: "松山弘平", dist: "全般", gate: "好位追走", place: "阪神・京都", bonus: 6, placeMod: 0, condMod: 0 },
    "北村友": { name: "北村友一", dist: "中距離", gate: "イン", place: "阪神・京都", bonus: 4, placeMod: 0, condMod: 0 },
    "丹内": { name: "丹内祐次", dist: "ローカル巧者", gate: "積極策", place: "函館・札幌・福島", bonus: 4, placeMod: 0, condMod: 0 }
  };

  if (specialMapping[cleanInput]) {
    return { placeMod: 0, condMod: 0, ...specialMapping[cleanInput] };
  }

  // ② デフォルトデータベース
  const defaultJockeys = [
    { name: "川田将雅", dist: "マイル〜中距離", gate: "内枠・中枠巧者", place: "京都・阪神", bonus: 7, placeMod: 0, condMod: 0 },
    { name: "ルメール", dist: "全般得意", gate: "枠不問", place: "東京・中山", bonus: 8, placeMod: 0, condMod: 0 },
    { name: "戸崎圭太", dist: "1600m〜1800m", gate: "先行好位", place: "東京・新潟", bonus: 4, placeMod: 0, condMod: 0 },
    { name: "武豊", dist: "全般得意", gate: "自在", place: "京都・阪神", bonus: 6, placeMod: 0, condMod: 0 },
    { name: "横山武史", dist: "中長距離", gate: "積極策", place: "中山・東京", bonus: 5, placeMod: 0, condMod: 0 },
    { name: "横山和生", dist: "中距離", gate: "好位追走", place: "函館・札幌・中山", bonus: 4, placeMod: 0, condMod: 0 },
    { name: "横山典弘", dist: "全般巧者", gate: "イン突き・職人", place: "東京・中山", bonus: 6, placeMod: 0, condMod: 0 }
  ];

  const found = defaultJockeys.find(d => d.name && (d.name.includes(cleanInput) || cleanInput.includes(d.name)));
  if (found) return found;

  // ③ どれにもヒットしない場合はフォールバックとして安全に標準ボーナスを付与
  return { name: cleanInput, bonus: 3, placeMod: 0, condMod: 0, dist: "標準", gate: "標準", place: "標準" };
}

function formatSigned(val) {
  return val > 0 ? `+${val}` : `${val}`;
}

// 🔀 「馬」×「鞍上」×「馬場状態」掛け合わせ総合評価算出関数
function calculateMultipliedBonus(horseName, jockeyName, racePlace, raceDistance, trackCondition) {
  const horse = getHorseMasterData(horseName);
  const jockey = getJockeyMasterData(jockeyName);

  let totalBonus = (Number(horse.bonus) || 0) + (Number(jockey.bonus) || 0);
  const crossNoteParts = [];

  if (jockey.name && jockey.name !== "未指定") crossNoteParts.push(`鞍上:${jockey.name}`);

  // 🐎 馬の個別「場所補正」
  const horsePlaceDelta = parseConditionalMod(horse.placeMod, racePlace);
  if (horsePlaceDelta !== 0) {
    totalBonus += horsePlaceDelta;
    crossNoteParts.push(`🐎場補正(${formatSigned(horsePlaceDelta)})`);
  }

  // 🐎 馬の個別「馬場補正」
  const horseCondDelta = parseConditionalMod(horse.condMod, trackCondition);
  if (horseCondDelta !== 0) {
    totalBonus += horseCondDelta;
    crossNoteParts.push(`🐎馬場補正(${formatSigned(horseCondDelta)})`);
  }

  // 🏇 鞍上の得意場所一致＋個別「場所増減」
  const isPlaceMatched = Boolean(jockey.place && racePlace && jockey.place.includes(racePlace));
  if (isPlaceMatched) {
    totalBonus += 3;
    crossNoteParts.push(`📍場適性◎(+3)`);
  }
  const jockeyPlaceDelta = isPlaceMatched ? (Number(jockey.placeMod) || 0) : 0;
  if (jockeyPlaceDelta !== 0) {
    totalBonus += jockeyPlaceDelta;
    crossNoteParts.push(`🏇場増減(${formatSigned(jockeyPlaceDelta)})`);
  }

  // 🏇 鞍上の個別「馬場増減」（良馬場以外で適用）
  const jockeyCondDelta = (trackCondition && trackCondition !== "良") ? (Number(jockey.condMod) || 0) : 0;
  if (jockeyCondDelta !== 0) {
    totalBonus += jockeyCondDelta;
    crossNoteParts.push(`🏇馬場増減(${formatSigned(jockeyCondDelta)})`);
  }

  // 鞍上の得意距離とレース距離の一致
  if (jockey.dist && raceDistance && (jockey.dist.includes(raceDistance) || jockey.dist.includes("全般"))) {
    totalBonus += 2;
    crossNoteParts.push(`🎯距離適性◎(+2)`);
  }

  return {
    bonus: totalBonus,
    memo: crossNoteParts.join(' / '),
    jockeyName: jockey.name || "未指定"
  };
}