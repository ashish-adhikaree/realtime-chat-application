import { config } from 'dotenv';
import z from 'zod';
config();

const envSchema = z.object({
  PORT: z.string().default('8000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
});

export default envSchema.parse(process.env as z.infer<typeof envSchema>);
