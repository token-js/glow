import { ChatCompletionMessageParam } from "openai/resources";
import { ParsedExportedPiData } from "../types";
import { readJsonLinesFile } from "../utils"

// TODO(later): rename
type TODO = {
  id: string
  messages: Array<{
    role: ChatCompletionMessageParam['role']
    content: string
  }>
}

;(async () => {
  const piArray: Array<ParsedExportedPiData> = await readJsonLinesFile('scripts/fine-tune/data/pi.jsonl')
  const cleanArray: Array<TODO> = await readJsonLinesFile('scripts/fine-tune/data/pi.jsonl')
  for (const pi of piArray) {
    const cleanIds = cleanArray.map(c => c.id)
    if (!cleanIds.includes(pi.id)) {
      
    }
  }
})()