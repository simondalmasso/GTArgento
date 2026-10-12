# GTArgento · SEO/Discoverability sin inflar el juego (2026-10-12)

**Estado:** arquitectura y scripts de generación SEO; **no implica deploy ni indexación activa**. SEO no mejora FPS ni resuelve un juego roto. La prioridad es que GTArgento sea jugable, que Moria sea reconocible y que Buenos Aires luzca auténtica.

## 1. Política de indexación, derechos y dominios

El repositorio GitHub informa como homepage actual `https://gtargento.simondalmasso44.workers.dev/`, pero esta auditoría no pudo confirmar que la nueva URL realmente sirva un release jugable. El Worker viejo es `https://quienes-son.simondalmasso44.workers.dev/`. **No declarar el nuevo dominio canónico hasta que ARQ confirme HTTP/browser + control del Worker + source parity.** Si ambos quedan accesibles, definir **UNA** URL canónica por aceptación explícita del propietario; la otra redirige 301/308, o recibe `noindex,follow` si el redirect no está autorizado. No duplicar contenido indexable.

Dado que se representan personas vivas, y los derechos de imagen, promocionales, musicales y posibles alusiones a la vida privada siguen sin autorización documentada, **default `indexable=false`**. La metadata de redes/social puede existir, pero NO publicar `index,follow`, sitemap indexable ni solicitar Search Console hasta gate de derechos + aceptación funcional/visual. `robots.txt` no es sustituto de autenticación: contenido público sigue siendo accesible.

## 2. Micro sistema versionable (cero frameworks)

- `seo/site.json`: configuración única con título, descripción, origen, idioma y booleano `indexable`.
- `scripts/generate-seo.mjs`: luego de `vite build`, inserta/actualiza metatags en `dist/index.html`, escribe `dist/robots.txt`, y solo cuando se habilite indexación publica sitemap simple en `dist/sitemap.xml`.
- `scripts/check-seo.mjs`: aserciones estáticas contra el `dist` real. Agregarlas al workflow luego de build.
- API operativa: `node scripts/generate-seo.mjs --out=dist` seguido de `node scripts/check-seo.mjs --out=dist`. Cualquier cambio de raíz/canonical se pasa por `--origin=https://.../` y debe coincidir con producción verificada.

**Meta tags mínimos:** title único, descripción en castellano argentino, `lang=es-AR`, canonical HTTPS, `viewport-fit=cover` y viewport responsive, `og:type=website`, `og:title`, `og:description`, `og:url`, `twitter:card=summary`, `robots=noindex,nofollow` mientras esté en construcción. Agregar OG image solo si existe archivo propio en `dist/og/gtargento.webp` con licencia de todos los elementos; **no fabricar referencia a imagen inexistente**. No insertar schema.org Game con personas, reseñas, rating o estrellas inventadas.

## 3. Performance SEO + accesibilidad real

- Hero contenido descriptivo/indexable debe estar en HTML semántico, no solo texto pintado por WebGL. Título, instrucciones, enlace a aviso legal y controles visibles sin que WebGL compile; accesibilidad por teclado y screen readers.
- CSS `safe-area-inset`, `100dvh`, sin bloqueo vertical. La orientación no debe alterar canonical ni recargar la página.
- Optimizar WebP, GLB, texturas y primeros bytes; evitar bundle JS no utilizado; almacenar caché de activos hasheados y **evitar caché agresiva del HTML**. Nunca dejar falsos 200 de SPA para robots/sitemap, verificar `Content-Type`.
- Medir carga inicial, viewport real, interacción "JUGAR" y frame time en Chrome Android/iOS Safari; no basar SEO solo en Lighthouse/Puppeteer emulado.
- Título en español: **GTArgento | Juego 3D de sátira argentina**.
- Descripción propuesta: **Jugá una aventura 3D original de humor argentino: una Buenos Aires nocturna, cuatro personajes y misiones distintas. Para móvil y PC. Parodia no oficial.**

## 4. Topics GitHub vs palabras de búsqueda

Los 11 topics actuales verificados del repo son `argentina`, `browser-game`, `buenos-aires`, `cloudflare-workers`, `game-development`, `gtargento`, `mobile-game`, `satire`, `threejs`, `typescript`, `webgl`. Son útiles para descubrimiento del **repositorio**, no equivalen a tags SEO del Worker. Evitar duplicación/spam y keywords de GTA que sugieran asociación legal. Descripción y homepage se gestionan por API de GitHub; metatags del juego por build estático.

## 5. Pasos post-READY_FOR_AUD

Cuando exista Worker accesible y source parity:
1. Registrar URL canónica real (actualmente origin configurado pero no validado). Aprobar uso de imagen/publicidad y copy no difamatorio.
2. Definir `indexable=true` **en un cambio revisado**. Construir, generar SEO, chequear, desplegar Cloudflare.
3. Correr inspección HTTP real: status 200 /, robots.txt / sitemap.xml cuando corresponda; canonical una sola vez; title/meta únicos, OG propios; sin error JS/GLB.
4. Solo después solicitar indexación (Search Console o equivalente, si cuenta conectada). No crear herramientas externas no necesarias.

## 6. Definición de DONE del subsistema

[ ] No hay canonical ambiguo ni URL inexistente.
[ ] Meta tags comprobados en el HTML **del Worker**, no solo repo.
[ ] Robots y sitemap reflejan indexable correctamente.
[ ] No hay imágenes OG 404.
[ ] HTML accesible móvil/PC y no bloquea gameplay.
[ ] Estado legal y aprobación owner se registran antes de indexar públicamente.

Scripts SEO NO deben usarse como prueba de que el motor del juego esté implementado.
