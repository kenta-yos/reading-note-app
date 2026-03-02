# 書籍検索 & バーコードリーダー 実装仕様書

他アプリへの移植を想定した、書籍検索APIとバーコードスキャナーの実装仕様。

---

## 1. 全体アーキテクチャ

```
┌──────────────────────────────────────────────────────────┐
│  フロントエンド                                            │
│                                                          │
│  ┌──────────────┐    isbn:{code}    ┌──────────────────┐ │
│  │ BarcodeScanner├──────────────────►│                  │ │
│  │ (カメラ/手入力) │                  │  検索フォーム      │ │
│  └──────────────┘                   │  (debounce 600ms) │ │
│                                     └────────┬─────────┘ │
└──────────────────────────────────────────────┼───────────┘
                                               │ GET /api/books/search?q=...
                                               ▼
┌──────────────────────────────────────────────────────────┐
│  バックエンド  /api/books/search                           │
│                                                          │
│  1. ISBN判定 ──► Google Books ISBN検索                     │
│     └─ 結果0件 → OpenBD でタイトル取得 → タイトルで再検索   │
│  2. 通常検索 ──► Google Books + NDL 並列検索               │
│  3. マージ（ISBN重複排除、Google優先）                       │
│  4. 結果ソート（日本語優先・新しい順）、上位8件              │
│  5. OpenBD で補完（ページ数・出版社・内容紹介）               │
│                                                          │
│  外部API:  Google Books / NDL SRU / OpenBD                │
└──────────────────────────────────────────────────────────┘
```

---

## 2. 検索API

### 2.1 エンドポイント

```
GET /api/books/search?q={query}
```

| パラメータ | 必須 | 説明 |
|-----------|------|------|
| `q` | Yes | 検索クエリ（2文字以上）。ISBN検索の場合は `isbn:9784000000000` 形式 |

### 2.2 レスポンス

```typescript
// 成功時 (200)
{
  candidates: Candidate[]  // 最大8件
}

// エラー時
{ error: string }  // 400: パラメータ不正, 502: 外部API障害
```

### 2.3 Candidate 型

```typescript
type Candidate = {
  title: string;           // 書籍タイトル
  author: string;          // 著者（複数名は「／」区切り）
  publisherName: string;   // 出版社
  publishedYear: number | null;  // 出版年（4桁）
  thumbnail: string | null;      // 表紙画像URL（HTTPS）
  isbn: string | null;           // ISBN-13 優先、なければ ISBN-10

  // ── 以下はアプリ固有 ──
  // 本アプリではページ数・内容紹介を取得しているが、
  // 必要なフィールドはアプリごとに追加・削除してよい
  pages: number | null;          // ページ数（参考）
  description: string | null;    // 内容紹介（参考）
};
```

### 2.4 検索フロー詳細

#### A. ISBN検索（クエリが `isbn:{10-13桁}` にマッチ）

```
1. Google Books API に isbn:{code} で検索
   └─ ヒットあり → 通常フローへ進む（ステップ2以降）
   └─ ヒットなし:
       2. OpenBD API (https://api.openbd.jp/v1/get?isbn={code}) でタイトル取得
          └─ タイトル取得成功 → そのタイトルで Google Books を再検索
          └─ 失敗 → 元のISBN文字列のまま Google Books を検索
```

**なぜフォールバックが必要か:** Google Books は日本語書籍のカバー率が低い。OpenBD は日本の出版物に特化しており、ISBN → タイトル変換に使うことで、タイトル検索経由で見つかるケースが多い。

#### B. テキスト検索（通常）

```
1. Google Books API で検索（maxResults: 20, printType: books）
2. 日本語書籍を優先ソート
3. 同優先度内では出版年が新しい順
4. ISBN で重複排除しつつ最大8件を抽出
5. OpenBD API で補完データを取得
```

### 2.5 NDL（国立国会図書館）並列検索

Google Books API は日本の学術出版社（有斐閣等）のカバー率が低いため、NDL SRU API を並列検索ソースとして追加し、日本語書籍の検索精度を向上させる。

#### NDL SRU API

```
GET https://ndlsearch.ndl.go.jp/api/sru
  ?operation=searchRetrieve
  &query=anywhere="{query}"   // テキスト検索
  &query=isbn="{isbn}"        // ISBN検索
  &maximumRecords=20
  &mediatype=1                // 図書に限定
  &recordSchema=dcndl
```

