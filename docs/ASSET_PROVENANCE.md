# Asset provenance — ORDER-003 staging

The runtime ships no external raster images, portrait photos, music, sound files, or web fonts. The city textures, billboard, hair strands, feathers and sequins are generated in source by `src/game/textures.ts`; sound effects and ambience are synthesized by `src/game/audio.ts`. Typography uses local system-font fallbacks.

The recovered sandbox contained portrait-like images and a theater texture with recognizable people. Those files were deliberately excluded; the character head uses volumetric geometry with a procedural skin texture, and the HUD uses initials instead of a photo.

This is a source-level provenance statement, not a likeness-rights clearance. Moria's procedural model has **not** passed the visual likeness gate. Supporting avatars are stylized prototypes and have **not** passed the final character-art gate. No production or promotional release is approved by this document.
