export interface ChatMessage {

  id: string;

  requestId: string;

  senderId: string;

  senderName: string;

  text: string;

  createdAt: Date | null;
}