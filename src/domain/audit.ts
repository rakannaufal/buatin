const sensitiveKey =
  /^(?:password|secret|secretKey|clientSecret|token|tokenHash|accessToken|refreshToken|idToken|apiKey|authorization|cookie|sessionToken|backupCodes|recoveryCodes|mfaCode|totpCode|totpURI|totp|credential|credentials)$/i;

export function redactText(value: string) {
  return value
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}/g, "[REDACTED]")
    .replace(
      /\b(password|secret|(?:access[_-]?|refresh[_-]?|id[_-]?)?token|api[_-]?key|authorization|totp(?:[_-]?code)?)\s*[:=]\s*[^\s&,;]+/gi,
      "$1=[REDACTED]",
    )
    .replace(
      /((?:https?|postgres(?:ql)?|redis):\/\/)[^\s/@]+:[^\s/@]+@/g,
      "$1[REDACTED]@",
    );
}

export function redactAudit(value: unknown): unknown {
  if (typeof value === "string") return redactText(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(redactAudit);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitiveKey.test(key) ? "[REDACTED]" : redactAudit(item),
      ]),
    );
  return value;
}
