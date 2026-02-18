import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import BottomNav from "@/components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScholarGraph",
  description: "研究書・専門書の読書管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50`}>
        <div className="flex min-h-screen">
          {/* PC only sidebar */}
          <Sidebar />
          {/* pb-20 on mobile to avoid content hiding behind BottomNav */}
          <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 overflow-auto">
            {children}
          </main>
        </div>
        {/* Mobile only bottom nav */}
        <BottomNav />
      </body>
    </html>
  );
}
