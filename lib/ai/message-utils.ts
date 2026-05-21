import type { FileUIPart, UIMessage } from "ai";

export const getMessageText = (message: UIMessage) => {
  if (message.parts) {
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");
  }

  const legacyContent = (message as { content?: unknown }).content;
  return typeof legacyContent === "string" ? legacyContent : "";
};

export const getMessageReasoning = (message: UIMessage) => {
  if (message.parts) {
    return message.parts
      .filter((part) => part.type === "reasoning")
      .map((part) => ("reasoning" in part ? part.reasoning : part.text))
      .join("");
  }

  return "";
};

export const getMessageAttachments = (message: UIMessage): FileUIPart[] => {
  if (message.parts) {
    return message.parts.filter((part): part is FileUIPart => part.type === "file");
  }

  return [];
};
