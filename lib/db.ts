import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const buildDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  const isPooler = (value: string) => value.includes("pooler.supabase.com");
  const shouldPreferDirect = !!directUrl && (!databaseUrl || isPooler(databaseUrl)) && !isPooler(directUrl);
  const url = shouldPreferDirect ? directUrl : databaseUrl ?? directUrl;
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(".supabase.com") && !parsed.searchParams.has("sslmode")) {
      parsed.searchParams.set("sslmode", "require");
    }
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", "20");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", "20");
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

const datasourceUrl = buildDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
