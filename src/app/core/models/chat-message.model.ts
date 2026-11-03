export type ChatMessageType = 'text' | 'image';

export interface ChatMessage {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  type: ChatMessageType;
  text: string;
  imagePath: string | null;
  createdAt: Date | null;
}
