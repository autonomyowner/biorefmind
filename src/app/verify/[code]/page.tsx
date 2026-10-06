import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { fetchQuery } from "convex/nextjs";
import QRCode from "qrcode";
import { ArrowLeft, FileSearch } from "lucide-react";

import { certificateMessages } from "@/components/certificate/certificate-messages";
import { CertificateSheet } from "@/components/certificate/certificate-sheet";
import { fill, normalizeCode, printPageCss } from "@/components/certificate/format";
import { PrintButton, VerifyForm } from "@/components/certificate/verify-controls";
import { VerifyFrame } from "@/components/certificate/verify-frame";
import { getMessages } from "@/i18n/server";
import { api } from "@/lib/backend";
import { catalogLabels } from "@/lib/catalog-labels";

// Design: docs/superpowers/specs/2026-10-06-lab-requests-design.md (decision 8, expert items 1, 2, 5, 8).

/** One backend read per request, shared by the metadata and the page. Codes are 12 characters; anything long is unknown. */
const loadCertificate = cache(async (raw: string) => {
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    // A malformed escape: look the code up as typed.
  }
  const code = normalizeCode(decoded);
  if (!code || code.length > 40) return { code, cert: null };
  return { code, cert: await fetchQuery(api.labwork.certificate, { code }) };
});

export async function generateMetadata({ params }: PageProps<"/verify/[code]">): Promise<Metadata> {
  const [{ code }, t] = await Promise.all([params, getMessages(certificateMessages)]);
  const { cert } = await loadCertificate(code);
  return {
    title: cert ? fill(t.metaTitle, { reportNo: cert.reportNo }) : t.metaUnknown,
    description: t.metaDescription,
    robots: { index: false, follow: false },
  };
}

/** This page's absolute address, for the QR code (works on localhost, previews and production). */
async function originOf(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "biorefmind.vercel.app";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** A certificate of analysis, public to anyone holding its verify code. */
export default async function CertificatePage({ params }: PageProps<"/verify/[code]">) {
  const [{ code: raw }, t, labels] = await Promise.all([params, getMessages(certificateMessages), getMessages(catalogLabels)]);
  const { code, cert } = await loadCertificate(raw);

  if (!cert) {
    return (
      <VerifyFrame>
        <section className="mx-auto max-w-[640px] px-5 pt-4 pb-24 sm:px-10 sm:pt-8">
          <div className="glass flex flex-col items-center rounded-[28px] px-5 py-10 text-center sm:px-10">
            <span className="orb flex size-14 items-center justify-center rounded-full">
              <FileSearch className="size-6" strokeWidth={1.8} />
            </span>
            <h1 className="mt-5 text-[26px] font-semibold tracking-[-0.02em]">{t.unknownTitle}</h1>
            <p className="mt-2 max-w-[440px] text-[15px] leading-relaxed text-muted-foreground">{t.unknownBody}</p>
            {code ? (
              <p className="mt-3 text-[14px] text-muted-foreground">
                {fill(t.unknownCode, { code: "" })}
                <span dir="ltr" className="font-mono font-semibold tracking-[0.1em] text-foreground">
                  {code.slice(0, 40)}
                </span>
              </p>
            ) : null}
            <VerifyForm className="mt-8 text-start" />
          </div>
        </section>
      </VerifyFrame>
    );
  }

  const url = `${await originOf()}/verify/${cert.code}`;
  const qrSvg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#071733", light: "#ffffff" } });

  return (
    <VerifyFrame>
      <style>{printPageCss(`${t.reportShort} ${cert.reportNo}`, t.page, t.of)}</style>
      <div className="mx-auto max-w-[900px] px-3 pt-2 pb-20 sm:px-8 sm:pt-4 print:p-0">
        <div className="mx-auto mb-5 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href="/verify" className="inline-flex items-center gap-2 text-[15px] font-medium text-foreground/75 transition-colors hover:text-foreground">
            <ArrowLeft className="size-4 rtl:-scale-x-100" strokeWidth={2} />
            {t.checkAnother}
          </Link>
          <PrintButton />
        </div>
        <CertificateSheet cert={cert} t={t} labels={labels} url={url} qrSvg={qrSvg} />
        <p className="mx-auto mt-4 max-w-[210mm] text-center text-[13px] text-muted-foreground print:hidden">{t.printHint}</p>
      </div>
    </VerifyFrame>
  );
}
