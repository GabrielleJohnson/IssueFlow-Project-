const LOCAL_PART_PATTERN = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i;
const DOMAIN_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
const TOP_LEVEL_DOMAIN_PATTERN = /^[a-z]{2,63}$/i;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidRegistrationEmail(value: string) {
  const email = normalizeEmail(value);
  if (!email || email.length > 254 || /\s/.test(email)) return false;

  const atIndex = email.indexOf("@");
  if (atIndex <= 0 || atIndex !== email.lastIndexOf("@")) return false;

  const localPart = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);
  if (
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !LOCAL_PART_PATTERN.test(localPart)
  ) {
    return false;
  }

  const labels = domain.split(".");
  return (
    labels.length >= 2 &&
    labels.every((label) => DOMAIN_LABEL_PATTERN.test(label)) &&
    TOP_LEVEL_DOMAIN_PATTERN.test(labels.at(-1) ?? "")
  );
}
