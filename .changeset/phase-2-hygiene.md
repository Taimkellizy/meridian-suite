---
'@meridian/cli': patch
'@meridian/core': patch
---

Repo hygiene: remove dead code (`packages/core/scratch.js`, `packages/core/testTranslator.js`, unused `hashKey.js`), drop the non-functional `@meridian/translator` and deprecated `chalk-animation` dependencies, hide the stub ESLint/Stylelint install prompt, and stop `sync` from calling `process.exit()` inside reusable modules (results are returned and mapped to the CLI exit code). Sync state now stores per-file content hashes instead of mtimes, and locale files are written once per locale instead of once per extracted string.
