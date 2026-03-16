"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/lib/hashconnect";

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isConnected, isInitializing } = useWallet();
  const router = useRouter();

  useEffect(() => {
    // If initialization is done and still not connected, redirect to login
    if (!isInitializing && !isConnected) {
        router.push("/login");
    }
  }, [isConnected, isInitializing, router]);

  // Show loading while initializing or if not connected (redirecting)
  if (isInitializing || !isConnected) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-slate-950">
              <div className="flex flex-col items-center gap-4">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent"></div>
                  <p className="text-slate-400">Verifying Wallet Access...</p>
              </div>
          </div>
      );
  }

  return <>{children}</>;
}
