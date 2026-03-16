interface Config {
  laborFee: number;
  shippingFee: number;
  markupMultiplier: number;
  replicateModelId: string;
}

interface PriceQuoteProps {
  totalPrice: number | null;
  weightGrams: number;
  silverPrice: number | null;
  config: Config | null;
  error: boolean;
}

export default function PriceQuote({ totalPrice, weightGrams, silverPrice, config, error }: PriceQuoteProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Unable to fetch live silver price. Please refresh to try again.
      </div>
    );
  }

  const loading = silverPrice === null || config === null;

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-6">
      <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">Estimated Quote</h2>

      {loading ? (
        <p className="text-stone-400 text-sm animate-pulse">Fetching silver spot price…</p>
      ) : (
        <div className="space-y-2 text-sm text-stone-700">
          <div className="flex justify-between">
            <span>Ring weight</span>
            <span className="font-medium">{weightGrams.toFixed(2)} g</span>
          </div>
          <div className="flex justify-between">
            <span>Silver spot price</span>
            <span className="font-medium">${silverPrice!.toFixed(2)} / troy oz</span>
          </div>
          <div className="flex justify-between">
            <span>Silver material cost</span>
            <span className="font-medium">
              ${((weightGrams / 31.1035) * silverPrice! * config!.markupMultiplier).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Labor &amp; fabrication</span>
            <span className="font-medium">${config!.laborFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Shipping &amp; finishing</span>
            <span className="font-medium">${config!.shippingFee.toFixed(2)}</span>
          </div>
          <div className="border-t border-stone-300 pt-3 flex justify-between text-base font-bold text-stone-800">
            <span>Total estimate</span>
            <span>${totalPrice!.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
