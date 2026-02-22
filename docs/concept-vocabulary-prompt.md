概念語彙の見直しを行います。フェーズ①〜⑤を順番に実行してください。フェーズ②は私が語彙リストを確認・承認するまで次に進まないでください。

---

## フェーズ①：自由抽出

以下のコマンドを実行してください。

```bash
set -a && source .env && set +a
node scripts/extract-raw-concepts.mjs
```

完了したら `scripts/raw-concepts.json` をもとに、ユニーク概念を登場冊数の多い順に全件表示してください。

---

## フェーズ②：語彙候補の生成

以下のコマンドを実行してください。

```bash
set -a && source .env && set +a
node scripts/build-vocabulary.mjs
```

完了したら `scripts/vocabulary-candidate.json` の内容を全件表示してください。

**ここで必ず停止してください。私が「進んでください」と言うか修正を指示するまで次に進まないでください。**

私が承認したら：
- 修正なしの場合は `vocabulary-candidate.json` の内容をそのまま `src/lib/concept-vocabulary.json` に上書きする
- 修正を指示した場合はその内容を反映したうえで `src/lib/concept-vocabulary.json` に書き込む

---

## フェーズ③：全書籍の再抽出

以下のコマンドを実行してください。完了まで中断しないでください。

```bash
set -a && source .env && set +a
node scripts/reextract-wider.mjs
```

完了したら成功冊数とエラー件数を教えてください。

---

## フェーズ④：説明文の一括生成

以下のコマンドを実行してください。

```bash
set -a && source .env && set +a
node scripts/generate-descriptions.mjs
```

完了したら `src/lib/concept-descriptions.json` のキー数を教えてください。

---

## フェーズ⑤：コミット＆プッシュ

以下の2ファイルをコミットして main ブランチにプッシュしてください。

対象ファイル：
- `src/lib/concept-vocabulary.json`
- `src/lib/concept-descriptions.json`

コミットメッセージ：`feat: 語彙リスト更新・概念再抽出 (YYYY-MM)`（YYYY-MM は今月の年月に置き換えてください）

---

以上です。フェーズ①から順に開始してください。
