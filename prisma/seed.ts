import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    name: "Treasury Manager AI",
    role: "treasury_manager",
    description: "Autonomous treasury management for DAOs and Web3 startups. Allocates budget, monitors balance, and detects anomalies.",
    price: 50.0,
    imageUrl: "/icons/treasury.svg",
    capabilities: JSON.stringify([
      "Budget Allocation",
      "Balance Monitoring",
      "Anomaly Detection",
      "Multi-sig Support",
    ]),
  },
  {
    name: "Payment Automation AI",
    role: "payment_operator",
    description: "Automates complex payment flows including payroll, bounties, and grants distribution with 100% accuracy.",
    price: 35.0,
    imageUrl: "/icons/payment.svg",
    capabilities: JSON.stringify([
      "Scheduled Payments",
      "Bounty Distribution",
      "Payroll Management",
      "Grant Disbursement",
    ]),
  },
  {
    name: "Risk Monitor AI",
    role: "risk_manager",
    description: "Real-time risk monitoring for smart contracts and wallet activities. Detects suspicious transactions instantly.",
    price: 75.0,
    imageUrl: "/icons/risk.svg",
    capabilities: JSON.stringify([
      "Transaction Scanning",
      "Contract Auditing",
      "Phishing Detection",
      "Wallet Health Check",
    ]),
  },
  {
    name: "Market Analyst AI",
    role: "market_analyst",
    description: "Analyzes market trends and token performance to provide actionable insights for investment decisions.",
    price: 60.0,
    imageUrl: "/icons/market.svg",
    capabilities: JSON.stringify([
      "Trend Analysis",
      "Token Performance",
      "Sentiment Analysis",
      "Volume Tracking",
    ]),
  },
  {
    name: "Token Forge AI",
    role: "token_creator",
    description: "Expertly mints and manages new tokens on Hedera. Handles supply, treasury, and initial distribution.",
    price: 45.0,
    imageUrl: "/icons/token.svg",
    capabilities: JSON.stringify([
      "Token Minting",
      "Supply Management",
      "Treasury Setup",
      "Distribution Logic",
    ]),
  },
];

async function main() {
  console.log("Seeding Agent Templates...");
  
  for (const template of templates) {
    const existing = await prisma.agentTemplate.findFirst({
      where: { role: template.role },
    });

    if (!existing) {
      await prisma.agentTemplate.create({
        data: template,
      });
      console.log(`Created template: ${template.name}`);
    } else {
      console.log(`Skipped existing template: ${template.name}`);
    }
  }

  console.log("Seeding completed.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
