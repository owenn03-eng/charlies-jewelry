// US ring size → inner diameter in mm
const RING_SIZE_TO_DIAMETER_MM: Record<number, number> = {
  5: 15.7,
  5.5: 16.1,
  6: 16.5,
  6.5: 16.9,
  7: 17.3,
  7.5: 17.7,
  8: 18.2,
  8.5: 18.6,
  9: 19.0,
  9.5: 19.4,
  10: 19.8,
  10.5: 20.2,
  11: 20.6,
  11.5: 21.0,
  12: 21.4,
  12.5: 21.8,
  13: 22.2,
};

// Silver density g/cm³
const SILVER_DENSITY = 10.49;
// Troy oz per gram
const GRAMS_PER_TROY_OZ = 31.1035;

// Band width options (height on finger) in inches — displayed as fractions
export const BAND_WIDTHS = [
  { label: '1/4"', inches: 0.25, mm: 6.35 },
  { label: '3/8"', inches: 0.375, mm: 9.525 },
  { label: '1/2"', inches: 0.5, mm: 12.7 },
  { label: '5/8"', inches: 0.625, mm: 15.875 },
  { label: '3/4"', inches: 0.75, mm: 19.05 },
] as const;

// Gauge options — maps gauge label to thickness in mm
export const GAUGES = [
  { label: "18g", mm: 1.02 },
  { label: "16g", mm: 1.29 },
  { label: "14g", mm: 1.63 },
  { label: "12g", mm: 2.05 },
] as const;

/**
 * Flat band ring weight formula (hollow cylinder model):
 * volume = π × widthCm × ((outerRadius² - innerRadius²))
 * where outerRadius = innerRadius + thickness
 */
export function calcRingWeightGrams(ringSizeUS: number, widthMm: number, thicknessMm: number): number {
  const innerDiameterMm = RING_SIZE_TO_DIAMETER_MM[ringSizeUS];
  if (!innerDiameterMm) return 0;

  const innerRadiusCm = innerDiameterMm / 2 / 10;
  const outerRadiusCm = innerRadiusCm + thicknessMm / 10;
  const widthCm = widthMm / 10;

  // Hollow cylinder: π × width × (outerR² - innerR²)
  const volumeCm3 = Math.PI * widthCm * (outerRadiusCm ** 2 - innerRadiusCm ** 2);
  return volumeCm3 * SILVER_DENSITY;
}

export function calcPrice(
  weightGrams: number,
  spotPricePerTroyOz: number,
  markupMultiplier: number,
  laborFee: number,
  shippingFee: number
): number {
  const weightTroyOz = weightGrams / GRAMS_PER_TROY_OZ;
  const silverCost = weightTroyOz * spotPricePerTroyOz * markupMultiplier;
  return silverCost + laborFee + shippingFee;
}

// Explicit sorted array — Object.keys() puts integers before decimals, scrambling the order
export const US_RING_SIZES = [5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13];
