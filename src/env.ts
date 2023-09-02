import { config } from "dotenv";
import z from "zod";
config()

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BLESS_TOKEN: z.string(),
  KV_REST_API_TOKEN: z.string(),
  KV_REST_API_URL: z.string(),
  WALLET_SESSION_KEY: z.string(),
  WALLET_CREDENTIALS: z.string(),
  CRYPTO_WALLET_NAME: z.string(),
  CMC_AUTH_TOKEN: z.string(),
  CRYPTO_PORTFOLIO_NAME: z.string(),
});

export type EnvType = z.infer<typeof envSchema>;

export const ENV = envSchema.parse(process.env);