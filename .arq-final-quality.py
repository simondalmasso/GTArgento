from pathlib import Path
p=Path('src/game.ts')
s=p.read_text()
old="if (fpsAvg < 50 && resolutionScale > 0.32) { resolutionScale = Math.max(0.32, resolutionScale - 0.06); updateRendererSize(); }\n  else if (fpsAvg > 59 && fpsP5 > 47 && resolutionScale < 0.92) { resolutionScale = Math.min(0.92, resolutionScale + 0.04); updateRendererSize(); }"
new="if (fpsAvg < 50 && resolutionScale > 0.32) { resolutionScale = Math.max(0.32, resolutionScale - 0.06); refreshViewport(); }\n  else if (fpsAvg > 59 && fpsP5 > 47 && resolutionScale < 0.92) { resolutionScale = Math.min(0.92, resolutionScale + 0.04); refreshViewport(); }"
if old not in s: raise SystemExit('ORDER-001A quality resize block not found')
p.write_text(s.replace(old,new,1))
print('ORDER-001A quality resize fixed')
