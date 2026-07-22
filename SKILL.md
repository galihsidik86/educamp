---
name: tazkia-design
description: Use this skill to generate well-branded interfaces and assets for STMIK Tazkia's SIAKAD (academic information system), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files (tokens, components, ui_kits, guidelines, assets).

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view — link `styles.css`, use the `tz-*` component classes and DS tokens, and load icons from Lucide. If working on production code, copy assets and read the rules here to become an expert in designing with the Tazkia brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Key facts:
- Brand: deep Tazkia navy (`--brand` #1D3180) + oranye accent (`--accent` #F47B20) + growth green. Cool slate neutrals.
- Type: Plus Jakarta Sans (UI/body), Spectral (serif display), JetBrains Mono (data/NIM/IPK).
- Language: Bahasa Indonesia, formal-but-warm; Islamic greetings welcome; no emoji in chrome.
- Icons: Lucide. Motif: subtle Islamic geometric pattern + navy gradients with orange glow.
- Components: `window.TazkiaSIAKADDesignSystem_e8738f` (Button, Input, StatCard, Alert, …). UI kit: `ui_kits/siakad/`.
