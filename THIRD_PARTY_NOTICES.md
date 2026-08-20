# Third-Party Notices & Licenses

This project incorporates open-source libraries, weather data APIs, and visual assets. This document provides attribution and applicable license texts for all third-party components.

---

## 1. Weather Data & Geocoding: Open-Meteo

- **Provider:** Open-Meteo (https://open-meteo.com/)
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0) / Open-Meteo Terms of Service (Free for non-commercial use)
- **Attribution:** Weather forecasts, geocoding, and air quality data are provided by Open-Meteo under the [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) license.
- **Documentation:** https://open-meteo.com/en/docs

---

## 2. Weather Icons: Meteocons by Bas Milius

- **Author:** Bas Milius (https://github.com/basmilius, https://meteocons.com/)
- **Source Repository:** https://github.com/basmilius/meteocons
- **Used Assets:** Weather SVG icons in `static/icons/weather/`
- **License:** MIT License

```text
MIT License

Copyright (c) 2021-present Bas Milius

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 3. Map Rendering: MapLibre GL JS

- **Project:** MapLibre GL JS (https://maplibre.org/)
- **Source Repository:** https://github.com/maplibre/maplibre-gl-js
- **Status:** Dynamically imported on the `/map/` route (kept out of the initial Home screen bundle).
- **License:** BSD 3-Clause License

```text
Copyright (c) 2020, MapLibre contributors
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
```

---

## 4. Radar Precipitation Data: RainViewer

- **Provider:** RainViewer (https://www.rainviewer.com/)
- **Used for:** Past and forecast precipitation radar frames rendered on the `/map/` route (`api.rainviewer.com`, `tilecache.rainviewer.com`).
- **Attribution:** Radar imagery is provided by the RainViewer public API. See https://www.rainviewer.com/api.html for terms and attribution requirements.

---

## 5. Map Basemap Tiles: OpenStreetMap & CARTO

- **Providers:** OpenStreetMap (https://www.openstreetmap.org/), CARTO (https://carto.com/)
- **Used for:** Standard basemap tiles on the `/map/` route.
- **Attribution:** © OpenStreetMap contributors (ODbL), © CARTO. See https://www.openstreetmap.org/copyright.

---

## 6. Frameworks & Build Tools

### Svelte & SvelteKit
- **Source:** https://github.com/sveltejs/svelte, https://github.com/sveltejs/kit
- **License:** MIT License
- **Copyright:** (c) 2016-present Svelte contributors

### Vite
- **Source:** https://github.com/vitejs/vite
- **License:** MIT License
- **Copyright:** (c) 2019-present Yuxi (Evan) You and Vite contributors

### @vite-pwa/sveltekit & Workbox
- **Source:** https://github.com/vite-pwa/sveltekit, https://github.com/GoogleChrome/workbox
- **License:** MIT / Apache-2.0
- **Copyright:** (c) 2022-present Anthony Fu and vite-pwa contributors; Google LLC

---

## 7. Original Artwork & App Icons

- The app icon (`static/icons/app/icon-source.svg` and generated PNGs `icon-180.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`) was created specifically for this project.
- No proprietary Yandex imagery, typography, or assets are included.
