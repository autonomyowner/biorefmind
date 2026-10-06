import Link from "next/link";

import type { CertificateMessages } from "@/components/certificate/certificate-messages";
import { fill, formatDate, formatNumber, formatResult, hasConformity } from "@/components/certificate/format";
import { ANALYSIS_UNITS, labelOf, residueLabel } from "@/lib/catalog-labels";
import type { Certificate } from "@/lib/types";
import { cn } from "@/lib/utils";

// Design: docs/superpowers/specs/2026-10-06-lab-requests-design.md (decision 8, expert items 1, 2, 5, 8).

type Labels = { analyses: Record<string, string>; residues: Record<string, string> };

/** Left-to-right islands for codes, numbers, units and dates inside Arabic text. */
function Ltr({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span dir="ltr" className={cn("[unicode-bidi:isolate]", className)}>
      {children}
    </span>
  );
}

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("mt-7 print:mt-5", className)}>
      <h2 className="break-after-avoid border-b border-[#071733]/20 pb-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#071733]/70">{title}</h2>
      {children}
    </section>
  );
}

/** Label/value pairs in two columns (one on phones). */
function Fields({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-2 text-[14px] sm:grid-cols-[repeat(2,minmax(0,1fr))] print:grid-cols-[repeat(2,minmax(0,1fr))] print:text-[10pt]">
      {rows.map((r) => (
        <div key={r.label} className="flex min-w-0 gap-3">
          <dt className="w-[44%] shrink-0 text-[#071733]/60">{r.label}</dt>
          <dd className="min-w-0 break-words font-medium">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const TH = "border-b border-[#071733]/25 px-2 py-1.5 text-start text-[12px] font-semibold text-[#071733]/70 print:text-[9pt]";
const TD = "border-b border-[#071733]/10 px-2 py-1.5 align-top print:text-[9.5pt]";

/**
 * The certificate of analysis as a white A4-like sheet (ISO/IEC 17025 §7.8.2 content).
 * Everything comes from the frozen report; BiorefMind's score and route are never shown.
 */
export function CertificateSheet({
  cert: c,
  t,
  labels,
  url,
  qrSvg,
}: {
  cert: Certificate;
  t: CertificateMessages;
  labels: Labels;
  url: string;
  qrSvg: string;
}) {
  const r = c.results;
  const conformity = hasConformity(r);
  const roleOf = (role: string) => (t.roles as Record<string, string>)[role] ?? role;
  const stateOf = (s: string) => (t.states as Record<string, string>)[s] ?? s;
  const result = (value: number, q: "<" | ">" | "nd" | undefined) => {
    const s = formatResult(value, q, t.notDetected);
    return q === "nd" ? s : <Ltr>{s}</Ltr>;
  };

  return (
    <article className="cert-sheet mx-auto w-full max-w-[210mm] rounded-[6px] bg-white px-5 py-7 text-[#071733] shadow-[0_30px_70px_-40px_rgba(7,23,51,0.55)] sm:px-12 sm:py-12 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
      {c.replacedByCode ? (
        <div role="alert" className="mb-7 rounded-md border-[3px] border-[#b42318] px-4 py-3 text-[#b42318] print:mb-5">
          <p className="text-[22px] font-bold leading-tight tracking-[-0.01em] sm:text-[26px] print:text-[18pt]">
            {fill(t.superseded, { n: c.version + 1 })}
          </p>
          <p className="mt-1 text-[14px] print:text-[10pt]">
            {t.supersededBody}{" "}
            <Link href={`/verify/${c.replacedByCode}`} className="font-semibold break-all underline underline-offset-2">
              <Ltr>{url.replace(/[^/]+$/, c.replacedByCode)}</Ltr>
            </Link>
          </p>
        </div>
      ) : null}

      {/* Lab and report identity */}
      <header className="flex flex-col gap-6 border-b-2 border-[#071733] pb-5 sm:flex-row sm:items-start sm:justify-between print:flex-row">
        <div className="min-w-0">
          <p className="text-[22px] font-semibold leading-tight tracking-[-0.015em] print:text-[16pt]">
            <bdi>{c.lab.name}</bdi>
          </p>
          {c.lab.address ? <p className="mt-1 whitespace-pre-line text-[14px] text-[#071733]/75 [unicode-bidi:plaintext] print:text-[10pt]">{c.lab.address}</p> : null}
          {c.lab.phone ? (
            <p className="mt-0.5 text-[14px] text-[#071733]/75 print:text-[10pt]">
              {t.phone}: <Ltr>{c.lab.phone}</Ltr>
            </p>
          ) : null}
        </div>
        <div className="shrink-0 sm:text-end print:text-end">
          <h1 className="text-[24px] font-bold uppercase tracking-[0.04em] print:text-[17pt]">{t.title}</h1>
          <dl className="mt-2 space-y-0.5 text-[14px] print:text-[10pt]">
            <div>
              <dt className="inline text-[#071733]/60">{t.reportNo}: </dt>
              <dd className="inline font-semibold">
                <Ltr>{c.reportNo}</Ltr>
              </dd>
            </div>
            <div>
              <dt className="inline text-[#071733]/60">{t.version}: </dt>
              <dd className="inline font-semibold">
                <Ltr>{c.version}</Ltr>
              </dd>
            </div>
            <div>
              <dt className="inline text-[#071733]/60">{t.issued}: </dt>
              <dd className="inline font-semibold">
                <Ltr>{formatDate(c.releasedAt)}</Ltr>
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {c.version >= 2 && c.amendReason ? (
        <p className="mt-4 rounded-md border border-[#071733]/25 px-3 py-2 text-[14px] [unicode-bidi:plaintext] print:text-[10pt]">
          <span className="font-semibold">{fill(t.amendment, { reason: "" })}</span>
          {c.amendReason}
        </p>
      ) : null}

      <Section title={t.client}>
        <Fields
          rows={[
            { label: t.clientName, value: <bdi>{c.client.name || "—"}</bdi> },
            { label: t.region, value: <bdi>{c.client.region || "—"}</bdi> },
          ]}
        />
      </Section>

      <Section title={t.sample}>
        <Fields
          rows={[
            { label: t.sampleNo, value: <Ltr className="font-semibold">{c.sampleNo}</Ltr> },
            { label: t.sampleLabel, value: <bdi>{c.sample.label}</bdi> },
            { label: t.residue, value: <bdi>{residueLabel(labels.residues, c.sample)}</bdi> },
            { label: t.state, value: stateOf(c.sample.state) },
            { label: t.collected, value: <Ltr>{formatDate(c.sample.collectedAt)}</Ltr> },
            { label: t.quantity, value: fill(t.grams, { n: "⁦" + formatNumber(c.sample.grams) + "⁩" }) },
            ...(c.sample.packaging ? [{ label: t.packaging, value: <bdi>{c.sample.packaging}</bdi> }] : []),
            { label: t.region, value: <bdi>{c.sample.region || "—"}</bdi> },
            {
              label: t.condition,
              value: c.condition ? <span className="whitespace-pre-line [unicode-bidi:plaintext]">{c.condition}</span> : t.conditionNone,
            },
          ]}
        />
      </Section>

      <Section title={t.dates}>
        <Fields
          rows={[
            { label: t.received, value: <Ltr>{formatDate(c.receivedAt)}</Ltr> },
            {
              label: t.tested,
              value:
                formatDate(c.testedFrom) === formatDate(c.testedTo) ? (
                  <Ltr>{formatDate(c.testedFrom)}</Ltr>
                ) : (
                  fill(t.testedRange, { from: "⁨" + formatDate(c.testedFrom) + "⁩", to: "⁨" + formatDate(c.testedTo) + "⁩" })
                ),
            },
            { label: t.issued, value: <Ltr>{formatDate(c.releasedAt)}</Ltr> },
          ]}
        />
      </Section>

      {r.items.length > 0 ? (
        <Section title={t.results}>
          <div className="mt-3 overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[560px] border-collapse text-[14px] print:min-w-0">
              <thead>
                <tr>
                  <th className={TH}>{t.colAnalysis}</th>
                  <th className={TH}>{t.colResult}</th>
                  <th className={TH}>{t.colUncertainty}</th>
                  <th className={TH}>{t.colUnit}</th>
                  <th className={TH}>{t.colMethod}</th>
                </tr>
              </thead>
              <tbody>
                {r.items.map((it) => (
                  <tr key={it.analysis} className="break-inside-avoid">
                    <td className={cn(TD, "font-medium")}>{labelOf(labels.analyses, it.analysis)}</td>
                    <td className={cn(TD, "font-semibold tabular-nums")}>{result(it.value, it.qualifier)}</td>
                    <td className={cn(TD, "tabular-nums")}>{it.uncertainty !== undefined ? <Ltr>± {formatNumber(it.uncertainty)}</Ltr> : "—"}</td>
                    <td className={TD}>
                      <Ltr>{ANALYSIS_UNITS[it.analysis] ?? ""}</Ltr>
                    </td>
                    <td className={cn(TD, "text-[#071733]/80 [unicode-bidi:plaintext]")}>{it.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ) : null}

      {r.panels.map((p) => {
        const assessed = p.lines.some((l) => l.pass !== undefined);
        return (
          <Section key={p.analysis} title={labelOf(labels.analyses, p.analysis)}>
            <p className="mt-2 text-[13px] text-[#071733]/75 [unicode-bidi:plaintext] print:text-[9.5pt]">{fill(t.method, { method: p.method })}</p>
            <div className="mt-2 overflow-x-auto print:overflow-visible">
              <table className="w-full min-w-[560px] border-collapse text-[14px] print:min-w-0">
                <thead>
                  <tr>
                    <th className={TH}>{t.colParameter}</th>
                    <th className={TH}>{t.colResult}</th>
                    <th className={TH}>{t.colUnit}</th>
                    <th className={TH}>{t.colLimit}</th>
                    <th className={TH}>{t.colReference}</th>
                    {assessed ? <th className={TH}>{t.colConformity}</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {p.lines.map((l, i) => (
                    <tr key={`${l.name}-${i}`} className="break-inside-avoid">
                      <td className={cn(TD, "font-medium [unicode-bidi:plaintext]")}>{l.name}</td>
                      <td className={cn(TD, "font-semibold tabular-nums")}>{result(l.value, l.qualifier)}</td>
                      <td className={TD}>
                        <Ltr>{l.unit}</Ltr>
                      </td>
                      <td className={cn(TD, "tabular-nums")}>{l.limit !== undefined ? <Ltr>{formatNumber(l.limit)}</Ltr> : "—"}</td>
                      <td className={cn(TD, "[unicode-bidi:plaintext]")}>{l.limitRef || "—"}</td>
                      {assessed ? (
                        <td className={cn(TD, "font-semibold", l.pass === false && "text-[#b42318]")}>
                          {l.pass === undefined ? "—" : l.pass ? t.conforms : t.notConform}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        );
      })}

      {conformity ? <p className="mt-4 text-[13px] italic text-[#071733]/80 print:text-[9.5pt]">{t.conformityNote}</p> : null}

      <Section title={t.deviations}>
        <p className="mt-3 whitespace-pre-line text-[14px] [unicode-bidi:plaintext] print:text-[10pt]">{r.deviations || t.deviationsNone}</p>
      </Section>

      <Section title={t.release}>
        <Fields
          rows={[
            {
              label: t.releasedBy,
              value: (
                <>
                  <bdi>{c.releasedByName}</bdi>, {roleOf(c.releasedByRole)}
                </>
              ),
            },
            { label: t.retention, value: <bdi>{c.retention}</bdi> },
          ]}
        />
        <ul className="mt-4 space-y-1 text-[13px] text-[#071733]/85 print:text-[9.5pt]">
          <li>{t.statementSample}</li>
          <li>{t.statementCopy}</li>
        </ul>
      </Section>

      <section className="mt-7 flex break-inside-avoid items-center gap-5 rounded-md border border-[#071733]/20 p-4 print:mt-5">
        {/* The SVG comes from the qrcode package (our own URL), not from user input. */}
        <div aria-hidden className="size-24 shrink-0 [&_svg]:size-full" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        <div className="min-w-0 text-[13px] print:text-[9.5pt]">
          <p className="font-semibold">{t.verifyTitle}</p>
          <p className="mt-1 break-all text-[#071733]/75">{fill(t.verifyBody, { url: "⁦" + url + "⁩" })}</p>
          <p className="mt-1">
            {t.verifyCode}: <Ltr className="font-mono text-[15px] font-semibold tracking-[0.12em] print:text-[11pt]">{c.code}</Ltr>
          </p>
        </div>
      </section>

      <p className="mt-8 text-center text-[13px] font-semibold uppercase tracking-[0.2em] text-[#071733]/70 print:mt-6">— {t.end} —</p>
      <p className="mt-6 border-t border-[#071733]/20 pt-3 text-center text-[12px] text-[#071733]/65 print:text-[8.5pt]">
        {fill(t.footer, { lab: c.lab.name })}
      </p>
    </article>
  );
}
