import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kira AI Investor Agent - Your Web3 Financial Assistant",
  description: "AI-powered financial assistant for Web3 investments. Manage your portfolio, invest in funds, exchange currencies, and track your USDC balance with Kira.",
  keywords: ["AI", "Web3", "DeFi", "Crypto", "Investment", "USDC", "Avalanche", "Portfolio Management"],
  authors: [{ name: "KiraFin" }],
  creator: "KiraFin",
  openGraph: {
    title: "Kira AI Investor Agent",
    description: "Your AI-powered financial assistant for Web3 investments",
    type: "website",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
