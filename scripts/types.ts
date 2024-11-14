import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
} from "openai/resources";

export type TrainingDataExample = Array<
  | ChatCompletionMessageParam
  | (ChatCompletionAssistantMessageParam & { weight: 0 | 1 })
>;

export type ExportedPiMessage = {
  text: string;
  sender: "AI" | "HUMAN";
  channel: string;
  sent_at: string;
};

export type RawExportedPiData = {
  user_data: {
    details: {
      createdAt: string;
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
  messages: Array<ExportedPiMessage>;
};
