import * as Joi from 'joi';
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  // Render expone el puerto público en PORT. API_PORT se conserva para Docker local.
  PORT: Joi.number().port().optional(),
  API_PORT: Joi.number().port().default(3000),
  // Número de proxies de confianza frente a la API. En Render corresponde a un proxy.
  TRUST_PROXY_HOPS: Joi.number().integer().min(0).max(3).default(0),
  WEB_ORIGIN: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  SHADOW_DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  MAIL_HOST: Joi.string().hostname().default('mailpit'),
  MAIL_PORT: Joi.number().port().default(1025),
  MAIL_SECURE: Joi.boolean().default(false),
  MAIL_FROM: Joi.string().email().default('no-reply@convivencia.example.com'),
  MAIL_USER: Joi.string().allow('').optional(),
  MAIL_PASSWORD: Joi.when('MAIL_USER', { is: Joi.string().min(1).required(), then: Joi.string().min(1).required(), otherwise: Joi.string().allow('').optional() }),
  // En Render debe apuntar al disco persistente, por ejemplo /var/data/private.
  PRIVATE_STORAGE_PATH: Joi.string().min(1).optional(),
  PASSWORD_RESET_TTL_MINUTES: Joi.number().integer().min(5).max(1440).default(30),
  SESSION_TTL_HOURS: Joi.number().integer().min(1).max(168).default(12),
  SESSION_LAST_SEEN_UPDATE_MINUTES: Joi.number().integer().min(1).max(1440).default(15)
});
