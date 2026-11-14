import { sendAsDemo } from "@/lib/demo-signer";
import type { TxRequest } from "@rhea/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let body: { accountId?: unknown; transactions?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.accountId !== "string" || !Array.isArray(body.transactions)) {
    return Response.json({ error: "accountId and transactions are required" }, { status: 400 });
  }
  try {
    const outcomes = await sendAsDemo(body.accountId, body.transactions as TxRequest[]);
    return Response.json({ outcomes });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Demo transaction failed";
    return Response.json({ error: message }, { status: 422 });
  }
}
