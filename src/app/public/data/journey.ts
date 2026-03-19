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
  parentId: string | null;
  ongoing: boolean;
};

export const journeyEntries: JourneyEntry[] = [
  {
    id: "education-sociology",
    title: "教育社会学",
    period: "2016〜",
    description:
      "教育格差、就活、メリトクラシー。「個人の成功を自己責任のレンズでのみ見ることの問題」に気づいたのがすべての出発点。苅谷剛彦、本田由紀、中村高康らを読み漁り、教育と社会階層の関係にのめり込んだ。ここから芋づる式に読書が始まる。",
    books: [
      { title: "現代教育社会学", author: "岩井八郎・近藤博之" },
      { title: "大卒就職の社会学", author: "苅谷剛彦・本田由紀編" },
      { title: "暴走する能力主義", author: "中村高康" },
    ],
    parentId: null,
    ongoing: true,
  },
  {
    id: "family-sociology",
    title: "家族社会学",
    period: "2016〜",
    description:
      "教育格差の背後にある「家族」に目が向いた。落合恵美子『21世紀型家族へ』で「普通の家族」がいかに異質なものかを叩き込まれ、戸籍制度、事実婚、シングルの生き方など、家族のかたちを問い続けるようになる。恋愛社会学にも手を伸ばし、現在も読み続けている領域。",
    books: [
      { title: "21世紀型家族へ 第3版", author: "落合恵美子" },
      { title: "戸籍と無戸籍", author: "遠藤正敬" },
      { title: "最小の結婚", author: "エリザベス・ブレイク" },
    ],
    parentId: "education-sociology",
    ongoing: true,
  },
  {
    id: "gender-sexuality",
    title: "ジェンダー・セクシュアリティ",
    period: "2017〜",
    description:
      "家族社会学からジェンダーの非対称性へ。フェミニズム、男性学、クィア理論と広がり、読書全体の中で最も多くの本を読んできた分野。「正常」に異議を唱えるクィア理論の射程、ポスト・フェミニズムの陥穽、インターセクショナリティの重要性を学び続けている。50冊以上を費やしてなお現在進行形。",
    books: [
      { title: "フェミニズム", author: "竹村和子" },
      { title: "クイア・スタディーズ", author: "河口和也" },
      { title: "「ゲイコミュニティ」の社会学", author: "森山至貴" },
      { title: "トランスジェンダー問題", author: "ショーン・フェイ" },
    ],
    parentId: "family-sociology",
    ongoing: true,
  },
  {
    id: "disability-racism",
    title: "障害学・レイシズム",
    period: "2019〜",
    description:
      "ジェンダー・セクシュアリティ研究で培った視点を、障害やレイシズムの問題にも向ける。星加良司の障害概念の分析、差別の哲学的検討、インターセクショナリティの実践。マイノリティの権利という共通の問いが諸分野を貫いている。",
    books: [
      { title: "障害とは何か", author: "星加良司" },
      { title: "差別の哲学入門", author: "池田喬・堀田義太郎" },
      { title: "差別する人の研究", author: "阿久澤麻理子" },
    ],
    parentId: "gender-sexuality",
    ongoing: true,
  },
  {
    id: "qualitative-research",
    title: "質的社会調査",
    period: "2016〜",
    description:
      "初期から通奏低音のように流れてきた方法論への関心。岸政彦の「他者の合理性」という言葉に泣き、佐藤郁哉のフィールドワーク論に刺激を受け、桜井厚のインタビュー論で自分自身の「聞く」姿勢を猛省した。「どうやって社会を知るのか」は常に問い続けている。",
    books: [
      { title: "質的社会調査の方法", author: "岸政彦ほか" },
      { title: "断片的なものの社会学", author: "岸政彦" },
      { title: "フィールドワーク", author: "佐藤郁哉" },
    ],
    parentId: "education-sociology",
    ongoing: true,
  },
  {
    id: "sociology-theory",
    title: "社会学理論",
    period: "2017〜2018",
    description:
      "デュルケム、ヴェーバー、ジンメル。社会を個人から切り離された「物」と見るか、相互作用の網の目と見るか。構築主義やルーマンの等価機能主義を知り、「事象の持つ意味は格段に多様になる」ことに興奮した。ジンメルの社会観が特に好きだった。",
    books: [
      { title: "社会学の歴史（１）", author: "奥村隆" },
      { title: "社会学の方法", author: "佐藤俊樹" },
      { title: "構築主義とは何か", author: "上野千鶴子編" },
    ],
    parentId: "education-sociology",
    ongoing: false,
  },
  {
    id: "ethics-philosophy",
    title: "倫理学・政治哲学",
    period: "2018〜2023",
    description:
      "社会の不平等を「記述」するだけでなく、「ではどうあるべきか」という規範の問いに向き合うようになった。功利主義と義務論の対立、メタ倫理学における道徳の実在性、ロールズの正義論、社会契約論。法哲学ではハート対ドゥオーキン論争に深入りし、「法とは何か」という問いに魅了された。",
    books: [
      { title: "功利と直観", author: "児玉聡" },
      { title: "メタ倫理学入門", author: "佐藤岳詩" },
      { title: "社会契約論", author: "重田園江" },
      { title: "法哲学", author: "瀧川裕英・宇佐美誠・大屋雄裕" },
    ],
    parentId: "sociology-theory",
    ongoing: false,
  },
  {
    id: "welfare-politics",
    title: "福祉国家・福祉政治",
    period: "2017〜2020",
    description:
      "教育や家族の問題を掘り下げていくと、国家がどのように市民の生活を支えてきた（支えてこなかった）のかに行き着く。日本は企業と家族に福祉を丸投げしてきた結果としての現在がある。宮本太郎のライフ・ポリティクス、田中拓道の「政治的機会構造」の概念に目を開かれた。",
    books: [
      { title: "福祉政治", author: "宮本太郎" },
      { title: "福祉政治史", author: "田中拓道" },
      { title: "ベーシック・インカム入門", author: "山森亮" },
    ],
    parentId: "education-sociology",
    ongoing: false,
  },
  {
    id: "international-politics",
    title: "国際政治",
    period: "2022〜",
    description:
      "ロシアのウクライナ侵攻が直接のきっかけ。「正しくなさに寄りかかりすぎて盲目になるな」と自分に言い聞かせながら、国際政治史を一から学び直した。パレスチナ問題では岡真理に衝撃を受け、安全保障論、ロシア法研究まで手を伸ばした。",
    books: [
      { title: "国際政治史", author: "小川浩之・板橋拓己・青野利彦" },
      { title: "ガザに地下鉄が走る日", author: "岡真理" },
      { title: "現代ロシアの軍事戦略", author: "小泉悠" },
    ],
    parentId: "welfare-politics",
    ongoing: true,
  },
  {
    id: "japanese-politics",
    title: "日本政治",
    period: "2023〜",
    description:
      "福祉政治や国際政治を学ぶうちに、自分が暮らす日本の政治をまともに知らないことに気づいた。投票行動、政治過程、利益団体。「この国はなぜこうなのか」という問いに正面から向き合い始めている。",
    books: [
      { title: "何が投票率を高めるのか", author: "松林哲也" },
      { title: "政治行動論", author: "飯田健・松林哲也・大村華子" },
      { title: "リベラルとは何か", author: "田中拓道" },
    ],
    parentId: "international-politics",
    ongoing: true,
  },
  {
    id: "psychology",
    title: "心理学",
    period: "2024〜",
    description:
      "2024年から急速に読書量が増えた分野。感情、性格、カウンセリング、加害者臨床。「人の心という温度感のあるものを徹底的に冷たく扱う」学問に、冷たく扱うからこそ見えるものがあると気づいた。社会の構造だけでなく、個人の内面にも目を向け始めている。",
    books: [
      { title: "感情心理学・入門", author: "大平英樹編著" },
      { title: "「自傷的自己愛」の精神分析", author: "斎藤環" },
      { title: "改訂新版 カウンセリングで何ができるか", author: "信田さよ子" },
    ],
    parentId: "education-sociology",
    ongoing: true,
  },
  {
    id: "economics-business",
    title: "経済学・経営学",
    period: "2017〜2023",
    description:
      "苦手意識がありつつも、金融政策、自由貿易、マーケティングなど折に触れて手を伸ばしてきた。特に有斐閣の教科書は信頼している。起業やプロダクトマネジメントにも関心が広がっている。",
    books: [
      { title: "金融のエッセンス", author: "川西諭・山崎福寿" },
      { title: "自由貿易はなぜ必要なのか", author: "椋寛" },
      { title: "はじめてのマーケティング", author: "久保田進彦ほか" },
    ],
    parentId: "welfare-politics",
    ongoing: false,
  },
  {
    id: "tech",
    title: "プログラミング",
    period: "2023",
    description:
      "コンピュータの仕組みを基礎から学び、プログラミングの原則を知った。この読書記録アプリは、読書を通じてテクノロジーへの関心が芽生えた結果でもある。",
    books: [
      { title: "プリンシプル オブ プログラミング", author: "上田勲" },
      { title: "コンピュータ、どうやってつくったんですか？", author: "川添愛" },
    ],
    parentId: "education-sociology",
    ongoing: false,
  },
];
