import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SelectZeroNumberInput } from "@/components/SelectZeroNumberInput";
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
        <SelectZeroNumberInput />
        {children}
      </body>
    </html>
  );
}
