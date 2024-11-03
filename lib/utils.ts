export const convertSQLToSettings = (data: any[] | null) => {
  const settings = data?.at(0)

  if (!settings) {
    return null
  }

  return {
    id: settings.id,
    name: settings.name,
    gender: settings.gender,
    voice: settings.voice,
    aiName: settings.aiName
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));