# 概念語彙の見直し：Claude へのプロンプト集

このファイルには、概念語彙の見直し作業を Claude Code に依頼するためのプロンプトが入っています。
ターミナルから貼り付けるだけで実行できます。

---

## ターミナルから Claude Code を使う方法

```bash
# プロジェクトディレクトリに移動
cd ~/reading-note-app

# Claude Code を起動
claude
```

起動後、対話形式になります。下記のプロンプトをそのままコピー＆ペーストしてください。

> **注意**: 各フェーズは順番に実行してください。フェーズ②はユーザーが語彙を確認・承認するまで次に進まないでください。

---

## フェーズ①〜⑤ を一括依頼するプロンプト（フェーズ②で一時停止あり）

```
概念語彙の見直しを行います。以下の手順で進めてください。

## フェーズ①：自由抽出

以下のコマンドを実行してください：

```
set -a && source .env && set +a
node scripts/extract-raw-concepts.mjs
```

完了したら結果（ユニーク概念数）を教えてください。

## フェーズ②：語彙候補の生成

以下のコマンドを実行してください：

```
set -a && source .env && set +a
node scripts/build-vocabulary.mjs
```

生成された `scripts/vocabulary-candidate.json` の内容を表示し、**私が確認・承認するまで次のフェーズに進まないでください**。

私がOKを出したら、以下を実行します：
- 承認したリストを `src/lib/concept-vocabulary.json` に書き込む（私が修正を指示した場合はその修正も反映する）

## フェーズ③：全書籍の再抽出

以下のコマンドを実行してください（完了まで中断しない）：

```
set -a && source .env && set +a
node scripts/reextract-wider.mjs
```

## フェーズ④：説明文の一括生成

以下のコマンドを実行してください：

```
set -a && source .env && set +a
node scripts/generate-descriptions.mjs
```

## フェーズ⑤：コミット＆プッシュ

以下のファイルをコミットしてください：

- src/lib/concept-vocabulary.json
- src/lib/concept-descriptions.json

コミットメッセージ：feat: 語彙リスト更新・概念再抽出 (YYYY-MM)（YYYYとMMは現在の年月に置き換えてください）

その後、main ブランチにプッシュしてください。

以上です。フェーズ①から順に進めてください。
```

---

## フェーズごとの個別プロンプト

フェーズを個別に実行したい場合はこちらを使用してください。

---

### フェーズ①のみ（自由抽出）

```
以下のコマンドを実行してください：

set -a && source .env && set +a
node scripts/extract-raw-concepts.mjs

完了したら結果（ユニーク概念数と上位10概念）を教えてください。
```

---

### フェーズ②のみ（語彙候補生成）

```
以下のコマンドを実行してください：

set -a && source .env && set +a
node scripts/build-vocabulary.mjs

完了したら scripts/vocabulary-candidate.json の内容を全件表示してください。
私が修正を指示するまで次のフェーズには進まないでください。
```

---

### 語彙ファイル更新（フェーズ②承認後）

```
scripts/vocabulary-candidate.json（または私が提示したリスト）を
src/lib/concept-vocabulary.json に書き込んでください。
現在のファイルを上書きします。
```

---

### フェーズ③のみ（全書籍の再抽出）

```
以下のコマンドを実行してください（完了まで中断しないでください）：

set -a && source .env && set +a
node scripts/reextract-wider.mjs

完了したら何冊成功・何件エラーだったかを教えてください。
```

---

### フェーズ④のみ（説明文生成）

```
以下のコマンドを実行してください：

set -a && source .env && set +a
node scripts/generate-descriptions.mjs

完了したら src/lib/concept-descriptions.json の語数を教えてください。
```

---

### フェーズ⑤のみ（コミット＆プッシュ）

```
以下のファイルをコミット＆プッシュしてください：

- src/lib/concept-vocabulary.json
- src/lib/concept-descriptions.json

コミットメッセージ：feat: 語彙リスト更新・概念再抽出 (YYYY-MM)
（YYYY・MM は今月の年月に置き換えてください）

その後 main ブランチにプッシュしてください。
```

---

### 特定の1冊だけ再抽出したい場合

```
book ID [xxxxxxxx] の概念を再抽出してください。
現在の concept-vocabulary.json の語彙リストを使って、
この書籍のタイトルと感想から概念を抽出し、
BookKeyword テーブルを更新してください。
```

---

## メモ

- フェーズ①②は読書の習慣や関心が変わったと感じたタイミング（目安：半年〜1年に1回）に実施
- フェーズ③④は語彙リストを変更するたびに実行が必要
- 中間ファイル（`scripts/raw-concepts.json`、`scripts/vocabulary-candidate.json`）はコミット不要
