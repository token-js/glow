import { ChatCompletionMessageParam } from "openai/resources";

export type TrainingDataset = Array<{messages: Array<ChatCompletionMessageParam>}>

export type ExportedPiMessage = {
  text: string;
  sender: "AI" | "HUMAN";
  channel: string;
  sent_at: string;
};

export type RawExportedPiData = {
  user_data: {
    details: {
      created_at: string;
      first_name: string;
      identifiers: Array<{
        type: "GOOGLE_OAUTH_ID" | "EMAIL";
        identifier: string;
      }>;
      entry_channel: string;
    };
    messages: ExportedPiMessage[];
  };
  base64encoded_compressed_user_data: string;
  signatures_of_compressed_user_data: string[];
  signature_verification_code: string;
};

export type ParsedExportedPiData = {
  messages: Array<ExportedPiMessage>
  id: string
}

// TODO(later-later): before fine-tuning, check that all of the messages in `clean.jsonl` have a `Done` status.

// TODO(later-later): rename everything below

// TODO(docs): must be in ascending order according to when the step occurs during the cleaning process.
export enum TODOStatus {
  CensoredProfanity = "CensoredProfanity",
  WrongTranscription = "WrongTranscription",
  NewConversations = "NewConversations",
  NegativeUserResponses = "NegativeUserResponses",
  RepeatedStatements = "RepeatedStatements",
  Hallucinations = "Hallucinations",
  Done = "Done"
}

export type TODOMessage = {
  role: 'assistant' | 'user' | 'system'
  content: string
  status: TODOStatus
}

export type TODO = {
  id: string
  messages: Array<TODOMessage>
}
