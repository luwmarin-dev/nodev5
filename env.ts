import { env as loadEnv } from 'custom-env'
import { z } from 'zod'

// Render supplies NODE_ENV; APP_STAGE remains an optional explicit override.
process.env.APP_STAGE = process.env.APP_STAGE || (
  process.env.NODE_ENV === 'production' ? 'production' :
  process.env.NODE_ENV === 'test' ? 'test' : 'dev'
)

if (process.env.APP_STAGE === 'dev') {
  loadEnv()
} else if (process.env.APP_STAGE === 'test') {
  loadEnv('test')
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_STAGE: z.enum(['dev', 'test', 'production']).default('dev'),
  PORT: z.coerce.number().positive().default(3000),
  DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//, 'Must start with postgres:// or postgresql://'),
  JWT_SECRET: z.string().min(32, 'Must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().min(10).max(20).default(12),
})

export type Env = z.infer<typeof envSchema>

let env: Env
try {
  env = envSchema.parse(process.env)
} catch (e) {
  if (e instanceof z.ZodError) {
    console.error('Invalid environment variables')
    console.error(JSON.stringify(e.flatten().fieldErrors, null, 2))
    process.exit(1)
  }
  throw e
}

export const isProd = () => env.APP_STAGE === 'production'
export const isDev = () => env.APP_STAGE === 'dev'
export const isTest = () => env.APP_STAGE === 'test'

export { env }
export default env

