/**
 * 読書ラボ用データ準備・プロンプト構築
 */
import { prisma } from "./prisma";

/**
 * 読書分析用: 全書籍のタイトル・著者・分野・読了日・評価・概念・メモをテキスト化
 */
export async function getAllBooksForInsight(): Promise<{
  text: string;
  bookCount: number;
}> {
  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    orderBy: { readAt: "asc" },
    select: {
      title: true,
      author: true,
      discipline: true,
      readAt: true,
      rating: true,
      notes: true,
      keywords: {
        where: {
          keyword: {
            notIn: ["__api_error__", "__no_concepts__"],
          },
        },
        select: { keyword: true },
      },
    },
  });

  const lines = books.map((b) => {
    const parts: string[] = [];
    parts.push(`タイトル: ${b.title}`);
    if (b.author) parts.push(`著者: ${b.author}`);
    if (b.discipline) parts.push(`分野: ${b.discipline}`);
    if (b.readAt) {
      const d = new Date(b.readAt);
      parts.push(
        `読了: ${d.getFullYear()}年${d.getMonth() + 1}月`
      );
    }
    if (b.rating) parts.push(`評価: ${b.rating}/5`);
    if (b.keywords.length > 0) {
      parts.push(
        `概念: ${b.keywords.map((k) => k.keyword).join("、")}`
      );
    }
    if (b.notes?.trim()) parts.push(`メモ: ${b.notes.trim()}`);
    return parts.join("\n");
  });

  return {
    text: lines.join("\n---\n"),
    bookCount: books.length,
  };
}

/**
 * おすすめ用: メタデータのみ（notesなし）を取得
 */
export async function getBookMetadataForRecommend(): Promise<{
  metadataText: string;
  titleList: string[];
  bookCount: number;
}> {
  const books = await prisma.book.findMany({
    where: { readAt: { not: null } },
    orderBy: { readAt: "asc" },
    select: {
      title: true,
      author: true,
      discipline: true,
      readAt: true,
      rating: true,
      keywords: {
        where: {
          keyword: {
            notIn: ["__api_error__", "__no_concepts__"],
          },
        },
        select: { keyword: true },
      },
    },
  });

  const lines = books.map((b) => {
    const parts: string[] = [];
    parts.push(`「${b.title}」`);
    if (b.author) parts.push(`著者:${b.author}`);
    if (b.discipline) parts.push(`分野:${b.discipline}`);
    if (b.readAt) {
      const d = new Date(b.readAt);
      parts.push(`${d.getFullYear()}年`);
    }
    if (b.rating) parts.push(`★${b.rating}`);
    if (b.keywords.length > 0) {
      parts.push(b.keywords.map((k) => k.keyword).join(","));
    }
    return parts.join(" / ");
  });

  return {
    metadataText: lines.join("\n"),
    titleList: books.map((b) => b.title),
    bookCount: books.length,
  };
}

/**
 * 読書分析プロンプト
 */
export function buildInsightPrompt(bookText: string, bookCount: number): string {
  return `あなたは読書分析の専門家です。以下は1人の読者が読んできた${bookCount}冊の読書記録です。

${bookText}

■ タスク
この読者の読書履歴を分析し、以下の2つの視点でJSON形式で返してください。

1. **discoveries（発見）**: 複数の本を横断して見えてくるユニークな洞察・パターン・意外なつながり。個々の本の要約ではなく、本と本の間の関係性から浮かび上がる発見を記述してください。5〜8個。

2. **evolution（変遷）**: 読書テーマの時間的変化。どの時期にどんな関心を持ち、それがどう発展・転換したか。各期間について、変化だけでなく一貫しているテーマも描写してください。3〜6個。

■ 出力JSON（これ以外のテキストを含めないでください）
{
  "discoveries": [
    { "title": "発見を端的に表すタイトル", "books": ["関連する本のタイトル1", "本2"], "insight": "3〜5文で発見を記述。具体的な本の内容に言及すること" }
  ],
  "evolution": [
    { "period": "2016-2018", "theme": "その時期の探求テーマ", "description": "3〜5文で変化と不変の両方を描写。読んだ具体的な本に言及すること", "keyBooks": ["この時期の重要な本"] }
  ]
}`;
}

