#!/usr/bin/env node
// GTArgento: post-Vite HTML metadata/robots/sitemap generator. Node 20+, no dependencies.
// Usage: node scripts/generate-seo.mjs --out=dist [--origin=https://...]
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { resolve, join } from 'node:path';

const args = process.argv.slice(2);
const getArg = (key, fallback) => args.find(a => a.startsWith('--' + key + '='))?.slice(key.length + 3) ?? fallback;
const out = resolve(getArg('out', 'dist'));
const config = JSON.parse(readFileSync(resolve('seo/site.json'), 'utf8'));
const originArg = getArg('origin', config.origin);
const origin = new URL(originArg);
if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash) {
  throw new Error('SEO origin must be a clean HTTPS URL');
}
if (!config.title || !config.description || !config.locale || typeof config.indexable !== 'boolean') {
  throw new Error('SEO config missing title, description, locale or boolean indexable');
}
const base = origin.origin + '/';
const escaped = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const docPath = join(out, 'index.html');
if (!existsSync(docPath)) throw new Error('SEO target missing: ' + docPath + ' (run Vite build first)');
let doc = readFileSync(docPath, 'utf8');
if (!/<head(?:\s[^>]*)?>/i.test(doc) || !/<\/head>/i.test(doc)) throw new Error('No HTML head in build');
const imageRel = config.ogImage?.startsWith('/') ? config.ogImage : null;
const imagePath = imageRel ? join(out, imageRel.slice(1)) : null;
const imageUrl = imagePath && existsSync(imagePath) ? new URL(imageRel, base).toString() : null;
const markerBegin = '<!-- GTARGENTO_SEO_BEGIN -->';
const markerEnd = '<!-- GTARGENTO_SEO_END -->';
// Idempotent: remove generated block and existing overlapping standalone tags.
doc = doc.replace(/<!-- GTARGENTO_SEO_BEGIN -->[\s\S]*?<!-- GTARGENTO_SEO_END -->/g, '');
doc = doc.replace(/<title\b[^>]*>[\s\S]*?<\/title\s*>/gi, '');
doc = doc.replace(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/gi, '');
doc = doc.replace(/<meta\b(?=[^>]*\b(?:name|property)\s*=\s*["'](?:description|robots|og:type|og:title|og:description|og:url|og:image|twitter:card|twitter:title|twitter:description|twitter:image)["'])[^>]*>/gi, '');
const robots = config.indexable ? 'index,follow' : 'noindex,nofollow';
const lines = [
  markerBegin,
  '<title>' + escaped(config.title) + '</title>',
  '<meta name="description" content="' + escaped(config.description) + '">',
  '<meta name="robots" content="' + robots + '">',
  '<link rel="canonical" href="' + escaped(base) + '">',
  '<meta property="og:type" content="website">',
  '<meta property="og:title" content="' + escaped(config.title) + '">',
  '<meta property="og:description" content="' + escaped(config.description) + '">',
  '<meta property="og:url" content="' + escaped(base) + '">',
  '<meta name="twitter:card" content="' + (imageUrl ? 'summary_large_image' : 'summary') + '">',
  '<meta name="twitter:title" content="' + escaped(config.title) + '">',
  '<meta name="twitter:description" content="' + escaped(config.description) + '">'
];
if (imageUrl) {
  lines.push('<meta property="og:image" content="' + escaped(imageUrl) + '">');
  lines.push('<meta name="twitter:image" content="' + escaped(imageUrl) + '">');
} else if (imageRel) console.warn('SEO: OG image missing; omitted tag: ' + imagePath);
lines.push(markerEnd);
doc = doc.replace(/<\/head>/i, '  ' + lines.join('\n  ') + '\n</head>');
doc = doc.replace(/<html\b([^>]*)>/i, (_, attrs) => {
  const updated = /\blang\s*=/.test(attrs) ? attrs.replace(/\blang\s*=\s*(["']).*?\1/i, 'lang="' + escaped(config.locale) + '"') : attrs + ' lang="' + escaped(config.locale) + '"';
  return '<html' + updated + '>';
});
if (!/<meta\b(?=[^>]*name=["']viewport["'])[^>]*>/i.test(doc)) {
  doc = doc.replace(/<\/head>/i, '  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>');
}
writeFileSync(docPath, doc);
const robotsTxt = config.indexable
  ? 'User-agent: *\nAllow: /\nSitemap: ' + base + 'sitemap.xml\n'
  : 'User-agent: *\nDisallow: /\n';
writeFileSync(join(out, 'robots.txt'), robotsTxt);
const sitemapPath = join(out, 'sitemap.xml');
if (config.indexable) {
  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + escaped(base) + '</loc></url></urlset>\n';
  writeFileSync(sitemapPath, xml);
} else if (existsSync(sitemapPath)) unlinkSync(sitemapPath);
console.log('SEO generated:', base, robots, 'ogImage=' + Boolean(imageUrl), 'out=' + out);
