export default function Loading() {
  return (
    <main className="mx-auto max-w-page px-6 py-16 lg:px-12" aria-busy="true">
      <div className="h-14 w-72 bg-stone" />
      <div className="mt-16 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}><div className="aspect-[4/3] animate-pulse bg-stone motion-reduce:animate-none" /><div className="mt-4 h-5 w-2/3 bg-stone" /><div className="mt-3 h-4 w-1/3 bg-stone" /></div>
        ))}
      </div>
    </main>
  );
}
