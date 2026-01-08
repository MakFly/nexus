import type { Config } from 'drizzle-kit';

export default {
  schema: './src/storage/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: '/home/kev/Documents/lab/brainstorming/free-context/free-context.db',
  },
} satisfies Config;
