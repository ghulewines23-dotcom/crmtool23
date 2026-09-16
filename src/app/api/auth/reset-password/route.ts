import { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  return Response.json(
    { success: false, error: "Password reset is currently unavailable. Please contact your organization owner." },
    { status: 404 }
  );
}
