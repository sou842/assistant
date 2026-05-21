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
    <header className="w-full h-16 shrink-0 border-b border-white/5 bg-black/70 backdrop-blur-xl z-30 sticky top-0">
      <div className="mx-auto max-w-8xl px-5 h-full">
        <div className="flex items-center justify-between gap-4 h-full">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {backHref ? (
              <Link
                href={backHref}
                className="size-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-white shrink-0 hover:bg-white/10 transition"
              >
                <ArrowLeft size={16} />
              </Link>
            ) : (
              <button
                className="md:hidden size-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white shrink-0"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu size={16} />
              </button>
            )}

            <div className="size-9 rounded-xl bg-white/4 border border-white/10 flex items-center justify-center shrink-0">
              {React.cloneElement(icon as React.ReactElement, { className: "size-4 text-indigo-200" })}
            </div>

            <div className="min-w-0 flex-1">
              {typeof title === "string" ? (
                <h1 className="text-base font-medium tracking-tight text-white truncate">{title}</h1>
              ) : (
                title
              )}
              {subtitle && (
                typeof subtitle === "string" ? (
                  <p className="text-xs text-white/35 truncate">{subtitle}</p>
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
