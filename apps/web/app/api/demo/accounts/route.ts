import { demoAccountsAvailable } from "@/lib/demo-signer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return Response.json({ accounts: demoAccountsAvailable() });
}
