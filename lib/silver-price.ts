let cachedPrice: number | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function getSilverSpotPrice(): Promise<number> {
  if (cachedPrice !== null && Date.now() < cacheExpiresAt) {
    return cachedPrice;
  }

  const apiKey = process.env.METALS_API_KEY;
  if (!apiKey) throw new Error("METALS_API_KEY is not set");

  const res = await fetch(
    `https://api.metalpriceapi.com/v1/latest?api_key=${apiKey}&base=USD&currencies=XAG`,
    { next: { revalidate: 0 } }
  );

  if (!res.ok) {
    throw new Error(`Metals API error: ${res.status}`);
  }

  const data = await res.json() as {
    success: boolean;
    rates: Record<string, number>;
  };

  if (!data.success || !data.rates.XAG) {
    throw new Error("Unexpected metals API response shape");
  }

  // API returns XAG per USD (e.g. ~0.030 troy oz per $1)
  // Invert to get USD per troy oz (e.g. ~$33/oz)
  const pricePerTroyOz = 1 / data.rates.XAG;

  cachedPrice = pricePerTroyOz;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return pricePerTroyOz;
}
