export const fetchTokenPrices = async (symbols: string[]) => {
  try {
    // Map internal symbols to CoinGecko IDs
    const idMap: Record<string, string> = {
      "HBAR": "hedera-hashgraph",
      "BTC": "bitcoin",
      "ETH": "ethereum",
      "SOL": "solana",
      "LINK": "solana" // fallback example
    };

    const ids = symbols.map(s => idMap[s] || s.toLowerCase()).join(",");
    
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );

    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.statusText}`);
    }

    const data = await res.json();

    return symbols.map(symbol => {
      const id = idMap[symbol] || symbol.toLowerCase();
      const coinData = data[id];
      
      if (!coinData) {
        // Fallback if ID not found (e.g. rate limit or bad symbol)
        return {
          symbol,
          price: 0,
          change24h: 0,
          error: "Data not available"
        };
      }

      return {
        symbol,
        price: coinData.usd,
        change24h: coinData.usd_24h_change
      };
    });

  } catch (error) {
    console.error("Failed to fetch market data:", error);
    // Return stale/mock data on failure to prevent crash
    return symbols.map((s) => ({ 
      symbol: s, 
      price: 0, 
      change24h: 0,
      error: "Service unavailable" 
    }));
  }
};
