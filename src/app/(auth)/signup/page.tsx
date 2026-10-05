import type { Metadata } from "next";

import { WorkspaceForm } from "@/components/auth-forms";
import { authMessages } from "@/components/auth-messages";
import { getMessages } from "@/i18n/server";
import type { Kind } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(authMessages)).signUp };
}

const KINDS: readonly Kind[] = ["farm", "lab", "factory"];

/** `?as=factory` (from the public marketplace) opens straight on that account type's form. */
export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const as = (await searchParams).as;
  const initialKind = KINDS.find((k) => k === as) ?? null;
  return <WorkspaceForm mode="signup" initialKind={initialKind} />;
}
