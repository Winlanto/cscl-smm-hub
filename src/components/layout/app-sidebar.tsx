"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_ITEMS = [{ href: "/", label: "Dashboard" }] as const;

function BrandLink({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="p-4">
      <Link href="/" onClick={onNavigate} className="flex items-center gap-0.5">
        <Image
          src="/cscl-logo.png"
          alt="CSCL"
          width={50}
          height={50}
          className="h-auto object-contain"
        />
        <span className="leading-tight flex flex-col text-sm gap-0.5">
          <span className="font-bold tracking-tight text-foreground">CSCL</span>
          <span className="text-muted">SMM Hub</span>
        </span>
      </Link>
    </div>
  );
}

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 pb-4"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-border/70 text-foreground"
                : "text-muted hover:bg-border/50 hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface lg:flex">
        <BrandLink />
        <Nav />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 pr-4 backdrop-blur lg:hidden">
        <BrandLink />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
          aria-expanded={isOpen}
          aria-controls="mobile-nav-drawer"
          className="rounded-md p-2 text-muted transition-colors hover:bg-border/50 hover:text-foreground"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {isOpen && (
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className="fixed inset-0 z-50 flex lg:hidden"
        >
          <div
            onClick={close}
            aria-hidden="true"
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          />
          <div className="relative z-10 flex h-dvh w-64 max-w-[80vw] flex-col border-r border-border bg-surface">
            <div className="flex items-center justify-between pr-3">
              <BrandLink onNavigate={close} />
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="rounded-md p-2 text-muted transition-colors hover:bg-border/50 hover:text-foreground"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <Nav onNavigate={close} />
          </div>
        </div>
      )}
    </>
  );
}
