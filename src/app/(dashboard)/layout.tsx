export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
