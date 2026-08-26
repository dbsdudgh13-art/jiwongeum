import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 해설 글은 content/ 아래에 둔다. data/ 는 기계가 매일 덮어쓰는 영역이라 섞으면 글이 날아간다.
const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/services' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    updated: z.string(),
    reviewed: z.boolean().default(false),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    published: z.string(),
    updated: z.string(),
    author: z.string(),
  }),
});

export const collections = { services, guides };
