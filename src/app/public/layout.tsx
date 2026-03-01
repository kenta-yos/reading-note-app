import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ken | 芋づる式読書の記録",
  description:
    "10年間の読書遍歴。教育社会学→フェミニズム→障害学→法哲学。全読了書籍リストと知識の地図を公開しています。",
  openGraph: {
    title: "Ken | 芋づる式読書の記録",
    description:
      "10年間の読書遍歴。教育社会学→フェミニズム→障害学→法哲学。全読了書籍リストと知識の地図を公開しています。",
    url: "https://reading-note-app.vercel.app/public",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ken | 芋づる式読書の記録",
    description:
      "10年間の読書遍歴。教育社会学→フェミニズム→障害学→法哲学。全読了書籍リストと知識の地図を公開しています。",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#faf9f6" }}>
      {children}
    </div>
  );
}
