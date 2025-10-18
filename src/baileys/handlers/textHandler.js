import logger from "../../utils/logger.js";
import { getContactName } from "../../utils/contacts.js";
import { getDisplayName, parseJid, removeBotMention, replaceMentionsWithNames } from "../../utils/helpers.js";
import { invokeAgent } from "../../agents/apiAgent.js";

export async function textHandler(sock, msg) {
    const remoteJid = msg.key.remoteJid;
    const senderJid = msg.key.participant || remoteJid;
    const isGroup = remoteJid.endsWith("@g.us");

    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const botJid = parseJid(sock.user.lid || sock.user.id);

    if (isGroup) {
        const hasMention = mentions.includes(botJid);
        const hasQuoted = !!msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (!hasMention && !hasQuoted) {
            logger.info(`📭 Ignored group message in ${remoteJid} (no mention/quote)`);
            return;
        }
    }

    let messageText = (
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        ""
    ).trim();

    messageText = removeBotMention(messageText, botJid);
    messageText = replaceMentionsWithNames(messageText, mentions, sock.store.contacts);

    const senderName = getContactName(senderJid, sock.store.contacts) || getDisplayName(msg.pushName);

    let quotedContext = "";
    const contextInfo = msg.message.extendedTextMessage?.contextInfo;
    const quotedMsg = contextInfo?.quotedMessage;
    const quotedJid = contextInfo?.participant;
    const quotedMentions = quotedMsg?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    if (quotedMsg) {
        let quotedText =
            quotedMsg.conversation ||
            quotedMsg.extendedTextMessage?.text ||
            "";

        quotedText = replaceMentionsWithNames(quotedText, quotedMentions, sock.store.contacts, botJid);

        const quotedName = quotedJid === botJid
            ? "Assistant"
            : getContactName(quotedJid, sock.store.contacts);

        quotedContext = `Replying to ${quotedName}: "${quotedText}"`;
    }

    const fullMessageContext = [
        `[User: ${senderName}]`,
        quotedContext,
        `Message: "${messageText}"`
    ].filter(Boolean).join("\n");

    try {
        await sock.sendPresenceUpdate("composing", remoteJid);

        const reply = await invokeAgent(remoteJid, senderJid, fullMessageContext);

        await sock.sendMessage(remoteJid, { text: reply });

        logger.info(`✅ Replied to ${remoteJid}: ${reply.slice(0, 100)}`);
    } catch (err) {
        logger.error(`❌ Error processing message from ${remoteJid}:`, err);

        try {
            await sock.sendMessage(remoteJid, {
                text: "⚠️ Sorry, something went wrong processing your message.",
            });
        } catch (sendErr) {
            logger.error(`❌ Failed to send error message to ${remoteJid}:`, sendErr);
        }
    } finally {
        try {
            await sock.sendPresenceUpdate("paused", remoteJid);
        } catch (presenceErr) {
            logger.warn(`⚠️ Failed to reset presence for ${remoteJid}:`, presenceErr);
        }
    }
}

