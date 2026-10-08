"use client";

import { useActionState, useState } from "react";
import { submitInquiry, type InquiryState } from "@/server/leads/actions";

export function InquiryForm({ propertyId, title }: { propertyId: string; title: string }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitInquiry.bind(null, propertyId), {});
  const [kind, setKind] = useState<"inquiry" | "viewing">("viewing");
  const err = state.errors ?? {};
  const today = new Date().toISOString().slice(0, 10);

  if (state.ok) {
    return (
      <div role="status" className="border-l-2 border-moss pl-4">
        <p className="font-serif text-2xl">Thank you, {state.name}</p>
        <p className="mt-2 text-sm text-mist">We have your message about {title}. An agent will contact you on the number you gave.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-6" noValidate>
      <fieldset className="flex gap-6 text-sm">
        <legend className="sr-only">What would you like to do</legend>
        <label className="flex items-center gap-2"><input type="radio" name="kind" value="viewing" checked={kind === "viewing"} onChange={() => setKind("viewing")} /> Request a viewing</label>
        <label className="flex items-center gap-2"><input type="radio" name="kind" value="inquiry" checked={kind === "inquiry"} onChange={() => setKind("inquiry")} /> Ask a question</label>
      </fieldset>
      {([["name", "Full name", "text", "name"], ["phone", "Phone or WhatsApp", "tel", "tel"], ["email", "Email (optional)", "email", "email"]] as const).map(([n, l, t, ac]) => (
        <label key={n} className="block text-xs text-mist">{l}
          <input name={n} type={t} autoComplete={ac} aria-invalid={!!err[n]} aria-describedby={err[n] ? `${n}-e` : undefined} className="field mt-1 text-sm text-basalt" />
          {err[n] && <span id={`${n}-e`} role="alert" className="mt-1 block text-xs text-brass">{err[n]}</span>}
        </label>
      ))}
      {kind === "viewing" && (
        <label className="block text-xs text-mist">Preferred date
          <input name="viewingDate" type="date" min={today} className="field mt-1 text-sm text-basalt" />
          {err.viewingDate && <span role="alert" className="mt-1 block text-xs text-brass">{err.viewingDate}</span>}
        </label>
      )}
      <label className="block text-xs text-mist">Message (optional)
        <textarea name="message" rows={3} maxLength={1000} className="field mt-1 resize-none text-sm text-basalt" />
      </label>
      {/* Honeypot: disembunyikan dari pengguna dan pembaca layar */}
      <div aria-hidden="true" className="absolute -left-[9999px]"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div role="status" aria-live="polite">{state.error && <p className="text-sm text-brass">{state.error}</p>}</div>
      <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">{pending ? "Sending" : kind === "viewing" ? "Request viewing" : "Send message"}</button>
    </form>
  );
}
