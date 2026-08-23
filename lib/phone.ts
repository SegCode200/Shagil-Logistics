export function normalizeNigerianPhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("@")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("234")) return `+${digits}`;
  if (digits.startsWith("0")) return `+234${digits.slice(1)}`;
  if (/^[789]\d{9}$/.test(digits)) return `+234${digits}`;
  return trimmed;
}

export function isNigerianPhone(value: string) {
  return /^\+234[789]\d{9}$/.test(normalizeNigerianPhone(value));
}
