// Retained to fail safely for operators using the obsolete entry point.
console.error(
  "Shared account bootstrap has been removed. Use owner:create for the first owner, owner:reset for owner recovery, and admin invitations for staff. Password arguments are not accepted.",
);
process.exitCode = 1;
