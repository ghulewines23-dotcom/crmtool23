import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/db/connect";
import Lead from "@/models/Lead";
import { analyzeLeadsBatch, type AIAnalysisResult } from "@/lib/import/ai-analysis";

// In-memory AI analysis job tracking
const aiJobs = new Map<string, {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  total: number;
  processed: number;
  analyzed: number;
  failed: number;
  startedAt: Date;
  completedAt?: Date;
}>();

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";

  if (!apiKey) {
    return Response.json(
      { success: false, error: "OpenRouter API key not configured" },
      { status: 500 }
    );
  }

  try {
    await connectDB();

    const body = await request.json();
    const { leadIds } = body as { leadIds?: string[] };

    // Build query
    const query: Record<string, unknown> = {
      organizationId: auth.user.organizationId,
      aiAnalyzedAt: null, // Only analyze leads not yet analyzed
    };

    if (leadIds && leadIds.length > 0) {
      query._id = { $in: leadIds };
    }

    // Find leads to analyze
    const leads = await Lead.find(query)
      .select("name phone email company source requirement notes")
      .lean();

    if (leads.length === 0) {
      return Response.json(
        { success: false, error: "No leads to analyze" },
        { status: 400 }
      );
    }

    // Create analysis job
    const jobId = "ai_" + Date.now().toString(36);
    aiJobs.set(jobId, {
      id: jobId,
      status: "processing",
      total: leads.length,
      processed: 0,
      analyzed: 0,
      failed: 0,
      startedAt: new Date(),
    });

    // Run analysis in background (don't await)
    runAIAnalysis(jobId, leads, apiKey, model, auth.user.organizationId).catch(
      (err) => {
        console.error("AI analysis background error:", err);
        const job = aiJobs.get(jobId);
        if (job) {
          job.status = "failed";
          job.completedAt = new Date();
        }
      }
    );

    return Response.json({
      success: true,
      jobId,
      totalLeads: leads.length,
      message: "AI analysis started in background",
    });
  } catch (error) {
    console.error("Error starting AI analysis:", error);
    return Response.json(
      { success: false, error: "Failed to start AI analysis" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (jobId) {
    const job = aiJobs.get(jobId);
    if (!job) {
      return Response.json(
        { success: false, error: "AI analysis job not found" },
        { status: 404 }
      );
    }
    return Response.json({ success: true, job });
  }

  // Return overall stats
  const jobs = Array.from(aiJobs.values());
  const totalPending = jobs
    .filter((j) => j.status === "processing")
    .reduce((sum, j) => sum + (j.total - j.processed), 0);

  return Response.json({
    success: true,
    activeJobs: jobs.filter((j) => j.status === "processing").length,
    totalPending,
  });
}

async function runAIAnalysis(
  jobId: string,
  leads: Array<{
    _id: unknown;
    name: string;
    phone: string;
    email: string;
    company: string;
    source: string;
    requirement: string;
    notes: string;
  }>,
  apiKey: string,
  model: string,
  organizationId: string
) {
  const BATCH_SIZE = 10;

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);

    const leadsForAI = batch.map((lead) => ({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      company: lead.company,
      source: lead.source,
      message: lead.requirement || lead.notes || "",
    }));

    try {
      const results = await analyzeLeadsBatch(leadsForAI, apiKey, model);

      // Update each lead in the batch
      for (let j = 0; j < batch.length; j++) {
        const lead = batch[j];
        const analysis = results[j];

        if (analysis) {
          await Lead.findByIdAndUpdate(lead._id, {
            aiTemperature: analysis.temperature,
            aiIntent: analysis.intent,
            aiPriority: analysis.priority,
            aiSummary: analysis.summary,
            aiNextAction: analysis.next_action,
            aiConfidence: analysis.confidence,
            aiAnalyzedAt: new Date(),
          });

          const job = aiJobs.get(jobId);
          if (job) {
            job.analyzed++;
            job.processed++;
          }
        }
      }
    } catch (error) {
      console.error(`AI batch analysis failed for batch starting at ${i}:`, error);
      const job = aiJobs.get(jobId);
      if (job) {
        job.failed += batch.length;
        job.processed += batch.length;
      }
    }
  }

  const job = aiJobs.get(jobId);
  if (job) {
    job.status = "completed";
    job.completedAt = new Date();
  }
}
