const crypto = require("node:crypto");

const ADMIN_ACK =
  "รับข้อความแล้วครับ ระบบส่งต่อให้แอดมินเรียบร้อยแล้ว กรุณารอการตอบกลับครับ";
const ADMIN_NOT_CONFIGURED =
  "ตอนนี้ระบบติดต่อแอดมินยังตั้งค่าไม่ครบ กรุณาลองใหม่ภายหลังครับ";
const ADMIN_COMMAND_HELP =
  "รูปแบบตอบผู้ใช้: ตอบ TICKET_ID ข้อความที่ต้องการส่งกลับครับ";

function createTicketId() {
  return `T${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function parseAdminReplyCommand(text) {
  const match = String(text ?? "").trim().match(/^(?:ตอบ|reply)\s+([A-Z0-9]+)\s+([\s\S]+)$/i);
  if (!match) return null;
  return { ticketId: match[1].toUpperCase(), message: match[2].trim() };
}

function createAdminRelay({ adminUserId, client, logger }) {
  const tickets = new Map();

  return {
    configured: Boolean(adminUserId),
    async forward({ userId, text }) {
      if (!adminUserId || !userId) return null;

      const ticketId = createTicketId();
      tickets.set(ticketId, {
        createdAt: Date.now(),
        userId,
      });

      try {
        await client.pushMessage({
          to: adminUserId,
          messages: [
            {
              type: "text",
              text:
                `มีข้อความรอแอดมิน [${ticketId}]\n` +
                `ข้อความ: ${String(text).slice(0, 4500)}\n\n` +
                `ตอบกลับด้วย: ตอบ ${ticketId} ข้อความ`,
            },
          ],
        });
        return ticketId;
      } catch (error) {
        tickets.delete(ticketId);
        logger.error("admin_forward_failed", {
          errorCode: error.code ?? "LINE_PUSH_ERROR",
        });
        return null;
      }
    },
    async replyToTicket({ ticketId, message }) {
      const ticket = tickets.get(ticketId);
      if (!ticket) return { ok: false, reason: "unknown_ticket" };

      try {
        await client.pushMessage({
          to: ticket.userId,
          messages: [{ type: "text", text: String(message).slice(0, 5000) }],
        });
        tickets.delete(ticketId);
        return { ok: true };
      } catch (error) {
        logger.error("admin_reply_failed", {
          errorCode: error.code ?? "LINE_PUSH_ERROR",
        });
        return { ok: false, reason: "line_push_failed" };
      }
    },
    getHelp() {
      return ADMIN_COMMAND_HELP;
    },
    getAck() {
      return ADMIN_ACK;
    },
    getNotConfigured() {
      return ADMIN_NOT_CONFIGURED;
    },
    parseReplyCommand: parseAdminReplyCommand,
  };
}

module.exports = {
  ADMIN_ACK,
  ADMIN_COMMAND_HELP,
  ADMIN_NOT_CONFIGURED,
  createAdminRelay,
  parseAdminReplyCommand,
};

