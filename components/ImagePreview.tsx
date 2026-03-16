interface ImagePreviewProps {
  imageUrl: string | null;
  loading: boolean;
}

export default function ImagePreview({ imageUrl, loading }: ImagePreviewProps) {
  if (!loading && !imageUrl) return null;

  return (
    <div className="rounded-xl border border-stone-200 overflow-hidden">
      {loading ? (
        <div className="h-80 flex items-center justify-center bg-stone-100">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-stone-500">Generating your ring preview…</p>
            <p className="text-xs text-stone-400">This may take 20–40 seconds</p>
          </div>
        </div>
      ) : imageUrl ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="AI-generated ring preview"
            className="w-full object-cover max-h-[500px]"
          />
          <p className="absolute bottom-2 right-3 text-xs text-white/70 bg-black/30 px-2 py-0.5 rounded">
            AI preview — for reference only
          </p>
        </div>
      ) : null}
    </div>
  );
}
