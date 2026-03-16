import { readFileSync, writeFileSync } from "fs";
import path from "path";

export interface SiteConfig {
  laborFee: number;
  shippingFee: number;
  markupMultiplier: number;
  replicateModelId: string;
}

const CONFIG_PATH = path.join(process.cwd(), "config.json");

export function getConfig(): SiteConfig {
  const raw = readFileSync(CONFIG_PATH, "utf-8");
  return JSON.parse(raw) as SiteConfig;
}

export function saveConfig(config: SiteConfig): void {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
