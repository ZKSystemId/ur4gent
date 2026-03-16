import {
  AccountCreateTransaction,
  Client,
  Hbar,
  PrivateKey,
  TransactionReceiptQuery,
  TransferTransaction,
  TransactionId,
  AccountBalanceQuery,
  TokenCreateTransaction,
  TokenSupplyType,
  TokenType,
  TokenAssociateTransaction,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
} from "@hashgraph/sdk";

type HederaConfig = {
  operatorId: string;
  operatorKey: string;
  network: "testnet" | "mainnet" | "previewnet";
};

const getConfig = (): HederaConfig | null => {
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  const network =
    (process.env.HEDERA_NETWORK as HederaConfig["network"]) ?? "testnet";

  if (!operatorId || !operatorKey) {
    return null;
  }

  return { operatorId, operatorKey, network };
};

export const getHederaOperator = () => getConfig();

export const initializeHederaClient = () => {
  const config = getConfig();
  if (!config) return null;
  const client =
    config.network === "mainnet"
      ? Client.forMainnet()
      : config.network === "previewnet"
        ? Client.forPreviewnet()
        : Client.forTestnet();
  client.setOperator(config.operatorId, config.operatorKey);
  return client;
};

export const createAgentWallet = async () => {
  const client = initializeHederaClient();
  const privateKey = PrivateKey.generateED25519();
  const publicKey = privateKey.publicKey.toString();

  if (!client) {
    return {
      accountId: "0.0.0",
      publicKey,
      privateKey: privateKey.toString(),
      initialBalance: 0,
    };
  }

  const response = await new AccountCreateTransaction()
    .setKey(privateKey.publicKey)
    .setInitialBalance(new Hbar(10))
    .execute(client);

  const receipt = await response.getReceipt(client);
  return {
    accountId: receipt.accountId?.toString() ?? "0.0.0",
    publicKey,
    privateKey: privateKey.toString(),
    initialBalance: 10,
  };
};

export const sendHbarPayment = async (input: {
  fromAccountId: string;
  fromPrivateKey: string;
  toAccountId: string;
  amount: number;
}) => {
  const client = initializeHederaClient();
  if (!client) {
    return {
      transactionId: "0.0.0@0.0.0",
      status: "mocked",
    };
  }
  
  // Set the operator (sender) for this transaction
  client.setOperator(input.fromAccountId, input.fromPrivateKey);

  // Create the transfer transaction
  const transaction = new TransferTransaction()
    .addHbarTransfer(input.fromAccountId, new Hbar(-input.amount)) // Sender deduct
    .addHbarTransfer(input.toAccountId, new Hbar(input.amount))    // Receiver add
    .freezeWith(client);

  // Sign with the sender key explicitly
  const signTx = await transaction.sign(PrivateKey.fromString(input.fromPrivateKey));

  const txResponse = await signTx.execute(client);
  const receipt = await txResponse.getReceipt(client);

  return {
    transactionId: txResponse.transactionId.toString(),
    status: receipt.status.toString(),
  };
};

export const sendBatchHbarPayment = async (input: {
  fromAccountId: string;
  fromPrivateKey: string;
  transfers: { toAccountId: string; amount: number }[];
}) => {
  const client = initializeHederaClient();
  if (!client) {
    return {
      transactionId: "0.0.0@0.0.0",
      status: "mocked",
    };
  }

  // Set the operator (sender)
  client.setOperator(input.fromAccountId, input.fromPrivateKey);

  // Calculate total amount to deduct from sender
  const totalAmount = input.transfers.reduce((sum, t) => sum + t.amount, 0);

  // Create one atomic transaction with multiple transfers
  let transaction = new TransferTransaction()
      .addHbarTransfer(input.fromAccountId, new Hbar(-totalAmount));

  // Add each recipient
  for (const t of input.transfers) {
      transaction = transaction.addHbarTransfer(t.toAccountId, new Hbar(t.amount));
  }

  const txResponse = await transaction.execute(client);
  const receipt = await txResponse.getReceipt(client);

  return {
    transactionId: txResponse.transactionId.toString(),
    status: receipt.status.toString(),
    totalAmount
  };
};

export const getHederaBalance = async (accountId: string) => {
  const client = initializeHederaClient();
  if (!client) return { balance: 0, status: "mocked" };

  try {
    const balance = await new AccountBalanceQuery()
      .setAccountId(accountId)
      .execute(client);
    
    return { 
      balance: balance.hbars.toTinybars().toNumber() / 100000000,
      status: "success"
    };
  } catch (error: unknown) {
    console.error("Failed to fetch balance:", error);
    return { balance: 0, status: "error" };
  }
};

