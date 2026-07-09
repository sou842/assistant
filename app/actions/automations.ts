"use server";

import dbConnect from "@/lib/mongodb";
import InstagramConnection from "@/lib/models/InstagramConnection";
import AutomationRule from "@/lib/models/AutomationRule";
import { auth } from "@/auth";

export async function getInstagramConnection() {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  await dbConnect();
  try {
    const connection = await InstagramConnection.findOne({ userId: session.user.id });
    if (!connection) return { success: true, isConnected: false };
    
    // We don't want to leak access tokens to the client, so only send a safe boolean/status
    return { 
      success: true, 
      isConnected: true, 
      accountId: connection.instagramAccountId 
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getAutomationRules() {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  await dbConnect();
  try {
    const rules = await AutomationRule.find({ userId: session.user.id }).sort({ createdAt: -1 });
    return { success: true, data: JSON.parse(JSON.stringify(rules)) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createAutomationRule(data: { keyword: string; dmContent: string }) {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  await dbConnect();
  try {
    const rule = await AutomationRule.create({
      userId: session.user.id,
      platform: "instagram",
      triggerKeyword: data.keyword,
      dmContent: data.dmContent,
      isActive: true,
      matchType: "contains"
    });
    return { success: true, data: JSON.parse(JSON.stringify(rule)) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
