export const convertSQLToSettings = (data: any[] | null) => {
  const settings = data?.at(0);

  if (!settings) {
    return null;
  }

  return {
    id: settings.id,
    userId: settings.user_id,
    name: settings.name,
    gender: settings.gender,
    voice: settings.voice,
    agentName: settings.agent_name,
  };
};
