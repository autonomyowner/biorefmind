import type { Metadata } from "next";

import { WorkspaceForm } from "@/components/auth-forms";
import { authMessages } from "@/components/auth-messages";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(authMessages)).signUp };
}

export default function SignupPage() {
  return <WorkspaceForm mode="signup" />;
}