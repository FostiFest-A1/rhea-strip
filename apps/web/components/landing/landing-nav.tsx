import { ButtonLink } from "@/components/ui/button";
import { GlassNav } from "@/components/ui/glass-nav";

const links = [
  { href: "#how", label: "How it works" },
  { href: "#markets", label: "Markets" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  return (
    <GlassNav
      links={links}
      actions={
        <ButtonLink href="/strip" variant="white" size="sm">
          Launch app
        </ButtonLink>
      }
    />
  );
}
