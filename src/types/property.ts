export interface CardImage { src: string; srcSet: string; blur: string | null; alt: string; width: number | null; height: number | null }

/** Bentuk data kartu properti untuk situs publik. Tidak memuat kolom internal. */
export interface PublicCard {
  id: string; slug: string; code: string; title: string;
  category: string; location: string; transaction: "SALE" | "RENT";
  price: number; currency: string;
  bedrooms: number | null; bathrooms: number | null; landArea: number | null; buildingArea: number | null;
  isFeatured: boolean; isPremium: boolean; image: CardImage | null;
}

export interface CompareRow extends PublicCard {
  floors: number | null; parking: number | null; certificate: string | null;
  furnished: boolean; hasPool: boolean; hasGarage: boolean; hasGarden: boolean;
}
