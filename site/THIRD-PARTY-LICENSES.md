# Third-party licenses – Dirwise website

Software and assets from other projects that the website (`site/`) ships to the browser. Build-only tools (Astro, sharp, subset-font …) are not listed – they don't end up in the published pages.

| Component | Version | Used for | License |
|---|---|---|---|
| [GSAP](https://gsap.com) (gsap, ScrollTrigger, SplitText) | 3.15.0 | Animations (`src/scripts/motion.ts`) | GSAP Standard “No Charge” License |
| [Lenis](https://github.com/darkroomengineering/lenis) | 1.3.27 | Smooth scrolling (`src/scripts/motion.ts`) | MIT |
| [Inter](https://github.com/rsms/inter) via [@fontsource-variable/inter](https://fontsource.org/fonts/inter) | 5.2.8 | Web font | SIL Open Font License 1.1 |
| [Lucide](https://lucide.dev) | 1.28.0 | Icons (inlined as SVG at build time) | ISC (some icons MIT, from Feather) |

The license headers of GSAP and Lenis are also kept in the bundled JavaScript (`/*! … */` comments, see `astro.config.mjs`).

## GSAP

Copyright 2008-2026, GreenSock. All rights reserved.

Licensed under the GSAP Standard “No Charge” License: <https://gsap.com/standard-license>.
Since GSAP 3.13 (2025, with Webflow’s support) the entire library is free, including all former bonus plugins such as SplitText, and including commercial use (“GSAP is now 100% FREE including ALL of the bonus plugins … even for commercial use”, GSAP README). It is not an open-source license: without written consent the terms don’t allow putting GSAP into no-code tools for building visual animations that compete with Webflow’s visual animation builder, or reverse engineering it to build competing products (license text mirrored at <https://scancode-licensedb.aboutcode.org/gsap-standard-no-charge-2025.html>). The Dirwise website does neither.

## Lenis

The MIT License

Copyright (c) 2024 darkroom.engineering

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Inter

Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter).
Licensed under the SIL Open Font License, Version 1.1: <https://openfontlicense.org>. The full text is in `node_modules/@fontsource-variable/inter/LICENSE`.

## Lucide

ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

Icons derived from the Feather project: The MIT License (MIT), Copyright (c) 2013-present Cole Bemis – full text in `node_modules/lucide/LICENSE`.
