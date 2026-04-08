import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const fontSans = Inter({ subsets: ['latin'], variable: '--font-sans' });


export const metadata: Metadata = {
  title: "Octarv — あなたのXブックマークを知識ベースに",
  description:
    "Xブックマークを自動でタグ付け・フォルダー整理。AIエージェントが毎朝リサーチして最新トレンドをキュレーションします。",
  openGraph: {
    title: "Octarv — あなたのXブックマークを知識ベースに",
    description:
      "Xブックマークを自動でタグ付け・フォルダー整理。AIエージェントが毎朝リサーチして最新トレンドをキュレーションします。",
    type: "website",
    images: [
      {
        url: "/lp-pic.png",
        width: 2880,
        height: 1842,
        alt: "Octarv",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Octarv — あなたのXブックマークを知識ベースに",
    description:
      "Xブックマークを自動でタグ付け・フォルダー整理。AIエージェントが毎朝リサーチして最新トレンドをキュレーションします。",
    images: ["/lp-pic.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={fontSans.variable}>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body
        className="font-sans antialiased"
      >
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
