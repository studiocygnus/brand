import { describe, expect, test } from "bun:test";
import { dark, light, textPairs, type Theme } from "./tokens.ts";

// WCAG 2 relative luminance and contrast ratio.
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.039_28 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (hi + 0.05) / (lo + 0.05);
};

describe.each([
  ["dark", dark],
  ["light", light],
] as [string, Theme][])("%s theme", (_name, theme) => {
  test.each(textPairs.map(([text, ground]) => [text, ground]))(
    "%s on %s meets WCAG AA",
    (text, ground) => {
      expect(contrast(theme[text], theme[ground])).toBeGreaterThanOrEqual(4.5);
    },
  );
});

test("the brand book's contrast figures still hold", () => {
  expect(contrast("#E88E11", "#0B0E1A")).toBeCloseTo(7.6, 1);
  expect(contrast("#9A5700", "#F3F4F7")).toBeCloseTo(5.1, 1);
});
