import { Redis } from "@upstash/redis";

export interface SiteConfig {
  laborFee: number;
  shippingFee: number;
  markupMultiplier: number;
  replicateModelId: string;
}

const CONFIG_KEY = "site-config";

const DEFAULT_CONFIG: SiteConfig = {
  laborFee: 50,
  shippingFee: 10,
  markupMultiplier: 3,
  replicateModelId: "",
};

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function getLocalConfig(): SiteConfig {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const raw = fs.readFileSync(path.join(process.cwd(), "config.json"), "utf-8");
    return JSON.parse(raw) as SiteConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

function saveLocalConfig(config: SiteConfig): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
  fs.writeFileSync(path.join(process.cwd(), "config.json"), JSON.stringify(config, null, 2));
}

export async function getConfig(): Promise<SiteConfig> {
  const redis = getRedis();
  if (redis) {
    const stored = await redis.get<SiteConfig>(CONFIG_KEY);
    if (stored) return stored;
    // First run: seed Redis with defaults from config.json
    const local = getLocalConfig();
    await redis.set(CONFIG_KEY, local);
    return local;
  }
  return getLocalConfig();
}

export async function saveConfig(config: SiteConfig): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(CONFIG_KEY, config);
    return;
  }
  saveLocalConfig(config);
}
