import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Dipanggil setelah admin mengubah apa pun yang tampil di situs publik.
 * Halaman publik di-cache (ISR) dan data pencarian memakai tag "public"; ini menyegarkan keduanya segera,
 * sehingga perubahan terlihat tanpa menunggu masa berlaku cache.
 */
export function revalidatePublic() {
  revalidateTag("public");
  revalidatePath("/", "layout");
}
