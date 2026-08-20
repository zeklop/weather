import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

// Dual-theme split comparison image (Left: Light mode, Right: Dark mode)
// Dimensions: 1500 x 980
const W = 1500;
const H = 980;
const halfW = W / 2;

const weatherCols = [
  'Ясно',
  'Переменная',
  'Пасмурно',
  'Дождь',
  'Гроза',
  'Снег'
];

const styles = [
  {
    id: 'current',
    name: '0. Текущие (Meteocons Fill)',
    sub: 'Пастельный Fill, блеклый на белом',
    lightScore: '❌ Теряется на белом',
    darkScore: '✓ Хорошо на черном'
  },
  {
    id: 'tweaked',
    name: '1. Meteocons Tweaked',
    sub: 'Тот же пак + контраст + серо-голубой подтон',
    lightScore: '✓ Четкий на белом',
    darkScore: '✓ Отлично на черном'
  },
  {
    id: 'filled_line',
    name: '2. Meteocons Line / Outline',
    sub: 'Четкий контур 2.5px + цветная заливка',
    lightScore: '✓ 100% контраст',
    darkScore: '✓ Адаптивный контур'
  },
  {
    id: 'rich_apple',
    name: '3. Apple / Rich Flat',
    sub: 'Сочный псевдо-3D, тени, насыщенные капли',
    lightScore: '✓ Премиум на белом',
    darkScore: '✓ Очень ярко на черном'
  },
  {
    id: 'duotone',
    name: '4. Phosphor / Solar Duotone',
    sub: 'Полупрозрачные подложки + контур в цвет',
    lightScore: '✓ Строгий UI',
    darkScore: '✓ Строгий UI'
  }
];

