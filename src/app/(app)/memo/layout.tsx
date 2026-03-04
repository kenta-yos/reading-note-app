import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "読書メモ",
  manifest: "/memo-manifest.webmanifest",
  icons: {
    apple: "/read-memo-icon-180.png",
  },
};

export default function MemoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
