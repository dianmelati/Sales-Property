"use client";
import { createListStore } from "./list-store";

export const compareStore = createListStore("estate:compare", 3);
export const toggleCompare = compareStore.toggle;
export const clearCompare = compareStore.clear;
export const useCompare = compareStore.useList;
