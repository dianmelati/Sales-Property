"use client";
import { createListStore } from "./list-store";

const store = createListStore("estate:favorites", 30);
export const toggleFavorite = store.toggle;
export const useFavorites = store.useList;
