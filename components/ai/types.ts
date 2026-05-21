import type { FileUIPart } from "ai";

export type ChatRequestOptions = {
  body?: Record<string, unknown>;
} & Record<string, unknown>;

export type ChatMessagePayload = {
  text: string;
  files: FileUIPart[];
};

export type SendChatMessage = (
  message: ChatMessagePayload,
  options?: ChatRequestOptions
) => Promise<void>;

export type RegenerateChatMessage = (options?: ChatRequestOptions) => void;
