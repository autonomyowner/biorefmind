import Image from "next/image";

import { authMessages } from "@/components/auth-messages";
import { LanguageSwitch } from "@/components/language-switch";
import { Wordmark } from "@/components/landing/site-header";
import { getMessages } from "@/i18n/server";

/** Sign-in, sign-up and onboarding: a centred card above the moss-and-butterfly scene. */
export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const t = await getMessages(authMessages);
  return (
    <div className="flex min-h-dvh flex-1 flex-col overflow-x-clip bg-background">
      <header className="relative z-20 flex h-20 items-center justify-between px-5 sm:h-24 sm:px-10 lg:px-[70px]">
        <Wordmark label={t.back} />
        <LanguageSwitch />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pt-2 pb-5">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>

      {/* The hero's moss arch along the bottom: the butterfly and the top of the arch. */}
      <div aria-hidden className="relative h-[clamp(150px,16vw,230px)] w-full">
        <Image
          src="/hero-moss-cutout.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[45%_24%]"
        />
      </div>
    </div>
  );
}
