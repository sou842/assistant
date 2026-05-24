"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Bot,
  Code2,
  GitPullRequest,
  MessageSquare,
  Plus,
  Search,
  Workflow,
  Youtube,
} from "lucide-react";

import { PageHeader } from "../_components/page-header";

const PREBUILT_WORKFLOWS = [
  {
    id: "code-reviewer",
    title: "AI Code Reviewer",
    description: "Review GitHub repositories with AI.",
    icon: Code2,
    chain: ["GitHub", "AI", "PR"],
  },
  {
    id: "daily-briefing",
    title: "Daily Briefing",
    description: "Weather and meetings summary.",
    icon: Bot,
    chain: ["Calendar", "AI", "WhatsApp"],
  },
  {
    id: "email-triage",
    title: "Email Assistant",
    description: "Summarize emails automatically.",
    icon: MessageSquare,
    chain: ["Gmail", "AI", "Summary"],
  },
  {
    id: "meeting-scheduler",
    title: "Meeting Scheduler",
    description: "Create meetings automatically.",
    icon: Workflow,
    chain: ["Contacts", "Meet", "Calendar"],
  },
  {
    id: "youtube-summarizer",
    title: "YouTube Summarizer",
    description: "Generate video summaries.",
    icon: Youtube,
    chain: ["YouTube", "AI", "Notes"],
  },
  {
    id: "github-pr-creator",
    title: "PR Generator",
    description: "Generate PR descriptions using AI.",
    icon: GitPullRequest,
    chain: ["Commits", "AI", "PR"],
  },
];

export default function PlaygroundTemplatesPage() {
  const [query, setQuery] = useState("");

  const filteredWorkflows = useMemo(() => {
    return PREBUILT_WORKFLOWS.filter(
      (workflow) =>
        workflow.title.toLowerCase().includes(query.toLowerCase()) ||
        workflow.description
          .toLowerCase()
          .includes(query.toLowerCase())
    );
  }, [query]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-black text-white">
      {/* FIXED TOP */}
      <div className="shrink-0 border-b border-white/10 bg-black">
        <PageHeader
          icon={<Blocks />}
          title="Workflow Templates"
          subtitle="Start with a pre-built AI workflow."
        >
          <Link
            href="/ai/playground/create"
            className="flex h-9 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-black transition hover:opacity-90"
          >
            <Plus className="size-4" />
            Create
          </Link>
        </PageHeader>

        {/* HERO */}
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
          <div className="p-5">
            <div className="flex flex-col gap-5 items-center justify-between text-center">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Build AI workflows
                </h1>

                <p className="mt-1 text-sm text-white/60">
                  Connect AI, APIs, and automations together.
                </p>
              </div>

              <div className="relative w-full max-w-[500px]">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40" />

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search workflows..."
                  className="h-11 w-full rounded-full border border-white/10 bg-black/40 pl-11 pr-4 text-sm outline-none transition-all placeholder:text-white/30 focus:border-white/30"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {/* CREATE CARD */}
            <Link
              href="/ai/playground/create"
              className="group rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.04]"
            >
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-xl bg-white text-black">
                  <Plus className="size-4" />
                </div>

                <ArrowRight className="size-4 text-white/30 transition-all group-hover:translate-x-1 group-hover:text-white/70" />
              </div>

              <h3 className="mt-4 text-base font-semibold">
                Create from Scratch
              </h3>

              <p className="mt-1 text-sm text-white/55">
                Start with a blank workflow canvas.
              </p>
            </Link>

            {/* TEMPLATE CARDS */}
            {filteredWorkflows.map((workflow) => {
              const Icon = workflow.icon;

              return (
                <Link
                  key={workflow.id}
                  href={`/ai/playground/create?template=${workflow.id}`}
                  className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-black">
                      <Icon className="size-4 text-white" />
                    </div>

                    <ArrowRight className="size-4 text-white/30 transition-all group-hover:translate-x-1 group-hover:text-white/70" />
                  </div>

                  <h3 className="mt-4 text-base font-semibold">
                    {workflow.title}
                  </h3>

                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/55">
                    {workflow.description}
                  </p>

                  {/* FLOW */}
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {workflow.chain.map((item, i) => (
                      <React.Fragment key={item}>
                        <div className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white/70">
                          {item}
                        </div>

                        {i !== workflow.chain.length - 1 && (
                          <ArrowRight className="size-3 text-white/20" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}