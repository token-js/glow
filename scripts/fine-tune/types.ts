import { ChatCompletionMessageParam } from "openai/resources";

export type TrainingDataset = Array<{messages: Array<ChatCompletionMessageParam>}>
