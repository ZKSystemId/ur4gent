## Ur4gent — AI Agent Rental Marketplace (Hedera)

Ur4gent is a marketplace to rent specialized AI agents (operators) to run crypto operations: market analysis, risk monitoring, treasury management, payment workflows, token launches, and bounty proofs on Hedera.

**Submission**
- Project details: [docs/project-details.md](file:///c:/Users/user/Desktop/WEB4U/web4u/docs/project-details.md)
- Submission links: [docs/submission-links.md](file:///c:/Users/user/Desktop/WEB4U/web4u/docs/submission-links.md)
- Pitch deck (HTML → Save as PDF): `/pitch`

## Getting Started

### 1) Install

```bash
npm install
```

### 2) Configure environment

Create `.env` (see `.env.example` if available) and set:
- `DATABASE_URL` (Supabase pooler recommended)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Hedera + WalletConnect keys if you want on-chain demo features

### 3) Run the dev server

```bash
npm run dev
```

Open http://localhost:3000

### 4) Build

```bash
npm run build
```

## Pitch Deck (PDF)

Open `/pitch` in the browser → click **Print / Save as PDF** → select **Save as PDF** and enable **Background graphics** (Landscape recommended).

## Troubleshooting

### DB errors (pool timeout / closed connection)

If `/api/health` returns `Unable to check out connection from the pool due to timeout`, the database/pooler is overloaded or unreachable.

Recommended:
- Use Supabase pooler for `DATABASE_URL`
- Avoid using direct DB host if DNS/network blocks it
- Restart pooler/database from Supabase dashboard
