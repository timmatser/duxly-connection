# Jewellery client guide

The Dutch guide is embedded in Duxly Connection for Vintage and 2ehands, using one shared content object. ClickUp source: [8cnw4jt-14735](https://app.clickup.com/9015530073/v/dc/8cnw4jt-26595/8cnw4jt-14735). Delivery ticket: [86cbet1mg](https://app.clickup.com/t/86cbet1mg).

`jewellery-nl-2026-09-07.md` preserves the original complete source. `jewellery-nl.md` is the reviewed revision, dated 21 September. Its changes cover:

- Monnickendam-only Shopify supplier stock/values and the corrected supplier-stock view, retaining frozen legacy fields.
- Repaired supplier links, with missing links still separate from the completed correction cohort.
- Duxly Translate enrollment versus English completeness and `translated:en` in Shopify/CM.
- Vintage-only silver resizing and the confirmed free-resizing threshold.
- Vintage checkout price-option correction; the 2ehands selector remains unverified.

These additions come from the completed work and verification recorded in tickets 1244errmbvm, 1244errmcgd, 86cbfqjm8, 86cbgj24b and 86cbgwkrq. Historical counts and financial snapshots are deliberately not presented as current client totals.

## Updating

1. Refresh the canonical source and relevant delivery evidence; edit `jewellery-nl.md` and keep its revision date accurate.
2. Install `markdown-it-py==4.0.0` in a Python environment and run `python3 scripts/import-client-guide.py` from the repository root. The script emits `frontend/src/content/jewelleryGuideNl.js`; unknown source syntax fails the import. No Markdown parser runs in the browser.
3. From `frontend`, run `node --test tests/documentation.test.mjs` and `npm run build`. The tests check source freshness, both client registrations, every table cell, rendering order, safe links, escaping and legacy rendering.
4. Visually check desktop and narrow embedded widths. The 15 numbered sections, four tables and complete source links must survive. Keep source and app revisions identical and verify both real Shopify admin installations after deployment.

This change needs only the frontend build and S3/CloudFront publication described in `CLAUDE.md`. The root `deploy.sh` provisions infrastructure and is intentionally not used for a documentation-only release. Preserve previous hashed assets for rollback; upload new assets first, then the uncached index, and invalidate `/` and `/index.html`.
