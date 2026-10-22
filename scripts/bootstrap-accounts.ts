import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { db } from "../src/server/db";
import { roles, type Role } from "../src/domain/admin";

/**
 * Script untuk membuat atau meng-upgrade akun asli (owner, admin, user).
 *
 * Contoh penggunaan:
 *   node --import tsx scripts/bootstrap-accounts.ts <email> <password> <role> [nama]
 *
 * Contoh:
 *   node --import tsx scripts/bootstrap-accounts.ts owner@buatin.id "PasswordRahasia123!" owner "Owner Buatin"
 *   node --import tsx scripts/bootstrap-accounts.ts admin@buatin.id "PasswordRahasia123!" admin "Admin Staff"
 *   node --import tsx scripts/bootstrap-accounts.ts user@buatin.id "PasswordRahasia123!" user "Klien Percobaan"
 */

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];
  const targetRole = (process.argv[4]?.trim().toLowerCase() ?? "owner") as Role;
  const name =
    process.argv[5]?.trim() ||
    (targetRole === "owner"
      ? "Pemilik Buatin"
      : targetRole === "admin"
        ? "Admin Buatin"
        : "Pengguna Buatin");

  if (!email || !password) {
    console.log(`
Penggunaan:
  node --import tsx scripts/bootstrap-accounts.ts <email> <password> <role: owner|admin|user> [nama]

Contoh:
  node --import tsx scripts/bootstrap-accounts.ts owner@domain.com "SandiRahasia123!" owner "Pemilik Buatin"
`);
    process.exit(1);
  }

  if (!roles.includes(targetRole)) {
    console.error(
      `Role tidak valid: "${targetRole}". Pilihan role yang sah: ${roles.join(", ")}`,
    );
    process.exit(1);
  }

  if (password.length < 12) {
    console.error("Password minimal harus 12 karakter.");
    process.exit(1);
  }

  try {
    const existing = await db.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    const hashedPassword = await hashPassword(password);

    if (existing) {
      console.log(
        `User dengan email ${email} sudah ada (ID: ${existing.id}). Memperbarui role menjadi '${targetRole}'...`,
      );

      const credentialAccount = existing.accounts.find(
        (a) => a.providerId === "credential",
      );

      await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: existing.id },
          data: {
            role: targetRole,
            emailVerified: true,
            status: "active",
            suspendedUntil: null,
            name: existing.name || name,
          },
        });

        if (credentialAccount) {
          await tx.account.update({
            where: { id: credentialAccount.id },
            data: { password: hashedPassword, accountId: existing.id },
          });
        } else {
          await tx.account.create({
            data: {
              id: crypto.randomUUID(),
              accountId: existing.id,
              providerId: "credential",
              userId: existing.id,
              password: hashedPassword,
            },
          });
        }

        // Revoke existing sessions to force re-login with new role
        await tx.session.deleteMany({ where: { userId: existing.id } });
      });

      console.log(`Berhasil memperbarui akun:`);
      console.log(`- Email : ${email}`);
      console.log(`- Role  : ${targetRole}`);
      console.log(`- Status: emailVerified = true, status = active`);
    } else {
      const userId = crypto.randomUUID();

      await db.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id: userId,
            email,
            name,
            role: targetRole,
            emailVerified: true,
            status: "active",
          },
        });

        await tx.account.create({
          data: {
            id: crypto.randomUUID(),
            accountId: userId,
            providerId: "credential",
            userId,
            password: hashedPassword,
          },
        });
      });

      console.log(`Berhasil membuat akun baru:`);
      console.log(`- ID    : ${userId}`);
      console.log(`- Email : ${email}`);
      console.log(`- Nama  : ${name}`);
      console.log(`- Role  : ${targetRole}`);
      console.log(`- Status: Terverifikasi (siap login langsung)`);
    }
  } catch (err) {
    console.error("Gagal memproses akun:", err instanceof Error ? err.message : err);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
