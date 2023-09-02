import { createClient } from "@vercel/kv";
import { ENV } from "../env.js";

const KV_REST_API_TOKEN = ENV.KV_REST_API_TOKEN;
const KV_REST_API_URL = ENV.KV_REST_API_URL;

export default createClient({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});
