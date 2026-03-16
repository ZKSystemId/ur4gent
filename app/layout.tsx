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
  // Only initialize on server if needed, or keep it.
  // The original code had a side-effect import here which is unconventional for Server Components but might work.
  // We'll keep it as is.
  void import("@/services/operationsOrchestrator").then(
    ({ initializeOperationsSystem }) => initializeOperationsSystem(),
  );
  
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
