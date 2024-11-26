import { Settings } from "@prisma/client";

export const convertSQLToSettings = (data: any[] | null): Settings | null => {
  const settings = data?.at(0);

  if (!settings) {
    return null;
  }

  const converted: Settings = {
    id: settings.id,
    name: settings.name,
    gender: settings.gender,
    voice: settings.voice,
    agentName: settings.agent_name,
    audioMessagesEnabled: settings.audio_messages_enabled,
  };

  return converted;
};
