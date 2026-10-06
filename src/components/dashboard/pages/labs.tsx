"use client";

import { LabDirectory } from "@/components/dashboard/lab-directory";
import { LabTests } from "@/components/dashboard/labtests/my-requests";
import { dashboardMessages } from "@/components/dashboard/messages";
import { useDashboard } from "@/components/dashboard/shell";
import { useMessages } from "@/i18n/provider";

/** Labs (farm and factory): lab tests sent and the directory. */
export function LabsPage() {
  const { workspace } = useDashboard();
  const t = useMessages(dashboardMessages);
  return (
    <div className="space-y-5">
      <LabTests />
      <LabDirectory title={workspace.kind === "factory" ? t.directory.titleFactory : t.directory.title} />
    </div>
  );
}
