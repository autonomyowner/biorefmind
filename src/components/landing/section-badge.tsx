import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

/** The frosted pill that opens every landing section (from the section designs). */
export function SectionBadge({
  children,
  tone = "light",
  className,
}: {
  children: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium",
        tone === "light"
          ? "border border-white/80 bg-white/55 text-[#24366a] shadow-[0_8px_24px_-16px_rgba(7,23,51,0.4)]"
          : "border border-white/15 bg-white/8 text-[#c9d6ff]",
        className,
      )}
    >
      <Sparkles className={cn("size-4", tone === "light" ? "text-azure" : "text-[#a9bcff]")} strokeWidth={2} />
      {children}
    </p>
  );
}

/** A headline whose last words carry the azure-to-violet gradient. */
export function Headline({
  lead,
  accent,
  tone = "light",
}: {
  lead: string;
  accent: string;
  tone?: "light" | "dark";
}) {
  return (
    <>
      {lead} <span className={tone === "light" ? "text-gradient" : "text-gradient-light"}>{accent}</span>
    </>
  );
}
