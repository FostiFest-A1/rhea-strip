import { getMode } from "@rhea/sdk";
import { RheaProvider } from "@/lib/rhea/context";
import { ConnectModal } from "@/components/app/connect-modal";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <RheaProvider mode={getMode()}>
        {children}
        <ConnectModal />
      </RheaProvider>
    </ToastProvider>
  );
}
