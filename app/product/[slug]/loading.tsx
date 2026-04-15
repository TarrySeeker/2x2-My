export default function ProductLoading() {
  return (
    <main className="bg-surface-cream">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 md:px-8 lg:py-14">
        <div className="h-4 w-72 animate-pulse rounded-full bg-neutral-200/80" />
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
          <div className="flex flex-col gap-3">
            <div className="aspect-[4/3] w-full animate-pulse rounded-2xl bg-neutral-200/80" />
            <div className="flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 w-20 animate-pulse rounded-xl bg-neutral-200/80"
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-5">
            <div className="h-8 w-3/4 animate-pulse rounded-xl bg-neutral-200/80" />
            <div className="h-20 w-full animate-pulse rounded-xl bg-neutral-200/80" />
            <div className="h-24 w-full animate-pulse rounded-2xl bg-neutral-200/80" />
            <div className="h-64 w-full animate-pulse rounded-2xl bg-white/70" />
          </div>
        </div>
      </div>
    </main>
  );
}
