import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ur4gent — AI Crypto Operations",
  description:
    "AI operators that manage treasury, execute payments, and monitor blockchain operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  if (process.env.NODE_ENV !== "production") {
    void import("@/services/operationsOrchestrator").then(
      ({ initializeOperationsSystem }) => initializeOperationsSystem(),
    );
  }
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 text-slate-100 antialiased`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
