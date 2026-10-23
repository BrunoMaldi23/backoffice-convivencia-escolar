import * as Joi from 'joi';
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  API_PORT: Joi.number().port().default(3000),
  WEB_ORIGIN: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  MAIL_HOST: Joi.string().hostname().default('mailpit'),
  MAIL_PORT: Joi.number().port().default(1025),
  MAIL_SECURE: Joi.boolean().default(false),
  MAIL_FROM: Joi.string().email().default('no-reply@convivencia.example.com'),
  PASSWORD_RESET_TTL_MINUTES: Joi.number().integer().min(5).max(1440).default(30),
  SESSION_TTL_HOURS: Joi.number().integer().min(1).max(168).default(12)
});
