# Accessibility Statement

The plugin is designed around native labels, fieldsets, buttons, tables, status regions, visible focus, keyboard alternatives for drag ordering, and text/table fallbacks for visualizations. Reduced-motion preferences are respected and color is not intended to carry meaning alone.

Current evidence is developmental, not a conformance claim. `npm run audit:accessibility` applies a reusable semantic audit to eight representative rendered surfaces. It checks duplicate IDs, programmatic control names, button names, informative SVG roles and names, table captions, and disclosure summaries; a malformed negative fixture proves each diagnostic. `npm run audit:contrast` checks a closed power-of-two set of sixteen opaque Ember Circuit token pairs: normal text at 4.5:1 and focus/control boundaries at 3:1. It preserves the inspected source colors while using minimally lifted operational link and border colors. Computed styles, color mixes, screen-reader combinations, forced colors, 200–400% zoom, focus order, full keyboard operation, touch interaction, narrow panes, and current Obsidian hosts still require recorded human testing before public beta.

Known boundaries:

- drag reordering also provides named Move up/Move down buttons;
- visualization SVG is supplementary to a semantic table fallback;
- source and diagnostic disclosures remain available when rendering is withheld;
- future inputs must name an accessible fallback before admission;
- there is no mobile compatibility claim yet.

The audit implementations are `src/accessibility/audit.ts` and `src/accessibility/contrast.ts`. Their receipts explicitly state that structural inspection and bounded token ratios are not WCAG conformance evidence.

Follow the human checks in the [maintainer testing guide](docs/maintainers/testing.md) and record the assistive technology, Obsidian version, operating system, zoom or contrast mode, tested surface, result, and unresolved barrier. Do not infer a pass for an untested combination.
