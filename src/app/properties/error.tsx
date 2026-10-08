"use client";

export default function PropertiesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-page px-6 py-24 lg:px-12">
      <h1 className="text-4xl">We could not load the properties</h1>
      <p className="mt-4 max-w-md text-mist">Something went wrong on our side. Please try again in a moment.</p>
      <button onClick={reset} className="btn-primary mt-8">Try again</button>
    </main>
  );
}
