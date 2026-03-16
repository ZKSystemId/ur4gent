import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const BLACKLIST_KEY = "risk_blacklist";
const WATCHLIST_KEY = "risk_contract_watchlist";

const parseList = <T>(raw: string | null, fallback: T[]) => {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as T[];
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return fallback;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");

  if (!agentId) {
    return NextResponse.json({ error: "Missing agentId" }, { status: 400 });
  }

  const [blacklistRaw, watchlistRaw] = await Promise.all([
    prisma.agentMemory.findUnique({
      where: { agentId_key: { agentId, key: BLACKLIST_KEY } },
    }),
    prisma.agentMemory.findUnique({
      where: { agentId_key: { agentId, key: WATCHLIST_KEY } },
    }),
  ]);

  const blacklist = parseList<string>(blacklistRaw?.value ?? null, []);
  const watchlist = parseList<{ address: string; reason: string }>(
    watchlistRaw?.value ?? null,
    [],
  );

  return NextResponse.json({ blacklist, watchlist });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    agentId?: string;
    type?: "blacklist" | "contract";
    address?: string;
    reason?: string;
  };

  if (!body.agentId || !body.type || !body.address) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  if (body.type === "blacklist") {
    const existing = await prisma.agentMemory.findUnique({
      where: { agentId_key: { agentId: body.agentId, key: BLACKLIST_KEY } },
    });
    const list = parseList<string>(existing?.value ?? null, []);
    if (!list.includes(body.address)) list.push(body.address);
    await prisma.agentMemory.upsert({
      where: { agentId_key: { agentId: body.agentId, key: BLACKLIST_KEY } },
      update: { value: JSON.stringify(list), type: "long_term" },
      create: {
        agentId: body.agentId,
        key: BLACKLIST_KEY,
        value: JSON.stringify(list),
        type: "long_term",
      },
    });
    return NextResponse.json({ blacklist: list });
  }

  const existing = await prisma.agentMemory.findUnique({
    where: { agentId_key: { agentId: body.agentId, key: WATCHLIST_KEY } },
  });
  const list = parseList<{ address: string; reason: string }>(
    existing?.value ?? null,
    [],
  );
  if (!list.find((x) => x.address === body.address)) {
    list.push({ address: body.address, reason: body.reason ?? "Suspicious" });
  }
  await prisma.agentMemory.upsert({
    where: { agentId_key: { agentId: body.agentId, key: WATCHLIST_KEY } },
    update: { value: JSON.stringify(list), type: "long_term" },
    create: {
      agentId: body.agentId,
      key: WATCHLIST_KEY,
      value: JSON.stringify(list),
      type: "long_term",
    },
  });
  return NextResponse.json({ watchlist: list });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    agentId?: string;
    type?: "blacklist" | "contract";
    address?: string;
  };

  if (!body.agentId || !body.type || !body.address) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  if (body.type === "blacklist") {
    const existing = await prisma.agentMemory.findUnique({
      where: { agentId_key: { agentId: body.agentId, key: BLACKLIST_KEY } },
    });
    const list = parseList<string>(existing?.value ?? null, []);
    const next = list.filter((x) => x !== body.address);
    await prisma.agentMemory.upsert({
      where: { agentId_key: { agentId: body.agentId, key: BLACKLIST_KEY } },
      update: { value: JSON.stringify(next), type: "long_term" },
      create: {
        agentId: body.agentId,
        key: BLACKLIST_KEY,
        value: JSON.stringify(next),
        type: "long_term",
      },
    });
    return NextResponse.json({ blacklist: next });
  }

  const existing = await prisma.agentMemory.findUnique({
    where: { agentId_key: { agentId: body.agentId, key: WATCHLIST_KEY } },
  });
  const list = parseList<{ address: string; reason: string }>(
    existing?.value ?? null,
    [],
  );
  const next = list.filter((x) => x.address !== body.address);
  await prisma.agentMemory.upsert({
    where: { agentId_key: { agentId: body.agentId, key: WATCHLIST_KEY } },
    update: { value: JSON.stringify(next), type: "long_term" },
    create: {
      agentId: body.agentId,
      key: WATCHLIST_KEY,
      value: JSON.stringify(next),
      type: "long_term",
    },
  });
  return NextResponse.json({ watchlist: next });
}
