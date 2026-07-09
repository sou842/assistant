"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageSquare, Plus, Activity, Workflow } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "../_components/page-header";
import { getInstagramConnection, getAutomationRules, createAutomationRule } from "@/app/actions/automations";

export default function AutomationPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [rules, setRules] = useState<any[]>([]);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [keyword, setKeyword] = useState("");
  const [dmContent, setDmContent] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const connRes = await getInstagramConnection();
        if (connRes.success && connRes.isConnected) {
          setIsConnected(true);
          const rulesRes = await getAutomationRules();
          if (rulesRes.success && rulesRes.data) {
            setRules(rulesRes.data);
          }
        }
      } catch (error) {
        console.error("Failed to load automations", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleConnect = () => {
    // Redirect to the actual OAuth route
    window.location.href = "/api/auth/meta";
  };

  const handleSaveRule = async () => {
    if (!keyword || !dmContent) {
      toast.error("Please fill in all fields");
      return;
    }
    
    setIsSaving(true);
    const res = await createAutomationRule({ keyword, dmContent });
    setIsSaving(false);
    
    if (res.success && res.data) {
      setRules([res.data, ...rules]);
      setIsRuleModalOpen(false);
      setKeyword("");
      setDmContent("");
      toast.success("Automation rule created!");
    } else {
      toast.error(res.error || "Failed to create rule");
    }
  };

  return (
    <div className="flex h-screen flex-col bg-app-background overflow-hidden text-app-text-primary">
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-app-background relative">
          <PageHeader
            icon={<Workflow />}
            title="Automations"
            subtitle="Turn your social media comments into direct messages automatically"
            backHref="/ai"
          />
          <div className="max-w-6xl mx-auto px-4 py-6 md:px-10 md:py-10">
            {isLoading ? (
              <div className="flex justify-center items-center h-48">
                <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : !isConnected ? (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-app-border-default rounded-xl bg-app-surface/20">
                  <div className="mx-auto bg-gradient-to-tr from-pink-500 to-orange-400 w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-pink-500/20">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Connect Instagram</h3>
                  <p className="text-app-text-secondary max-w-md mb-8">
                    Link your Instagram Professional account to start automating replies and direct messages based on keywords.
                  </p>
                  <Button 
                    onClick={handleConnect} 
                    className="gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-full px-8 py-2 h-auto"
                  >
                    Connect with Meta
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-app-surface border border-app-border-default rounded-xl p-5">
                  <div className="flex items-center gap-4">
                    <div className="bg-green-500/10 p-3 rounded-full border border-green-500/20">
                      <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-app-text-primary">Instagram Connected</h3>
                      <p className="text-sm text-app-text-muted">Listening for trigger keywords on your posts.</p>
                    </div>
                  </div>
                  
                  <Dialog open={isRuleModalOpen} onOpenChange={setIsRuleModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2 rounded-full px-6">
                        <Plus className="size-4" />
                        New Automation
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-app-surface border-app-border-default text-app-text-primary">
                      <DialogHeader>
                        <DialogTitle>Create Rule</DialogTitle>
                        <DialogDescription className="text-app-text-muted">
                          Set up an auto-DM for comments containing a specific keyword.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-5 py-4">
                        <div className="space-y-2">
                          <Label className="text-app-text-secondary">If a user comments the keyword:</Label>
                          <Input 
                            placeholder="e.g. LINK or COURSE" 
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            className="bg-app-background border-app-border-default focus-visible:ring-brand-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-app-text-secondary">Send them this Direct Message:</Label>
                          <Input 
                            placeholder="e.g. Here is the link to my course! https://..." 
                            value={dmContent}
                            onChange={(e) => setDmContent(e.target.value)}
                            className="bg-app-background border-app-border-default focus-visible:ring-brand-primary"
                          />
                        </div>
                        <Button disabled={isSaving} onClick={handleSaveRule} className="w-full mt-2 rounded-full">
                          {isSaving ? "Saving..." : "Save Automation"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rules.length === 0 ? (
                    <div className="col-span-full border border-dashed border-app-border-default bg-app-surface/30 rounded-xl flex flex-col items-center justify-center py-16 text-app-text-muted">
                      <MessageSquare className="size-12 mb-4 opacity-20" />
                      <p className="font-medium text-app-text-secondary">No automation rules yet.</p>
                      <p className="text-sm mt-1">Click "New Automation" to get started.</p>
                    </div>
                  ) : (
                    rules.map(rule => (
                      <div key={rule._id} className="relative overflow-hidden group border border-app-border-default bg-app-surface rounded-xl p-5 hover:border-brand-primary/50 transition-colors">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="text-lg font-semibold flex items-center gap-2 text-app-text-primary">
                            <MessageSquare className="size-4 text-blue-500" />
                            "{rule.triggerKeyword}"
                          </h4>
                          <div className="flex items-center gap-1 text-[11px] font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                            <Activity className="size-3" /> {rule.isActive ? "Active" : "Inactive"}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-app-text-muted line-clamp-2">
                            <span className="font-medium text-app-text-secondary mr-2">Sends:</span> 
                            {rule.dmContent}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
