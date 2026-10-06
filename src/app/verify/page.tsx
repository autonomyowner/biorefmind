import type { Metadata } from "next";

import { certificateMessages } from "@/components/certificate/certificate-messages";
import { VerifyForm } from "@/components/certificate/verify-controls";
import { VerifyFrame } from "@/components/certificate/verify-frame";
import { Headline, SectionBadge } from "@/components/landing/section-badge";
import { getMessages } from "@/i18n/server";

// Design: docs/superpowers/specs/2026-10-06-lab-requests-design.md (decision 8)

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(certificateMessages);
  return { title: t.metaCheck, description: t.metaDescription, robots: { index: false } };
}

/** "Check a certificate": type the verify code printed on a certificate of analysis. */
export default async function VerifyPage() {
  const t = await getMessages(certificateMessages);
  return (
    <VerifyFrame>
      <section className="mx-auto max-w-[720px] px-5 pt-4 pb-24 text-center sm:px-10 sm:pt-8">
        <SectionBadge>{t.badge}</SectionBadge>
        <h1 className="mt-6 text-balance text-[40px] font-semibold leading-[1.04] tracking-[-0.04em] sm:text-[56px]">
          <Headline lead={t.checkLead} accent={t.checkAccent} />
        </h1>
        <p className="mx-auto mt-5 max-w-[560px] text-pretty text-[17px] leading-relaxed text-muted-foreground">{t.checkBody}</p>
        <div className="glass mx-auto mt-10 max-w-[560px] rounded-[28px] p-5 text-start sm:p-7">
          <VerifyForm />
        </div>
      </section>
    </VerifyFrame>
  );
}
