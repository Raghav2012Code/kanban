type WebCrypto = Pick<Crypto, 'getRandomValues'> & { randomUUID?: () => string };

function webCrypto(): WebCrypto | undefined {
  const candidate = (globalThis as { crypto?: unknown }).crypto;
  if (!candidate || typeof candidate !== 'object') return undefined;
  const { getRandomValues, randomUUID } = candidate as Partial<WebCrypto>;
  if (typeof getRandomValues !== 'function') return undefined;
  return {
    getRandomValues: getRandomValues.bind(candidate),
    randomUUID: typeof randomUUID === 'function' ? randomUUID.bind(candidate) : undefined,
  };
}

export function makeId(prefix: string): string {
  const cryptoApi = webCrypto();
  // randomUUID is preferred but unavailable outside secure contexts; the byte
  // fallback below works everywhere, so filing a card never throws on plain HTTP.
  if (cryptoApi?.randomUUID) return `${prefix}-${cryptoApi.randomUUID()}`;
  return `${prefix}-${uuidFromRandomBytes(cryptoApi)}`;
}

function uuidFromRandomBytes(cryptoApi: WebCrypto | undefined): string {
  const bytes = new Uint8Array(16);
  if (cryptoApi) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function tailNumber(id: string): string {
  const compact = id.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return compact.slice(-4).padStart(4, '0');
}
