export type Book = {
  id: string;
  title: string;
  author: string | null;
  pages: number;
  category: string | null;
  tags: string[];
  rating: number | null;
  notes: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export type AnnualGoal = {
  id: string;
  year: number;
  pageGoal: number;
  createdAt: Date;
};

export type MonthlyPages = {
  month: number;
  pages: number;
};

export type CategoryTotal = {
  category: string;
  pages: number;
  count: number;
};

export type TagFrequency = {
  tag: string;
  count: number;
};

export type MonthlyByCategory = {
  month: number;
  [category: string]: number;
};

export type StatsResponse = {
  totalBooks: number;
  totalPages: number;
  monthlyPages: MonthlyPages[];
  categoryTotals: CategoryTotal[];
  tagFrequencies: TagFrequency[];
  monthlyByCategory: MonthlyByCategory[];
  goal: AnnualGoal | null;
};

export const CATEGORIES = [
  "哲学",
  "科学",
  "歴史",
  "社会学",
  "経済学",
  "文学",
  "心理学",
  "政治学",
  "その他",
] as const;

export type Category = (typeof CATEGORIES)[number];
