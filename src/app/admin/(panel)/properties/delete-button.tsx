"use client";

import { useTransition } from "react";
import { deleteProperty } from "@/server/properties/actions";

export function DeleteButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending}
      onClick={() => { if (confirm(`Delete "${title}"? It will be removed from the website and the admin list.`)) start(() => deleteProperty(id)); }}
      className="text-sm underline underline-offset-4 hover:text-brass disabled:opacity-60">
      {pending ? "Deleting" : "Delete property"}
    </button>
  );
}
