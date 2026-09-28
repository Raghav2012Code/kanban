import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The token system, checked as arithmetic over declared values.
 *
 * Two seams are under test here, and the split is deliberate: the colour maths is
 * pure and lives at this module, while anything only a component can break is
 * tested through the component. Nothing else needs a new seam.
 *
 * The token file and the design document are read as text and parsed, never
 * sampled from computed style. The defect this guards is precisely that two
 * declarations disagree, and sampling computed style would report only the
 * winner — it could never detect the loser drifting.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function readRepoFile(relativePath: string): string {
  return readFileSync(path.resolve(repoRoot, relativePath), 'utf8');
}

const tokenFile = readRepoFile('src/styles/index.css');
const designDoc = readRepoFile('DESIGN.md');

// ---------------------------------------------------------------------------
// Colour conversion
// ---------------------------------------------------------------------------

type Rgb = readonly [number, number, number];

/** OKLCH -> sRGB, following Bjorn Ottosson's reference transform. */
function oklchToRgb(lightness: number, chroma: number, hue: number): Rgb {
  const radians = (hue * Math.PI) / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);

  const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = lightness - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  // Channels are clipped, not gamut-mapped, which is what the browser does when it
  // rasterises an out-of-gamut colour. The reference set below includes clipped
  // values so this cannot quietly diverge.
  const encode = (channel: number): number => {
    const clipped = Math.min(1, Math.max(0, channel));
    return clipped <= 0.0031308 ? 12.92 * clipped : 1.055 * clipped ** (1 / 2.4) - 0.055;
  };

  return [
    encode(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    encode(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    encode(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`;
}

const OKLCH_VALUE = /^oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)$/;

function parseOklch(value: string): [lightness: number, chroma: number, hue: number] | null {
  const match = value.match(OKLCH_VALUE);
  if (!match) return null;
  const [, lightness, chroma, hue] = match;
  return [Number(lightness), Number(chroma), Number(hue)];
}

function relativeLuminance(rgb: Rgb): number {
  const linearise = (channel: number) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linearise(rgb[0]) + 0.7152 * linearise(rgb[1]) + 0.0722 * linearise(rgb[2]);
}

function contrastRatio(a: Rgb, b: Rgb): number {
  const first = relativeLuminance(a);
  const second = relativeLuminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

// ---------------------------------------------------------------------------
// The reference fixture
// ---------------------------------------------------------------------------

/**
 * OKLCH -> sRGB as a real browser performs it, captured offline on 2026-09-28.
 *
 * Chromium rasterises each value onto an sRGB canvas and reads the pixel back
 * through getImageData. Provenance: eight opaque control colours were probed
 * first and every one round-tripped byte-exact — #123456, #000000, #ffffff,
 * #efad32, #7f7f80, #010203, #c0ffee, #4b0082 — so no colour management is
 * applied and these readings are the browser's own conversion rather than a
 * re-encoded version of the input.
 *
 * The set deliberately includes values the palette does not use: mid greys, an
 * out-of-gamut high-chroma red that clips to #ff0000, a high-lightness magenta, a
 * near-black cyan, and two mid-chroma hues. Without them the fixture could only
 * ever confirm the nine tokens it already polices, and a conversion bug confined
 * to, say, high chroma would pass unnoticed.
 *
 * This is what stops the guard from trusting its own arithmetic. A conversion that
 * is wrong here would produce a confidently wrong verdict on every token, which
 * is the failure this work exists to prevent.
 */
const BROWSER_OKLCH_TO_HEX: Readonly<Record<string, string>> = {
  'oklch(0 0 0)': '#000000',
  'oklch(0.19 0.003 250)': '#131415',
  'oklch(0.24 0.003 250)': '#1e1f21',
  'oklch(0.93 0.002 250)': '#e7e8e9',
  'oklch(0.74 0.003 250)': '#a9abad',
  'oklch(0.63 0.003 250)': '#88898b',
  'oklch(0.79 0.15 78)': '#efad32',
  'oklch(0.68 0.16 25)': '#ea6a64',
  'oklch(0.75 0.1 160)': '#72c298',
  'oklch(1 0 0)': '#ffffff',
  'oklch(0.5 0 0)': '#636363',
  'oklch(0.6 0.3 30)': '#ff0000',
  'oklch(0.45 0.25 145)': '#007200',
  'oklch(0.85 0.2 320)': '#ff9eff',
  'oklch(0.12 0.05 200)': '#000a0d',
  'oklch(0.72 0.12 95)': '#bca341',
};

// ---------------------------------------------------------------------------
// The token declarations
// ---------------------------------------------------------------------------

interface Declaration {
  property: string;
  value: string;
  comment: string;
}

/** One pass over the file: every custom property, its value, and its trailing comment. */
function parseDeclarations(css: string): Declaration[] {
  return [...css.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);\s*(?:\/\*([^*\n]*)\*\/)?/g)].map(
    ([, property, value, comment]) => ({ property, value: value.trim(), comment: comment ?? '' }),
  );
}

const declarations = parseDeclarations(tokenFile);

const declaredProperties = new Map<string, string[]>();
for (const { property, value } of declarations) {
  const values = declaredProperties.get(property) ?? [];
  values.push(value);
  declaredProperties.set(property, values);
}

const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
const isOklch = (value: string) => parseOklch(value) !== null;

function valuesOf(property: string): string[] {
  return declaredProperties.get(property) ?? [];
}

const oklchColourTokens = [...declaredProperties.keys()].filter(
  (property) => property.startsWith('color-') && valuesOf(property).some(isOklch),
);

// ---------------------------------------------------------------------------
// The border ladder
// ---------------------------------------------------------------------------

/** WCAG 1.4.11 asks 3:1 of boundaries that identify a control, and of nothing else. */
const NON_TEXT_MINIMUM = 3;

/** The grounds a border can be composited over. */
const GROUNDS = ['bg', 'surface', 'surface-2'] as const;

type Purpose = 'decorative' | 'control' | 'emphasis';

interface BorderRung extends Declaration {
  purpose: Purpose | null;
}

/**
 * The purpose is read from beside the token rather than from a table here, so a
 * fourth rung added to the token file without a declaration fails. A table in this
 * file would satisfy that rule only for tokens someone remembered to add.
 */
const borderRungs: BorderRung[] = declarations
  .filter((declaration) => declaration.property.startsWith('color-border'))
  .map((declaration) => {
    const declared = declaration.comment.match(/purpose:\s*([a-z]+)/i)?.[1];
    return { ...declaration, purpose: declared ? (declared.toLowerCase() as Purpose) : null };
  });

function declaredColour(property: string): Rgb {
  const value = valuesOf(property).find(isOklch);
  if (!value) throw new Error(`${property} declares no OKLCH value`);
  const oklch = parseOklch(value);
  if (!oklch) throw new Error(`cannot read ${value}`);
  return oklchToRgb(...oklch);
}

/** `rgb(255 255 255 / 0.18)` is white at 18%, which has no single contrast value. */
function parseTranslucent(value: string): { color: Rgb; alpha: number } | null {
  const match = value.match(/^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)\s*)?\)$/);
  if (!match) return null;
  const [, r, g, b, alpha] = match;
  return {
    color: [Number(r) / 255, Number(g) / 255, Number(b) / 255],
    alpha: alpha === undefined ? 1 : Number(alpha),
  };
}

/** Judged as it will actually appear, which is what makes one token correct across the ramp. */
function composite(ground: Rgb, token: { color: Rgb; alpha: number }): Rgb {
  const blend = (over: number, under: number) => over * token.alpha + under * (1 - token.alpha);
  return [blend(token.color[0], ground[0]), blend(token.color[1], ground[1]), blend(token.color[2], ground[2])];
}

/** Measured on every ground, because a rung that passes on base can fail on a raised surface. */
function ratiosOnEveryGround(rung: BorderRung): Array<[ground: string, ratio: number]> {
  const token = parseTranslucent(rung.value);
  if (!token) throw new Error(`cannot read ${rung.property}: ${rung.value}`);
  return GROUNDS.map((ground) => {
    const base = declaredColour(`color-${ground}`);
    return [ground, contrastRatio(composite(base, token), base)] as [string, number];
  });
}

// ---------------------------------------------------------------------------
// The design document
// ---------------------------------------------------------------------------

/** The Tailwind adapter renames two tokens: `--color-bg` is `bg-base` and `--color-fg` is `text-ink`. The document quotes the adapter. */
const TOKEN_ALIASES: Readonly<Record<string, string>> = { ink: 'fg', base: 'bg' };

const documentTokenName = (name: string) => TOKEN_ALIASES[name] ?? name;

const documentTokens = new Set(
  [...declaredProperties.keys()].map((property) => property.replace(/^color-/, '')),
);

function lineStartingWith(prefix: string): string {
  const line = designDoc.split('\n').find((candidate) => candidate.startsWith(prefix));
  if (!line) throw new Error(`the design document no longer contains a line starting "${prefix}"`);
  return line;
}

/** A named `##` section, bounded by the next heading so a stray later match cannot count. */
function docSection(heading: string): string {
  const start = designDoc.indexOf(`## ${heading}`);
  if (start < 0) throw new Error(`the design document no longer has a "${heading}" section`);
  const rest = designDoc.slice(start);
  const nextHeading = rest.slice(1).search(/\n## /);
  return nextHeading < 0 ? rest : rest.slice(0, nextHeading + 1);
}

// ---------------------------------------------------------------------------
// Palette coherence
// ---------------------------------------------------------------------------

describe('the token conversion', () => {
  it('agrees with a real browser on every reference value, including ones the palette never uses', () => {
    for (const [declared, browserHex] of Object.entries(BROWSER_OKLCH_TO_HEX)) {
      const oklch = parseOklch(declared);
      expect(oklch, `unreadable reference value ${declared}`).not.toBeNull();
      expect(toHex(oklchToRgb(...(oklch!))), `${declared} against the browser`).toBe(browserHex);
    }
  });
});

describe('palette coherence', () => {
  it('covers every OKLCH colour token with a hex fallback', () => {
    const missing = oklchColourTokens.filter((property) => !valuesOf(property).some(isHex));
    expect(missing, 'tokens with no hex fallback for a browser without OKLCH').toEqual([]);
  });

  it('never declares a token twice in a way that silently overrides one value', () => {
    // A hex fallback beside an OKLCH value is the deliberate pattern: a browser
    // without OKLCH reads the first, a browser with it reads the second. Anything
    // else declared twice means one of the two values is discarded without a word.
    const offenders: string[] = [];
    for (const [property, values] of declaredProperties) {
      if (values.length < 2) continue;
      const isFallbackPair = values.length === 2 && values.some(isHex) && values.some(isOklch);
      if (!isFallbackPair) offenders.push(`${property}: ${values.join(' then ')}`);
    }

    expect(offenders, 'declarations where one value silently overrides the other').toEqual([]);
  });

  it('gives every token a hex fallback equal to the OKLCH value it shadows', () => {
    const mismatches: string[] = [];

    for (const property of oklchColourTokens) {
      const fallbacks = valuesOf(property).filter(isHex);
      for (const value of valuesOf(property).filter(isOklch)) {
        const oklch = parseOklch(value)!;
        const expected = toHex(oklchToRgb(...oklch));
        for (const fallback of fallbacks) {
          if (fallback.toLowerCase() !== expected) {
            mismatches.push(`${property}: declares ${value} but its hex fallback is ${fallback}, not ${expected}`);
          }
        }
      }
    }

    expect(mismatches, 'hex fallbacks that disagree with the value they shadow').toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The border ladder
// ---------------------------------------------------------------------------

describe('the border ladder', () => {
  it('declares a purpose for every rung, so a new rung cannot be added unmeasured', () => {
    const undeclared = borderRungs.filter((rung) => rung.purpose === null).map((rung) => rung.property);
    expect(undeclared, 'border rungs with no declared purpose').toEqual([]);
  });

  it('declares only purposes it knows how to hold to a floor', () => {
    const known: readonly string[] = ['decorative', 'control', 'emphasis'];
    const unknown = borderRungs
      .filter((rung) => rung.purpose !== null && !known.includes(rung.purpose))
      .map((rung) => `${rung.property}: ${rung.purpose}`);
    expect(unknown, 'border rungs with an unrecognised purpose').toEqual([]);
  });

  it('holds control and emphasis rungs at or above the non-text minimum on every ground', () => {
    const failures: string[] = [];
    for (const rung of borderRungs) {
      if (rung.purpose !== 'control' && rung.purpose !== 'emphasis') continue;
      for (const [ground, ratio] of ratiosOnEveryGround(rung)) {
        if (ratio < NON_TEXT_MINIMUM) {
          failures.push(`${rung.property} on ${ground}: ${ratio.toFixed(2)}:1, below ${NON_TEXT_MINIMUM}:1`);
        }
      }
    }
    expect(failures, 'control boundaries below the non-text minimum').toEqual([]);
  });

  it('permits decorative rungs below the minimum, and still keeps one there', () => {
    // Permitting decoration below the floor is only meaningful while the ladder is
    // genuinely split. Lifting every hairline to 3:1 would satisfy nothing extra and
    // turn the board into a wireframe, so this asserts the split still exists rather
    // than merely tolerating it.
    const decorative = borderRungs.filter((rung) => rung.purpose === 'decorative');
    expect(decorative.length, 'the ladder must keep a decorative rung').toBeGreaterThan(0);

    const belowFloor = decorative.filter((rung) =>
      ratiosOnEveryGround(rung).some(([, ratio]) => ratio < NON_TEXT_MINIMUM),
    );
    expect(belowFloor.length, 'a decorative rung must be allowed to sit below the floor').toBeGreaterThan(0);
  });

  it('keeps the emphasis rung stronger than every control rung, on every ground', () => {
    const emphasis = borderRungs.filter((rung) => rung.purpose === 'emphasis');
    const control = borderRungs.filter((rung) => rung.purpose === 'control');
    expect(emphasis.length, 'the ladder must keep an emphasis rung').toBeGreaterThan(0);

    const inversions: string[] = [];
    for (const strong of emphasis) {
      const strongRatios = new Map(ratiosOnEveryGround(strong));
      for (const plain of control) {
        for (const [ground, plainRatio] of ratiosOnEveryGround(plain)) {
          const strongRatio = strongRatios.get(ground) ?? 0;
          if (strongRatio <= plainRatio) {
            inversions.push(
              `${strong.property} at ${strongRatio.toFixed(2)}:1 is not stronger than ${plain.property} at ${plainRatio.toFixed(2)}:1 on ${ground}`,
            );
          }
        }
      }
    }
    expect(inversions, 'the ladder inverted').toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The documented figures
// ---------------------------------------------------------------------------

describe('the documented contrast table', () => {
  it('recomputes every figure it publishes', () => {
    const published = [
      ...lineStartingWith('- Verified contrast,').matchAll(/([a-z0-9-]+)\/([a-z0-9-]+) \*\*(\d+\.\d+)\*\*/g),
    ];
    expect(published.length, 'figures found in the documented table').toBeGreaterThan(0);

    const mismatches: string[] = [];
    for (const [, rawForeground, rawBackground, documented] of published) {
      const foreground = documentTokenName(rawForeground);
      const background = documentTokenName(rawBackground);
      if (!documentTokens.has(foreground) || !documentTokens.has(background)) {
        mismatches.push(`${rawForeground}/${rawBackground} is not a token the token file declares`);
        continue;
      }
      const measured = contrastRatio(declaredColour(`color-${foreground}`), declaredColour(`color-${background}`));
      if (Math.abs(measured - Number(documented)) > 0.005) {
        mismatches.push(`${rawForeground}/${rawBackground}: documented ${documented}, measured ${measured.toFixed(2)}`);
      }
    }

    expect(mismatches, 'documented contrast figures that no longer match the tokens').toEqual([]);
  });

  it('publishes a figure for every border rung, on base', () => {
    const documented = new Map<string, { alpha: number; ratio: number }>();
    for (const line of designDoc.split('\n')) {
      const match = line.match(/^\s*- `(border[a-z-]*)` ([\d.]+) — \*\*([\d.]+):1\*\* on base/);
      if (match) documented.set(match[1], { alpha: Number(match[2]), ratio: Number(match[3]) });
    }

    const problems: string[] = [];
    for (const rung of borderRungs) {
      const name = rung.property.replace(/^color-/, '');
      const entry = documented.get(name);
      if (!entry) {
        problems.push(`${name} is declared but its contrast on base is not published`);
        continue;
      }
      const token = parseTranslucent(rung.value);
      if (!token) continue;
      if (Math.abs(token.alpha - entry.alpha) > 0.0001) {
        problems.push(`${name}: documented alpha ${entry.alpha}, token declares ${token.alpha}`);
      }
      const base = declaredColour('color-bg');
      const measured = contrastRatio(composite(base, token), base);
      if (Math.abs(measured - entry.ratio) > 0.005) {
        problems.push(`${name}: documented ${entry.ratio}:1 on base, measured ${measured.toFixed(2)}:1`);
      }
    }
    for (const name of documented.keys()) {
      if (!borderRungs.some((rung) => rung.property === `color-${name}`)) {
        problems.push(`the document publishes a contrast figure for ${name}, which is not a declared token`);
      }
    }

    expect(problems, 'border figures that no longer match the tokens').toEqual([]);
  });

  it('publishes the brand mark bar figures by name, each clearing the non-text minimum', () => {
    const bars = [...lineStartingWith('- Brand mark:').matchAll(/([a-z]+) \*\*(\d+\.\d+)\*\*/g)];
    expect(bars.length, 'brand mark bars with a published figure').toBeGreaterThan(0);

    const problems: string[] = [];
    for (const [, name, documented] of bars) {
      const token = documentTokenName(name);
      if (!documentTokens.has(token)) {
        problems.push(`${name} is not a token the token file declares`);
        continue;
      }
      const measured = contrastRatio(declaredColour(`color-${token}`), declaredColour('color-bg'));
      if (Math.abs(measured - Number(documented)) > 0.005) {
        problems.push(`brand mark ${name}: documented ${documented}, measured ${measured.toFixed(2)}`);
      }
      if (measured < NON_TEXT_MINIMUM) {
        problems.push(`brand mark ${name} measures ${measured.toFixed(2)}:1 on base, below ${NON_TEXT_MINIMUM}:1`);
      }
    }

    expect(problems, 'brand mark figures that no longer match the tokens').toEqual([]);
  });
});

describe('the documented token block', () => {
  const tokenSection = docSection('Tokens (source of truth)');

  it('transcribes only values the token file actually declares', () => {
    const transcribed = [...tokenSection.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)];
    expect(transcribed.length, 'properties transcribed into the design document').toBeGreaterThan(0);

    const problems: string[] = [];
    for (const [, property, value] of transcribed) {
      const declared = valuesOf(property);
      if (declared.length === 0) {
        problems.push(`--${property} is transcribed but the token file does not declare it`);
        continue;
      }
      if (!declared.includes(value.trim())) {
        problems.push(`--${property} transcribed as "${value.trim()}", which the token file does not declare`);
      }
    }

    expect(problems, 'the design document describes a token that does not exist').toEqual([]);
  });

  it('documents every token the file declares, so a new one cannot be skipped', () => {
    const undocumented = [...declaredProperties.keys()].filter(
      (property) => !tokenSection.includes(`--${property}:`),
    );
    expect(undocumented, 'tokens missing from the design document').toEqual([]);
  });
});