function renderIcon(styleId, colIdx, isDark = false, size = 52) {
  const s = size / 128;
  
  if (styleId === 'current') {
    switch (colIdx) {
      case 0: // clear-day
        return `
          <g transform="scale(${s})">
            <circle cx="64" cy="64" r="20" fill="url(#cur_sun)" stroke="#F8AF18" stroke-width="1.5"/>
            ${[0,45,90,135,180,225,270,315].map(deg => `
              <line x1="64" y1="36" x2="64" y2="24" stroke="#F8AF18" stroke-width="3.5" stroke-linecap="round" transform="rotate(${deg} 64 64)"/>
            `).join('')}
          </g>
        `;
      case 1: // partly-cloudy-day
        return `
          <g transform="scale(${s})">
            <g transform="translate(-14, -14)">
              <circle cx="56" cy="56" r="16" fill="url(#cur_sun)" stroke="#F8AF18" stroke-width="1.5"/>
              ${[0,45,90,135,180,225,270,315].map(deg => `
                <line x1="56" y1="34" x2="56" y2="24" stroke="#F8AF18" stroke-width="3" stroke-linecap="round" transform="rotate(${deg} 56 56)"/>
              `).join('')}
            </g>
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="url(#cur_cloud)" stroke="#E6EFFC" stroke-width="1.5" stroke-miterlimit="10"/>
          </g>
        `;
      case 2: // cloudy
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="url(#cur_cloud)" stroke="#E6EFFC" stroke-width="1.5" stroke-miterlimit="10"/>
          </g>
        `;
      case 3: // rain
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="url(#cur_cloud)" stroke="#E6EFFC" stroke-width="1.5"/>
            <path d="M48 94V104M64 94V104M80 94V104" stroke="#0A5AD4" stroke-width="3.5" stroke-linecap="round"/>
          </g>
        `;
      case 4: // thunder
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="url(#cur_cloud)" stroke="#E6EFFC" stroke-width="1.5"/>
            <path d="M68 76L61 88H70L55 106L58 93H51L58 76H68Z" fill="url(#cur_sun)" stroke="#F6A823" stroke-width="1.5"/>
          </g>
        `;
      case 5: // snow
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="url(#cur_cloud)" stroke="#E6EFFC" stroke-width="1.5"/>
            <g stroke="#5B9BF6" stroke-width="2" stroke-linecap="round">
              <path d="M48 94v8M44 98h8M45 95l6 6M45 101l6-6"/>
              <path d="M64 94v8M60 98h8M61 95l6 6M61 101l6-6"/>
              <path d="M80 94v8M76 98h8M77 95l6 6M77 101l6-6"/>
            </g>
          </g>
        `;
    }
  } else if (styleId === 'tweaked') {
    const cloudFill = isDark ? 'url(#twk_cloud_on_dark)' : 'url(#twk_cloud)';
    const cloudDarkFill = isDark ? 'url(#twk_cloud_dark_on_dark)' : 'url(#twk_cloud_dark)';
    const cloudStroke = isDark ? '#94A3B8' : '#94A3B8';
    
    switch (colIdx) {
      case 0:
        return `
          <g transform="scale(${s})">
            <circle cx="64" cy="64" r="22" fill="url(#twk_sun)" stroke="#EA580C" stroke-width="1.5"/>
            ${[0,45,90,135,180,225,270,315].map(deg => `
              <line x1="64" y1="34" x2="64" y2="20" stroke="#F59E0B" stroke-width="4.5" stroke-linecap="round" transform="rotate(${deg} 64 64)"/>
            `).join('')}
          </g>
        `;
      case 1:
        return `
          <g transform="scale(${s})">
            <g transform="translate(-14, -14)">
              <circle cx="56" cy="56" r="17" fill="url(#twk_sun)" stroke="#EA580C" stroke-width="1.5"/>
              ${[0,45,90,135,180,225,270,315].map(deg => `
                <line x1="56" y1="32" x2="56" y2="20" stroke="#F59E0B" stroke-width="3.5" stroke-linecap="round" transform="rotate(${deg} 56 56)"/>
              `).join('')}
            </g>
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="${cloudFill}" stroke="${cloudStroke}" stroke-width="2" filter="url(#drop_shadow)"/>
          </g>
        `;
      case 2:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="${cloudFill}" stroke="${cloudStroke}" stroke-width="2" filter="url(#drop_shadow)"/>
          </g>
        `;
      case 3:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="${cloudDarkFill}" stroke="#64748B" stroke-width="2" filter="url(#drop_shadow)"/>
            <path d="M48 94V106M64 94V106M80 94V106" stroke="#3B82F6" stroke-width="4.5" stroke-linecap="round"/>
          </g>
        `;
      case 4:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="${cloudDarkFill}" stroke="#64748B" stroke-width="2" filter="url(#drop_shadow)"/>
            <path d="M70 74L61 88H72L53 110L57 93H49L58 74H70Z" fill="url(#twk_sun)" stroke="#D97706" stroke-width="1.5"/>
          </g>
        `;
      case 5:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="${cloudFill}" stroke="${cloudStroke}" stroke-width="2" filter="url(#drop_shadow)"/>
            <g stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round">
              <path d="M48 94v8M44 98h8M45 95l6 6M45 101l6-6"/>
              <path d="M64 94v8M60 98h8M61 95l6 6M61 101l6-6"/>
              <path d="M80 94v8M76 98h8M77 95l6 6M77 101l6-6"/>
            </g>
          </g>
        `;
    }
  } else if (styleId === 'filled_line') {
    const strokeColor = isDark ? '#E2E8F0' : '#1E293B';
    const cloudFill1 = isDark ? '#334155' : '#F1F5F9';
    const cloudFill2 = isDark ? '#475569' : '#CBD5E1';
    
    switch (colIdx) {
      case 0:
        return `
          <g transform="scale(${s})">
            <circle cx="64" cy="64" r="22" fill="#FDE047" stroke="${strokeColor}" stroke-width="3"/>
            ${[0,45,90,135,180,225,270,315].map(deg => `
              <line x1="64" y1="34" x2="64" y2="20" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" transform="rotate(${deg} 64 64)"/>
            `).join('')}
          </g>
        `;
      case 1:
        return `
          <g transform="scale(${s})">
            <g transform="translate(-14, -14)">
              <circle cx="56" cy="56" r="17" fill="#FDE047" stroke="${strokeColor}" stroke-width="2.5"/>
              ${[0,45,90,135,180,225,270,315].map(deg => `
                <line x1="56" y1="32" x2="56" y2="20" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" transform="rotate(${deg} 56 56)"/>
              `).join('')}
            </g>
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="${cloudFill1}" stroke="${strokeColor}" stroke-width="3" stroke-linejoin="round"/>
          </g>
        `;
      case 2:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="${cloudFill2}" stroke="${strokeColor}" stroke-width="3" stroke-linejoin="round"/>
          </g>
        `;
      case 3:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="${cloudFill2}" stroke="${strokeColor}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M48 94V104M64 94V104M80 94V104" stroke="${strokeColor}" stroke-width="3.5" stroke-linecap="round"/>
          </g>
        `;
      case 4:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="${cloudFill2}" stroke="${strokeColor}" stroke-width="3" stroke-linejoin="round"/>
            <path d="M70 74L61 88H72L53 110L57 93H49L58 74H70Z" fill="#FDE047" stroke="${strokeColor}" stroke-width="2.5" stroke-linejoin="round"/>
          </g>
        `;
      case 5:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="${cloudFill1}" stroke="${strokeColor}" stroke-width="3" stroke-linejoin="round"/>
            <g stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round">
              <path d="M48 94v8M44 98h8M45 95l6 6M45 101l6-6"/>
              <path d="M64 94v8M60 98h8M61 95l6 6M61 101l6-6"/>
              <path d="M80 94v8M76 98h8M77 95l6 6M77 101l6-6"/>
            </g>
          </g>
        `;
    }
  } else if (styleId === 'rich_apple') {
    switch (colIdx) {
      case 0:
        return `
          <g transform="scale(${s})">
            <circle cx="64" cy="64" r="26" fill="url(#ap_sun)" filter="url(#drop_shadow_lg)"/>
            ${[0,30,60,90,120,150,180,210,240,270,300,330].map(deg => `
              <line x1="64" y1="32" x2="64" y2="18" stroke="url(#ap_sun_ray)" stroke-width="4" stroke-linecap="round" transform="rotate(${deg} 64 64)"/>
            `).join('')}
          </g>
        `;
      case 1:
        return `
          <g transform="scale(${s})">
            <g transform="translate(-16, -16)">
              <circle cx="56" cy="56" r="20" fill="url(#ap_sun)" filter="url(#drop_shadow)"/>
              ${[0,45,90,135,180,225,270,315].map(deg => `
                <line x1="56" y1="30" x2="56" y2="18" stroke="url(#ap_sun_ray)" stroke-width="4" stroke-linecap="round" transform="rotate(${deg} 56 56)"/>
              `).join('')}
            </g>
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="url(#ap_cloud)" filter="url(#drop_shadow_lg)"/>
            <path d="M42 56 C46 50, 56 46, 68 47 C76 47, 84 52, 86 58" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
          </g>
        `;
      case 2:
        return `
          <g transform="scale(${s})">
            <path d="M68 44 C72 36 82 34 88 38 C94 42 98 50 96 58 C102 59 106 64 106 70 C106 76 101 80 95 80 H60 C54 80 50 76 50 70 C50 64 54 59 60 58 C60 52 64 46 68 44 Z" fill="url(#ap_cloud_dark)" opacity="0.7" transform="translate(-10, -6)"/>
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="url(#ap_cloud)" filter="url(#drop_shadow_lg)"/>
            <path d="M42 56 C46 50, 56 46, 68 47 C76 47, 84 52, 86 58" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" opacity="0.9"/>
          </g>
        `;
      case 3:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="url(#ap_cloud_dark)" filter="url(#drop_shadow_lg)"/>
            <path d="M46 94 C46 94, 43 100, 43 102 C43 105, 45 107, 48 107 C51 107, 53 105, 53 102 C53 100, 50 94, 50 94 Z" fill="url(#ap_rain)"/>
            <path d="M62 94 C62 94, 59 100, 59 102 C59 105, 61 107, 64 107 C67 107, 69 105, 69 102 C69 100, 66 94, 66 94 Z" fill="url(#ap_rain)"/>
            <path d="M78 94 C78 94, 75 100, 75 102 C75 105, 77 107, 80 107 C83 107, 85 105, 85 102 C85 100, 82 94, 82 94 Z" fill="url(#ap_rain)"/>
          </g>
        `;
      case 4:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="url(#ap_cloud_dark)" filter="url(#drop_shadow_lg)"/>
            <path d="M72 72L61 88H73L52 112L57 93H47L58 72H72Z" fill="url(#ap_bolt)" filter="url(#drop_shadow)"/>
          </g>
        `;
      case 5:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="url(#ap_cloud)" filter="url(#drop_shadow_lg)"/>
            <g stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round">
              <path d="M48 94v8M44 98h8M45 95l6 6M45 101l6-6"/>
              <path d="M64 94v8M60 98h8M61 95l6 6M61 101l6-6"/>
              <path d="M80 94v8M76 98h8M77 95l6 6M77 101l6-6"/>
            </g>
          </g>
        `;
    }
  } else if (styleId === 'duotone') {
    const cloudStroke = isDark ? '#94A3B8' : '#475569';
    const cloudDarkStroke = isDark ? '#CBD5E1' : '#334155';
    
    switch (colIdx) {
      case 0:
        return `
          <g transform="scale(${s})">
            <circle cx="64" cy="64" r="22" fill="#F59E0B" fill-opacity="0.25" stroke="#F59E0B" stroke-width="3"/>
            ${[0,45,90,135,180,225,270,315].map(deg => `
              <line x1="64" y1="34" x2="64" y2="20" stroke="#F59E0B" stroke-width="3.5" stroke-linecap="round" transform="rotate(${deg} 64 64)"/>
            `).join('')}
          </g>
        `;
      case 1:
        return `
          <g transform="scale(${s})">
            <g transform="translate(-14, -14)">
              <circle cx="56" cy="56" r="17" fill="#F59E0B" fill-opacity="0.25" stroke="#F59E0B" stroke-width="3"/>
              ${[0,45,90,135,180,225,270,315].map(deg => `
                <line x1="56" y1="32" x2="56" y2="20" stroke="#F59E0B" stroke-width="3" stroke-linecap="round" transform="rotate(${deg} 56 56)"/>
              `).join('')}
            </g>
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="#64748B" fill-opacity="0.25" stroke="${cloudStroke}" stroke-width="3"/>
          </g>
        `;
      case 2:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="#64748B" fill-opacity="0.3" stroke="${cloudDarkStroke}" stroke-width="3"/>
          </g>
        `;
      case 3:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="#3B82F6" fill-opacity="0.25" stroke="#3B82F6" stroke-width="3"/>
            <path d="M48 94V104M64 94V104M80 94V104" stroke="#3B82F6" stroke-width="4" stroke-linecap="round"/>
          </g>
        `;
      case 4:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="#64748B" fill-opacity="0.3" stroke="${cloudDarkStroke}" stroke-width="3"/>
            <path d="M70 74L61 88H72L53 110L57 93H49L58 74H70Z" fill="#F59E0B" fill-opacity="0.3" stroke="#F59E0B" stroke-width="2.5"/>
          </g>
        `;
      case 5:
        return `
          <g transform="scale(${s})">
            <path d="M55.26 48.47C60.12 40.61 70.3 37.38 78.82 40.94C87.32 44.5 92.14 54 89.9 62.96L89.74 63.61L90.41 63.59C97.42 63.28 103.5 68.99 103.5 76.03C103.5 82.84 97.77 88.5 90.98 88.5H37.95C31.13 88.5 25.2 83.17 24.56 76.36C23.92 69.55 28.74 63.21 35.44 61.95L35.93 61.85L35.84 61.37C35.03 56.62 37.13 51.72 41.11 49.01C45.1 46.3 50.45 46.15 54.58 48.64L55 48.89L55.26 48.47Z" 
              fill="#38BDF8" fill-opacity="0.25" stroke="#38BDF8" stroke-width="3"/>
            <g stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round">
              <path d="M48 94v8M44 98h8M45 95l6 6M45 101l6-6"/>
              <path d="M64 94v8M60 98h8M61 95l6 6M61 101l6-6"/>
              <path d="M80 94v8M76 98h8M77 95l6 6M77 101l6-6"/>
            </g>
          </g>
        `;
    }
  }
}

