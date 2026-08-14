# Provider-Neutral Semantic Interoperability

This specification defines eight portable meanings shared by local authoring, rendering, response capture, exchange, and possible future destination adapters. It does not connect a provider or external knowledge system.

## Eight normalized types

1. interaction definition;
2. interaction response;
3. worksheet definition;
4. workbook definition;
5. view definition;
6. response packet;
7. governance projection;
8. exchange packet.

The machine-readable contract is `config/provider-neutral-semantic-interoperability.json`; the synthetic corpus is `tests/fixtures/provider-neutral-semantic-interoperability.json`.

## Eight rules

1. Preserve contract versions and reject unknown major semantics.
2. Preserve stable IDs and response values exactly.
3. Pair source locators with digests.
4. Keep authority, lifecycle, review, and verification distinct.
5. Preserve candidate and projection status during transport.
6. Never infer write capability from validation or rendering.
7. Import creates a review candidate, never a canonical amendment.
8. Unknown mappings fail closed with field-addressed diagnostics.

Run `npm run proof:interoperability` to verify the shape and digests. Passing proves only the local specification and fixtures. A real adapter needs independent destination ownership, privacy, authentication, conflict, rollback, and acceptance gates.
