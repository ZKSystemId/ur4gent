"use client";

import Link from "next/link";

type PitchDeckProps = {
  repoUrl: string;
  liveUrl: string;
  demoUrl: string;
};

const Slide = ({
  children,
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
}) => {
  return (
    <section className="slide relative mx-auto flex min-h-[720px] w-full max-w-[1280px] flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-10 shadow-[0_30px_80px_rgba(0,0,0,0.55)] print:min-h-[980px] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      <div>
        {title && (
          <div className="text-3xl font-semibold tracking-tight text-white">{title}</div>
        )}
        {subtitle && (
          <div className="mt-2 text-sm text-slate-300">{subtitle}</div>
        )}
      </div>
      <div className="mt-10 flex-1">{children}</div>
      <div className="mt-10 flex items-center justify-between text-xs text-slate-500">
        <div>Ur4gent • AI Agent Rental Marketplace</div>
        <div className="print:hidden">Press Print to save as PDF</div>
      </div>
    </section>
  );
};

export default function PitchDeck({ repoUrl, liveUrl, demoUrl }: PitchDeckProps) {
  return (
    <div className="w-full">
      <div className="no-print sticky top-0 z-10 border-b border-white/10 bg-slate-950/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-3">
          <div className="text-sm font-semibold text-white">Pitch Deck</div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
            >
              Back to App
            </Link>
            <button
              onClick={() => window.print()}
              className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Print / Save as PDF
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1280px] space-y-8 px-6 py-10 print:max-w-none print:space-y-0 print:p-0">
        <Slide
          title="Ur4gent"
          subtitle="Rent autonomous AI operators to run crypto operations on Hedera"
        >
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">Team</div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <div>Team Name: Ur4gent</div>
                <div>Team Members: (fill)</div>
                <div>Contact: (fill)</div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">Links</div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <div>
                  Repo: <span className="text-cyan-300">{repoUrl}</span>
                </div>
                <div>
                  Live Demo: <span className="text-cyan-300">{liveUrl}</span>
                </div>
                <div>
                  Demo Video: <span className="text-cyan-300">{demoUrl}</span>
                </div>
              </div>
              <div className="mt-6 text-xs text-slate-500">
                Tip: Open this page and use Print → Save as PDF (Landscape recommended).
              </div>
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/40 p-6">
            <div className="text-sm font-semibold text-slate-200">One-liner</div>
            <div className="mt-3 text-base leading-relaxed text-slate-300">
              A marketplace to rent specialized AI agents that monitor markets, manage treasury,
              execute payments, and prove work on-chain on Hedera.
            </div>
          </div>
        </Slide>

        <Slide title="Problem" subtitle="Crypto operations are fragmented and hard to audit">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Too many tools",
                body: "Market, risk, treasury, payouts, and launches live in separate dashboards with no unified workflow.",
              },
              {
                title: "High operational risk",
                body: "Teams miss anomalies, execute risky payments, or lose context under time pressure.",
              },
              {
                title: "Weak accountability",
                body: "Even when actions are taken, it's hard to prove what happened, why, and by whom.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6"
              >
                <div className="text-base font-semibold text-white">{item.title}</div>
                <div className="mt-3 text-sm leading-relaxed text-slate-300">
                  {item.body}
                </div>
              </div>
            ))}
          </div>
        </Slide>

        <Slide title="Solution" subtitle="Rent AI operators, not dashboards">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">What Ur4gent does</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>Marketplace → rent specialized agents per wallet/account</li>
                <li>Command Center → monitor status, health, and activity</li>
                <li>Agent Console → run analysis, generate demos, and view audit logs</li>
                <li>OpenClaw Bounties → claim work, pay, and publish proofs on Hedera</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">Why it matters</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>Faster decisions with consistent insight formats</li>
                <li>Safer operations with risk checks and anomaly alerts</li>
                <li>Better trust via on-chain proof links (Hashscan)</li>
                <li>Composable agent roles for different teams and workflows</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/40 p-6">
            <div className="text-sm font-semibold text-slate-200">Core principle</div>
            <div className="mt-3 text-sm leading-relaxed text-slate-300">
              Each agent produces structured outputs (insights, tasks, alerts, logs) that can be
              inspected, refreshed, and verified—without needing to rebuild the whole workflow.
            </div>
          </div>
        </Slide>

        <Slide title="How It Works" subtitle="Architecture overview">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">Flow</div>
              <ol className="mt-4 space-y-2 text-sm text-slate-300">
                <li>1) Connect HashPack wallet (WalletConnect)</li>
                <li>2) Rent an agent template from Marketplace</li>
                <li>3) Agent Console shows panels per capability</li>
                <li>4) Operations engine runs analysis cycles + records events/logs</li>
                <li>5) Results are displayed with audit trail + links</li>
              </ol>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">Tech</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>Next.js (App Router) + React + TypeScript</li>
                <li>Prisma ORM + PostgreSQL (Supabase)</li>
                <li>Hedera SDK + WalletConnect + HashPack</li>
                <li>Deployed on Vercel</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { k: "Security", v: "Wallet-based ownership scoping and auditable logs" },
              { k: "Performance", v: "On-demand analysis + lightweight polling" },
              { k: "Reliability", v: "DB health endpoint and safe fallbacks for demo flows" },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
                <div className="text-sm font-semibold text-white">{x.k}</div>
                <div className="mt-2 text-sm text-slate-300">{x.v}</div>
              </div>
            ))}
          </div>
        </Slide>

        <Slide title="Agent Suite" subtitle="Specialized operators for core workflows">
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Market Analyst AI",
                body: "Price scan, trend detection, whale alerts, and concise AI market summary.",
              },
              {
                title: "Risk Monitor AI",
                body: "Flags suspicious recipients, risky patterns, and produces a risk score + rationale.",
              },
              {
                title: "Treasury Manager (CFO AI)",
                body: "Monitors treasury health, detects unusual spending, and suggests allocations.",
              },
              {
                title: "Payment Operator AI",
                body: "Task-based payouts: schedule, execute, and audit trail for every payment.",
              },
              {
                title: "Token Creator AI",
                body: "Token launch pipeline with execution logs and verifiable tokenId/txId outputs.",
              },
              {
                title: "OpenClaw Bounties",
                body: "Claim work, pay contributors, and publish proof links on Hedera/Hashscan.",
              },
            ].map((x) => (
              <div key={x.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-base font-semibold text-white">{x.title}</div>
                <div className="mt-3 text-sm leading-relaxed text-slate-300">{x.body}</div>
              </div>
            ))}
          </div>
        </Slide>

        <Slide title="Hedera Integration" subtitle="Trust via verifiable trails">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">What we put on-chain</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>HTS transfers for payouts (where available)</li>
                <li>Payment transaction hashes for verification</li>
                <li>Proof-of-work references (Hashscan links)</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">Why it helps</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>Judges can verify actions publicly</li>
                <li>Teams can audit payouts and decisions later</li>
                <li>Enables accountable agent automation</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/40 p-6">
            <div className="text-sm font-semibold text-slate-200">Key message</div>
            <div className="mt-3 text-sm leading-relaxed text-slate-300">
              Ur4gent turns AI outputs into operational artifacts (tasks, logs, proofs) that can be
              inspected and verified on Hedera.
            </div>
          </div>
        </Slide>

        <Slide title="Judging Criteria" subtitle="How Ur4gent maps to evaluation">
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: "Innovation",
                body: "Agent marketplace + operational console + proof-of-work workflow in one system.",
              },
              {
                title: "Technical depth",
                body: "Next.js App Router, Prisma/Postgres, Hedera integrations, modular agent services.",
              },
              {
                title: "Usability",
                body: "Rent → Console → Run analysis → See outputs/logs/proofs (clear demo path).",
              },
              {
                title: "Impact",
                body: "Reduces operational overhead for DAOs, communities, and Web3 teams.",
              },
              {
                title: "Security & trust",
                body: "Wallet-scoped ownership, auditable logs, and on-chain verification.",
              },
              {
                title: "Scalability",
                body: "Add new agent templates and capabilities without changing core UX.",
              },
            ].map((x) => (
              <div key={x.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-base font-semibold text-white">{x.title}</div>
                <div className="mt-3 text-sm leading-relaxed text-slate-300">{x.body}</div>
              </div>
            ))}
          </div>
        </Slide>

        <Slide title="Demo" subtitle="Pre-recorded walkthrough (≤ 5 minutes)">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div className="text-sm font-semibold text-slate-200">Suggested flow</div>
            <ol className="mt-4 space-y-2 text-sm text-slate-300">
              <li>1) Connect HashPack wallet</li>
              <li>2) Rent Market Analyst + Payment Operator + Treasury Manager</li>
              <li>3) Open Agent Console → generate demo data → run analysis</li>
              <li>4) Show risk alerts + payment tasks + treasury health changes</li>
              <li>5) Open OpenClaw Bounties → claim → show proof/tx links</li>
            </ol>
            <div className="mt-6 text-sm text-slate-300">
              Demo video URL: <span className="text-cyan-300">{demoUrl}</span>
            </div>
          </div>
        </Slide>

        <Slide title="Roadmap" subtitle="What we ship next">
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Real-time ops",
                body: "Worker-based cycles, job queue, and rate-limited background execution.",
              },
              {
                title: "Policy engine",
                body: "Spend limits, allowlists, approval flows, and multi-sig support.",
              },
              {
                title: "More templates",
                body: "DAO governance agent, growth agent, community agent, and compliance agent.",
              },
              {
                title: "Better market data",
                body: "Deeper on-chain analytics, token metadata, and sentiment integrations.",
              },
              {
                title: "Enterprise controls",
                body: "RBAC, workspace roles, and per-agent permissions with audit exports.",
              },
              {
                title: "Bounty ecosystem",
                body: "Bounty creation, reviewer workflow, escrow, and automated settlement rules.",
              },
            ].map((x) => (
              <div key={x.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <div className="text-base font-semibold text-white">{x.title}</div>
                <div className="mt-3 text-sm leading-relaxed text-slate-300">{x.body}</div>
              </div>
            ))}
          </div>
        </Slide>

        <Slide title="Thank You" subtitle="Questions?">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">Project links</div>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <div>
                  Repo: <span className="text-cyan-300">{repoUrl}</span>
                </div>
                <div>
                  Live Demo: <span className="text-cyan-300">{liveUrl}</span>
                </div>
                <div>
                  Demo Video: <span className="text-cyan-300">{demoUrl}</span>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
              <div className="text-sm font-semibold text-slate-200">Call to action</div>
              <div className="mt-4 text-sm leading-relaxed text-slate-300">
                We are building the operational layer for Web3 teams on Hedera—where AI agents,
                treasury workflows, and verifiable proofs meet.
              </div>
            </div>
          </div>
        </Slide>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          html,
          body {
            background: #020617 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .slide {
            break-after: page;
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
}

