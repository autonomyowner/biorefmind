import Image from "next/image";

import { authMessages } from "@/components/auth-messages";
import { LanguageSwitch } from "@/components/language-switch";
import { Wordmark } from "@/components/landing/site-header";
import { getMessages } from "@/i18n/server";

/** Sign-in, sign-up and onboarding: a centred frosted card, the robotic hand at the side on wide screens. */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getMessages(authMessages);
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col overflow-x-clip bg-background">
      {/* The hero's blue halo and the hand holding the emblem, faded into the page. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_55%_at_85%_70%,#b6c8dc_0%,rgba(182,200,220,0.5)_45%,transparent_80%)] rtl:bg-[radial-gradient(ellipse_50%_55%_at_15%_70%,#b6c8dc_0%,rgba(182,200,220,0.5)_45%,transparent_80%)]"
      />
      <div aria-hidden className="pointer-events-none absolute end-0 bottom-0 hidden aspect-[1546/1017] w-[40vw] max-w-[640px] lg:block">
        <Image
          src="/hero-hand.png"
          alt=""
          fill
          sizes="40vw"
          // Mirrored in Arabic; the mask mirrors with it, so it needs no right-to-left variant.
          className="object-cover rtl:-scale-x-100 [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_35%),linear-gradient(to_bottom,transparent,black_25%)]"
        />
      </div>

      <header className="relative z-20 flex h-20 items-center justify-between px-5 sm:h-24 sm:px-10 lg:px-16">
        <Wordmark label={t.back} />
        <LanguageSwitch />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pt-2 pb-16">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