- タイムアウト: 5秒
- 失敗時は空配列を返す（Google Books の結果のみで動作する）

#### 並列実行

```
NDL 検索開始（非同期）
  ↓ 並行して
Google Books フロー実行（ISBN フォールバック含む）
  ↓
Promise.allSettled で両方の結果を待つ
```

- ISBN検索時: NDL は `isbn="${isbn}"` で検索
- テキスト検索時: NDL は `anywhere="${query}"` で検索

#### マージルール

```
1. Google Books 候補を先に処理（日本語優先ソート済み）
2. NDL 候補を追加（ISBN 重複は除外、Google 側を優先 ← サムネがあるため）
3. マージ後の全候補を日本語優先 + 新しい順でソート
4. 上位8件に絞る
5. OpenBD 補完（従来通り）
```

**重要:** Google Books が失敗した場合は従来通り 502 を返す。NDL の成功/失敗は Google Books のエラーハンドリングに影響しない。

### 2.6 Google Books API

```
GET https://www.googleapis.com/books/v1/volumes
  ?q={query}
  &maxResults=20
  &printType=books
  &key={GOOGLE_BOOKS_API_KEY}  // 省略可（レートリミットが厳しくなる）
```

**APIキーについて:** `GOOGLE_BOOKS_API_KEY` 環境変数が設定されていれば付与する。未設定でも動作するが、日次リクエスト上限が低い。

**レスポンスから取得するフィールド:**

| Google Books フィールド | 用途 |
|------------------------|------|
| `volumeInfo.title` | タイトル |
| `volumeInfo.authors[]` | 著者（「／」結合） |
| `volumeInfo.publisher` | 出版社 |
| `volumeInfo.publishedDate` | 出版年（正規表現で4桁年を抽出） |
| `volumeInfo.pageCount` | ページ数（参考） |
| `volumeInfo.description` | 内容紹介（参考） |
| `volumeInfo.industryIdentifiers[]` | ISBN（ISBN_13 優先） |
| `volumeInfo.imageLinks.thumbnail` | 表紙画像 |
| `volumeInfo.language` | 日本語判定用 |

**表紙画像:** `http://` → `https://` に強制変換する（Mixed Content対策）。

### 2.7 日本語書籍の優先判定

```typescript
function isJapanese(vol) {
  // 1. language フィールドが "ja"
  if (vol.language === "ja") return true;
  // 2. タイトル・著者・出版社に日本語文字（ひらがな/カタカナ/漢字）を含む
  const text = `${vol.title}${vol.authors?.join("")}${vol.publisher}`;
  return /[\u3000-\u9FFF\uF900-\uFAFF]/.test(text);
}
```

20件取得して日本語を上位にソートし、最大8件に絞る方式。
`langRestrict=ja` を使わない理由は、language未設定の日本語書籍が除外されるため。

### 2.8 OpenBD API（補完用）

```
GET https://api.openbd.jp/v1/get?isbn={isbn1},{isbn2},...
```

- 候補のうち ISBN を持つもの全てをカンマ区切りで一括リクエスト
- レスポンスは配列（ISBN順、データなしの場合 `null`）
- **失敗してもエラーにしない**（try-catch で握りつぶす）

**補完するデータ（優先順位付き）:**

| データ | 取得元（優先順） | 補完条件 |
|--------|----------------|---------|
| ページ数 | `summary.pages` → `onix.DescriptiveDetail.Extent[ExtentType==="11"].ExtentValue` | Google Books の値が null の場合のみ |
| 出版社 | `summary.publisher` | Google Books の値が空の場合のみ |
| 内容紹介 | `onix.CollateralDetail.TextContent[TextType==="03"]`（詳細）→ `TextType==="02"`（短文） | 常に上書き（OpenBD の方が日本語で正確なため） |

---

## 3. バーコードスキャナー

### 3.1 概要

カメラでEAN-13バーコード（ISBN）を自動検出し、検出できない場合は手入力にフォールバックするUIコンポーネント。

### 3.2 依存

```json
{
  "barcode-detector": "^3.1.0"  // BarcodeDetector ポリフィル
}
```

### 3.3 BarcodeDetector のフォールバック戦略

```
1. window.BarcodeDetector（ネイティブ）
   └─ 利用不可:
2. import("barcode-detector/pure")（ポリフィル）
   └─ 利用不可:
3. 手入力のみモード（カメラは表示するがスキャンしない）
```

