import Image from "next/image";

export default function Home() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-8 py-10 text-center">
        <Image
          src="/cscl-logo.png"
          alt="CSCL logo"
          width={89}
          height={18}
          className="h-auto object-contain"
        />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          CSCL SMM Hub
        </h1>
        <p className="inline-flex items-center gap-2 text-sm text-muted">
          <span className="size-2 rounded-full bg-success" aria-hidden="true" />
          System status: Walking Skeleton initialized.
        </p>
      </div>
    </section>
  );
}