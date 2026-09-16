import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Client from "@/models/Client";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();

    const clients = await Client.find({
      organizationId: auth.user.organizationId,
    })
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return Response.json({ success: true, clients });
  } catch (error) {
    console.error("Error fetching clients:", error);
    return Response.json(
      { success: false, error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  // Only SERENE_OWNER can create clients
  if (auth.user.role !== "SERENE_OWNER") {
    return Response.json(
      { success: false, error: "Only the owner can create clients" },
      { status: 403 }
    );
  }

  try {
    await connectDB();

    const body = await request.json();

    const total = Number(body.totalAmount) || 0;
    const paid = Number(body.amountPaid) || 0;

    const client = await Client.create({
      name: body.name,
      company: body.company || "",
      phone: body.phone || "",
      email: body.email || "",
      website: body.website || "",
      loginUrl: body.loginUrl || "",
      loginEmail: body.loginEmail || "",
      password: body.password || "",
      accessNotes: body.accessNotes || "",
      service: body.service || "",
      totalAmount: total,
      amountPaid: paid,
      balanceDue: total - paid,
      expenses: Number(body.expenses) || 0,
      paymentStatus: body.paymentStatus || "pending",
      dueDate: body.dueDate || "",
      notes: body.notes || "",
      paymentHistory: [],
      avatar: body.avatar || "",
      organizationId: auth.user.organizationId,
    });

    return Response.json({ success: true, client }, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return Response.json(
      { success: false, error: "Failed to create client" },
      { status: 500 }
    );
  }
}
