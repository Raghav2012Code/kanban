export function makeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function tailNumber(id: string): string {
  const compact = id.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return compact.slice(-4).padStart(4, '0');
}
