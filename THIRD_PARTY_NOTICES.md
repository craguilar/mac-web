# Third-party font notices

The font licenses below apply to the font assets, not to the site's original code or copy. CSS aliases and asset filenames are application labels, not the original font family names.

## Open Sans

- Asset: `public/assets/fonts/open-sans.woff` (CSS alias: Studio).
- Original: Open Sans Regular, version 1.10.
- Copyright: Digitized data copyright (c) 2010-2011, Google Corporation.
- License: Apache License, Version 2.0. See `licenses/Apache-2.0.txt` and retained `licenses/Open-Sans-package-copyright.txt`.
- Modifications: the distributed WOFF is a subset and format conversion of the original font; 195 encoded characters are retained. This modified file is not the original upstream TTF.
- Provenance: font metadata and every encoded glyph's decomposed outline and advance width match OpenSans-Regular.ttf distributed by the fonts-open-sans system package. Original upstream is identified by that package as https://www.opensans.com/.
- WOFF SHA-256: `45df0c5c59a1c16d6ff95c84769aab509dfb34de9d483650d3fc89faef05e4d8`.
- Original TTF SHA-256: `e64e508b2aa2880f907e470c4550980ec4c0694d103a43f36150ac3f93189bee`.

## Nimbus Sans and Nimbus Mono PS

- Assets: `public/assets/fonts/nimbus-sans.woff` (CSS alias: Grotesk) and `public/assets/fonts/nimbus-mono.woff` (CSS alias: Mono).
- Originals: Nimbus Sans Regular and Nimbus Mono PS Regular, version 1.00.
- Copyright (c) 2014,2015 by (URW)++ Design & Development.
- License selected for these files: SIL Open Font License, Version 1.1. See the complete unchanged `licenses/LICENSE.OFL`. No Reserved Font Names are declared.
- Modifications: each distributed WOFF is a subset and format conversion of its original OTF, retaining 197 encoded characters. These modified files are not the original upstream OTFs.
- Provenance: the original OTF SHA-256 values exactly match the URW-authorized alternative-license distribution at https://github.com/twardoch/urw-core35-fonts. See its retained `licenses/URW-license-options.md`, `licenses/URW-provenance.md`, and `licenses/URW-fonts.sha256`. Every encoded glyph's outline and advance width in the WOFF assets match the corresponding original font.
- Nimbus Sans WOFF SHA-256: `3eb26779af55b2612335ab057f01ad263ebb011e92068f3b860097548365a825`.
- NimbusSans-Regular.otf SHA-256: `7c25be4d78155523080ab85b10277150657ff7dabbcad7037bdd536c9b6d0d08`.
- Nimbus Mono PS WOFF SHA-256: `a4e0a5882fae884fae6f946c94e1e2ce3b4e7ba8d741fbc42d69c7ac8ea8d2b6`.
- NimbusMonoPS-Regular.otf SHA-256: `4f225ca8e13acb16f733ce741693105e527d5f7a5443901b9ecc190fca4e149b`.

The upstream distribution offers a choice of licenses. This project elects OFL-1.1 for the Nimbus fonts; its retention of provenance and license-choice documentation does not elect AGPL for the website. Neither font copyright holders nor authors endorse this website.

Audit performed November 15, 2026. Glyph comparisons verify outlines and advance widths, not byte identity between subset WOFFs and full source fonts. SHA-256 mappings refer to the exact files audited; update this notice if font assets change.
