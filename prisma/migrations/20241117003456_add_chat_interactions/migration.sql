-- CreateTable
CREATE TABLE "chat_interactions" (
    "id" TEXT NOT NULL,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "ai_name" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_gender" "Gender" NOT NULL,
    "timezone" TEXT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "memory_ids" TEXT[],
    "preference_ids" TEXT[],
    "chat_id" TEXT NOT NULL,
    "assistant_response_id" TEXT NOT NULL,

    CONSTRAINT "chat_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ChatInteractionsToChatMessages" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_interactions_assistant_response_id_key" ON "chat_interactions"("assistant_response_id");

-- CreateIndex
CREATE UNIQUE INDEX "_ChatInteractionsToChatMessages_AB_unique" ON "_ChatInteractionsToChatMessages"("A", "B");

-- CreateIndex
CREATE INDEX "_ChatInteractionsToChatMessages_B_index" ON "_ChatInteractionsToChatMessages"("B");

-- AddForeignKey
ALTER TABLE "chat_interactions" ADD CONSTRAINT "chat_interactions_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chats"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_interactions" ADD CONSTRAINT "chat_interactions_assistant_response_id_fkey" FOREIGN KEY ("assistant_response_id") REFERENCES "chat_messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatInteractionsToChatMessages" ADD CONSTRAINT "_ChatInteractionsToChatMessages_A_fkey" FOREIGN KEY ("A") REFERENCES "chat_interactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ChatInteractionsToChatMessages" ADD CONSTRAINT "_ChatInteractionsToChatMessages_B_fkey" FOREIGN KEY ("B") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
