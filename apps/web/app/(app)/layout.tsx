import { AppHeader } from "@/components/app/app-header";
import { DevClock } from "@/components/app/dev-clock";
import { NetworkNotice } from "@/components/app/network-notice";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-page px-4 pt-32 pb-40 md:px-8">
        <NetworkNotice />
        {children}
      </main>
      <DevClock />
    </>
  );
}
