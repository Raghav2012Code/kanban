let idSequence = 0;

export function makeId(prefix: string): string {
  idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSequence.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function tailNumber(id: string): string {
  const compact = id.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return compact.slice(-4).padStart(4, '0');
}
