import { PaymentPage } from "@/features/billing/billing";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentPage id={id} />;
}
