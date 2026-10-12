#!/usr/bin/env node
// Static SEO verification for the built GTArgento Vite bundle.
// Usage: node scripts/check-seo.mjs --out=dist [--origin=https://...]
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const args = process.argv.slice(2);
const arg = (key, fallback) => args.find(x => x.startsWith('--' + key + '='))?.slice(key.length + 3) ?? fallback;
const out = resolve(arg('out', 'dist'));
const cfg = JSON.parse(readFileSync(resolve('seo/site.json'), 'utf8'));
const base = new URL(arg('origin', cfg.origin)).origin + '/';
const html = readFileSync(join(out, 'index.html'), 'utf8');
const robots = readFileSync(join(out, 'robots.txt'), 'utf8');
const occurrences = (re) => [...html.matchAll(re)].length;
const meta = (name) => html.match(new RegExp('<meta\\b(?=[^>]*(?:name|property)\\s*=\\s*["\\x27]' + name + '["\\x27])[^>]*>', 'i'))?.[0] ?? '';
const tagValue = (tag, attr) => tag.match(new RegExp('\\b' + attr + '\\s*=\\s*(["\\x27])([^"\\x27]*)\\1', 'i'))?.[2] ?? '';
assert.equal(occurrences(/<title\b/gi), 1, 'one title tag required');
assert.equal(occurrences(/<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/gi), 1, 'one meta description required');
assert.equal(occurrences(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/gi), 1, 'one canonical tag required');
assert.equal(occurrences(/<meta\b(?=[^>]*\bname\s*=\s*["']robots["'])[^>]*>/gi), 1, 'one robots meta tag required');
const canonical = html.match(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i)?.[0] ?? '';
assert.equal(tagValue(canonical, 'href'), base, 'canonical must match exact origin');
assert.equal(tagValue(meta('og:url'), 'content'), base, 'og:url canonical mismatch');
assert.equal(tagValue(meta('robots'), 'content'), cfg.indexable ? 'index,follow' : 'noindex,nofollow', 'wrong indexability');
assert.ok(/lang\s*=\s*["']es-AR["']/i.test(html), 'es-AR document lang required');
assert.ok(tagValue(meta('description'), 'content').length > 60, 'meta description too short');
const ogImage = tagValue(meta('og:image'), 'content');
if (ogImage) {
  const u = new URL(ogImage);
  assert.equal(u.origin, new URL(base).origin, 'OG images must be locally hosted');
  assert.ok(existsSync(join(out, decodeURIComponent(u.pathname).replace(/^\//, ''))), 'OG image 404 in dist');
}
if (cfg.indexable) {
  assert.match(robots, /Allow:\s*\/(?:\r?\n|$)/);
  assert.ok(existsSync(join(out, 'sitemap.xml')), 'indexable release requires sitemap');
  const sitemap = readFileSync(join(out, 'sitemap.xml'), 'utf8');
  assert.ok(sitemap.includes(base), 'sitemap must match canonical');
} else {
  assert.match(robots, /Disallow:\s*\/(?:\r?\n|$)/);
  assert.ok(!existsSync(join(out, 'sitemap.xml')), 'noindex build must not include sitemap');
}
console.log('PASS GTArgento SEO static gate:', base, cfg.indexable ? 'INDEXABLE' : 'NOINDEX');
