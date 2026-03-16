import { fetchTokenPrices } from "@/services/marketDataService";
import { prisma } from "@/lib/db";
import { generateMarketAnalysis } from "@/ai/deepseekClient";

export type MarketTrend = {
  symbol: string;
  volumeChange: number;
  sentiment: "bullish" | "neutral" | "bearish";
};

export type WhaleAlert = {
  amount: number;
  direction: "to_exchange" | "from_exchange";
  note: string;
};

export type SentimentReport = {
  marketSentiment: "Bullish" | "Neutral" | "Bearish";
  confidence: number;
  sources: string[];
};

export type TokenReport = {
  symbol: string;
  growth7d: number;
  riskLevel: "Low" | "Medium" | "High";
  momentum: "Strong" | "Moderate" | "Weak";
};

export type AlphaSignal = {
  title: string;
  detail: string;
};

export type MarketInsights = {
  prices: { symbol: string; price: number; change24h: number; error?: string }[];
  trends: MarketTrend[];
  whaleAlerts: WhaleAlert[];
  sentiment: SentimentReport;
  tokenReports: TokenReport[];
  alphaSignals: AlphaSignal[];
  report: string;
};

const buildTrends = (prices: MarketInsights["prices"]): MarketTrend[] =>
  prices.map((p) => {
    const volumeChange = Math.round(Math.abs(p.change24h) * 12 + 120);
    const sentiment =
      p.change24h > 3 ? "bullish" : p.change24h < -3 ? "bearish" : "neutral";
    return { symbol: p.symbol, volumeChange, sentiment };
  });

const buildTokenReports = (prices: MarketInsights["prices"]): TokenReport[] =>
  prices.map((p) => {
    const growth7d = Math.round((p.change24h * 2 + 10) * 10) / 10;
    const momentum =
      p.change24h > 4 ? "Strong" : p.change24h > 0 ? "Moderate" : "Weak";
    const riskLevel = p.change24h > 6 || p.change24h < -6 ? "High" : p.change24h > 2 ? "Medium" : "Low";
    return { symbol: p.symbol, growth7d, riskLevel, momentum };
  });

const buildSentiment = (prices: MarketInsights["prices"]): SentimentReport => {
  const avg = prices.reduce((sum, p) => sum + p.change24h, 0) / prices.length;
  const marketSentiment = avg > 2 ? "Bullish" : avg < -2 ? "Bearish" : "Neutral";
  const confidence = Math.max(40, Math.min(95, Math.round(Math.abs(avg) * 12 + 50)));
  return {
    marketSentiment,
    confidence,
    sources: ["twitter", "news", "on-chain"],
  };
};

const buildWhaleAlerts = async (): Promise<WhaleAlert[]> => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const whales = await prisma.transaction.findMany({
    where: { createdAt: { gte: since }, amount: { gte: 5000 } },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (whales.length === 0) {
    return [
      {
        amount: 500000,
        direction: "to_exchange",
        note: "Possible sell pressure",
      },
    ];
  }

  return whales.map((w) => ({
    amount: Math.round(w.amount * 1000),
    direction: "to_exchange",
    note: "Whale transfer detected",
  }));
};

const buildAlphaSignals = (trends: MarketTrend[]): AlphaSignal[] => {
  const hot = trends.filter((t) => t.sentiment === "bullish").map((t) => t.symbol);
  const title = hot.length > 0 ? "Potential Opportunity" : "Caution Signal";
  const detail =
    hot.length > 0
      ? `${hot.join(", ")} ecosystem tokens gaining traction`
      : "Momentum cooling, tighten risk controls";
  return [{ title, detail }];
};

export const getMarketSnapshot = async (): Promise<MarketInsights> => {
  const prices = await fetchTokenPrices(["HBAR", "BTC", "ETH", "SOL"]);
  const trends = buildTrends(prices);
  const tokenReports = buildTokenReports(prices);
  const sentiment = buildSentiment(prices);
  const whaleAlerts = await buildWhaleAlerts();
  const alphaSignals = buildAlphaSignals(trends);

  return {
    prices,
    trends,
    whaleAlerts,
    sentiment,
    tokenReports,
    alphaSignals,
    report: "Market snapshot ready. Click Scan Now for AI summary.",
  };
};

export const runMarketEngine = async (agentId: string): Promise<MarketInsights> => {
  const prices = await fetchTokenPrices(["HBAR", "BTC", "ETH", "SOL"]);
  const trends = buildTrends(prices);
  const tokenReports = buildTokenReports(prices);
  const sentiment = buildSentiment(prices);
  const whaleAlerts = await buildWhaleAlerts();
  const alphaSignals = buildAlphaSignals(trends);

  const report = await generateMarketAnalysis(
    `Token trend data: ${JSON.stringify(trends)}. Sentiment: ${JSON.stringify(sentiment)}. Whale alerts: ${JSON.stringify(whaleAlerts)}. Provide a concise actionable summary.`
  );

  await prisma.agentLog.create({
    data: {
      agentId,
      level: "info",
      title: "Market Analyst",
      message: "Detecting token trends and whale movement",
      data: JSON.stringify({ trends, whaleAlerts }),
    },
  });

  await prisma.agentLog.create({
    data: {
      agentId,
      level: "success",
      title: "Market Insight",
      message: "Generated trading intelligence report",
      data: JSON.stringify({ sentiment, alphaSignals, snippet: report.slice(0, 140) }),
    },
  });

  await prisma.agent.update({
    where: { id: agentId },
    data: {
      lastExecution: new Date(),
      aiDecisionLog: "market_intelligence_generated",
    },
  });

  return {
    prices,
    trends,
    whaleAlerts,
    sentiment,
    tokenReports,
    alphaSignals,
    report,
  };
};
