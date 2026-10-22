# Spending v2.1 — Responsive review

32 captures, 30 checked layout cases, zero detected element/glyph overflow outside the Spending card's inner bounds. Both normal and doubled text are covered at 320/390/430 widths in light/dark themes. The list occupies the full width below the donut/total introduction in every case. Donut diameter stays at or below 104 points.

| Coverage | Representative captures |
| --- | --- |
| Standard phone, five plus Other | [390 dark](normal-390-dark.png), [390 light](normal-390-light.png) |
| One / five categories | [One dark](one-390-dark.png), [One light](one-390-light.png), [Five dark](five-390-dark.png), [Five light](five-390-light.png) |
| Narrow stress data | [320 dark](stress-320-dark.png), [320 light](stress-320-light.png), [320 large dark](stress-320-dark-large.png), [320 large light](stress-320-light-large.png) |
| 390 stress data | [Dark](stress-390-dark.png), [Light](stress-390-light.png), [Large dark](stress-390-dark-large.png), [Large light](stress-390-light-large.png) |
| 430 stress data | [Dark](stress-430-dark.png), [Light](stress-430-light.png), [Large dark](stress-430-dark-large.png), [Large light](stress-430-light-large.png) |
| Expanded individual categories | Every stress capture has a corresponding `-expanded.png`, including [320 large dark](stress-320-dark-large-expanded.png), [390 light](stress-390-light-expanded.png), [430 large light](stress-430-light-large-expanded.png) |
| Phone-height scrolling | [Dark](phone-scrolling-dark.png), [Light](phone-scrolling-light.png) |

[checks.json](checks.json) records exact totals, accessible category amounts, card/list bounds, row counts, intro layout and SVG decoding. Stress data includes long unbroken/spaced names, archived names, No category and very large exact amounts. Compact shows six rows; expansion replaces them with eight individual rows.

Captures render the actual source Spending/Finance components with SQLite-generated analytics and substituted browser/native lifecycle boundaries. Card captures use a tall review viewport; phone-height screenshots use 390×844. Doubled text is a browser simulation with RN fontScale, not native Dynamic Type. No native tabs/status bars are simulated.

The first pass caught a font-measurement mismatch: probes omitted visible amounts' tabular digits. The correction matches those styles and adds rounding allowance. The confirmation checks every visible non-whitespace glyph rather than accepting viewport-only containment or invisible trailing-space rectangles.

See [technical notes and device checklist](../../finance-spending-v21.md).
