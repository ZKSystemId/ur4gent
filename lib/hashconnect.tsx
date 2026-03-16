"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DAppConnector, HederaJsonRpcMethod } from "@hashgraph/hedera-wallet-connect";
import { LedgerId } from "@hiero-ledger/sdk";

// Types
interface WalletContextType {
  accountId: string | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  dAppConnector: DAppConnector | null;
  isInitializing: boolean;
}

const WalletContext = createContext<WalletContextType>({
  accountId: null,
  isConnected: false,
  connect: async () => {},
  disconnect: async () => {},
  dAppConnector: null,
  isInitializing: true,
});

export const useWallet = () => useContext(WalletContext);

const APP_METADATA = {
  name: "WEB4U Ur4gent",
  description: "Ur4gent AI Agent Operating System on Hedera",
  url: "https://web4u.vercel.app",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [dAppConnector, setDAppConnector] = useState<DAppConnector | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize DAppConnector
  useEffect(() => {
    const init = async () => {
      try {
        const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
        if (!projectId) {
          console.error("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID");
          return;
        }

        // Initialize DAppConnector
        // Constructor: (metadata, network, projectId, methods, events, chains)
        const connector = new DAppConnector(
          APP_METADATA,
          LedgerId.TESTNET,
          projectId,
          Object.values(HederaJsonRpcMethod),
          [],
          ["hedera:testnet"]
        );

        await connector.init();
        setDAppConnector(connector);

        // Check for existing signers (restored session)
        if (connector.signers.length > 0) {
            const signer = connector.signers[0];
            setAccountId(signer.getAccountId().toString());
        }
        
      } catch (e) {
        const detail = e instanceof Error ? e.message : JSON.stringify(e);
        console.error("Failed to initialize DAppConnector:", detail);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (accountId) {
      document.cookie = `ur4gent_ownerId=${encodeURIComponent(accountId)}; Path=/; SameSite=Lax`;
    } else {
      document.cookie = "ur4gent_ownerId=; Path=/; Max-Age=0; SameSite=Lax";
    }
  }, [accountId]);

  const connect = useCallback(async () => {
    if (!dAppConnector) return;
    try {
      await dAppConnector.openModal();
      // After modal closes and connection succeeds, check signers
      // We might want to add a listener or just check immediately
      if (dAppConnector.signers.length > 0) {
          setAccountId(dAppConnector.signers[0].getAccountId().toString());
      }
    } catch (e) {
      const detail = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Connect error:", detail);
      if (detail !== "User closed modal") {
         console.warn("Connection failed or cancelled");
      }
    }
  }, [dAppConnector]);

  const disconnect = useCallback(async () => {
    if (!dAppConnector) return;
    try {
      await dAppConnector.disconnectAll();
      setAccountId(null);
    } catch (e) {
      const detail = e instanceof Error ? e.message : JSON.stringify(e);
      console.error("Disconnect error:", detail);
    }
  }, [dAppConnector]);

  return (
    <WalletContext.Provider
      value={{
        accountId,
        isConnected: !!accountId,
        connect,
        disconnect,
        dAppConnector,
        isInitializing
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
