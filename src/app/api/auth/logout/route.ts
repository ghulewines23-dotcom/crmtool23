import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db/connect";
import TeamMember from "@/models/TeamMember";
import { clearSessionCookie, getSessionFromRequest } from "@/lib/auth";
import { logAudit, AUDIT_ACTIONS } from "@/lib/auth-helpers";

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);

    if (session) {
      // Clear the active session on the server side
      try {
        await connectDB();
        await TeamMember.findByIdAndUpdate(session.userId, {
          activeSessionId: "",
        });
      } catch {
        // Don't block logout on DB failure
      }

      // Audit log (best effort)
      await logAudit({
        actorId: session.userId,
        actorEmail: session.email,
        organizationId: session.organizationId || null,
        action: AUDIT_ACTIONS.USER_LOGOUT,
        targetType: "User",
        targetId: session.userId,
      });
    }
  } catch {
    // Never block logout on failure
  }

  await clearSessionCookie();
  return Response.json({ success: true });
}
