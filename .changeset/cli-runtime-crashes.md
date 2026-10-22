---
'@meridian/cli': patch
---

Fix ESM `__dirname` crash on the Pages Router `_document` fallback path (template resolution moved to a tested pure helper), guard `.meridianrc.json` reads with a friendly error instead of a raw SyntaxError crash, and stop appending a duplicate `MERIDIAN_API_KEY` to `.env` when one is already set.