const headerY = 110;
const startY = 150;
const rowHeight = 155;
const subColWidth = 72;
const iconsStartOffset = 250;

function generateRows(isDark) {
  const baseX = isDark ? halfW + 15 : 15;
  const cardW = halfW - 30;
  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const cardStroke = isDark ? '#334155' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#94A3B8' : '#64748B';
  const iconFrameBg = isDark ? '#0F172A' : '#F8FAFC';
  const iconFrameStroke = isDark ? '#1E293B' : '#F1F5F9';
  
  let out = '';
  styles.forEach((st, rIdx) => {
    const y = startY + rIdx * rowHeight;
    out += `
      <g transform="translate(${baseX}, ${y})">
        <!-- Row Card Background -->
        <rect width="${cardW}" height="142" rx="16" fill="${cardBg}" stroke="${cardStroke}" stroke-width="1.2" filter="url(#card_shadow)"/>
        
        <!-- Style Info -->
        <g transform="translate(18, 28)">
          <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="${textPrimary}">${st.name}</text>
          <text x="0" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" fill="${textSecondary}">${st.sub}</text>
          
          <g transform="translate(0, 36)">
            <text x="0" y="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="${isDark ? '#38BDF8' : (st.id === 'current' ? '#EF4444' : '#10B981')}">${isDark ? st.darkScore : st.lightScore}</text>
          </g>
        </g>
        
        <!-- 6 Weather Icons -->
        ${weatherCols.map((_, cIdx) => {
          const ix = iconsStartOffset + cIdx * subColWidth + (subColWidth - 58) / 2;
          const iy = (142 - 58) / 2;
          return `
            <g transform="translate(${ix}, ${iy})">
              <rect width="58" height="58" rx="10" fill="${iconFrameBg}" stroke="${iconFrameStroke}" stroke-width="1"/>
              <g transform="translate(3, 3)">
                ${renderIcon(st.id, cIdx, isDark, 52)}
              </g>
            </g>
          `;
        }).join('')}
      </g>
    `;
  });
  return out;
}

