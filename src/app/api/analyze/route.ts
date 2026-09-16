import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface AnalyzeRequest {
  fileContent: string;
  fileName: string;
}

interface AnalyzeResponse {
  success: boolean;
  dataType?: string;
  headers?: string[];
  mappedData?: Record<string, unknown>[];
  suggestions?: string[];
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { success: false, error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const body: AnalyzeRequest = await request.json();
    const { fileContent, fileName } = body;

    if (!fileContent) {
      return NextResponse.json(
        { success: false, error: "No file content provided" },
        { status: 400 }
      );
    }

    const prompt = `You are a data analyst. Analyze this CSV data and help organize it for a CRM system.

File: ${fileName}

Data (first 50 rows):
${fileContent}

Please analyze this data and return a JSON response with:
1. "dataType": What type of data this is (leads, contacts, deals, invoices, projects, or unknown)
2. "headers": The column headers from the CSV
3. "suggestions": Array of 2-3 suggestions for how to improve/organize this data
4. "sampleMappedData": First 5 rows mapped to the appropriate CRM format

Return ONLY valid JSON, no markdown formatting.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://your-crm-app.com",
        "X-Title": "CRM Import Assistant",
      },
      body: JSON.stringify({
        model: "openai/gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful data analyst that returns valid JSON responses.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("OpenRouter API error:", errorData);
      return NextResponse.json(
        { success: false, error: "Failed to analyze file with AI" },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { success: false, error: "No response from AI" },
        { status: 500 }
      );
    }

    try {
      const parsed = JSON.parse(content);
      return NextResponse.json({
        success: true,
        dataType: parsed.dataType,
        headers: parsed.headers,
        suggestions: parsed.suggestions,
        mappedData: parsed.sampleMappedData,
      });
    } catch {
      return NextResponse.json({
        success: true,
        dataType: "unknown",
        headers: [],
        suggestions: ["Could not parse AI response. Please manually select data type."],
        mappedData: [],
      });
    }
  } catch (error) {
    console.error("Error analyzing file:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
