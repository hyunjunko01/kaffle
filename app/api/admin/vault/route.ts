import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { fundVault, getVaultStatus } from "@/lib/vault";

export async function GET() {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  try {
    return NextResponse.json(await getVaultStatus());
  } catch (error) {
    const message = error instanceof Error ? error.message : "vault read failed";
    const status =
      message.includes("is not set") || message.includes("does not match")
        ? 500
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminSession();
  if (!auth.ok) {
    return auth.response;
  }

  let amount: unknown;
  try {
    ({ amount } = (await request.json()) as { amount?: unknown });
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (typeof amount !== "string" || amount.trim().length === 0) {
    return NextResponse.json({ error: "invalid amount" }, { status: 400 });
  }

  try {
    const result = await fundVault(amount.trim());
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "fund failed";
    if (message === "invalid amount") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const status = message.includes("is not set") ? 500 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