**対応ブラウザ:**
- Chrome/Edge: ネイティブ BarcodeDetector あり
- Safari/Firefox: ポリフィル使用
- ポリフィルも失敗: 手入力のみ

### 3.4 カメラ設定

```typescript
navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: "environment",   // 背面カメラ
    width: { ideal: 1280 },
    height: { ideal: 720 },
  }
});
```

### 3.5 バーコード検出ロジック

```
- 検出フォーマット: EAN-13 のみ
- ポーリング間隔: 200ms
- ISBN-13 バリデーション: /^97[89]\d{10}$/
- 非数字文字は除去してからバリデーション
- 一度検出したら即座にカメラ停止 & コールバック発火
- 重複検出防止フラグ（scannedRef）あり
```

### 3.6 手入力フォールバック

```
- ISBN-13: /^97[89]\d{10}$/  にマッチ → 有効
- ISBN-10: /^\d{10}$/  にマッチ → 有効
- inputMode="numeric" でモバイルに数字キーボード表示
- fontSize: "16px" でモバイルの自動ズーム防止
- Enter キーで送信可能
```

### 3.7 エラーハンドリング

| エラー種別 | メッセージ | 表示 |
|-----------|----------|------|
| `NotAllowedError` / "Permission" | カメラへのアクセスが許可されていません | カメラ非表示、手入力のみ |
| その他のカメラエラー | カメラを起動できませんでした | カメラ非表示、手入力のみ |

### 3.8 ライフサイクル管理

```
マウント時:
  1. getUserMedia でカメラ取得
  2. video 要素に接続 & play
  3. BarcodeDetector 取得（ネイティブ → ポリフィル）
  4. 200ms インターバルでスキャン開始

アンマウント時:
  1. mounted フラグを false に（非同期処理の状態更新防止）
  2. scannedRef を true に（スキャン停止）
  3. インターバルクリア
  4. カメラストリーム全トラック停止
```

---

## 4. フロントエンド統合

### 4.1 検索フォームの動作

```
テキスト入力:
  ユーザー入力 → 600ms debounce → GET /api/books/search?q={text}

バーコード読み取り:
  スキャン完了 → GET /api/books/search?q=isbn:{code}

いずれも:
  → 候補リスト表示 → ユーザーが候補をタップ → フォームに自動入力
```

### 4.2 リクエスト制御

```typescript
// 前のリクエストを必ずキャンセルしてから新しいリクエストを発行
abortController.abort();
const controller = new AbortController();
fetch(url, { signal: controller.signal });
```

- 入力のたびに前回リクエストを abort → レースコンディション防止
- AbortError は無視（正常なキャンセル）
- 2文字未満の入力では候補クリア & リクエスト発行しない

### 4.3 候補選択時のフォーム自動入力

```typescript
function applyCandidate(candidate: Candidate) {
  setTitle(candidate.title);
  setAuthor(candidate.author);
  setPublisher(candidate.publisherName);
  setPublishedYear(candidate.publishedYear);
  if (candidate.isbn) setIsbn(candidate.isbn);
  // pages, description 等はアプリ固有のフィールドに応じて追加
  clearCandidates();
}
```

---

## 5. 環境変数

| 変数名 | 必須 | 説明 |
|--------|------|------|
| `GOOGLE_BOOKS_API_KEY` | No | Google Books API キー。未設定でも動作するがレートリミットが厳しい |

---

## 6. 移植時のカスタマイズポイント

| 項目 | 説明 |
|------|------|
| **Candidate の型** | `pages`, `description` 以外にも、アプリに必要なフィールドを Google Books / OpenBD から追加取得可能 |
| **最大候補数** | 現在は8件。用途に応じて調整 |
| **debounce 時間** | 現在は600ms。リアルタイム性が必要なら短くする |
| **日本語優先ロジック** | 日本語以外の書籍を主対象にする場合は削除・変更する |
| **OpenBD 補完** | 日本語書籍を扱わない場合は不要。他言語圏なら該当国のAPIに差し替え |
| **バーコードフォーマット** | 現在はEAN-13のみ。UPC-A等を追加する場合は `formats` 配列に追加 |
| **UIコンポーネント** | BarcodeScanner と候補リストのUIは自由に差し替え可能。APIとの接続インターフェースは同じ |
