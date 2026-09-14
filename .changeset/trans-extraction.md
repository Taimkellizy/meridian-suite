---
'@meridian/core': minor
'@meridian/cli': minor
---

Extract mixed text+markup JSX runs as single `<Trans>` translation units (children kept verbatim, interpolations rewritten to object shorthand, bare strong/b/em/i kept as readable tags), abort unsupported expressions cleanly with a per-file summary instead of emitting fragment keys, fix multi-component `useTranslation` injection, merge `Trans` into existing react-i18next imports, and extract `alt`/`aria-label` attributes.
