import sharp from "sharp";

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const MIN_SIDE = 800;
const MAX_SIDE = 12000;
const PIXEL_LIMIT = 100_000_000; // mencegah "decompression bomb"

export const VARIANTS = {
  thumbnail: { width: 320, quality: 72 },
  small: { width: 640, quality: 76 },
  medium: { width: 1280, quality: 80 },
  large: { width: 2200, quality: 82 },
} as const;
export type VariantName = keyof typeof VARIANTS;

/** Denah butuh garis tipis dan teks kecil tetap terbaca: kualitas lebih tinggi dan varian besar lebih lebar. */
export const PLAN_VARIANTS = {
  thumbnail: { width: 320, quality: 80 },
  small: { width: 640, quality: 84 },
  medium: { width: 1280, quality: 88 },
  large: { width: 3000, quality: 90 },
} as const;
export interface ProcessOptions { plan?: boolean; minSide?: number }

export class InvalidImageError extends Error {
  constructor(public code: "TOO_LARGE" | "BAD_TYPE" | "BAD_DIMENSIONS" | "UNREADABLE", message: string) {
    super(message);
  }
}

export type SourceMime = "image/jpeg" | "image/png" | "image/heic";

/** Cek tipe dari isi file (magic bytes), bukan dari ekstensi atau header klien. */
export function sniffMime(buf: Buffer): SourceMime | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(4, 8).toString() === "ftyp" && ["heic", "heix", "mif1", "heif", "hevc"].includes(buf.subarray(8, 12).toString())) return "image/heic";
  return null;
}

export interface ProcessedImage {
  sourceMime: SourceMime;
  width: number;
  height: number;
  blurDataUrl: string;
  variants: Record<VariantName, { buffer: Buffer; width: number; height: number; bytes: number }>;
}

/**
 * Validasi -> (HEIC ke JPEG) -> auto-rotate -> metadata dibuang -> resize -> WebP -> blur placeholder.
 * Fungsi murni: tidak menyentuh storage.
 * Catatan: sharp bawaan npm tidak bisa membaca HEIC (HEVC berpaten), jadi HEIC dikonversi dulu dengan heic-convert.
 */
export async function processImage(input: Buffer, opts: ProcessOptions = {}): Promise<ProcessedImage> {
  const cfgSet = opts.plan ? PLAN_VARIANTS : VARIANTS;
  const minSide = opts.minSide ?? MIN_SIDE;
  if (input.length > MAX_UPLOAD_BYTES) throw new InvalidImageError("TOO_LARGE", "File exceeds 25 MB.");
  const sourceMime = sniffMime(input);
  if (!sourceMime) throw new InvalidImageError("BAD_TYPE", "Only JPG, PNG and HEIC images are accepted.");

  let work = input;
  if (sourceMime === "image/heic") {
    try {
      const { default: heicConvert } = await import("heic-convert"); // dimuat hanya saat ada HEIC
      work = Buffer.from(await heicConvert({ buffer: input, format: "JPEG", quality: 0.92 }));
    } catch {
      throw new InvalidImageError("UNREADABLE", "This HEIC image could not be converted.");
    }
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(work, { failOn: "error", limitInputPixels: PIXEL_LIMIT }).metadata();
  } catch {
    throw new InvalidImageError("UNREADABLE", "The image could not be read.");
  }
  const w = meta.width ?? 0, h = meta.height ?? 0;
  if (Math.min(w, h) < minSide || Math.max(w, h) > MAX_SIDE || w * h > PIXEL_LIMIT) {
    throw new InvalidImageError("BAD_DIMENSIONS", `Image sides must be between ${minSide}px and ${MAX_SIDE}px.`);
  }

  // rotate() menerapkan orientasi EXIF; sharp membuang metadata (EXIF/GPS) secara default saat menulis.
  const base = sharp(work, { limitInputPixels: PIXEL_LIMIT }).rotate();
  // Header yang sehat tidak menjamin isi yang sehat: gambar terpotong atau rusak baru gagal saat dipecahkan.
  let entries: (readonly [VariantName, { buffer: Buffer; width: number; height: number; bytes: number }])[];
  let blur: Buffer;
  try {
    entries = await Promise.all(
      (Object.entries(cfgSet) as [VariantName, { width: number; quality: number }][]).map(async ([name, cfg]) => {
        const { data, info } = await base.clone()
          .resize({ width: cfg.width, withoutEnlargement: true })
          .webp({ quality: cfg.quality, effort: 4 })
          .toBuffer({ resolveWithObject: true });
        return [name, { buffer: data, width: info.width, height: info.height, bytes: info.size }] as const;
      }),
    );
    blur = await base.clone().resize(16).blur(1).webp({ quality: 40 }).toBuffer();
  } catch {
    throw new InvalidImageError("UNREADABLE", "The image could not be processed. The file may be damaged; try exporting it again.");
  }
  const swapped = !!meta.orientation && meta.orientation >= 5;
  return {
    sourceMime,
    width: swapped ? h : w,
    height: swapped ? w : h,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
    variants: Object.fromEntries(entries) as ProcessedImage["variants"],
  };
}
