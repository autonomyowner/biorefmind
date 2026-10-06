import type { Metadata } from "next";

import { AssistantPage } from "@/components/dashboard/assistant/assistant-page";

export const metadata: Metadata = { title: "Assistant" };

/** The AI assistant: questions, photos, and actions it prepares for the person to confirm. */
export default function Page() {
  return <AssistantPage />;
}
