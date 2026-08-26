import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFileSync } from 'node:fs';
import { SITE } from './src/lib/site.mjs';

const readJson = (p, fallback) => {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
};

// 종료됐거나 출처 링크가 죽은 지원금은 사이트맵에서 뺀다. 페이지 자체는 남겨서 404 를 만들지 않는다.
const services = readJson('data/normalized/services.json', { services: [] }).services ?? [];
const dead = new Set(readJson('data/normalized/dead-links.json', []).map((d) => d.id));
const excluded = new Set(
  services.filter((s) => !s.open || dead.has(s.id)).map((s) => `${SITE.url}/s/${s.id}/`)
);

export default defineConfig({
  site: SITE.url,
  integrations: [sitemap({ filter: (page) => !excluded.has(page) })],
  build: { format: 'directory' },
});
