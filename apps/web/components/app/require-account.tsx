"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { useRhea } from "@/lib/rhea/context";

type ConnectCardProps = {
  title?: string;
  description?: string;
  action?: string;
  className?: string;
};

export function ConnectCard({
  title = "Connect to get started",
  description = "Use a ready-funded demo account, or connect your own NEAR testnet wallet. Every action is a real testnet transaction.",
  action = "Connect",
  className,
}: ConnectCardProps) {
  const { walletStatus, signIn } = useRhea();

  return (
    <Card className={cn("flex flex-col items-start gap-5 p-6 md:p-8", className)}>
      <h2 className="text-h3 font-normal text-fg">{title}</h2>
      <p className="max-w-[520px] text-body text-fg-80">{description}</p>
      <Button variant="white" disabled={walletStatus === "connecting"} onClick={() => void signIn()}>
        {walletStatus === "connecting" ? "Connecting" : action}
      </Button>
    </Card>
  );
}

export function RequireAccount({ children }: { children: ReactNode }) {
  const { account } = useRhea();
  if (account) return <>{children}</>;
  return <ConnectCard />;
}
