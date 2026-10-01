import type { Metadata } from "next";
import { Geist_Mono, IBM_Plex_Sans_Arabic, Inter_Tight } from "next/font/google";
import { preconnect } from "react-dom";
import { Toaster } from "sonner";
import "./globals.css";
import { ConvexClientProvider } from "@/lib/convex-provider";
import { dirOf } from "@/i18n/locale";
import { defineMessages } from "@/i18n/messages";
import { I18nProvider } from "@/i18n/provider";
import { getLocale, getMessages } from "@/i18n/server";

const brand = Inter_Tight({ variable: "--font-brand", subsets: ["latin"], display: "swap" });
// Arabic glyphs; only fetched when a page actually shows Arabic text.
const arabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

const meta = defineMessages({
  en: {
    title: "BioGrena — the bio-waste marketplace",
    description:
      "Farmers and factories sell peels, pomace and residues to factories that need them. Every batch is scored, so buyers know what they get.",
  },
  ar: {
    title: "BioGrena — سوق المخلفات الحيوية",
    description:
      "يبيع المزارعون والمصانع القشور والتفل والمخلفات للمصانع التي تحتاجها. كل دفعة تحصل على تقييم، فيعرف المشتري ما يشتريه.",
  },
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(meta);
  return { title: t.title, description: t.description };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const backend = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (backend) preconnect(backend, { crossOrigin: "anonymous" });
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      data-scroll-behavior="smooth"
      className={`${brand.variable} ${arabic.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col font-sans">
        <I18nProvider locale={locale}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </I18nProvider>
        <Toaster position="top-center" dir={dirOf(locale)} />
      </body>
    </html>
  );
}
