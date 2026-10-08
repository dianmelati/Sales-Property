"use client";

import { useActionState } from "react";
import { submitContact, type InquiryState } from "@/server/leads/actions";

export function ContactForm() {
  const [state, action, pending] = useActionState<InquiryState, FormData>(submitContact, {});
  const e = state.errors ?? {};
  if (state.ok) {
    return (
      <div role="status" className="border-l-2 border-moss pl-4">
        <p className="font-serif text-2xl">Thank you, {state.name}</p>
        <p className="mt-2 text-sm text-mist">We have your message. An agent will contact you on the number you gave.</p>
      </div>
    );
  }
  const err = (n: string) => e[n] && <span id={`${n}-e`} role="alert" className="mt-1 block text-xs text-brass">{e[n]}</span>;
  return (
    <form action={action} className="space-y-7" noValidate>
      <label className="block text-xs text-mist">Full name<input name="name" autoComplete="name" aria-invalid={!!e.name} className="field mt-1 text-sm text-basalt" />{err("name")}</label>
      <div className="grid gap-7 sm:grid-cols-2">
        <label className="block text-xs text-mist">Phone or WhatsApp<input name="phone" type="tel" autoComplete="tel" aria-invalid={!!e.phone} className="field mt-1 text-sm text-basalt" />{err("phone")}</label>
        <label className="block text-xs text-mist">Email (optional)<input name="email" type="email" autoComplete="email" aria-invalid={!!e.email} className="field mt-1 text-sm text-basalt" />{err("email")}</label>
      </div>
      <label className="block text-xs text-mist">How can we help<textarea name="message" rows={5} maxLength={1000} aria-invalid={!!e.message} className="field mt-1 resize-none text-sm text-basalt" />{err("message")}</label>
      <div aria-hidden="true" className="absolute -left-[9999px]"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <div role="status" aria-live="polite">{state.error && <p className="text-sm text-brass">{state.error}</p>}</div>
      <button type="submit" disabled={pending} className="btn-primary disabled:opacity-60">{pending ? "Sending" : "Send message"}</button>
    </form>
  );
}
