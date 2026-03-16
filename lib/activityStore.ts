import type { ActivityItem, ActivityType } from "@/types/activity";
import { prisma } from "@/lib/db";

const parseMessage = (message: string | null) => {
  if (!message) {
    return { title: "Activity", detail: "" };
  }
  try {
    const parsed = JSON.parse(message) as { title?: string; detail?: string };
    return {
      title: parsed.title ?? "Activity",
      detail: parsed.detail ?? message,
    };
  } catch {
    return { title: "Activity", detail: message };
  }
};

export const getActivities = async () => {
  try {
    const activities = await prisma.activity.findMany({
      orderBy: { createdAt: "desc" },
    });
    return activities.map<ActivityItem>((activity) => {
      const parsed = parseMessage(activity.message);
      return {
        id: activity.id,
        type: activity.type as ActivityType,
        title: parsed.title,
        detail: parsed.detail,
        timestamp: activity.createdAt.toISOString(),
        agentId: activity.agentId ?? undefined,
      };
    });
  } catch (error) {
    console.error("Failed to load activities:", error);
    return [];
  }
};

export const getRecentAgentActivities = async (
  agentId: string,
  limit = 5,
) => {
  try {
    const activities = await prisma.activity.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return activities.map<ActivityItem>((activity) => {
      const parsed = parseMessage(activity.message);
      return {
        id: activity.id,
        type: activity.type as ActivityType,
        title: parsed.title,
        detail: parsed.detail,
        timestamp: activity.createdAt.toISOString(),
        agentId: activity.agentId ?? undefined,
      };
    });
  } catch (error) {
    console.error("Failed to load agent activities:", error);
    return [];
  }
};

export const addActivity = async (input: {
  type: ActivityType;
  title: string;
  detail: string;
  agentId?: string;
}) => {
  try {
    const entry = await prisma.activity.create({
      data: {
        type: input.type,
        agentId: input.agentId,
        message: JSON.stringify({ title: input.title, detail: input.detail }),
      },
    });
    return {
      id: entry.id,
      type: entry.type as ActivityType,
      title: input.title,
      detail: input.detail,
      timestamp: entry.createdAt.toISOString(),
      agentId: entry.agentId ?? undefined,
    } satisfies ActivityItem;
  } catch (error) {
    console.error("Failed to add activity:", error);
    return {
      id: `local-${Date.now()}`,
      type: input.type,
      title: input.title,
      detail: input.detail,
      timestamp: new Date().toISOString(),
      agentId: input.agentId,
    } satisfies ActivityItem;
  }
};
