"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Laptop, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themes = [
    {
      id: "light",
      name: "Light",
      description: "Clean and bright appearance",
      icon: Sun,
    },
    {
      id: "dark",
      name: "Dark",
      description: "Easy on the eyes at night",
      icon: Moon,
    },
    {
      id: "system",
      name: "System",
      description: "Matches your device settings",
      icon: Laptop,
    },
  ];

  return (
    <div className="min-h-screen bg-app-background">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center rounded-full border border-app-border-default bg-app-surface-elevated px-3 py-1 text-xs font-medium text-app-text-muted mb-4">
            Preferences
          </div>

          <h1 className="text-4xl font-display font-semibold tracking-tight text-app-text-primary">
            Settings
          </h1>

          <p className="mt-3 max-w-2xl text-app-text-muted text-base leading-relaxed">
            Customize your Jarvis experience, appearance, and interface
            preferences.
          </p>
        </div>

        {/* Appearance Section */}
        <section className="relative overflow-hidden rounded-3xl border border-app-border-default bg-app-surface p-8 shadow-sm">
          {/* subtle gradient glow */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-primary/5 via-transparent to-transparent" />

          <div className="relative">
            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-app-text-primary">
                  Appearance
                </h2>

                <p className="mt-2 text-sm text-app-text-muted">
                  Choose how Jarvis looks across your devices.
                </p>
              </div>

              <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-2xl bg-app-surface-elevated border border-app-border-default">
                <Sun className="size-5 text-brand-primary" />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {themes.map((t) => {
                const Icon = t.icon;
                const isActive = theme === t.id;

                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border p-6 text-left transition-all duration-300",
                      "hover:-translate-y-1 hover:shadow-lg",
                      isActive
                        ? "border-brand-primary bg-app-surface-elevated shadow-md"
                        : "border-app-border-default bg-app-surface hover:border-app-border-strong"
                    )}
                  >
                    {/* active glow */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 to-transparent" />
                    )}

                    <div className="relative flex h-full flex-col">
                      <div className="mb-6 flex items-center justify-between">
                        <div
                          className={cn(
                            "flex h-12 w-12 items-center justify-center rounded-xl transition-colors",
                            isActive
                              ? "bg-brand-primary text-white"
                              : "bg-app-surface-elevated text-app-text-muted group-hover:text-app-text-primary"
                          )}
                        >
                          <Icon className="size-6" />
                        </div>

                        {isActive && (
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-primary">
                            <Check className="size-4 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3
                          className={cn(
                            "text-lg font-semibold transition-colors",
                            isActive
                              ? "text-app-text-primary"
                              : "text-app-text-secondary"
                          )}
                        >
                          {t.name}
                        </h3>

                        <p className="mt-2 text-sm leading-relaxed text-app-text-muted">
                          {t.description}
                        </p>
                      </div>

                      {/* mini preview */}
                      <div className="mt-6 flex gap-2">
                        <div
                          className={cn(
                            "h-2 flex-1 rounded-full",
                            t.id === "light"
                              ? "bg-zinc-200"
                              : t.id === "dark"
                                ? "bg-zinc-700"
                                : "bg-gradient-to-r from-zinc-200 to-zinc-700"
                          )}
                        />
                        <div
                          className={cn(
                            "h-2 w-12 rounded-full",
                            isActive
                              ? "bg-brand-primary"
                              : "bg-app-border-default"
                          )}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}