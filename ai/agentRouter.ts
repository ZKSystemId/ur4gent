export const routeAgentTask = (taskId: string) => {
  return {
    taskId,
    status: "queued",
  };
};