const leftRows = generateRows(false);
const rightRows = generateRows(true);

const svgContent = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Current Gradients -->
    <linearGradient id="cur_sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#F8AF18"/>
    </linearGradient>
    <linearGradient id="cur_cloud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F3F7FE"/>
      <stop offset="100%" stop-color="#E6EFFC"/>
    </linearGradient>

    <!-- Tweaked Gradients -->
    <linearGradient id="twk_sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="50%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#EA580C"/>
    </linearGradient>
    <linearGradient id="twk_cloud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="60%" stop-color="#F1F5F9"/>
      <stop offset="100%" stop-color="#CBD5E1"/>
    </linearGradient>
    <linearGradient id="twk_cloud_dark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F1F5F9"/>
      <stop offset="100%" stop-color="#94A3B8"/>
    </linearGradient>
    <linearGradient id="twk_cloud_on_dark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="70%" stop-color="#E2E8F0"/>
      <stop offset="100%" stop-color="#94A3B8"/>
    </linearGradient>
    <linearGradient id="twk_cloud_dark_on_dark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#CBD5E1"/>
      <stop offset="100%" stop-color="#64748B"/>
    </linearGradient>

    <!-- Apple / Rich Flat Gradients -->
    <linearGradient id="ap_sun" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="60%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#EA580C"/>
    </linearGradient>
    <linearGradient id="ap_sun_ray" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#F97316"/>
    </linearGradient>
    <linearGradient id="ap_cloud" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="45%" stop-color="#F8FAFC"/>
      <stop offset="80%" stop-color="#E2E8F0"/>
      <stop offset="100%" stop-color="#94A3B8"/>
    </linearGradient>
    <linearGradient id="ap_cloud_dark" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#E2E8F0"/>
      <stop offset="50%" stop-color="#94A3B8"/>
      <stop offset="100%" stop-color="#475569"/>
    </linearGradient>
    <linearGradient id="ap_rain" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="ap_bolt" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FEF08A"/>
      <stop offset="50%" stop-color="#FBBF24"/>
      <stop offset="100%" stop-color="#EA580C"/>
    </linearGradient>

    <!-- Filters -->
    <filter id="card_shadow" x="-5%" y="-5%" width="110%" height="120%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000000" flood-opacity="0.06"/>
    </filter>
    <filter id="drop_shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.15"/>
    </filter>
    <filter id="drop_shadow_lg" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000000" flood-opacity="0.2"/>
    </filter>
  </defs>

  <!-- Left Side: Light Theme Background -->
  <rect x="0" y="0" width="${halfW}" height="${H}" fill="#F3F5F8"/>

  <!-- Right Side: Dark Theme Background -->
  <rect x="${halfW}" y="0" width="${halfW}" height="${H}" fill="#0B0F19"/>

  <!-- Center Split Line -->
  <line x1="${halfW}" y1="0" x2="${halfW}" y2="${H}" stroke="#334155" stroke-width="2" stroke-dasharray="6 6"/>

  <!-- Top Headers -->
  <!-- Light Header -->
  <g transform="translate(30, 40)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#0F172A">☀️ СВЕТЛАЯ ТЕМА (White / Light Cards)</text>
    <text x="0" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" fill="#64748B">Проверка контраста солнца, облаков и осадков на белом фоне</text>
  </g>

  <!-- Dark Header -->
  <g transform="translate(${halfW + 30}, 40)">
    <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="800" fill="#F8FAFC">🌙 ТЁМНАЯ ТЕМА (Dark / OLED Cards)</text>
    <text x="0" y="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" fill="#94A3B8">Проверка читаемости и свечения на темном фоне карточек</text>
  </g>

  <!-- Column Headers Light -->
  ${weatherCols.map((colName, cIdx) => {
    const hx = 15 + iconsStartOffset + cIdx * subColWidth + subColWidth / 2;
    return `
      <text x="${hx}" y="${headerY}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#64748B">${colName}</text>
    `;
  }).join('')}

  <!-- Column Headers Dark -->
  ${weatherCols.map((colName, cIdx) => {
    const hx = halfW + 15 + iconsStartOffset + cIdx * subColWidth + subColWidth / 2;
    return `
      <text x="${hx}" y="${headerY}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#94A3B8">${colName}</text>
    `;
  }).join('')}

  <!-- Rows Content -->
  ${leftRows}
  ${rightRows}
</svg>
`;

await fs.writeFile(path.join(process.cwd(), 'static', 'icons-comparison.svg'), svgContent);
console.log('Saved split SVG to static/icons-comparison.svg');

// Render high-res PNG
await sharp(Buffer.from(svgContent), { density: 150 })
  .png()
  .toFile(path.join(process.cwd(), 'static', 'icons-comparison.png'));

console.log('Saved split PNG to static/icons-comparison.png');
