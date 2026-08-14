# Interaction and Visualization Catalog

## Interaction families

| Family | Current kinds |
|---|---|
| Choice | boolean, dropdown, multi-select, ranked choice, radio group, rating |
| Textual | short text, long text, email, URL, phone, file reference |
| Numeric | number, scale, duration, currency, percentage, numeric range, unit value, coordinates |
| Temporal | date, time, date-time, month, week, date range, time range |
| Collection | tags, repeatable group, key/value list |
| Composite | matrix, color |

The machine-readable source is `src/grammar/families.ts`. All 32 current kinds must belong to exactly one family. Ranked choice always begins as the complete declared order and never uses initialization checkboxes.

## Visualization families

| Family | Current kinds |
|---|---|
| Summary | metric, table, gauge |
| Comparison | bar, XY, heatmap, lollipop, dot plot, range bar |
| Composition | donut, stacked bar, treemap, waffle |
| Sequence | timeline, area, calendar heatmap, slope |
| Relation | hierarchy, network |
| Distribution | histogram, box plot |
| Process | waterfall, funnel |
| Target | bullet |

The machine-readable source is `src/visualization/families.ts`. All 24 current kinds must belong to exactly one family, and every rendered visualization retains a semantic table fallback.

## Selected candidate extensions

| Extension fence | Kind | Contract | Accessible fallback |
|---|---|---|---|
| `hcc-computed-field` | computed field | `0.1-candidate.1` | calculation input and derived-value table |
| `hcc-radar-view` | radar | `0.1-candidate.1` | subject-by-dimension table |

Both were selected in the immutable Phase 0.6 response packet. They are render-only, human-review-required candidates and are isolated from the stable interaction and view grammars.

## Replacement future proposals

Future inputs: hierarchy picker, conditional section, schema object, citation picker, ontology term picker, table editor, drawing annotation, collaborative field.

Future views: alluvial, chord, sunburst, streamgraph, choropleth, parallel coordinates, control chart, candlestick.

These proposal catalogs do not overlap the current catalogs or the selected computed-field/radar extensions. The earlier future sets—autocomplete, rich text, geolocation, media capture, signature, computed field, relation picker, secret input; and Gantt, Sankey, streamgraph, choropleth, radar, parallel coordinates, funnel, control chart—remain historical admission evidence rather than active descriptors.

## Native dashboard selectors

The C4 candidate adds seven projection modes: program status, active lanes, pending seals, review queue, programs, threads, and handoffs. They are not visualization kinds or HCC fence grammar. They operate only on the selected note and its explicitly linked one-hop metadata under the [native dashboard contract](native-dashboard.md). The capability is render/read-only and denies vault scan, mutation, network, and publication effects.

## Schema and workflow studio

The C5 `hcc-studio` candidate is a separate proposal grammar, not an admitted interaction or visualization kind. It jointly describes context sources, a record schema, vocabulary bindings, invariants, explicit migrations and loss reports, workflow states, actors, declarative guards, proposal-only effects, recovery rules, HumanGates, transitions, receipts, and dashboard specifications. Its only admitted effects are rendering and copying deterministic normalized YAML. See the [schema/workflow studio contract](schema-workflow-studio.md).

The C6 `hcc-exchange` candidate is another separate proposal grammar. It embeds up to eight manually disclosure-approved source-data records, verifies their content digests, copies a provider-neutral prompt packet, and validates one pasted raw `hcc-studio` YAML candidate in memory. It has no source reader, provider, network, credential, persistence, admission, or execution effect. See the [provider-neutral exchange contract](provider-neutral-exchange.md).
