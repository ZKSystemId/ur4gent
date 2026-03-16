"use client";

import { WalletProvider } from "@/lib/hashconnect";

export function Providers({ children }: { children: React.ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}