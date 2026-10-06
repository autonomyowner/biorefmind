import { landingMessages } from "@/components/landing/messages";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import type { Go } from "@/components/landing/go";
import { getMessages } from "@/i18n/server";
import { hasSession } from "@/lib/session";

/** The public site frame (header + footer, like /marketplace) around the certificate pages. Neither prints. */
export async function VerifyFrame({ children }: { children: React.ReactNode }) {
  const [landing, signedIn] = await Promise.all([getMessages(landingMessages), hasSession()]);
  const go: Go = signedIn ? { href: "/dashboard", label: landing.account.dashboard } : null;
  return (
    <div className="flex min-h-dvh flex-1 flex-col overflow-x-clip print:block print:min-h-0 print:overflow-visible">
      <div className="relative print:hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[480px] bg-[radial-gradient(ellipse_45%_60%_at_50%_30%,rgba(120,150,255,0.26),transparent_70%)]"
        />
        <SiteHeader signedIn={signedIn} />
      </div>
      <main className="relative flex-1">{children}</main>
      <div className="print:hidden">
        <SiteFooter t={landing.footer} go={go} account={landing.account} />
      </div>
    </div>
  );
}
