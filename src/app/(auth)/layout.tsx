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
      {/* A periwinkle glow and the hand holding the emblem (background removed) in the end-bottom corner. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_35%_45%_at_82%_72%,rgba(120,150,255,0.3),transparent_75%)] rtl:bg-[radial-gradient(ellipse_35%_45%_at_18%_72%,rgba(120,150,255,0.3),transparent_75%)]"
      />
      <div aria-hidden className="pointer-events-none absolute end-0 bottom-0 hidden aspect-[1546/1017] w-[38vw] max-w-[620px] lg:block">
        <Image
          src="/art/hand-emblem.png"
          alt=""
          fill
          sizes="38vw"
          // The arm's cut edges sit on the window's end and bottom edges. Mirrored in Arabic.
          className="object-contain object-[100%_100%] rtl:-scale-x-100"
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
