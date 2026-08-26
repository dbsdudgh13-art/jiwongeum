import { getCollection } from 'astro:content';
import { byId } from './data.mjs';

/** 실제로 페이지가 생성된 서비스만. 허브가 없는 페이지로 링크 걸면 404 가 쌓인다. */
export async function publishedServices() {
  const entries = await getCollection('services');
  return entries
    .filter((e) => e.data.reviewed && byId.has(e.id))
    .map((e) => ({ ...byId.get(e.id), description: e.data.description }));
}
