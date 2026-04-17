# Russell's static site

**This directory (`russells_static_site/`) is the canonical storefront static site for this repo.**  
Do not maintain a parallel static export elsewhere; see the repo root **`WEBSITE.md`** for scope and local preview.

Static export of the storefront, rebuilt with a small Node generator so global copy, navigation, footer, and Shopify script packs live in one place.

## Build

```bash
cd russells_static_site
npm run build
```

This reads [config/site.json](config/site.json), [config/routes.json](config/routes.json), [config/module-preload-packs.json](config/module-preload-packs.json), [config/products.json](config/products.json), [config/herbal-items.json](config/herbal-items.json), and HTML fragments under [src/](src/), then overwrites the published `index.html` files at the site root, under `why-russells/`, `online-vet/`, `ingredient-index/`, `formulas-bundles/`, `products/`, etc.

## Where to edit

| What you want to change | Edit |
| ------------------------ | ---- |
| Nav labels, footer links, emails, shipping banner text, cart strings, SEO defaults, external URLs | [config/site.json](config/site.json) |
| Page titles, which body file, product-only CSS hashes, Hydrogen `modulepreload` pack per page | [config/routes.json](config/routes.json) |
| Shopify route chunk URLs (shared packs) | [config/module-preload-packs.json](config/module-preload-packs.json) |
| Formulas & Bundles listing (slug + title) | [config/products.json](config/products.json) |
| Ingredient Index cards (copy, swatch, icon filename) | [config/herbal-items.json](config/herbal-items.json) |
| Home, Why Russell's, Online Vet, FAQ, product main markup | [src/bodies/](src/bodies/) |
| Site chrome (head shell, cart, menus, banner, header, footer) | [src/partials/](src/partials/) |
| Banner / accent colors (CSS variables) | [assets/tokens.css](assets/tokens.css) |

After changing config or `src/`, run `npm run build` before deploy.

## Maintenance scripts

- `npm run extract-bodies` — re-extract `<main>` inner HTML from the **current** built pages into `src/bodies/` (use after a fresh Hydrogen export if you replace HTML manually). Ingredient Index grid is split into intro + `ingredient-index.grid-close.html`.
- `npm run extract-herbal` — rebuild [config/herbal-items.json](config/herbal-items.json) from `ingredient-index/index.html` (run before changing the ingredient page structure).
- `npm run archive-assets` — move asset files under `assets/` that are not referenced by site HTML/JSON/CSS into `_archive/unreferenced-assets/<timestamp>/` (last run found all current assets referenced).

## Architecture (short)

- **Relative URLs:** [tools/build.mjs](tools/build.mjs) resolves links with a common-prefix algorithm so `href` values stay correct from root, one-level, and two-level routes.
- **Ingredient Index:** Intro + generated card grid from JSON + grid close + shared footer partial.
- **Formulas & Bundles:** Generated list from `products.json` plus the same chrome as other pages. Nav points to `formulas-bundles/index.html` (see `paths.shop` in `site.json`). Product URLs use slugs such as `products/calm-season/` and `products/bundle-starter/`. Other top-level routes include `why-russells/`, `online-vet/`, and `ingredient-index/`.
- **Products:** Optional extra CSS links in `<head>`, Junip SVG partial, hidden iframes tail preserved for Hydrogen.

## Follow-up (manual)

- Point `paths.privacy`, `shipping`, `terms`, `accessibility`, and `findUs` at real static pages when they exist (they still target `index.html` as in the original export).
- If Shopify renames Oxygen chunks, update `module-preload-packs.json` (and per-product CSS filenames in `routes.json` if the export changes).
- Internal links inside `src/bodies/*.html` still use the paths from the last extract; update them if routes change (e.g. more links to `formulas-bundles/`).
- Update `external` social and Shopify URLs in `site.json` when your live handles and store domain are final.