/**
 * 検索クエリ生成プロンプト
 */
export function buildQueryGenerationPrompt(
  metadataText: string,
  bookCount: number
): string {
  return `あなたは読書アドバイザーです。以下は読者が読んできた${bookCount}冊の読書記録のメタデータです。

${metadataText}

■ タスク
この読者に次に読むべき本・論文を提案するための検索クエリを生成してください。

「深める」= 既に関心のあるテーマをより深く掘り下げる
「広げる」= 現在の関心と関連しつつも新しい視野を開く

■ 出力JSON（これ以外のテキストを含めないでください）
{
  "ndlQueries": [
    { "keywords": ["キーワード1", "キーワード2"], "intent": "deepen", "description": "このクエリで探す内容" },
    { "keywords": ["キーワード1", "キーワード2"], "intent": "broaden", "description": "このクエリで探す内容" }
  ],
  "scholarQueries": [
    { "query": "English search query for academic papers", "intent": "deepen", "description": "このクエリで探す内容" },
    { "query": "English search query for academic papers", "intent": "broaden", "description": "このクエリで探す内容" }
  ]
}

■ 注意
- ndlQueries: 日本語キーワード、deepenを3つ + broadenを3つ = 計6つ
- scholarQueries: 英語クエリ、deepenを2つ + broadenを2つ = 計4つ
- キーワードは具体的に（例: 「社会学」だけでなく「構造的暴力 社会学」のように）
- 読者がまだ読んでいない領域を意識すること
- 新しい本・論文が見つかるようなクエリを優先すること`;
}

/**
 * 選定プロンプト
 */
export function buildSelectionPrompt(
  ndlCandidatesJson: string,
  scholarCandidatesJson: string,
  titleList: string[]
): string {
  return `あなたは読書アドバイザーです。NDL（国立国会図書館）と Semantic Scholar から検索した候補を評価し、おすすめを選定してください。

■ NDL候補（日本語書籍）
${ndlCandidatesJson}

■ Semantic Scholar候補（英語論文）
${scholarCandidatesJson}

■ 読者が既に読んだ本（これらは除外すること）
${titleList.join("\n")}

■ タスク
1. 候補の中から8〜12件を選定（deepen 4〜6件 + broaden 4〜6件）
2. 書籍と論文を混在させること
3. 既読リストと重複するものは除外
4. 全集、辞典、事典、ハンドブック、年鑑、白書、講座もの、雑誌は除外

■ 選定の最優先基準：新しさ
- 出版年が新しい本・論文を強く優先せよ（直近5年以内が理想）
- 古い本は原則選ばないこと。ただし分野の古典的名著で、現在も広く参照されている場合のみ例外として1〜2冊まで許容
- 同程度の候補なら必ず出版年が新しい方を選べ

■ 出力JSON（これ以外のテキストを含めないでください）
[
  {
    "type": "book",
    "intent": "deepen",
    "title": "本のタイトル",
    "author": "著者",
    "publisher": "出版社",
    "year": "2024",
    "isbn": "ISBN（あれば）",
    "reason": "推薦理由を2〜3文で"
  },
  {
    "type": "paper",
    "intent": "broaden",
    "title": "Paper Title in English",
    "author": "Author Name",
    "year": "2023",
    "url": "Semantic Scholar URL",
    "reason": "推薦理由を2〜3文で"
  }
]`;
}

/**
 * 翻訳プロンプト（英語論文のタイトル・要旨→日本語）
 */
export function buildTranslationPrompt(
  items: { title: string; reason: string }[]
): string {
  return `以下の英語の論文タイトルと推薦理由を日本語に翻訳してください。学術的で自然な日本語にしてください。

${items.map((item, i) => `${i + 1}. title: ${item.title}\n   reason: ${item.reason}`).join("\n\n")}

■ 出力JSON（これ以外のテキストを含めないでください）
[
  { "title_ja": "日本語タイトル", "reason_ja": "日本語の推薦理由" }
]`;
}
