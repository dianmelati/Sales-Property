"use client";

import { useActionState } from "react";
import { createLead, type LeadFormState } from "@/server/leads/admin-actions";
import { MANUAL_SOURCES, SOURCE_LABEL } from "@/lib/leads";

export function LeadForm({ properties, agents, isAgent }: { properties: { id: string; title: string; code: string }[]; agents: { id: string; name: string }[]; isAgent: boolean }) {
  const [state, action, pending] = useActionState<LeadFormState, FormData>(createLead, {});
  const e = state.errors ?? {};
  const err = (n: string) => e[n] && <span role="alert" className="mt-1 block text-xs text-brass">{e[n]}</span>;
  return (
    <form action={action} className="max-w-2xl space-y-8" noValidate>
      <div className="grid gap-8 sm:grid-cols-2">
        <label className="block text-xs text-mist">Name<input name="name" className="field mt-1 text-sm text-basalt" />{err("name")}</label>
        <label className="block text-xs text-mist">Phone<input name="phone" type="tel" className="field mt-1 text-sm text-basalt" />{err("phone")}</label>
        <label className="block text-xs text-mist">Email (optional)<input name="email" type="email" className="field mt-1 text-sm text-basalt" />{err("email")}</label>
        <label className="block text-xs text-mist">How did they reach you
          <select name="source" defaultValue="phone" className="field mt-1 text-sm text-basalt">{MANUAL_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}</select>
        </label>
        <label className="block text-xs text-mist">Property of interest (optional)
          <select name="propertyId" defaultValue="" className="field mt-1 text-sm text-basalt"><option value="">General inquiry</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.title}</option>)}</select>{err("propertyId")}
        </label>
        {!isAgent && (
          <label className="block text-xs text-mist">Assign to
            <select name="agentId" defaultValue="" className="field mt-1 text-sm text-basalt"><option value="">Unassigned</option>{agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>{err("agentId")}
          </label>
        )}
      </div>
      <label className="block text-xs text-mist">Notes (optional)<textarea name="message" rows={4} maxLength={1000} className="mt-1 w-full border border-basalt/25 bg-transparent p-3 text-sm text-basalt" /></label>
      <div role="status" aria-live="polite" className="min-h-5 text-sm">{state.error && <p className="text-brass">{state.error}</p>}</div>
      <button disabled={pending} className="btn-primary disabled:opacity-60">{pending ? "Saving" : "Save lead"}</button>
    </form>
  );
}
