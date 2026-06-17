"use client";

import React, { useState, useId } from "react";
import { PageHeader } from "../../_components/page-header";
import { Bot, Clock, Zap, MessageSquare, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
import { scheduleTemplates, ScheduleTemplate } from "@/lib/schedule-templates";
import { toast } from "sonner";
import { mutate } from "swr";

const iconMap: Record<string, React.ReactNode> = {
  "Productivity & Work": <Briefcase className="size-5 text-blue-400" />,
  "Reminders & Alerts": <Clock className="size-5 text-amber-400" />,
  "Communication": <MessageSquare className="size-5 text-emerald-400" />
};

export default function TemplatesPage() {
  const router = useRouter();

  // Unique IDs for accessibility
  const dateInputId = useId();
  const timeInputId = useId();
  const recurNumId = useId();
  const recurUnitId = useId();

  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [scheduleType, setScheduleType] = useState<"one_time" | "recurring">("one_time");
  const [runDate, setRunDate] = useState<string>("");
  const [runTime, setRunTime] = useState<string>("");
  const [recurNumber, setRecurNumber] = useState<number>(1);
  const [recurUnit, setRecurUnit] = useState<number>(1440);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Group templates by category safely
  const categoriesMap = scheduleTemplates.reduce((acc, tpl) => {
    if (!acc[tpl.category]) acc[tpl.category] = [];
    acc[tpl.category].push(tpl);
    return acc;
  }, {} as Record<string, ScheduleTemplate[]>);

  const categories = Object.keys(categoriesMap).map(category => ({
    title: category,
    icon: iconMap[category] || <Zap className="size-5 text-app-primary" />,
    templates: categoriesMap[category]
  }));

  const handleOpenTemplate = (template: ScheduleTemplate) => {
    setSelectedTemplate(template);
    setFormValues({});
    setScheduleType(template.defaultSchedule.scheduleType || "one_time");
    setRecurNumber(1);
    setRecurUnit(template.defaultSchedule.intervalMinutes || 1440);

    // Fix: Timezone-safe local ISO calculation
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now.getTime() - tzOffsetMs).toISOString();

    setRunDate(localISOTime.split('T')[0]);
    setRunTime(now.toTimeString().slice(0, 5));
  };

  const handleInputChange = (fieldId: string, value: string) => {
    setFormValues(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    let calculatedRunAt: string | undefined = undefined;

    if (scheduleType === "one_time") {
      if (!runDate || !runTime) {
        toast.error("Please provide both execution date and time.");
        return;
      }

      // Correctly parses string format YYYY-MM-DDTHH:mm into local timezone context
      const targetDate = new Date(`${runDate}T${runTime}`);

      if (isNaN(targetDate.getTime())) {
        toast.error("Invalid date or time formatted.");
        return;
      }

      if (targetDate < new Date()) {
        toast.error("Execution time must be in the future.");
        return;
      }

      calculatedRunAt = targetDate.toISOString();
    }

    setIsSubmitting(true);
    try {
      const generated = selectedTemplate.generateTask(formValues);

      const taskPayload = {
        ...generated,
        scheduleType,
        ...(scheduleType === "one_time" ? { runAt: calculatedRunAt } : { intervalMinutes: recurNumber * recurUnit })
      };

      const res = await fetch("/api/schedule/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskPayload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error(json.error || "Failed to create task");
      } else {
        toast.success("Schedule task created successfully");
        mutate("/api/schedule/tasks");
        setSelectedTemplate(null);
        router.push("/ai/schedule");
      }
    } catch (error) {
      toast.error("An unexpected network error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen relative overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0 relative">
        <PageHeader
          icon={<Bot />}
          title="Schedule Templates"
          subtitle="Pre-built automations to get you started"
          backHref="/ai/schedule"
        />

        <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10 p-5 sm:p-8">
          <div className="mx-auto w-full max-w-7xl space-y-12">
            {categories.map((category) => (
              <section key={category.title}>
                <div className="flex items-center gap-3 mb-6">
                  {category.icon}
                  <h2 className="text-xl font-semibold text-app-text-primary">{category.title}</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {category.templates.map((template) => (
                    <div
                      key={template.id}
                      className="group flex flex-col justify-between rounded-2xl border border-app-border-default bg-app-surface-glass p-5 hover:bg-app-surface-glass-strong hover:border-app-border-strong transition-all duration-300"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-medium text-app-text-primary">{template.title}</h3>
                          <Zap className="size-4 text-app-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <p className="text-sm text-app-text-soft mb-6">{template.description}</p>
                      </div>
                      <Button
                        onClick={() => handleOpenTemplate(template)}
                        className="w-full rounded-full bg-app-primary/10 text-app-primary hover:bg-app-primary hover:text-app-primary-foreground transition-colors"
                      >
                        Use Template
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>

      <Sheet open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-6 p-[11px] border-b border-app-border-subtle">
            <div className="flex flex-col items-start gap-1">
              <div className="text-left space-y-1">
                <SheetTitle className="text-sm font-semibold tracking-tight">{selectedTemplate?.title}</SheetTitle>
                <SheetDescription className="text-xs text-app-text-soft leading-snug">{selectedTemplate?.description}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          {selectedTemplate && (
            <form onSubmit={handleSubmit} className="space-y-6 mt-6 p-3 pb-8">

              {/* Configuration Section */}
              <div className="space-y-5 bg-app-surface-glass-soft border border-app-border-subtle rounded-2xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-app-text-primary flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold">1</span>
                  Configuration
                </h4>
                <div className="space-y-4">
                  {selectedTemplate.fields.map(field => (
                    <div key={field.id} className="space-y-1.5">
                      <label htmlFor={field.id} className="text-sm font-medium text-app-text-primary">
                        {field.label}
                      </label>
                      <Input
                        id={field.id}
                        type={field.type}
                        required={field.required}
                        placeholder={field.placeholder}
                        value={formValues[field.id] || ""}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="bg-app-surface border-app-border-strong focus-visible:ring-app-primary transition-all shadow-sm rounded-full"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Scheduling Options Section */}
              <div className="space-y-5 bg-app-surface-glass-soft border border-app-border-subtle rounded-2xl p-5 shadow-sm">
                <h4 className="text-sm font-semibold text-app-text-primary flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold">2</span>
                  Scheduling Options
                </h4>

                <div className="space-y-4">
                  <div className="flex rounded-full bg-app-surface border border-app-border-strong p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setScheduleType("one_time")}
                      className={`flex-1 rounded-full text-sm font-medium py-1.5 transition-all cursor-pointer ${scheduleType === "one_time" ? "bg-app-surface-glass-strong shadow-sm text-app-text-primary" : "text-app-text-soft hover:text-app-text-primary"}`}
                    >
                      One Time
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleType("recurring")}
                      className={`flex-1 rounded-full text-sm font-medium py-1.5 transition-all cursor-pointer ${scheduleType === "recurring" ? "bg-app-surface-glass-strong shadow-sm text-app-text-primary" : "text-app-text-soft hover:text-app-text-primary"}`}
                    >
                      Recurring
                    </button>
                  </div>

                  {scheduleType === "one_time" && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-1.5">
                        <label htmlFor={dateInputId} className="text-xs font-medium text-app-text-soft uppercase tracking-wider">Date</label>
                        <Input
                          id={dateInputId}
                          type="date"
                          required
                          value={runDate}
                          onChange={(e) => setRunDate(e.target.value)}
                          className="bg-app-surface border-app-border-strong shadow-sm rounded-full"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor={timeInputId} className="text-xs font-medium text-app-text-soft uppercase tracking-wider">Time</label>
                        <Input
                          id={timeInputId}
                          type="time"
                          required
                          value={runTime}
                          onChange={(e) => setRunTime(e.target.value)}
                          className="bg-app-surface border-app-border-strong shadow-sm rounded-full"
                        />
                      </div>
                    </div>
                  )}

                  {scheduleType === "recurring" && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                      <label htmlFor={recurNumId} className="text-xs font-medium text-app-text-soft uppercase tracking-wider">Repeat Every</label>
                      <div className="flex gap-3">
                        <Input
                          id={recurNumId}
                          type="number"
                          required
                          min={1}
                          value={recurNumber}
                          onChange={(e) => setRecurNumber(Number(e.target.value))}
                          className="bg-app-surface border-app-border-strong w-24 text-center shadow-sm rounded-full"
                        />
                        <label htmlFor={recurUnitId} className="sr-only">Interval Unit</label>
                        <select
                          id={recurUnitId}
                          value={recurUnit}
                          onChange={(e) => setRecurUnit(Number(e.target.value))}
                          className="flex h-10 flex-1 items-center justify-between rounded-full border border-app-border-strong bg-app-surface px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-app-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                        >
                          <option value={1}>Minutes</option>
                          <option value={60}>Hours</option>
                          <option value={1440}>Days</option>
                          <option value={10080}>Weeks</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <SheetFooter className="pt-4 mt-8 flex gap-3">
                <Button type="submit" disabled={isSubmitting} className="flex-1 rounded-full bg-app-primary text-app-primary-foreground hover:bg-app-primary-hover h-11">
                  {isSubmitting ? "Creating..." : "Create Automation"}
                </Button>
              </SheetFooter>
            </form>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}