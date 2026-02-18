export type Book = {
  id: string;
  title: string;
  author: string | null;
  publisher: string | null;
  publishedYear: number | null;
  pages: number;
  category: string | null;
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
