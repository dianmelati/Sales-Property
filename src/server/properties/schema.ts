import { z } from "zod";

const optInt = (max = 1_000_000) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(0).max(max).optional());
const optCoord = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(min).max(max).optional());
const optText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().max(max).optional());
const bool = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export const propertyInputSchema = z.object({
  title: z.string().trim().min(5, "Title needs at least 5 characters").max(140),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").max(90).optional().or(z.literal("")),
  categoryId: z.string().min(1, "Choose a property type"),
  locationId: z.string().min(1, "Choose a location"),
  agentId: optText(40),
  transaction: z.enum(["SALE", "RENT"]),
  price: z.preprocess((v) => Number(v), z.number().positive("Enter a price above zero").max(1e15)),
  currency: z.enum(["IDR", "USD", "SGD", "EUR"]).default("IDR"),
  address: optText(300),
  latitude: optCoord(-90, 90),
  longitude: optCoord(-180, 180),
  landArea: optInt(10_000_000),
  buildingArea: optInt(10_000_000),
  bedrooms: optInt(50),
  bathrooms: optInt(50),
  floors: optInt(100),
  parking: optInt(100),
  certificate: z.preprocess((v) => (v === "" ? undefined : v), z.enum(["SHM", "HGB", "HPL", "STRATA", "OTHER"]).optional()),
  furnished: bool,
  hasPool: bool,
  hasGarage: bool,
  hasGarden: bool,
  isFeatured: bool,
  isPremium: bool,
  description: z.string().max(20_000).default(""),
  featuresText: z.string().max(4000).default(""),
  status: z.enum(["DRAFT", "PUBLISHED", "RESERVED", "SOLD", "RENTED", "ARCHIVED"]).default("DRAFT"),
  seoTitle: optText(70),
  seoDescription: optText(170),
  seoKeywords: optText(250),
}).refine((v) => (v.latitude == null) === (v.longitude == null), {
  message: "Enter both latitude and longitude, or leave both empty",
  path: ["latitude"],
});

export type PropertyInput = z.infer<typeof propertyInputSchema>;
