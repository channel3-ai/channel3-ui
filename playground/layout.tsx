import * as React from "react";
import { Code } from "lucide-react";

import { cn } from "@/lib/utils";

export type ColSpan = 4 | 5 | 6 | 7 | 8 | 12;

export function DemoTile({
  id,
  title,
  description,
  span = 6,
  controls,
  children,
  className,
}: {
  id: string;
  title: string;
  description?: string;
  span?: ColSpan;
  controls?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const spanClass: Record<ColSpan, string> = {
    4: "lg:col-span-4",
    5: "lg:col-span-5",
    6: "lg:col-span-6",
    7: "lg:col-span-7",
    8: "lg:col-span-8",
    12: "lg:col-span-12",
  };

  return (
    <article
      id={id}
      className={cn(
        "col-span-12 flex min-h-0 flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm",
        spanClass[span],
        className,
      )}
    >
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-sm font-semibold leading-tight">{title}</h3>
          {description ? (
            <p className="text-xs text-muted-foreground leading-snug">{description}</p>
          ) : null}
        </div>
        {controls ? <div className="flex shrink-0 flex-wrap gap-2">{controls}</div> : null}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </article>
  );
}

export function ComponentCanvas({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-4">{children}</div>
  );
}

export function BlockSection({
  id,
  title,
  description,
  controls,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="flex flex-col gap-4 scroll-mt-24">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? <p className="max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {controls ? <div className="flex shrink-0 flex-wrap gap-2">{controls}</div> : null}
      </div>
      {children}
    </section>
  );
}

const NAV = [
  { label: "Components", href: "#components" },
  { label: "Blocks", href: "#blocks" },
] as const;

export function PlaygroundChrome({
  dark,
  onToggleDark,
  children,
}: {
  dark: boolean;
  onToggleDark: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 pb-24 sm:px-6">
      <header className="sticky top-0 z-10 -mx-4 border-b bg-background/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Channel3 UI</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Component canvas, then compound blocks.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
            <a
              href="https://github.com/channel3-ai/channel3-ui"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Code className="size-4" />
              Install
            </a>
            <button
              type="button"
              onClick={onToggleDark}
              className="rounded-md border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
            >
              {dark ? "Light" : "Dark"}
            </button>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

export function ZoneHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description?: string;
}) {
  return (
    <div id={id} className="flex flex-col gap-1 scroll-mt-24 border-t pt-10">
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? <p className="max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
