# 概念語彙の見直し・再抽出マニュアル

## 概要

読書グラフで使用する「概念語彙リスト」と「書籍ごとの概念データ」を定期的に見直すための手順書です。
新しい本を読む習慣や関心が変わったタイミング（目安：半年〜1年に1回）に実施します。

---

## 全体の流れ

```
フェーズ① 自由抽出    → 全書籍から語彙リストに縛られず概念を収集
フェーズ② 語彙構築    → 収集した概念を Sonnet で正規化・統合してリスト候補を作成
           ↓ ユーザー確認・承認
フェーズ③ 再抽出      → 新語彙リストで全書籍を再抽出・DBに保存
フェーズ④ 説明文生成  → 新語彙の説明文を一括生成・JSONに保存
フェーズ⑤ デプロイ    → コミット＆プッシュ → Vercel自動デプロイ
```

---

## 前提条件

- `.env` に `DATABASE_URL` と `ANTHROPIC_API_KEY` が設定されていること
- `node` と `npx` が使えること

---

## フェーズ① 自由抽出

全書籍のタイトルと感想から、語彙リストに縛られず概念を自由に抽出します。
結果は `scripts/raw-concepts.json` に保存されます。

```bash
set -a && source .env && set +a
node scripts/extract-raw-concepts.mjs
```

**所要時間**: 約2〜3分（310冊 × 400ms）
**出力**: `scripts/raw-concepts.json`（各書籍の抽出概念リスト）

---

## フェーズ② 語彙構築（Sonnet による正規化）

フェーズ①の結果と既存の語彙リストをもとに、Sonnet が正規化・統合した候補リストを生成します。

```bash
set -a && source .env && set +a
node scripts/build-vocabulary.mjs
```

**出力**: `scripts/vocabulary-candidate.json`（Sonnet 提案の語彙リスト）

### レビューのポイント

生成されたリストを確認し、以下の観点で調整してください：

| チェック項目 | 例 |
|---|---|
| 重複・類似概念の統合 | 「男性性」と「ヘゲモニック男性性」→ 一方に統合 |
| 細かすぎる概念の削除 | 特定の政策名（夫婦別姓 など）は上位概念に吸収 |
| 汎用すぎる概念の削除 | 「差別の構造」など一般的すぎるもの |
| 表記の統一 | 中黒の有無（ベーシック・インカム など）|
| 語数の確認 | 100〜150語が目安 |

調整が終わったら、**`src/lib/concept-vocabulary.json` を手動で書き換える**か、
Claude Code に「このリストで語彙ファイルを更新して」と依頼してください。

---

## フェーズ③ 全書籍の再抽出

新しい語彙リストを使って全書籍を再抽出し、DBに保存します。
**既存の BookKeyword はすべて削除してから再構築します。**

```bash
set -a && source .env && set +a
node scripts/reextract-wider.mjs
```

**所要時間**: 約2〜3分（310冊 × 400ms）
**注意**: 完了まで中断しないでください。途中で止まると一部の書籍が空になります。

---

## フェーズ④ 説明文の一括生成

新しい語彙リストの各概念について説明文（2〜3文）を生成し、JSONに保存します。

```bash
set -a && source .env && set +a
node scripts/generate-descriptions.mjs
```

**所要時間**: 約1〜2分（語彙数 × 300ms）
**出力**: `src/lib/concept-descriptions.json`

---

## フェーズ⑤ デプロイ

変更されたファイルをコミット＆プッシュします。Vercel が自動でデプロイします。

```bash
git add src/lib/concept-vocabulary.json src/lib/concept-descriptions.json
git commit -m "feat: 語彙リスト更新・概念再抽出 (YYYY-MM)"
git push origin main
```

デプロイ完了後（1〜2分）、分析ページで新しいグラフを確認してください。

---

## 関連ファイル一覧

| ファイル | 役割 |
|---|---|
| `src/lib/concept-vocabulary.json` | **メインの語彙リスト**（137語、ここを見直す） |
| `src/lib/concept-descriptions.json` | 各概念の説明文（自動生成、手動編集も可） |
| `scripts/extract-raw-concepts.mjs` | フェーズ①：語彙リストなしで自由抽出 |
| `scripts/build-vocabulary.mjs` | フェーズ②：Sonnet で正規化・候補リスト生成 |
| `scripts/reextract-wider.mjs` | フェーズ③：新語彙で全書籍を再抽出 |
| `scripts/generate-descriptions.mjs` | フェーズ④：説明文を一括生成 |
| `scripts/raw-concepts.json` | フェーズ①の出力（中間ファイル、コミット不要） |
| `scripts/vocabulary-candidate.json` | フェーズ②の出力（中間ファイル、コミット不要） |

---

## よくある質問

**Q: 語彙リストに新しい概念を手動で追加したい**
A: `src/lib/concept-vocabulary.json` を直接編集してから、フェーズ③④⑤を実行してください。

**Q: 特定の1冊だけ再抽出したい**
A: Claude Code に「book ID xxxxxxxx の概念を再抽出して」と依頼してください。
または、管理画面の書籍詳細ページから確認・編集できます。

**Q: 概念の説明文を手動で修正したい**
A: `src/lib/concept-descriptions.json` を直接編集してコミット＆プッシュしてください。

**Q: 語彙数の目安は？**
A: 100〜160語が適切です。多すぎるとグラフが煩雑になり、少なすぎると多様な読書が反映されません。
