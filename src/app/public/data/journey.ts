export type JourneyBook = {
  title: string;
  author: string;
};

export type JourneyEntry = {
  id: string;
  title: string;
  period: string;
  description: string;
  books: JourneyBook[];
};

export const journeyEntries: JourneyEntry[] = [
  {
    id: "labor-law",
    title: "労働法",
    period: "2016〜2017",
    description:
      "社会人として働き始め、職場の理不尽さに直面したことがきっかけ。自分の権利を知りたいという切実な動機から労働法の世界に入った。",
    books: [
      { title: "労働法入門", author: "水町勇一郎" },
      { title: "労働法", author: "荒木尚志" },
    ],
  },
  {
    id: "education-sociology",
    title: "教育社会学",
    period: "2017〜2018",
    description:
      "労働問題を掘り下げるうちに「なぜ人は不平等な立場に置かれるのか」という問いに行き着き、教育と社会階層の関係に関心が移った。",
    books: [
      { title: "教育と平等", author: "苅谷剛彦" },
      { title: "学力と階層", author: "苅谷剛彦" },
    ],
  },
  {
    id: "family-sociology",
    title: "家族社会学",
    period: "2018〜2019",
    description:
      "教育格差の背景にある家族のあり方に目が向き、近代家族の成り立ちや変容を追いかけるようになった。",
    books: [
      { title: "近代家族の曲がり角", author: "落合恵美子" },
      { title: "家族社会学の基礎", author: "松木洋人" },
    ],
  },
  {
    id: "feminism",
    title: "フェミニズム",
    period: "2019〜2020",
    description:
      "家族研究を通じてジェンダーの非対称性が浮き彫りになり、フェミニズム理論を体系的に学び始めた。",
    books: [
      { title: "ジェンダー・トラブル", author: "ジュディス・バトラー" },
      { title: "女性学入門", author: "杉本貴代栄" },
    ],
  },
  {
    id: "queer",
    title: "クィア",
    period: "2020〜2021",
    description:
      "フェミニズムからセクシュアリティの多様性へと視野が広がり、クィア理論や当事者の語りに触れるようになった。",
    books: [
      { title: "クィア・スタディーズ", author: "森山至貴" },
      { title: "LGBTを読みとく", author: "森山至貴" },
    ],
  },
  {
    id: "disability",
    title: "障害学",
    period: "2021",
    description:
      "マイノリティの権利という共通テーマから、障害の社会モデルや当事者研究に関心が広がった。",
    books: [
      { title: "障害学への招待", author: "杉野昭博" },
      { title: "当事者研究の研究", author: "石原孝二" },
    ],
  },
  {
    id: "race-ethnicity",
    title: "人種・エスニシティ",
    period: "2021〜2022",
    description:
      "差別と排除の構造を横断的に捉えたいという思いから、人種やエスニシティの問題へと読書が展開した。",
    books: [
      { title: "レイシズムとは何か", author: "梁英聖" },
      { title: "日本型排外主義", author: "樋口直人" },
    ],
  },
  {
    id: "qualitative-research",
    title: "質的社会調査",
    period: "2022〜2023",
    description:
      "読むだけでなく「どうやって社会を知るのか」という方法論への関心が高まり、質的調査の手法を学び始めた。",
    books: [
      { title: "質的社会調査の方法", author: "岸政彦・石岡丈昇・丸山里美" },
      { title: "社会調査の考え方（上・下）", author: "佐藤郁哉" },
    ],
  },
  {
    id: "political-philosophy",
    title: "政治哲学・法哲学",
    period: "2023〜2024",
    description:
      "社会問題を構造的に理解した上で「ではどうあるべきか」という規範の問いに向き合うようになった。",
    books: [
      { title: "正義論", author: "ジョン・ロールズ" },
      { title: "法哲学", author: "瀧川裕英・宇佐美誠・大屋雄裕" },
    ],
  },
  {
    id: "politics",
    title: "日本政治・国際政治",
    period: "2024〜",
    description:
      "哲学的な規範論と現実の政治がどう交わるのかを知りたくなり、日本政治の構造分析や国際政治の理論に手を伸ばしている。",
    books: [
      { title: "日本の統治構造", author: "飯尾潤" },
      { title: "国際政治学", author: "村田晃嗣ほか" },
    ],
  },
];
