import type { ReactNode } from "react";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DebugDbPageProps = {
  searchParams: { key?: string };
};

const truncate = (value: string, max = 140) => {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
};

export default async function DebugDbPage({ searchParams }: DebugDbPageProps) {
  const expected = process.env.DEBUG_VIEW_KEY;
  if (!expected) notFound();
  if (!searchParams.key || searchParams.key !== expected) notFound();

  const now = new Date();
  const load = async () => {
    const [
      agentCount,
      activityCount,
      paymentCount,
      agentLogCount,
      blockchainEventCount,
      agentMemoryCount,
      transactionCount,
    ] = await Promise.all([
      prisma.agent.count(),
      prisma.activity.count(),
      prisma.payment.count(),
      prisma.agentLog.count(),
      prisma.blockchainEvent.count(),
      prisma.agentMemory.count(),
      prisma.transaction.count(),
    ]);

    const [agents, activities, payments, agentLogs, chainEvents, memories, transactions] =
      await Promise.all([
        prisma.agent.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            name: true,
            role: true,
            operationalStatus: true,
            balance: true,
            reputation: true,
            hederaAccountId: true,
            createdAt: true,
          },
        }),
        prisma.activity.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            type: true,
            agentId: true,
            title: true,
            detail: true,
            message: true,
            createdAt: true,
          },
        }),
        prisma.payment.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            agentId: true,
            recipientAddress: true,
            amount: true,
            token: true,
            status: true,
            executionType: true,
            category: true,
            txId: true,
            createdAt: true,
            executedAt: true,
          },
        }),
        prisma.agentLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            agentId: true,
            level: true,
            title: true,
            message: true,
            createdAt: true,
          },
        }),
        prisma.blockchainEvent.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            agentId: true,
            eventType: true,
            detail: true,
            txId: true,
            createdAt: true,
          },
        }),
        prisma.agentMemory.findMany({
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: {
            agentId: true,
            key: true,
            value: true,
            updatedAt: true,
          },
        }),
        prisma.transaction.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            txId: true,
            fromAgentId: true,
            toAgentId: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

    return {
      counts: {
        agentCount,
        activityCount,
        paymentCount,
        agentLogCount,
        blockchainEventCount,
        agentMemoryCount,
        transactionCount,
      },
      agents,
      activities,
      payments,
      agentLogs,
      chainEvents,
      memories,
      transactions,
    };
  };

  let data: Awaited<ReturnType<typeof load>> | null = null;
  let errorMessage: string | null = null;

  try {
    data = await load();
  } catch (error: unknown) {
    errorMessage = error instanceof Error ? error.message : "DB query failed";
  }

  if (errorMessage || !data) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-200">
          <div className="text-lg font-semibold">DB status: ERROR</div>
          <div className="mt-2 text-sm">{errorMessage ?? "DB query failed"}</div>
          <div className="mt-4 text-xs text-rose-200/80">Time: {now.toISOString()}</div>
        </div>
      </div>
    );
  }

  const { counts, agents, activities, payments, agentLogs, chainEvents, memories, transactions } =
    data;

  return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Debug DB Viewer</h1>
              <div className="mt-2 text-sm text-slate-400">
                Server time: {now.toISOString()}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
              DB status: OK
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            { label: "Agents", value: counts.agentCount },
            { label: "Activities", value: counts.activityCount },
            { label: "Payments", value: counts.paymentCount },
            { label: "Agent Logs", value: counts.agentLogCount },
            { label: "Blockchain Events", value: counts.blockchainEventCount },
            { label: "Agent Memory", value: counts.agentMemoryCount },
            { label: "Transactions", value: counts.transactionCount },
          ].map((x) => (
            <div
              key={x.label}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-5"
            >
              <div className="text-xs text-slate-500">{x.label}</div>
              <div className="mt-2 text-2xl font-bold text-white">
                {x.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <Section title="Latest Agents">
            <Table
              headers={[
                "id",
                "name",
                "role",
                "operationalStatus",
                "balance",
                "reputation",
                "hederaAccountId",
                "createdAt",
              ]}
              rows={agents.map((a) => [
                a.id,
                a.name,
                a.role,
                a.operationalStatus,
                String(a.balance),
                String(a.reputation),
                a.hederaAccountId ?? "-",
                a.createdAt.toISOString(),
              ])}
            />
          </Section>

          <Section title="Latest Activities">
            <Table
              headers={["id", "type", "agentId", "title", "detail/message", "createdAt"]}
              rows={activities.map((a) => [
                a.id,
                a.type,
                a.agentId ?? "-",
                a.title ?? "-",
                truncate(a.detail ?? a.message ?? "-"),
                a.createdAt.toISOString(),
              ])}
            />
          </Section>

          <Section title="Latest Payments">
            <Table
              headers={[
                "id",
                "agentId",
                "amount",
                "token",
                "status",
                "executionType",
                "recipient",
                "txId",
                "createdAt",
              ]}
              rows={payments.map((p) => [
                p.id,
                p.agentId ?? "-",
                String(p.amount),
                p.token,
                p.status,
                p.executionType,
                truncate(p.recipientAddress, 60),
                p.txId ?? "-",
                p.createdAt.toISOString(),
              ])}
            />
          </Section>

          <Section title="Latest Agent Logs">
            <Table
              headers={["id", "agentId", "level", "title", "message", "createdAt"]}
              rows={agentLogs.map((l) => [
                l.id,
                l.agentId ?? "-",
                l.level,
                l.title,
                truncate(l.message ?? "-"),
                l.createdAt.toISOString(),
              ])}
            />
          </Section>

          <Section title="Latest Blockchain Events">
            <Table
              headers={["id", "eventType", "agentId", "txId", "detail", "createdAt"]}
              rows={chainEvents.map((e) => [
                e.id,
                e.eventType,
                e.agentId ?? "-",
                e.txId ?? "-",
                truncate(e.detail),
                e.createdAt.toISOString(),
              ])}
            />
          </Section>

          <Section title="Latest Agent Memory (truncated)">
            <Table
              headers={["agentId", "key", "value", "updatedAt"]}
              rows={memories.map((m) => [
                m.agentId,
                m.key,
                truncate(m.value ?? "-", 120),
                m.updatedAt.toISOString(),
              ])}
            />
          </Section>

          <Section title="Latest Transactions">
            <Table
              headers={["id", "txId", "fromAgentId", "toAgentId", "amount", "status", "createdAt"]}
              rows={transactions.map((t) => [
                t.id,
                t.txId ?? "-",
                t.fromAgentId ?? "-",
                t.toAgentId ?? "-",
                String(t.amount),
                t.status,
                t.createdAt.toISOString(),
              ])}
            />
          </Section>
        </div>
      </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full border-collapse text-left text-xs text-slate-200">
        <thead className="bg-slate-950/60 text-slate-400">
          <tr>
            {headers.map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.length === 0 ? (
            <tr>
              <td className="px-3 py-3 text-slate-400" colSpan={headers.length}>
                No rows
              </td>
            </tr>
          ) : (
            rows.map((r, idx) => (
              <tr key={idx} className="bg-slate-950/30">
                {r.map((c, j) => (
                  <td key={j} className="whitespace-nowrap px-3 py-2">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

