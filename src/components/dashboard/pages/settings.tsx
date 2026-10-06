"use client";

import { EnterpriseCard } from "@/components/dashboard/homes";
import { dashboardMessages } from "@/components/dashboard/messages";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { useDashboard } from "@/components/dashboard/shell";
import { useMessages } from "@/i18n/provider";

/** Settings: profile (public for labs), and the enterprise request for factories. */
export function SettingsPage() {
  const { workspace } = useDashboard();
  const t = useMessages(dashboardMessages);
  return (
    <div className="space-y-5">
      <ProfileCard title={workspace.kind === "lab" ? t.profile.publicTitle : t.profile.title} />
      {workspace.kind === "factory" ? <EnterpriseCard /> : null}
    </div>
  );
}
