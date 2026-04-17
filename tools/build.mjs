import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const site = JSON.parse(fs.readFileSync(path.join(root, 'config', 'site.json'), 'utf8'));
const routes = JSON.parse(fs.readFileSync(path.join(root, 'config', 'routes.json'), 'utf8'));
const packs = JSON.parse(
  fs.readFileSync(path.join(root, 'config', 'module-preload-packs.json'), 'utf8')
);
const products = JSON.parse(fs.readFileSync(path.join(root, 'config', 'products.json'), 'utf8'));
const herbalItems = JSON.parse(
  fs.readFileSync(path.join(root, 'config', 'herbal-items.json'), 'utf8')
);

const junipPartial = fs.readFileSync(
  path.join(root, 'src', 'partials', 'product-junip-symbols.inc.html'),
  'utf8'
);

function readPartial(name) {
  return fs.readFileSync(path.join(root, 'src', 'partials', name), 'utf8');
}

function relHref(outPath, targetRootRel) {
  const fromDir = path.posix.dirname(outPath.replace(/\\/g, '/'));
  const targetDir = path.posix.dirname(targetRootRel);
  const targetFile = path.posix.basename(targetRootRel);
  const fromParts = fromDir === '.' ? [] : fromDir.split('/').filter(Boolean);
  const targetParts = targetDir === '.' ? [] : targetDir.split('/').filter(Boolean);
  let i = 0;
  while (
    i < fromParts.length &&
    i < targetParts.length &&
    fromParts[i] === targetParts[i]
  ) {
    i++;
  }
  const up = fromParts.length - i;
  const down = targetParts.slice(i);
  const prefix = up ? '../'.repeat(up) : '';
  const suffix = [...down, targetFile].join('/');
  return prefix + suffix;
}

function absUrl(u) {
  return /^[a-z][a-z0-9+.-]*:/i.test(String(u || ''));
}

