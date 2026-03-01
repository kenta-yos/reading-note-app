export const BOOK_STATUSES = {
  WANT_TO_READ: { label: "読みたい", color: "purple" },
  READING_STACK: { label: "積読", color: "amber" },
  READING: { label: "読中", color: "blue" },
  READ: { label: "読了", color: "green" },
} as const;

export type BookStatus = keyof typeof BOOK_STATUSES;

// ステータスの進行順序（ワンタップ進行用）
export const STATUS_FLOW: BookStatus[] = ["WANT_TO_READ", "READING_STACK", "READING", "READ"];

export type Book = {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publishedYear: number | null;
  pages: number;
  category: string | null;
  discipline: string | null;
  rating: number | null;
  description: string | null;
  notes: string | null;
  status: BookStatus;
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

export type MonthlyByCategory = {
  month: number;
  [category: string]: number;
};

export type StatsResponse = {
  totalBooks: number;
  totalPages: number;
  monthlyPages: MonthlyPages[];
  categoryTotals: CategoryTotal[];
  monthlyByCategory: MonthlyByCategory[];
  goal: AnnualGoal | null;
};

export type Category = {
  id: string;
  name: string;
  createdAt: Date;
};

export type CategoryEvolutionPoint = {
  year: number;
  [category: string]: number;
};

export type CategoryEvolutionData = {
  years: number[];
  categories: string[];
  data: CategoryEvolutionPoint[];
};
