"use client";

import React from "react";
import { Menu, ArrowLeft } from "lucide-react";
import { useAI } from "./ai-provider";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface PageHeaderProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
}

export function PageHeader({ icon, title, subtitle, children, actions, backHref }: PageHeaderProps) {
  const { setMobileSidebarOpen } = useAI();

  return (
    <header className="sticky top-0 z-30 h-16 w-full shrink-0 border-0 border-app-border-default bg-app-canvas/70 backdrop-blur-xl">
      <div className="mx-auto max-w-8xl px-5 h-full">
        <div className="flex items-center justify-between gap-4 h-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {backHref ? (
              <Link
                href={backHref}
                className="size-9 shrink-0 rounded-full border border-app-border-default bg-app-surface-glass flex items-center justify-center text-app-text-primary transition hover:bg-app-surface-glass-strong"
              >
                <ArrowLeft size={16} />
              </Link>
            ) : (
              <button
                className="md:hidden size-9 shrink-0 rounded-xl border border-app-border-default bg-app-surface-glass flex items-center justify-center text-app-text-primary"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu size={16} />
              </button>
            )}

            <div className="size-9 shrink-0 flex items-center justify-center rounded-full bg-app-surface-elevated">
              {React.cloneElement(icon as React.ReactElement, { className: "size-4 text-brand-primary" })}
            </div>

            <div className="min-w-0 flex-1">
              {typeof title === "string" ? (
                <h1 className="truncate text-base font-medium tracking-tight text-app-text-primary">{title}</h1>
              ) : (
                title
              )}
              {subtitle && (
                typeof subtitle === "string" ? (
                  <p className="truncate text-xs text-app-text-faint">{subtitle}</p>
                ) : (
                  subtitle
                )
              )}
            </div>
          </div>


          {children && <div className="w-fit hidden md:flex items-center flex-1 justify-end max-w-xl mx-4">
            {children}
          </div>
          }

          {actions && <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
          }
        </div>
      </div>
    </header>
  );
}
