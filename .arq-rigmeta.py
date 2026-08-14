from pathlib import Path
p=Path('src/game.ts')
s=p.read_text(encoding='utf-8')
old="let basePreview: THREE.Group | null = null;\nlet baseReady = false;"
new="let basePreview: THREE.Group | null = null;\nlet baseReady = false;\nlet baseBones: string[] = [];\nlet baseMeshes: string[] = [];\nlet baseAnimations: string[] = [];"
assert old in s
s=s.replace(old,new,1)
old="    root.traverse(o => {\n      if (o instanceof THREE.Mesh || o instanceof THREE.SkinnedMesh) {\n        o.castShadow = false;\n        o.receiveShadow = true;\n      }\n    });"
new="    baseBones = []; baseMeshes = []; baseAnimations = gltf.animations.map(a => a.name);\n    root.traverse(o => {\n      if (o instanceof THREE.Bone) baseBones.push(o.name);\n      if (o instanceof THREE.Mesh || o instanceof THREE.SkinnedMesh) {\n        baseMeshes.push(o.name);\n        o.castShadow = false;\n        o.receiveShadow = true;\n      }\n    });"
assert old in s
s=s.replace(old,new,1)
old="triangles: renderer.info.render.triangles, baseReady })"
new="triangles: renderer.info.render.triangles, baseReady, baseBones, baseMeshes, baseAnimations })"
assert old in s
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')

spec=Path('tests/base-preview.spec.ts')
t=spec.read_text(encoding='utf-8')
old="  await page.evaluate(() => window.__QS_TEST__.cameraClose());\n  await page.waitForTimeout(1800);"
new="  const meta = await page.evaluate(() => window.__QS_TEST__.state());\n  console.log('QS_RIG_META', JSON.stringify({bones:meta.baseBones, meshes:meta.baseMeshes, animations:meta.baseAnimations}));\n  await page.evaluate(() => window.__QS_TEST__.cameraClose());\n  await page.waitForTimeout(1800);"
assert old in t
t=t.replace(old,new,1)
spec.write_text(t,encoding='utf-8')
print('rig metadata probe wired')
