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
    <section className="slide relative mx-auto flex min-h-[720px] w-full max-w-[1280px] flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-10 shadow-[0_30px_80px_rgba(0,0,0,0.55)] print:max-w-none print:rounded-none print:border-0 print:shadow-none">
      <div>
        {title && (
          <div className="text-3xl font-semibold tracking-tight text-white">{title}</div>
        )}
        {subtitle && (
          <div className="mt-2 text-sm text-slate-300">{subtitle}</div>
        )}
      </div>
      <div className="mt-8 flex-1 print:mt-5">{children}</div>
      <div className="mt-6 flex items-center justify-between text-xs text-slate-500 print:mt-4">
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
        <Slide title="Team & Project Introduction" subtitle="Ur4gent — Rent Autonomous AI Operators (Hedera)">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">Team</div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <div>Team Name: Ur4gent</div>
                <div>Team Member: Aril Babunuddin (Solo Dev)</div>
                <div>Contact: arielzx03@gmail.com</div>
              </div>
              <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/40 p-4 text-sm text-slate-300">
                One-liner: A marketplace to rent specialized AI operators that run market analysis,
                risk checks, treasury monitoring, payments, and verifiable proofs on Hedera.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">Links</div>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                <div>
                  GitHub Repo: <span className="text-cyan-300">{repoUrl}</span>
                </div>
                <div>
                  Live Demo: <span className="text-cyan-300">{liveUrl}</span>
                </div>
                <div>
                  Demo Video: <span className="text-cyan-300">{demoUrl}</span>
                </div>
              </div>
              <div className="mt-6 text-xs text-slate-500">
                Print settings: Save as PDF → Landscape → Background graphics ON.
              </div>
            </div>
          </div>
        </Slide>

        <Slide title="Project Summary" subtitle="Overview aligned with judging criteria">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">What it solves</div>
              <div className="mt-3 text-sm leading-relaxed text-slate-300">
                Crypto ops are fragmented across tools. Teams struggle to monitor markets, manage
                treasury, execute payments, and keep auditable trails.
              </div>
              <div className="mt-5 text-sm font-semibold text-slate-200">What we built</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Agent marketplace (rent templates per wallet)</li>
                <li>Unified Command Center + Agent Console (actions + logs)</li>
                <li>On-chain verifiability (tx/proof links on Hashscan)</li>
              </ul>
              <div className="mt-5 text-sm font-semibold text-slate-200">Tech stack</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Next.js + React + TypeScript</li>
                <li>Prisma + PostgreSQL (Supabase)</li>
                <li>HashPack (WalletConnect) + Hedera SDK</li>
                <li>Vercel</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
              <div className="text-sm font-semibold text-slate-200">Judging criteria mapping</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>
                  <span className="font-semibold text-white">Innovation:</span> AI operator marketplace
                  + unified ops console
                </li>
                <li>
                  <span className="font-semibold text-white">Technical depth:</span> Hedera SDK,
                  modular services, Prisma/Postgres
                </li>
                <li>
                  <span className="font-semibold text-white">Usability:</span> Rent → Console → Run →
                  outputs + logs
                </li>
                <li>
                  <span className="font-semibold text-white">Impact:</span> Less overhead for DAOs,
                  communities, Web3 teams
                </li>
                <li>
                  <span className="font-semibold text-white">Trust:</span> Auditable logs + verifiable
                  tx/proof links
                </li>
                <li>
                  <span className="font-semibold text-white">Scalability:</span> Add templates and
                  capabilities without changing core UX
                </li>
              </ul>
            </div>
          </div>
        </Slide>

        <Slide title="Future Roadmap" subtitle="Key learnings + next improvements">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">Key learnings</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>Ops automation needs clear guardrails (limits, approvals, allowlists)</li>
                <li>Auditability must be first-class: logs + proofs should be one click away</li>
                <li>Background execution must be rate-limited to protect DB and UX</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
              <div className="text-sm font-semibold text-slate-200">Next steps</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>Job queue + worker for stable cycles (no serverless interval loops)</li>
                <li>Policy engine: spend limits, multi-sig approvals, RBAC</li>
                <li>More agent templates: DAO governance, compliance, growth</li>
                <li>Deeper analytics: on-chain insights + richer token metadata</li>
              </ul>
            </div>
          </div>
        </Slide>

        <Slide title="Demo" subtitle="Technical strengths + usability + performance (pre-recorded)">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold text-slate-200">Demo flow (≤ 5 min)</div>
              <ol className="mt-4 space-y-2 text-sm text-slate-300">
                <li>1) Connect HashPack wallet</li>
                <li>2) Rent Market Analyst + Treasury Manager + Payment Operator</li>
                <li>3) Open Agent Console → run analysis / show logs</li>
                <li>4) Show risk alerts + payment tasks + treasury health</li>
                <li>5) Open OpenClaw Bounties → claim → show proof/tx links</li>
              </ol>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/40 p-6">
              <div className="text-sm font-semibold text-slate-200">Demo video</div>
              <div className="mt-4 text-sm text-slate-300">
                YouTube: <span className="text-cyan-300">{demoUrl}</span>
              </div>
              <div className="mt-6 text-sm font-semibold text-slate-200">Live environment</div>
              <div className="mt-3 text-sm text-slate-300">
                <span className="text-cyan-300">{liveUrl}</span>
              </div>
              <div className="mt-6 text-sm font-semibold text-slate-200">Source code</div>
              <div className="mt-3 text-sm text-slate-300">
                <span className="text-cyan-300">{repoUrl}</span>
              </div>
            </div>
          </div>
        </Slide>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          html,
          body {
            background: #020617 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .slide {
            width: 287mm;
            height: 200mm;
            padding: 9mm !important;
            box-sizing: border-box;
            overflow: hidden;
            break-after: page;
            page-break-after: always;
          }
          .slide > div:first-child > div:first-child {
            font-size: 20px !important;
          }
          .slide p,
          .slide li,
          .slide div {
            font-size: 10px;
            line-height: 1.25;
          }
        }
      `}</style>
    </div>
  );
}
