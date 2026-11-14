import { GlassNav } from "@/components/ui/glass-nav";
import { SessionControl } from "./session-control";

const links = [
  { href: "/strip", label: "Strip" },
  { href: "/trade", label: "Trade" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/settle", label: "Settle" },
];

export function AppHeader() {
  return <GlassNav links={links} actions={<SessionControl />} />;
}
