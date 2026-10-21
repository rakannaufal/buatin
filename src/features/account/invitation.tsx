"use client";
import { useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { post, message } from "@/components/api";
import { Button, Notice } from "@/components/ui";
export function InvitationAcceptance() {
  const token = useSearchParams().get("invitation");
  const accept = useMutation({
    mutationFn: () => post("/account/invitations/accept", { token }),
    onSuccess: () => {
      window.location.assign("/login");
    },
  });
  if (!token) return null;
  return (
    <section className="panel">
      <h2>Undangan admin</h2>
      <p>
        Terima hanya bila undangan ini berasal dari owner yang Anda kenal. Akun
        harus sesuai email undangan; MFA wajib pada domain publik. Setelah
        diterima, masuk kembali.
      </p>
      {accept.error && <Notice tone="error">{message(accept.error)}</Notice>}
      <Button busy={accept.isPending} onClick={() => accept.mutate()}>
        Terima undangan admin
      </Button>
    </section>
  );
}