export const createHederaToken = async (input: {
  accountId: string;
  privateKey: string;
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  treasuryAccountId: string;
}) => {
  const client = initializeHederaClient();
  
  // MOCK MODE if no client (e.g. no .env vars)
  if (!client) {
    console.log("Mocking Token Creation for", input.name);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
    return {
      status: "SUCCESS",
      tokenId: "0.0." + Math.floor(Math.random() * 1000000),
      transactionId: `${input.accountId}@${Date.now()}.0`,
    };
  }

  try {
    const operatorKey = PrivateKey.fromString(input.privateKey);
    client.setOperator(input.accountId, operatorKey);

    const transaction = await new TokenCreateTransaction()
      .setTokenName(input.name)
      .setTokenSymbol(input.symbol)
      .setDecimals(input.decimals)
      .setInitialSupply(input.initialSupply)
      .setTreasuryAccountId(input.treasuryAccountId)
      .setAutoRenewAccountId(input.treasuryAccountId)
      .setAdminKey(operatorKey)
      .setSupplyKey(operatorKey)
      .freezeWith(client);
    
    const signTx = await transaction.sign(operatorKey);
    const txResponse = await signTx.execute(client);
    const receipt = await txResponse.getReceipt(client);
    
    return {
      status: receipt.status.toString(),
      tokenId: receipt.tokenId?.toString(),
      transactionId: txResponse.transactionId.toString(),
    };
  } catch (error: unknown) {
    console.error("Hedera Token Create Error:", error);
    const message = error instanceof Error ? error.message : "Token creation failed";
    throw new Error(message);
  }
};

export const associateHederaToken = async (input: {
  accountId: string;
  privateKey: string;
  tokenId: string;
}) => {
  const client = initializeHederaClient();
  if (!client) {
    return { status: "mocked" };
  }
  try {
    const operatorKey = PrivateKey.fromString(input.privateKey);
    client.setOperator(input.accountId, operatorKey);
    const transaction = await new TokenAssociateTransaction()
      .setAccountId(input.accountId)
      .setTokenIds([input.tokenId])
      .freezeWith(client);
    const signed = await transaction.sign(operatorKey);
    const response = await signed.execute(client);
    const receipt = await response.getReceipt(client);
    return { status: receipt.status.toString() };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Token association failed";
    return { status: "error", message };
  }
};

export const transferHederaToken = async (input: {
  tokenId: string;
  fromAccountId: string;
  fromPrivateKey: string;
  toAccountId: string;
  amount: number;
}) => {
  const client = initializeHederaClient();
  if (!client) {
    return { status: "mocked", transactionId: "0.0.0@0.0.0" };
  }
  try {
    const operatorKey = PrivateKey.fromString(input.fromPrivateKey);
    client.setOperator(input.fromAccountId, operatorKey);
    const transaction = await new TransferTransaction()
      .addTokenTransfer(input.tokenId, input.fromAccountId, -input.amount)
      .addTokenTransfer(input.tokenId, input.toAccountId, input.amount)
      .freezeWith(client);
    const signed = await transaction.sign(operatorKey);
    const response = await signed.execute(client);
    const receipt = await response.getReceipt(client);
    return { status: receipt.status.toString(), transactionId: response.transactionId.toString() };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Token transfer failed";
    return { status: "error", message };
  }
};

export const getTransactionStatus = async (transactionId: string) => {
  const client = initializeHederaClient();
  if (!client) {
    return { transactionId, status: "mocked" };
  }

  const receipt = await new TransactionReceiptQuery()
    .setTransactionId(TransactionId.fromString(transactionId))
    .execute(client);

  return { transactionId, status: receipt.status?.toString() ?? "UNKNOWN" };
};

export const createUcpTopic = async () => {
  const client = initializeHederaClient();
  if (!client) return { topicId: "0.0.mock", status: "mocked" };

  try {
    const transaction = await new TopicCreateTransaction()
      .setTopicMemo("OpenClaw UCP - Agent Execution Log")
      .execute(client);
    
    const receipt = await transaction.getReceipt(client);
    return { 
      topicId: receipt.topicId?.toString() ?? "0.0.0", 
      status: "success" 
    };
  } catch (error: unknown) {
    console.error("Failed to create UCP topic:", error);
    return { topicId: "0.0.0", status: "error" };
  }
};

export const submitProofOfWork = async (topicId: string, message: string) => {
  const client = initializeHederaClient();
  if (!client) {
    console.log(`[MOCK HCS] Topic ${topicId}: ${message}`);
    return { sequenceNumber: Date.now(), status: "mocked" };
  }

  try {
    const transaction = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(message)
      .execute(client);
    
    const receipt = await transaction.getReceipt(client);
    return { 
      sequenceNumber: receipt.topicSequenceNumber?.toString() ?? "0", 
      status: "success" 
    };
  } catch (error: unknown) {
    console.error("Failed to submit proof:", error);
    return { sequenceNumber: "0", status: "error" };
  }
};