/** Absolute URL for social previews (og:image); requires publicSiteUrl when og is site-relative. */
function absolutePublicUrl(relativeUnderSiteRoot) {
  const base = String(site.publicSiteUrl || '').replace(/\/$/, '');
  const tail = String(relativeUnderSiteRoot || '').replace(/^\/*/, '');
  if (!tail) return '';
  if (!base) return '';
  return `${base}/${tail}`;
}

function resolveOgImageUrl() {
  const og = site.cdn.ogImage;
  if (!og) return '';
  if (absUrl(og)) return String(og);
  return absolutePublicUrl(og);
}

function resolveFaviconHref(assetsPrefix) {
  const fav = site.cdn.favicon;
  if (!fav) return '';
  if (absUrl(fav)) return String(fav);
  return `${assetsPrefix}${String(fav).replace(/^\//, '')}`;
}

/** Absolute URLs (http:, mailto:, etc.) pass through; site-root paths use relHref. */
function navTargetHref(outPath, u) {
  if (u == null || u === '') return '#';
  if (absUrl(u)) return String(u);
  return relHref(outPath, u);
}

function applyTpl(str, ctx) {
  let s = str;
  for (const [k, v] of Object.entries(ctx)) {
    s = s.split(`{{${k}}}`).join(v ?? '');
  }
  return s;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;');
}

function ampInAttrs(url) {
  return String(url).replace(/&/g, '&amp;');
}

function navClass(active, key) {
  return active === key ? ' active' : '';
}

function navAria(active, key) {
  return active === key ? 'aria-current="page" ' : '';
}

function renderHerbalCard(it, prefix) {
  const idx = String(it.index).padStart(2, '0');
  const iconHtml = it.icon
    ? `<img alt="" decoding="async" height="90" loading="lazy" src="${prefix}${escapeAttr(it.icon)}" width="90" style="aspect-ratio:90/90">`
    : '';
  const latin = it.latin != null && String(it.latin).trim();
  const latinHtml = latin
    ? `<p class="text-xs font-styrene tracking-2 font-bold mt-2">${escapeHtml(it.latin)}</p>`
    : '';
  const foundIn = it.foundIn != null && String(it.foundIn).trim();
  const foundInHtml = foundIn
    ? `<p class="font-styrene tracking-5 text-[18px] font-normal mt-1 text-dark-charcoal">Found in: ${escapeHtml(foundIn)}</p>`
    : '';
  const bestFor = it.bestFor != null && String(it.bestFor).trim();
  const bestForHtml = bestFor
    ? `<div class="mt-12 flex-shrink-0"><p class="text-xs font-styrene tracking-2 font-bold mb-1">Best For</p><p class="text-sm min-w-0">${escapeHtml(it.bestFor)}</p></div>`
    : '';
  return `<div class="herbal-card-cell" style="opacity:0.01;transform:translateY(32px)"><div class="herbal-card-surface flex flex-row rounded-[20px] cursor-pointer text-dark-charcoal bg-mist px-[22px] pt-[18px] pb-[27px]"><div class="herbal-card-inner flex flex-col w-full min-w-0 group" style="opacity: 1;"><div class="flex flex-row justify-between flex-shrink-0"><p class="font-styrene tracking-2 text-xs font-bold">[<!-- -->${idx}<!-- -->]</p><div style="background-color:${escapeAttr(it.swatch)}" class="h-[22px] w-[22px] rounded-full flex-shrink-0"></div></div><div class="herbal-card-body flex flex-1 flex-col justify-between min-h-0"><div class="herbal-card-body-main mt-10 md:mt-16">${iconHtml}<p class="font-styrene tracking-5 text-[18px] font-bold mt-2">${escapeHtml(it.name)}</p>${foundInHtml}${latinHtml}<p class="text-sm mt-1">${escapeHtml(it.description)}</p></div>${bestForHtml}</div></div></div></div>`;
}

/** First row: 3 columns; second row: remaining cards centered (expects 5 items). */
function buildHerbalCards(items, prefix) {
  const head = items.slice(0, 3).map((it) => renderHerbalCard(it, prefix)).join('');
  const tail = items.slice(3);
  if (tail.length === 0) return head;
  const tailHtml = tail.map((it) => renderHerbalCard(it, prefix)).join('');
  return `${head}<div class="herbal-cards-grid__row2">${tailHtml}</div>`;
}

function buildFormulasIntro() {
  return `<div class=" pt-[0rem] lg:pt-[47px]"><div class="px-[1.125rem] lg:px-[7rem] gap-[3.125rem] lg:gap-[6.25rem] flex flex-col"><div><div class="flex flex-col lg:flex-row gap-[1.688rem] lg:gap-[4rem] justify-between" style="opacity:1;transform:none"><div class="flex-1 order-1 lg:order-1 w-full min-w-0"><div class="w-full max-w-none"><h1 class="tracking-6 text-black font-styrene font-semibold text-[2rem] lg:text-[2.5rem] leading-[2.125rem] lg:leading-[2.75rem] mb-[1.875rem]">6 formulas. 1 biological system.</h1><p class="font-regular text-[1.25rem] leading-[1.5rem] whitespace-pre-line tracking-2">Six conditions that conventional care treats in isolation: separate prescriptions, separate side effect profiles, and no shared logic connecting them. Russell's was built on a different understanding. Every formula targets one system. Every formula shares the same five functional mushrooms at its core. Use the formula that fits the condition. Or use them together, the way biology actually works.</p></div></div></div></div></div></div>`;
}

function buildCollectionsInner(outPath) {
  const prefix = assetsPrefixFrom(outPath);
  const cards = products
    .map((p) => {
      const href = relHref(outPath, `products/${p.slug}/index.html`);
      const imgFile = p.image || '';
      const imgSrc = imgFile ? `${prefix}${escapeAttr(imgFile)}` : '';
      const price = escapeHtml(p.price || '');
      const tagline = escapeHtml(p.tagline || '');
      const reviews = p.reviews != null ? escapeHtml(String(p.reviews)) : '';
      const rating = p.rating != null ? Number(p.rating) : null;
      const ratingStr =
        rating != null && !Number.isNaN(rating) ? escapeHtml(String(rating)) : '';
      const ariaStars =
        rating != null && reviews
          ? escapeAttr(`${rating} stars, ${p.reviews} reviews`)
          : escapeAttr(`${p.reviews || 0} reviews`);
      const imgBlock = imgSrc
        ? `<div class="bg-mist rounded-2xl overflow-hidden w-full" style="aspect-ratio:1/1.25"><img src="${imgSrc}" alt="" width="400" height="500" loading="lazy" decoding="async" class="w-full h-full object-cover" style="width:100%;aspect-ratio:1/1.25"></div>`
        : `<div class="bg-mist rounded-2xl w-full" style="aspect-ratio:1/1.25"></div>`;
      const ratingRow =
        reviews || ratingStr
          ? `<p class="text-xs font-styrene tracking-2 text-dark-charcoal pt-1 flex flex-wrap items-center gap-1"><span class="text-clay" role="img" aria-label="${ariaStars}">★★★★★</span>${ratingStr ? `<span class="text-rock">${ratingStr}</span>` : ''}${reviews ? `<span class="text-rock">(${reviews})</span>` : ''}</p>`
          : '';
      return `<article class="collection-item min-w-0"><a data-discover="true" href="${href}" class="block text-inherit no-underline">${imgBlock}<div class="mt-4"><p class="font-styrene tracking-2 text-sm font-semibold text-dark-charcoal leading-5">${escapeHtml(p.title)}${price ? ` <span class="font-normal">• ${price}</span>` : ''}</p>${tagline ? `<p class="text-xs font-styrene tracking-2 text-dark-charcoal leading-4 mt-1">${tagline}</p>` : ''}${ratingRow}</div></a></article>`;
    })
    .join('');
  const shopHeading = escapeHtml(site.nav.labels.shop);
  return `<div class="px-4 md:px-[30px] max-w-[1400px] mx-auto py-16 md:py-24">${buildFormulasIntro()}<h1 class="font-styrene font-bold text-[32px] md:text-[40px] tracking-6 mb-10 mt-12 md:mt-16">${shopHeading}</h1><div class="collections-grid">${cards}</div><p class="mt-10 text-sm text-dark-charcoal"><a data-discover="true" class="underline" href="${relHref(outPath, 'index.html')}">Back to home</a></p></div>`;
}

function assetsPrefixFrom(outPath) {
  const href = relHref(outPath, `assets/${site.stylesheets[0]}`);
  const dir = path.posix.dirname(href);
  return dir.endsWith('/') ? dir : `${dir}/`;
}

function buildContext(outPath, route) {
  const p = site.paths;
  const ap = assetsPrefixFrom(outPath);
  const active = route.navActive;

  const ctx = {
    ASSETS_PREFIX: ap,
    TITLE: route.title,
    META_DESCRIPTION: escapeAttr(site.seoDefaults.description),
    KEYWORDS: escapeAttr(site.seoDefaults.keywords),
    OG_TITLE: escapeAttr(site.seoDefaults.ogTitle),
    OG_DESCRIPTION: escapeAttr(site.seoDefaults.description),
    OG_IMAGE: escapeAttr(resolveOgImageUrl()),
    OG_IMAGE_WIDTH: site.seoDefaults.ogImageWidth,
    OG_IMAGE_HEIGHT: site.seoDefaults.ogImageHeight,
    OG_TYPE: site.seoDefaults.ogType,
    FAVICON_URL: escapeAttr(resolveFaviconHref(ap)),
    CSS_A: site.stylesheets[0],
    CSS_B: site.stylesheets[1],
    CSS_C: site.stylesheets[2],
    TOKENS_CSS: site.tokensStylesheet,
    EXTRA_PRODUCT_CSS: route.isProduct
      ? route.productCss
          .map(
            (c) =>
              `<link rel="stylesheet" type="text/css" href="${ap}${c}" />`
          )
          .join('')
      : '',
    PRODUCT_JUNIP: route.isProduct ? junipPartial : '',
    CART_TITLE: escapeHtml(site.cart.title),
    CART_MARQUEE: escapeHtml(site.cart.cartMarquee),
    CART_EMPTY_HEADING: escapeHtml(site.cart.emptyHeading),
    CART_START_SHOPPING: escapeHtml(site.cart.startShopping),
    HREF_HOME: relHref(outPath, p.home),
    HREF_SHOP: relHref(outPath, p.shop),
    HREF_ETHOS: relHref(outPath, p.ethos),
    HREF_HERBAL: relHref(outPath, p.herbalIndex),
    HREF_ONLINE_VET: ampInAttrs(navTargetHref(outPath, p.onlineVet)),
    ATTR_ONLINE_VET: absUrl(p.onlineVet) ? ' target="_blank" rel="noopener noreferrer"' : '',
    HREF_FAQ: relHref(outPath, p.faq),
    HREF_FIND_US: relHref(outPath, p.findUs),
    HREF_PRIVACY: relHref(outPath, p.privacy),
    HREF_SHIPPING: relHref(outPath, p.shipping),
    HREF_TERMS: relHref(outPath, p.terms),
    HREF_ACCESSIBILITY: relHref(outPath, p.accessibility),
    HREF_CART_FOCUS: relHref(outPath, site.productPaths.calmSeason),
    HREF_CART_SLEEP: relHref(outPath, site.productPaths.calmGut),
    HREF_CART_KIT: relHref(outPath, site.productPaths.bundleComplete),
    URL_ACCOUNT: site.external.shopifyAccount,
    URL_INSTAGRAM: site.external.instagram,
    URL_TIKTOK: site.external.tiktok,
    ICON_INSTAGRAM: ampInAttrs(site.external.instagramIcon),
    ICON_TIKTOK: ampInAttrs(site.external.tiktokIcon),
    EMAIL_HELLO: site.emails.hello,
    EMAIL_SUPPORT: escapeAttr(site.emails.support || site.emails.hello),
    BANNER_MARQUEE: escapeHtml(site.shipping.bannerMarquee),
    LOGO_ALT: escapeAttr(site.brand.logoAlt),
    LABEL_HOME: escapeHtml(site.nav.labels.home),
    LABEL_SHOP: escapeHtml(site.nav.labels.shop),
    LABEL_ETHOS: escapeHtml(site.nav.labels.ethos),
    LABEL_HERBAL: escapeHtml(site.nav.labels.herbalIndex),
    LABEL_ONLINE_VET: escapeHtml(site.nav.labels.onlineVet),
    LABEL_ACCOUNT: escapeHtml(site.nav.labels.account),
    LABEL_FIND_US: escapeHtml(site.nav.labels.findUs),
    CLASS_LOGO_ACTIVE: active === 'home' ? ' active' : '',
    ATTR_LOGO_CURRENT: active === 'home' ? 'aria-current="page" ' : '',
    CLASS_ACTIVE_HOME: navClass(active, 'home'),
    CLASS_ACTIVE_SHOP: navClass(active, 'shop'),
    CLASS_ACTIVE_ETHOS: navClass(active, 'ethos'),
    CLASS_ACTIVE_HERBAL: navClass(active, 'herbal'),
    CLASS_ACTIVE_ONLINE_VET: navClass(active, 'onlineVet'),
    CLASS_ACTIVE_FIND: navClass(active, 'findUs'),
    ARIA_CURRENT_HOME: navAria(active, 'home'),
    ARIA_CURRENT_SHOP: navAria(active, 'shop'),
    ARIA_CURRENT_ETHOS: navAria(active, 'ethos'),
    ARIA_CURRENT_HERBAL: navAria(active, 'herbal'),
    ARIA_CURRENT_ONLINE_VET: navAria(active, 'onlineVet'),
    ARIA_CURRENT_FIND: navAria(active, 'findUs'),
    FOOTER_PRIMARY_0: escapeHtml(site.footer.primaryLabels[0]),
    FOOTER_PRIMARY_1: escapeHtml(site.footer.primaryLabels[1]),
    FOOTER_PRIMARY_2: escapeHtml(site.footer.primaryLabels[2]),
    FOOTER_SECONDARY_0: escapeHtml(site.footer.secondaryLabels[0]),
    FOOTER_SECONDARY_1: escapeHtml(site.footer.secondaryLabels[1]),
    FOOTER_SECONDARY_2: escapeHtml(site.footer.secondaryLabels[2]),
    FOOTER_SECONDARY_3: escapeHtml(site.footer.secondaryLabels[3]),
    FOOTER_LEGAL_PRIVACY: escapeHtml(site.footer.legalPrivacy),
    FOOTER_LEGAL_ACCESSIBILITY: escapeHtml(site.footer.legalAccessibility),
    FDA_DISCLAIMER: escapeHtml(site.footer.fdaDisclaimer),
    COPYRIGHT: escapeHtml(site.footer.copyright),
    SITE_NAV_SCRIPT_TAG: `<script defer src="${escapeAttr(relHref(outPath, 'assets/site-nav.js'))}"></script>`,
    PRODUCT_CAROUSEL_SCRIPT_TAG: route.isProduct
      ? `<script defer src="${escapeAttr(relHref(outPath, 'assets/product-carousel.js'))}"></script>`
      : '',
  };

  const preloads = packs[route.scriptPack] || [];
  ctx.MODULE_PRELOADS = preloads
    .map((u) => `<link rel="modulepreload" href="${u}">`)
    .join('');
  ctx.PRODUCT_EXTRA = route.isProduct
    ? '<!--$--><!--/$--><iframe style="display: none;"></iframe><iframe style="display: none;"></iframe>'
    : '';

  return ctx;
}

function getMainInner(outPath, route) {
  if (route.bodyType === 'herbal') {
    const intro = fs.readFileSync(
      path.join(root, 'src', 'bodies', 'ingredient-index.intro.html'),
      'utf8'
    );
    const gridClose = fs.readFileSync(
      path.join(root, 'src', 'bodies', 'ingredient-index.grid-close.html'),
      'utf8'
    );
    const coActives = fs.readFileSync(
      path.join(root, 'src', 'bodies', 'ingredient-index.co-actives.html'),
      'utf8'
    );
    const prefix = assetsPrefixFrom(outPath);
    const cards = buildHerbalCards(herbalItems, prefix);
    return intro + cards + gridClose + coActives;
  }
  if (route.bodyType === 'collections') {
    return buildCollectionsInner(outPath);
  }
  const bf = path.join(root, 'src', 'bodies', route.bodyFile);
  return fs.readFileSync(bf, 'utf8');
}

for (const route of routes) {
  const ctx = buildContext(route.outPath, route);
  const head = applyTpl(readPartial('head.html'), ctx);
  const cart = applyTpl(readPartial('cart-aside.html'), ctx);
  const menu = applyTpl(readPartial('menu-aside.html'), ctx);
  const banner = applyTpl(readPartial('banner.html'), ctx);
  const header = applyTpl(readPartial('header.html'), ctx);
  const footer = applyTpl(readPartial('footer.html'), ctx);
  const scripts = applyTpl(readPartial('scripts.html'), ctx);

  const mainInner = getMainInner(route.outPath, route);
  const html =
    head +
    cart +
    menu +
    banner +
    header +
    '<main class="pt-[100px] md:pt-[144px]">' +
    mainInner +
    footer +
    '</main>' +
    scripts +
    '</body></html>';

  const dest = path.join(root, route.outPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  console.log('Built', route.outPath);
}

console.log('Build complete.');
