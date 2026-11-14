import type { SVGProps } from "react";

function DuotoneIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 32 32" fill="none" className="size-8" aria-hidden="true" {...props} />;
}

export function LockIcon() {
  return (
    <DuotoneIcon>
      <rect x="6" y="13" width="20" height="14" rx="4" fill="#F7225B" fillOpacity=".28" />
      <rect x="6" y="13" width="20" height="14" rx="4" stroke="#F7225B" strokeWidth="2" />
      <path d="M11 13V10a5 5 0 0 1 10 0v3" stroke="#F7225B" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="20" r="1.8" fill="#F7225B" />
    </DuotoneIcon>
  );
}

export function SellIcon() {
  return (
    <DuotoneIcon>
      <circle cx="16" cy="16" r="11" fill="#F7225B" fillOpacity=".28" />
      <circle cx="16" cy="16" r="11" stroke="#F7225B" strokeWidth="2" />
      <path d="M11.5 20.5 20.5 11.5M13 11.5h7.5V19" stroke="#F7225B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </DuotoneIcon>
  );
}

export function RateIcon() {
  return (
    <DuotoneIcon>
      <path d="M4 25h24" stroke="#F7225B" strokeWidth="2" strokeLinecap="round" />
      <path d="M5 20l7-7 5 5 9-10v12H5Z" fill="#F7225B" fillOpacity=".28" />
      <path d="M5 20l7-7 5 5 9-10" stroke="#F7225B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </DuotoneIcon>
  );
}
