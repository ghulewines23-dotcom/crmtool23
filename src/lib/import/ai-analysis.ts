const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface AIAnalysisResult {
  temperature: "cold" | "warm" | "hot";
  intent: string;
  priority: number;
  summary: string;
  next_action: string;
  confidence: number;
}

const AI_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    temperature: { type: "string", enum: ["cold", "warm", "hot"] },
    intent: { type: "string" },
    priority: { type: "integer", minimum: 1, maximum: 10 },
    summary: { type: "string" },
    next_action: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: ["temperature", "intent", "priority", "summary", "next_action", "confidence"],
  additionalProperties: false,
};

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPrompt(leads: Record<string, string>[]): string {
  const leadsJson = JSON.stringify(leads, null, 2);

  return `You are a CRM lead analyst. Analyze the following leads and provide sales intelligence for each.

LEADS DATA:
${leadsJson}

For EACH lead, analyze the message/requirements and provide:
1. temperature: "cold" (just exploring), "warm" (interested but not decided), or "hot" (ready to buy/very interested)
2. intent: What service/product are they looking for? Be specific.
3. priority: Integer from 1 (lowest) to 10 (highest) based on urgency and potential value
4. summary: One-line summary of the lead's needs (max 100 chars)
5. next_action: Recommended next step (e.g., "Call to discuss requirements", "Send pricing", etc.)
6. confidence: 0.0 to 1.0 based on how much information is available

Return a JSON array with one analysis object per lead, in the same order.
Return ONLY valid JSON. No markdown, no explanations.`;
}

function validateAIResponse(parsed: unknown): parsed is AIAnalysisResult[] {
  if (!Array.isArray(parsed)) return false;

  return parsed.every((item) => {
    return (
      typeof item === "object" &&
      item !== null &&
      ["cold", "warm", "hot"].includes(item.temperature) &&
      typeof item.intent === "string" &&
      typeof item.priority === "number" &&
      item.priority >= 1 &&
      item.priority <= 10 &&
      typeof item.summary === "string" &&
      typeof item.next_action === "string" &&
      typeof item.confidence === "number" &&
      item.confidence >= 0 &&
      item.confidence <= 1
    );
  });
}

async function callOpenRouter(
  prompt: string,
  apiKey: string,
  model: string
): Promise<AIAnalysisResult[]> {
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://your-crm-app.com",
      "X-Title": "CRM Lead Analysis",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "You are a CRM lead analyst. Return ONLY valid JSON arrays. No markdown, no explanations, no code blocks.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter API error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenRouter response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }

  // Handle both array and object with array inside
  let results: unknown[];
  if (Array.isArray(parsed)) {
    results = parsed;
  } else if (typeof parsed === "object" && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    const keys = Object.keys(obj);
    const arrayKey = keys.find((k) => Array.isArray(obj[k]));
    if (arrayKey) {
      results = obj[arrayKey] as unknown[];
    } else {
      throw new Error("AI response does not contain an array");
    }
  } else {
    throw new Error("AI response is not an array or object");
  }

  if (!validateAIResponse(results)) {
    throw new Error("AI response does not match expected schema");
  }

  return results as AIAnalysisResult[];
}

export async function analyzeLeadsBatch(
  leads: Record<string, string>[],
  apiKey: string,
  model: string
): Promise<AIAnalysisResult[]> {
  const allResults: AIAnalysisResult[] = [];

  // Split into batches
  const batches: Record<string, string>[][] = [];
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    batches.push(leads.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const prompt = buildPrompt(batch);
        const results = await callOpenRouter(prompt, apiKey, model);
        allResults.push(...results);
        lastError = null;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`AI analysis attempt ${attempt + 1} failed:`, lastError.message);

        if (attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    if (lastError) {
      // If all retries failed for this batch, add low-confidence defaults
      for (const _ of batch) {
        allResults.push({
          temperature: "cold",
          intent: "Unable to analyze",
          priority: 1,
          summary: "AI analysis failed",
          next_action: "Manual review needed",
          confidence: 0,
        });
      }
    }
  }

  return allResults;
}
