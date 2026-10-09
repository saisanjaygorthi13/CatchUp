/**
 * CatchUp - Robust Local Multi-Format Chat Log Parser
 * Supports: WhatsApp (iOS/Android), Slack, Discord, MS Teams, Google Chat, Plain Speaker, and JSON exports.
 * 100% Client-Side. No network calls.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChatParser = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // System message patterns to ignore or classify
  const SYSTEM_PATTERNS = [
    /Messages and calls are end-to-end encrypted/i,
    /created group/i,
    /changed the group (description|icon|name|settings|subject)/i,
    /added you|added [^:]+$/i,
    /removed [^:]+$/i,
    /left the group/i,
    /changed their phone number/i,
    /security code changed/i,
    /missed (voice|video) call/i,
    /You deleted this message/i,
    /This message was deleted/i,
    /pinned a message/i
  ];

  // Regex patterns for chat message headers
  // 1. WhatsApp iOS: [DD/MM/YYYY, HH:MM:SS AM] Name: Text
  //    or [MM/DD/YY, HH:MM AM] Name: Text
  const RX_WHATSAPP_IOS = /^\[(\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?)\]\s*([^:\n\r]{1,50}?):\s*(.*)$/i;

  // 2. WhatsApp Android: DD/MM/YYYY, HH:MM - Name: Text
  const RX_WHATSAPP_ANDROID = /^(\d{1,4}[/.\-]\d{1,2}[/.\-]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?)\s*[-–—]\s*([^:\n\r]{1,50}?):\s*(.*)$/i;

  // 3. Bracketed Timestamp with Sender: [12:30 PM] Name: Text or [12:30] Name: Text
  const RX_TIME_BRACKET = /^\[(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?)\]\s*[-–—]?\s*([^:\n\r]{1,50}?):\s*(.*)$/i;

  // 4. Time first without date: 12:30 PM - Name: Text
  const RX_TIME_DASH = /^(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?)\s*[-–—]\s*([^:\n\r]{1,50}?):\s*(.*)$/i;

  // 5. Slack / Discord / Teams: Name [10:30 AM]: Text or Name Today at 10:30 AM: Text
  const RX_NAME_TIME_COLON = /^([^:\n\r[\]]{1,50}?)\s*(?:\[|\(|—\s*Today at\s*|\s+at\s+)(\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?)(?:\]|\))?:\s*(.*)$/i;

  // 6. Simple Speaker colon: Name: Text
  const RX_SPEAKER_COLON = /^([A-Za-z0-9][\w .'-]{0,35}?):\s+(.*)$/;

  /**
   * Main parsing entry point
   * @param {string} raw - raw chat text or JSON string
   * @returns {Array<{id: number, ts: string, sender: string, text: string, raw: string, isSystem: boolean}>}
   */
  function parse(raw) {
    if (!raw || typeof raw !== 'string') return [];

    const trimmed = raw.trim();
    if (!trimmed) return [];

    // Attempt JSON parsing if text starts with [ or {
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsedJson = JSON.parse(trimmed);
        const jsonMessages = normalizeJsonMessages(parsedJson);
        if (jsonMessages.length) return jsonMessages;
      } catch (e) {
        // Fall back to line-by-line parsing
      }
    }

    const lines = trimmed.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const messages = [];

    // First pass: detect if timestamped formats are present
    const hasTimestamps = lines.some(l => 
      RX_WHATSAPP_IOS.test(l) || 
      RX_WHATSAPP_ANDROID.test(l) || 
      RX_TIME_BRACKET.test(l) || 
      RX_TIME_DASH.test(l) ||
      RX_NAME_TIME_COLON.test(l)
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      let match;
      let matched = false;

      // Check WhatsApp iOS
      if ((match = line.match(RX_WHATSAPP_IOS))) {
        pushMessage(messages, match[1], match[2], match[3], line);
        matched = true;
      }
      // Check WhatsApp Android
      else if ((match = line.match(RX_WHATSAPP_ANDROID))) {
        pushMessage(messages, match[1], match[2], match[3], line);
        matched = true;
      }
      // Check Time Bracket
      else if ((match = line.match(RX_TIME_BRACKET))) {
        pushMessage(messages, match[1], match[2], match[3], line);
        matched = true;
      }
      // Check Time Dash
      else if ((match = line.match(RX_TIME_DASH))) {
        pushMessage(messages, match[1], match[2], match[3], line);
        matched = true;
      }
      // Check Name with time
      else if ((match = line.match(RX_NAME_TIME_COLON))) {
        pushMessage(messages, match[2], match[1], match[3], line);
        matched = true;
      }
      // Check Simple speaker if no timestamps or fallback
      else if (!hasTimestamps && (match = line.match(RX_SPEAKER_COLON))) {
        pushMessage(messages, '', match[1], match[2], line);
        matched = true;
      }
      // If we couldn't match a new message header, this is a continuation of previous message
      else {
        if (messages.length > 0) {
          const last = messages[messages.length - 1];
          last.text += '\n' + line.trim();
          last.raw += '\n' + line;
        } else {
          // If leading line doesn't match, check if speaker format can apply
          if ((match = line.match(RX_SPEAKER_COLON))) {
            pushMessage(messages, '', match[1], match[2], line);
          } else {
            pushMessage(messages, '', 'System', line.trim(), line);
          }
        }
      }
    }

    // Filter out obvious system noise while preserving message indexing
    return messages.map((m, idx) => {
      m.id = idx;
      m.isSystem = SYSTEM_PATTERNS.some(p => p.test(m.text) || p.test(m.sender));
      return m;
    });
  }

  function pushMessage(list, ts, sender, text, raw) {
    const cleanSender = (sender || 'Unknown').trim().replace(/^[~@\s]+/, '');
    const cleanText = (text || '').trim();
    const cleanTs = (ts || '').trim();

    list.push({
      id: list.length,
      ts: cleanTs,
      sender: cleanSender,
      text: cleanText,
      raw: raw
    });
  }

  function normalizeJsonMessages(json) {
    let arr = Array.isArray(json) ? json : (json.messages || json.chats || json.data || []);
    if (!Array.isArray(arr) || !arr.length) return [];

    return arr.map((item, idx) => ({
      id: idx,
      ts: String(item.ts || item.time || item.timestamp || item.date || ''),
      sender: String(item.sender || item.author || item.user || item.name || 'Unknown'),
      text: String(item.text || item.message || item.content || item.body || ''),
      raw: JSON.stringify(item),
      isSystem: false
    })).filter(m => m.text.trim().length > 0);
  }

  return {
    parse: parse
  };
});
