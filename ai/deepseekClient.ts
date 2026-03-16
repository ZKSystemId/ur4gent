type DeepSeekMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type DeepSeekResponse = {
  choices?: Array<{
    message?: { content?: string };
  }>;
};

type DeepSeekPayload = {
  model: string;
  temperature: number;
  messages: DeepSeekMessage[];
};

const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";

const callDeepSeek = async (messages: DeepSeekMessage[]) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return "DeepSeek mock response: API key not configured.";
  }

  const payload: DeepSeekPayload = {
    model: "deepseek-chat",
    temperature: 0.2,
    messages,
  };

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as DeepSeekResponse;
  return data.choices?.[0]?.message?.content?.trim() ?? "";
};

export const askAI = async (prompt: string) => {
  return callDeepSeek([{ role: "user", content: prompt }]);
};

export const generateMarketAnalysis = async (context: string) => {
  return callDeepSeek([
    {
      role: "system",
      content:
        "You are a market research agent. Respond with concise analysis in 2-4 sentences.",
    },
    {
      role: "user",
      content: context,
    },
  ]);
};

export const generateOperationsDecision = async (context: string) => {
  return callDeepSeek([
    {
      role: "system",
      content:
        "You are an AI crypto operations operator. Respond with strict JSON only.",
    },
    {
      role: "user",
      content:
        `${context}\nReturn JSON with keys: action, reason, next_step. action must be one of: execute_payment, hold_funds, allocate_budget, alert_user, request_analysis.`,
    },
  ]);
};
