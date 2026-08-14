from pathlib import Path

p = Path('src/game.ts')
s = p.read_text(encoding='utf-8')

replacements = [
    ("renderer.shadowMap.enabled = true;", "renderer.shadowMap.enabled = !isCoarse;"),
    ("key.castShadow = true;", "key.castShadow = !isCoarse;"),
    ("for (let i = 0; i < 12; i++) {\n    const a = (i / 12) * Math.PI * 2;", "for (let i = 0; i < 6; i++) {\n    const a = (i / 6) * Math.PI * 2;"),
    ("for (let i = 0; i < 12; i++) {\n    const a = -1.42 + (i / 11) * 2.84;", "for (let i = 0; i < 6; i++) {\n    const a = -1.42 + (i / 5) * 2.84;"),
    ("  createNPC('paparazzi', -10, 34), createNPC('paparazzi', 9, 29), createNPC('paparazzi', -2, 7), createNPC('paparazzi', 31, -25),\n  createNPC('fan', -28, 10), createNPC('fan', 8, -22),\n  createNPC('neutral', -46, 3), createNPC('neutral', 15, 10), createNPC('neutral', -4, -34),", "  createNPC('paparazzi', -10, 34), createNPC('paparazzi', -2, 7), createNPC('paparazzi', 31, -25),\n  createNPC('fan', -28, 10), createNPC('fan', 8, -22),\n  createNPC('neutral', 15, 10),"),
]

for old, new in replacements:
    count = s.count(old)
    if count != 1:
        raise SystemExit(f'expected exactly one match, found {count}: {old[:70]!r}')
    s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
print('ARQ optimization patch applied')
