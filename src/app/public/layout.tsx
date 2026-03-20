import type { Metadata } from "next";
import Script from "next/script";

const GA_ID = "G-4NRCM174FM";

export const metadata: Metadata = {
  title: "Ken | 学術と日常をつなぐ",
  description:
    "学術書の読書を通じて、社会について考え続けている会社員の読書記録です。",
  openGraph: {
    title: "Ken | 学術と日常をつなぐ",
    description:
      "学術書の読書を通じて、社会について考え続けている会社員の読書記録です。",
    url: "https://reading-note-app.vercel.app/public",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ken | 学術と日常をつなぐ",
    description:
      "学術書の読書を通じて、社会について考え続けている会社員の読書記録です。",
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
