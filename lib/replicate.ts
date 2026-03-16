import Replicate from "replicate";

export function getReplicateClient(): Replicate {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN is not set");
  return new Replicate({ auth: token });
}

export function buildRingPrompt(bandStyle: string, finish: string, initials?: string): string {
  let styleDesc = "";
  if (bandStyle === "plain") {
    styleDesc = "plain smooth band";
  } else if (bandStyle === "engraved initials") {
    const initialsText = initials ? ` with the initials "${initials}" engraved` : " with initials engraved";
    styleDesc = `simple band${initialsText}`;
  } else if (bandStyle === "fully engraved") {
    styleDesc = "band with intricate full engraving across the entire surface";
  }

  const finishDesc =
    finish === "polished"
      ? "high-polish mirror finish"
      : finish === "oxidized/blackened"
        ? "oxidized blackened finish with dark patina"
        : "brushed matte satin finish";

  return (
    `sterling silver ring, ${styleDesc}, ${finishDesc}, ` +
    `close-up professional jewelry photography, white seamless background, ` +
    `studio lighting, sharp focus, photorealistic, high resolution`
  );
}

export function buildNegativePrompt(): string {
  return (
    "gold, yellow metal, gemstone, stone, blurry, cartoon, illustration, " +
    "dark background, human hand, watermark, text overlay"
  );
}
