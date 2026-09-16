import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import Client from "@/models/Client";
import { requireAuth } from "@/lib/api-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;

    const client = await Client.findOne({
      _id: id,
      organizationId: auth.user.organizationId,
    }).select("-password").lean();

    if (!client) {
      return Response.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, client });
  } catch (error) {
    console.error("Error fetching client:", error);
    return Response.json(
      { success: false, error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const total = Number(body.totalAmount) || 0;
    const paid = Number(body.amountPaid) || 0;

    const client = await Client.findOneAndUpdate(
      { _id: id, organizationId: auth.user.organizationId },
      {
        name: body.name,
        company: body.company,
        phone: body.phone,
        email: body.email,
        website: body.website,
        loginUrl: body.loginUrl,
        loginEmail: body.loginEmail,
        password: body.password,
        accessNotes: body.accessNotes,
        service: body.service,
        totalAmount: total,
        amountPaid: paid,
        balanceDue: total - paid,
        paymentStatus: body.paymentStatus,
        dueDate: body.dueDate,
        notes: body.notes,
        avatar: body.avatar,
      },
      { new: true }
    ).lean();

    if (!client) {
      return Response.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true, client });
  } catch (error) {
    console.error("Error updating client:", error);
    return Response.json(
      { success: false, error: "Failed to update client" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    await connectDB();
    const { id } = await params;

    const client = await Client.findOneAndDelete({
      _id: id,
      organizationId: auth.user.organizationId,
    });

    if (!client) {
      return Response.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return Response.json(
      { success: false, error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
