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
読書履歴全体の傾向を踏まえ、多角的な検索クエリを作成すること。

■ 出力JSON（これ以外のテキストを含めないでください）
{
  "ndlQueries": [
    { "keywords": ["キーワード1", "キーワード2"], "description": "このクエリで探す内容" }
  ],
  "scholarQueries": [
    { "query": "English search query for academic papers", "description": "このクエリで探す内容" }
  ]
}

■ 注意
- ndlQueries: 日本語キーワード、計5つ
- scholarQueries: 英語クエリ、計5つ
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
1. 書籍5冊 + 論文5本 = 計10件を選定すること（必ずこの件数を守ること）
2. 既読リストと重複するものは除外
3. 全集、辞典、事典、ハンドブック、年鑑、白書、講座もの、雑誌は除外

■ 選定の最優先基準：新しさ
- 出版年が新しい本・論文を強く優先せよ（直近5年以内が理想）
- 古い本は原則選ばないこと。ただし分野の古典的名著で、現在も広く参照されている場合のみ例外として1〜2冊まで許容
- 同程度の候補なら必ず出版年が新しい方を選べ

■ 出力JSON（これ以外のテキストを含めないでください）
[
  {
    "type": "book",
    "title": "本のタイトル",
    "author": "著者",
    "publisher": "出版社",
    "year": "2024",
    "isbn": "ISBN（あれば）",
    "reason": "推薦理由を2〜3文で"
  },
  {
    "type": "paper",
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

/**
 * 次なに読む？用: 候補（読みたい+積読）と傾向（読了直近30冊）を取得
 */
export async function getNextReadData(): Promise<{
  candidateText: string;
  candidateCount: number;
  trendText: string;
  readCount: number;
}> {
  const [candidates, recentReads] = await Promise.all([
    prisma.book.findMany({
      where: { status: { in: ["WANT_TO_READ", "READING_STACK"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        author: true,
        discipline: true,
        category: true,
        status: true,
        keywords: {
          where: {
            keyword: {
              notIn: ["__api_error__", "__no_concepts__"],
            },
          },
          select: { keyword: true },
          take: 5,
        },
      },
    }),
    prisma.book.findMany({
      where: { status: "READ", readAt: { not: null } },
      orderBy: { readAt: "desc" },
      take: 30,
      select: {
        title: true,
        author: true,
        discipline: true,
        category: true,
        rating: true,
        readAt: true,
        keywords: {
          where: {
            keyword: {
              notIn: ["__api_error__", "__no_concepts__"],
            },
          },
          select: { keyword: true },
        },
      },
    }),
  ]);

  // 1行フォーマットでトークン節約
  const candidateLines = candidates.map((b) => {
    const parts: string[] = [];
    parts.push(`[${b.id}]`);
    parts.push(`「${b.title}」`);
    if (b.author) parts.push(b.author);
    if (b.discipline) parts.push(b.discipline);
    if (b.category) parts.push(b.category);
    parts.push(b.status === "WANT_TO_READ" ? "読みたい" : "積読");
    if (b.keywords.length > 0) {
      parts.push(b.keywords.map((k) => k.keyword).join(","));
    }
    return parts.join(" / ");
  });

  const trendLines = recentReads.map((b) => {
    const parts: string[] = [];
    parts.push(`「${b.title}」`);
    if (b.author) parts.push(`著者:${b.author}`);
    if (b.discipline) parts.push(`分野:${b.discipline}`);
    if (b.category) parts.push(`カテゴリ:${b.category}`);
    if (b.readAt) {
      const d = new Date(b.readAt);
      parts.push(`${d.getFullYear()}年${d.getMonth() + 1}月`);
    }
    if (b.rating) parts.push(`★${b.rating}`);
    if (b.keywords.length > 0) {
      parts.push(b.keywords.map((k) => k.keyword).join(","));
    }
    return parts.join(" / ");
  });

  return {
    candidateText: candidateLines.join("\n"),
    candidateCount: candidates.length,
    trendText: trendLines.join("\n"),
    readCount: recentReads.length,
  };
}

/**
 * 次なに読む？プロンプト構築
 */
export function buildNextReadPrompt(
  userQuery: string,
  candidateText: string,
  candidateCount: number,
  trendText: string,
  readCount: number
): string {
  return `あなたは読書アドバイザーです。ユーザーの「読みたい」「積読」リストから、今の気分・興味に合う本を5冊ピックアップしてください。

■ ユーザーの気分・興味
「${userQuery}」

■ 候補リスト（${candidateCount}冊）
${candidateText}

■ 直近の読書傾向（${readCount}冊）
${trendText}

■ タスク
1. ユーザーの気分・興味と読書傾向を踏まえて、候補リストから最適な5冊を選んでください
2. 各本について、なぜ今読むべきかの理由を2〜3文で書いてください
3. 候補が5冊未満の場合は、ある分だけ選んでください

■ 出力JSON（これ以外のテキストを含めないでください）
[
  { "bookId": "候補リストのID", "title": "本のタイトル", "reason": "推薦理由" }
]

■ 注意
- bookId は候補リストの先頭 [xxx] の値を正確に使うこと
- 候補リストにない本は絶対に含めないこと
- 理由はユーザーの気分・興味に直接紐づけること`;
}

/**
 * 自然文検索: クエリ分析プロンプト
 */
export function buildNaturalSearchQueryPrompt(
  userQuery: string,
  metadataText: string,
  bookCount: number
): string {
  return `あなたは読書アドバイザーです。ユーザーが自然文で本・論文を探しています。

■ ユーザーの検索クエリ
「${userQuery}」

■ 読者の読書履歴（${bookCount}冊）
${metadataText}

■ タスク
ユーザーの検索意図を分析してください。

1. クエリが十分明確な場合 → 検索クエリを生成
2. クエリが曖昧で、より良い結果のために確認が必要な場合 → 確認質問を返却

■ 出力JSON（これ以外のテキストを含めないでください）

明確な場合:
{
  "action": "search",
  "ndlQueries": [
    { "keywords": ["キーワード1", "キーワード2"], "description": "このクエリで探す内容" }
  ],
  "scholarQueries": [
    { "query": "English search query", "description": "このクエリで探す内容" }
  ]
}

曖昧な場合:
{
  "action": "clarify",
  "questions": [
    { "id": "q1", "question": "確認したい質問", "options": ["選択肢1", "選択肢2", "選択肢3"] }
  ]
}

■ 注意
- ndlQueries: 5つ、scholarQueries: 5つ
- 確認質問は最大3問まで
- 読書履歴を踏まえた上で、ユーザーの意図を推測すること`;
}

/**
 * 自然文検索: 確認回答後のクエリ生成プロンプト
 */
export function buildNaturalSearchQueryWithAnswersPrompt(
  userQuery: string,
  answers: { questionId: string; question: string; answer: string }[],
  metadataText: string,
  bookCount: number
): string {
  const answersText = answers
    .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");

  return `あなたは読書アドバイザーです。ユーザーが自然文で本・論文を探しています。

■ ユーザーの検索クエリ
「${userQuery}」

■ 確認質問への回答
${answersText}

■ 読者の読書履歴（${bookCount}冊）
${metadataText}

■ タスク
ユーザーの検索意図と確認回答を踏まえて、検索クエリを生成してください。

■ 出力JSON（これ以外のテキストを含めないでください）
{
  "ndlQueries": [
    { "keywords": ["キーワード1", "キーワード2"], "description": "このクエリで探す内容" }
  ],
  "scholarQueries": [
    { "query": "English search query", "description": "このクエリで探す内容" }
  ]
}

■ 注意
- ndlQueries: 5つ、scholarQueries: 5つ
- 確認回答の内容を最大限反映すること`;
}
