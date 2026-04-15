export default function CatalogLoading() {
  return (
    <main className="bg-surface-cream">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-10 md:px-8 lg:py-14">
        <div className="h-4 w-48 animate-pulse rounded-full bg-neutral-200/80" />
        <div className="h-12 w-80 animate-pulse rounded-2xl bg-neutral-200/80" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-9 w-28 animate-pulse rounded-full bg-neutral-200/80"
            />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="hidden h-[520px] animate-pulse rounded-2xl bg-neutral-200/60 lg:block" />
          <div className="flex flex-col gap-6">
            <div className="h-16 animate-pulse rounded-2xl bg-neutral-200/80" />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[420px] animate-pulse rounded-2xl bg-white/70"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
