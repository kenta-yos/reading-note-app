import type { Metadata } from "next";
import Script from "next/script";

const GA_ID = "G-4NRCM174FM";

export const metadata: Metadata = {
  title: "Ken | 学術と日常をつなぐ",
  description:
    "10年間の読書遍歴。教育社会学→フェミニズム→障害学→法哲学。全読了書籍リストと知識の地図を公開しています。",
  openGraph: {
    title: "Ken | 学術と日常をつなぐ",
    description:
      "10年間の読書遍歴。教育社会学→フェミニズム→障害学→法哲学。全読了書籍リストと知識の地図を公開しています。",
    url: "https://reading-note-app.vercel.app/public",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ken | 学術と日常をつなぐ",
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
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
      {children}
    </div>
  );
}
