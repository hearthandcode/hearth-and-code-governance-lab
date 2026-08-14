# Runtime Readiness Diagnostic

Status: candidate host-observation surface. It supplies compatibility evidence but does not verify or release the plugin.

## Run it

For the shortest release-review route, run **Hearth and Code Governance Lab: Run and copy combined host assurance packet**. It opens one selectable JSON packet containing the runtime receipt and four-target compatibility matrix, both bound to the same observation timestamp, and retains the compatibility clipboard copy. The viewer includes a compact **Copy report** control and keeps the entire packet available when clipboard access fails. The older individual commands remain available for focused diagnosis.

In Obsidian, open the command palette and run **Hearth and Code Governance Lab: Run and copy runtime readiness report**. The command opens a selectable JSON receipt and also copies it, containing exactly eight observations:

1. the current Obsidian API satisfies `minAppVersion`;
2. desktop/mobile UI mode resolves coherently;
3. desktop/mobile application host resolves coherently;
4. Web Crypto SHA-256 is available;
5. UTF-8 `TextEncoder` is available;
6. the explicit clipboard surface is available;
7. exact-path Vault lookup and cached-read APIs are available;
8. create-only Vault APIs are available and the writer host profile resolves as either the prototype disposable vault or the public identity's current named local vault.

The receipt discloses plugin version, minimum application version, Obsidian API version, coarse platform, and pass/fail observations. It deliberately does not disclose the vault name, note paths, note content, file inventory, theme, operating-system version, account state, or device identity.

## Interpretation

An `8/8` receipt establishes only that required runtime primitives are present. It does not exercise a write, render a widget, test touch input, inspect assistive-technology output, benchmark the device, or establish that every Obsidian version is supported. Preserve it as bounded evidence alongside the applicable manual compatibility review.

The command performs no vault read, search, mutation, network request, canonical-system operation, Git action, release, submission, or publication. Rendering the local report and explicitly copying its receipt are its only effects.

## Release evidence

Before a public compatibility claim, collect the receipt separately on the declared minimum and current Obsidian versions and on each claimed platform. Pair it with the manual worksheet route for Reading View, Live Preview, interaction, accessibility, theme, reload, and writer behavior. A receipt from one host cannot be generalized to another host.

The adjacent **Run and copy compatibility matrix** command turns exactly one runtime receipt into four explicitly bounded targets without inferring unobserved support. See [Compatibility Matrix](compatibility-matrix.md).

The combined packet does not add or merge observations. Run it separately on every platform and Obsidian version under review. Its only effects are rendering the local selectable report and explicit clipboard copies; it never reads note content or vault identity.
