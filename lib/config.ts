import IORedis from "ioredis";

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

async function withRedis<T>(fn: (redis: IORedis) => Promise<T>): Promise<T | null> {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const redis = new IORedis(url, { maxRetriesPerRequest: 2, enableReadyCheck: false });
  try {
    return await fn(redis);
  } finally {
    redis.disconnect();
  }
}

export async function getConfig(): Promise<SiteConfig> {
  const result = await withRedis(async (redis) => {
    const stored = await redis.get(CONFIG_KEY);
    if (stored) return JSON.parse(stored) as SiteConfig;
    // First run: seed Redis from config.json defaults
    const local = getLocalConfig();
    await redis.set(CONFIG_KEY, JSON.stringify(local));
    return local;
  });
  return result ?? getLocalConfig();
}

export async function saveConfig(config: SiteConfig): Promise<void> {
  const saved = await withRedis(async (redis) => {
    await redis.set(CONFIG_KEY, JSON.stringify(config));
    return true;
  });
  if (!saved) {
    // Local dev fallback
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    fs.writeFileSync(path.join(process.cwd(), "config.json"), JSON.stringify(config, null, 2));
  }
}
