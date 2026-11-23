import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { getChainConfig } from "@/lib/chain/config";
import { enterErrorMessage, enterRaffle } from "@/lib/raffle/enter";
import { entryOperationResponse, reconcileEntryOperation } from "@/lib/raffle/entry-recovery";
import { EntryAlreadyPendingError, findEntryByRequest, findUserEntry, readEntry } from "@/lib/raffle/entry-store";

const REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!user.wallet) return NextResponse.json({ error: "wallet required" }, { status: 400 });

  let body: { ticketCount?: unknown; requestId?: unknown };
  try {
    body = (await request.json()) as typeof body;
    if (!body || typeof body !== "object") throw new Error("invalid");
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (typeof body.requestId !== "string" || !REQUEST_ID_RE.test(body.requestId)) {
    return NextResponse.json({ error: "invalid request id" }, { status: 400 });
  }
  if (typeof body.ticketCount !== "number" && typeof body.ticketCount !== "string") {
    return NextResponse.json({ error: "invalid ticket count" }, { status: 400 });
  }
  const count = Number(body.ticketCount);
  if (!Number.isInteger(count)) {
    return NextResponse.json({ error: "invalid ticket count" }, { status: 400 });
  }

  try {
    const result = await enterRaffle({
      userId: user.id,
      requestId: body.requestId.toLowerCase(),
      walletAddress: user.wallet.address,
      ticketCount: count,
    });
    // No view refresh belongs in the accounting path. The client reloads it separately.
    return NextResponse.json(result, { status: result.state === "pending" ? 202 : 200 });
  } catch (error) {
    if (error instanceof EntryAlreadyPendingError) {
      const result = entryOperationResponse(await readEntry(error.operationId));
      return NextResponse.json(result, { status: result.state === "pending" ? 202 : 200 });
    }
    const message = enterErrorMessage(error);
    const conflict = ["insufficient tickets", "RoundClosed", "entry already pending", "entry request conflict"];
    const invalid = ["invalid ticket count", "no raffle"];
    const status = conflict.includes(message) ? 409 : invalid.includes(message) ? 400 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId")?.toLowerCase();
  const operationId = url.searchParams.get("operationId");
  try {
    const { chainId } = getChainConfig();
    const operation = requestId
      ? await findEntryByRequest(user.id, requestId)
      : await findUserEntry(user.id, chainId, operationId ?? undefined);
    if (!operation || operation.chainId !== chainId) {
      return NextResponse.json({ operation: null }, { status: requestId || operationId ? 404 : 200 });
    }
    const result = entryOperationResponse(await reconcileEntryOperation(operation.id));
    return NextResponse.json(result, { status: result.state === "pending" ? 202 : 200 });
  } catch {
    return NextResponse.json({ error: "entry status unavailable" }, { status: 503 });
  }
}
