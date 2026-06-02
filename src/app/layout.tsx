import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import MistBackground from "@/components/ui/realistic-fog-background";
import { FogProvider } from "@/components/ui/fog-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IM 大富翁：迷霧資本戰",
  description: "策略遊戲即時系統",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-slate-100">
        <FogProvider>
          <MistBackground />
          {children}
        </FogProvider>
      </body>
    </html>
  );
}
