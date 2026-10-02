# BiorefMind — theme and rebrand of the BioGrena platform (2026-10-01)

**Ask (owner):** recreate the BioGrena platform in `D:\Biorefmind` as another version named BiorefMind, using the theme in `theme.png`.

## Decisions
- **Same product, new brand and look.** Code imported from BioGrena `blank-skeleton` @ `355cf0d` (backend, auth, Arabic, landing structure, dashboard shell). The copy keeps BioGrena's marketplace story; the brand is renamed.
- **Own backend.** New Convex project `biorefmind-platform` so the two versions never share data.
- **Fresh git history.** `main` holds the untouched import; all BiorefMind changes are on top, so the diff shows exactly what changed.
- **Theme from `theme.png`:** ice-blue page, navy ink, glowing navy pill buttons (arrow first), frosted cards, bold Figtree headlines; accents from the emblem (teal, leaf green, gold, cyan glow).
- **Hero** mirrors the theme: badge pill, large left headline, body, navy + outlined buttons, an icon row with a trust line; the robotic hand (`herohandandlogo.png`) bleeds off the right edge, its edges faded into a blue halo of the photo's own tones.
- **No moss photos.** BioGrena's moss imagery doesn't fit; replaced by code-built visuals: a marketplace hub (rings, the hand photo in a circle, residues in / products out), three step previews (listing form, score dial, certificate) and a dashboard preview. Example figures are labelled as examples.
- **Left out:** the theme's social icons (no accounts to link) and its "1000+ Patients" avatars (no real figure; replaced by role icons and "Farmers, factories & labs on one platform").
