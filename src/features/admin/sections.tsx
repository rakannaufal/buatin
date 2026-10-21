"use client";
import type { AdminSection } from "@/domain/admin";
import { UsersAdmin, StaffAdmin } from "./users";
import { PlansAdmin, VouchersAdmin } from "./commercial";
import { PaymentsAdmin, RefundsAdmin } from "./finance";
import {
  JobsAdmin,
  AuditAdmin,
  PrivacyAdmin,
  AiUsageAdmin,
} from "./operations";
import { OperationsPanel } from "./operations-health";
import { SettingsAdmin } from "./settings";
import { ContentAdmin } from "./content";
import { SupportAdmin } from "./support";
import { ReportsAdmin } from "./reports";
export function AdminSectionPage({
  section,
  id,
}: {
  section: AdminSection;
  id?: string;
}) {
  switch (section) {
    case "users":
      return <UsersAdmin id={id} />;
    case "staff":
      return <StaffAdmin />;
    case "plans":
      return <PlansAdmin />;
    case "vouchers":
      return <VouchersAdmin id={id} />;
    case "payments":
      return <PaymentsAdmin id={id} />;
    case "refunds":
      return <RefundsAdmin />;
    case "jobs":
      return <JobsAdmin />;
    case "audit":
      return <AuditAdmin />;
    case "privacy":
      return <PrivacyAdmin />;
    case "ai":
      return <AiUsageAdmin />;
    case "operations":
      return <OperationsPanel />;
    case "settings":
      return <SettingsAdmin />;
    case "content":
      return <ContentAdmin />;
    case "support":
      return <SupportAdmin id={id} />;
    case "reports":
      return <ReportsAdmin />;
  }
}
