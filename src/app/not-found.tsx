import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-[22px] font-semibold">Page Not Found</h1>
      <Link href="/" className="text-[17px] text-primary">
        Home
      </Link>
    </main>
  );
}
