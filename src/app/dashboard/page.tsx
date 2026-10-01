/** Dashboard skeleton: title and four placeholder sections. */
export default function DashboardPage() {
  return (
    <>
      <h1 className="text-[34px] font-bold tracking-tight">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((n) => (
          <section key={n} className="min-h-40 rounded-2xl bg-card p-5">
            <h2 className="text-[20px] font-semibold">Section {n}</h2>
            <p className="mt-1 text-[15px] text-muted-foreground">Content goes here.</p>
          </section>
        ))}
      </div>
    </>
  );
}
