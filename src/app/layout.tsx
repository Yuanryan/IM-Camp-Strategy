import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SelectZeroNumberInput } from "@/components/SelectZeroNumberInput";
import { SystemAmbientBackground } from "@/components/SystemAmbientBackground";
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
      <body className="relative min-h-full flex flex-col overflow-x-hidden text-slate-100">
        <SystemAmbientBackground />
        <div className="system-content-shell flex min-h-full flex-1 flex-col">
          <SelectZeroNumberInput />
          {children}
        </div>
      </body>
    </html>
  );
}
