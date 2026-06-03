import { z } from 'zod';

/**
 * Parser de boolean a partir de variável de ambiente (string).
 * `z.coerce.boolean()` trata qualquer string não-vazia como true
 * (`Boolean("false") === true`), então usamos um parser explícito:
 * apenas "true"/"1" (case-insensitive) viram true.
 */
const booleanFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((v) =>
    typeof v === 'boolean'
      ? v
      : ['true', '1', 'yes'].includes(v.trim().toLowerCase()),
  );

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN deve ser como 12h, 7d, 30m')
    .default('12h'),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: booleanFromEnv.default(false),

  // [AUTH] URL pública do frontend usada para montar links (ex.: reset de senha).
  // Default para a origem de CORS quando não informado.
  APP_URL: z.string().url().optional(),

  // [MAIL] Configuração SMTP (opcional). Sem isso, e-mails são apenas logados (modo dev).
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: booleanFromEnv.default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('Advision <no-reply@advision.app>'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function validateEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

export const env = validateEnv();
