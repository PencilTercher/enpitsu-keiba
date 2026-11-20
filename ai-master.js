// えんぴつ先生AI 公開・更新用データファイル（ai-update.js）
// ※このファイルをGitHubにアップロードすると、スマホや全ユーザーのカレンダー・出走表に即反映されます
window.AI_UPDATE_DATA = {
  // 1. 開催日・レース・出走馬・レース別コラム
  races: [
    {
      date: "2026/11/22",
      raceName: "マイルチャンピオンシップ",
      place: "京都",
      distance: "芝1600m",
      condition: "良",
      column: "京都芝1600m外回りは3角の坂の下りから一気にペースが上がる。スピード持続力と内・中枠の立ち回りが鍵。",
      horses: [
        { num: 1, name: "サンプルホースA", style: "先行", fit: "A", jockey: "川田", odds: 4.5, memo: "" },
        { num: 2, name: "サンプルホースB", style: "差し", fit: "S", jockey: "ルメール", odds: 3.2, memo: "" }
      ]
    }
  ],

  // 2. 個別「馬」補正マスター（任意）
  horsesDb: [
    // { name: "サンプルホースB", bonus: 5, placeMod: "京都:+3", condMod: "良:+2", note: "" }
  ],

  // 3. 個別「鞍上」補正マスター（任意）
  jockeysDb: [
    // { name: "川田将雅", bonus: 7, place: "京都・阪神", placeMod: 3, condMod: 0 }
  ],

  // 4. トップのデフォルトコラム（レース未選択時に表示）
  defaultColumn: "今週の注目レース展望：馬場傾向と脚質バランスから期待値の高い馬をピックアップします。"
};