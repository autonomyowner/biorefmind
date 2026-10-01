import type { Metadata } from "next";

import { LoginForm } from "@/components/auth-forms";
import { authMessages } from "@/components/auth-messages";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(authMessages)).signIn };
}

export default function LoginPage() {
  return <LoginForm />;
}