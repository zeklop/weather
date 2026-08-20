import fs from 'node:fs/promises';
import path from 'node:path';

const ICONS_DIR = path.join(process.cwd(), 'static', 'icons', 'weather');

const files = await fs.readdir(ICONS_DIR);
const svgFiles = files.filter(f => f.endsWith('.svg'));

console.log(`Found ${svgFiles.length} SVG weather icons in ${ICONS_DIR}`);

for (const file of svgFiles) {
  const filePath = path.join(ICONS_DIR, file);
  let content = await fs.readFile(filePath, 'utf8');

  // 1. Upgrade Sun colors:
  // Sun rays & core stroke: #F8AF18 -> #F59E0B / #EA580C
  content = content.replaceAll('#F8AF18', '#F59E0B');
  content = content.replaceAll('stop-color="#FBBF24"', 'stop-color="#FDE047"');
  // If gradient was FBBF24 -> F8AF18, make it rich FDE047 -> F59E0B -> EA580C or FDE047 -> EA580C
  content = content.replaceAll('stop-color="#F59E0B"', 'stop-color="#EA580C"');

  // 2. Upgrade Cloud gradients & strokes:
  // Old cloud fill: #F3F7FE -> #E6EFFC
  // New cloud fill: #FFFFFF -> #CBD5E1
  content = content.replaceAll('stop-color="#F3F7FE"', 'stop-color="#FFFFFF"');
  content = content.replaceAll('stop-color="#E6EFFC"', 'stop-color="#CBD5E1"');
  // Cloud stroke: #E6EFFC -> #94A3B8
  content = content.replaceAll('stroke="#E6EFFC"', 'stroke="#94A3B8" stroke-width="1.5"');

  // 3. Upgrade Rain & Drizzle lines:
  // #0A5AD4 / #0B57D0 -> #3B82F6 with prominent stroke
  content = content.replaceAll('#0A5AD4', '#3B82F6');
  content = content.replaceAll('#0B57D0', '#3B82F6');
  content = content.replaceAll('#2563EB', '#3B82F6');

  // 4. Upgrade Snowflakes:
  // #5B9BF6 -> #38BDF8 with 2.5px width
  content = content.replaceAll('#5B9BF6', '#38BDF8');

  // 5. Upgrade Thunder/Lightning:
  content = content.replaceAll('#F6A823', '#D97706');

  // Clean duplicate attributes if any
  content = content.replaceAll('stroke-width="1.5" stroke-width="1.5"', 'stroke-width="1.5"');

  await fs.writeFile(filePath, content);
  console.log(`Updated ${file}`);
}

console.log('All 19 SVG icons updated to Meteocons Tweaked contrast style.');
