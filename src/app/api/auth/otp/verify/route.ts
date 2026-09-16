import { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  return Response.json(
    { success: false, error: "OTP verification is currently disabled. Please contact your organization owner." },
    { status: 404 }
  );
}
