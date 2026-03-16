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

// Wire gauge → diameter in mm (AWG standard)
const GAUGE_TO_WIRE_DIAMETER_MM: Record<string, number> = {
  "14g": 1.63,
  "16g": 1.29,
  "18g": 1.02,
  "20g": 0.81,
};

// Silver density g/cm³
const SILVER_DENSITY = 10.49;
// Troy oz per gram
const GRAMS_PER_TROY_OZ = 31.1035;

export function calcRingWeightGrams(ringSizeUS: number, gauge: string): number {
  const innerDiameterMm = RING_SIZE_TO_DIAMETER_MM[ringSizeUS];
  const wireDiameterMm = GAUGE_TO_WIRE_DIAMETER_MM[gauge];

  if (!innerDiameterMm || !wireDiameterMm) return 0;

  const wireRadiusCm = wireDiameterMm / 2 / 10;
  // Ring center radius = inner radius + wire radius
  const ringCenterRadiusCm = (innerDiameterMm / 2 + wireDiameterMm / 2) / 10;

  // Torus volume: 2π² × R × r²
  const volumeCm3 = 2 * Math.PI ** 2 * ringCenterRadiusCm * wireRadiusCm ** 2;
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

export const US_RING_SIZES = Object.keys(RING_SIZE_TO_DIAMETER_MM).map(Number);
export const SILVER_GAUGES = Object.keys(GAUGE_TO_WIRE_DIAMETER_MM);
