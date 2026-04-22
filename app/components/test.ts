import { NextResponse } from "next/server";
import firebase from "@/configs/firebase";
import { getSMToken } from "../../salesmsg/service";

const AFTER_DATE = new Date("2026-03-01T00:00:00Z").getTime();
const BEFORE_DATE = new Date("2026-04-16T00:00:00Z").getTime();

// CONFIG
const MESSAGE_LIMIT = 300;
const CONVO_LIMIT = 100;
const CONCURRENT_BATCH = 4;
const FIRESTORE_BATCH_LIMIT = 400;
const OFFSET_LIMIT = 10000; 

// ---------------- SAFE FETCH (NO CRASH ON HTML) ----------------
async function safeFetchJSON(url: string, options: any) {
  try {
    const res = await fetch(url, options);

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    // Detect HTML fallback (SalesMessage bug / auth / permission issue)
    if (
      !res.ok ||
      !contentType.includes("application/json") ||
      text.trim().startsWith("<!DOCTYPE")
    ) {
      console.error("BAD RESPONSE (skipping)");
      console.error("URL:", url);
      console.error("STATUS:", res.status);
      console.error("BODY:", text.slice(0, 200));

      return null; // IMPORTANT: do not throw
    }

    return JSON.parse(text);
  } catch (err) {
    console.error("NETWORK ERROR:", err);
    return null;
  }
}

// ---------------- FETCH CONVERSATIONS ----------------
    async function fetchConversationsByFilter({
    token,
    filter,
    }: {
    token: string;
    filter: string;
    }) {
    let offset = 0;
    const all: any[] = [];

    while (true) {
        // Guard: stop if offset exceeds the cap
        if (offset >= OFFSET_LIMIT) {
        console.warn(
            `OFFSET_LIMIT (${OFFSET_LIMIT}) reached for filter "${filter}" — some conversations may be skipped`
        );
        break;
        }

        const url = `https://api.salesmessage.com/pub/v2.2/conversations?filter=${encodeURIComponent(
        filter
        )}&limit=${CONVO_LIMIT}&offset=${offset}&before=${new Date(
        BEFORE_DATE
        ).toISOString()}&after=${new Date(AFTER_DATE).toISOString()}&grouped_response=true`;

        const json = await safeFetchJSON(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        },
        });

        if (!json) break;

        const convos = json?.data?.conversations || json?.conversations || [];

        if (!Array.isArray(convos) || convos.length === 0) break;

        all.push(...convos);

        if (convos.length < CONVO_LIMIT) break;

        offset += CONVO_LIMIT;
    }

    console.log(`Filter "${filter}" DONE → Total: ${all.length}`);

    return all;
    }

// ---------------- FETCH MESSAGES ----------------
async function fetchMessagesForConversation(token: string, convo: any) {
  const seenIds = new Set<string>();   // fix #6 — dedup across pages
  let allMessages: any[] = [];
  let beforeId: number | null = null;

  while (true) {
    const url = new URL(
      `https://api.salesmessage.com/pub/v2.2/messages/${convo.id}`
    );
    url.searchParams.append("limit", MESSAGE_LIMIT.toString());
    if (beforeId !== null) {
      url.searchParams.append("before_id", String(beforeId));
    }

    const messages = await safeFetchJSON(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Fix #4 — single clear guard, no redundant checks below
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("API ERROR:", { convoId: convo.id, response: messages });
      break;
    }

    // Fix #6 — deduplicate before pushing
    const newMessages = messages.filter(
      (m: any) => m?.id && !seenIds.has(String(m.id))
    );
    for (const m of newMessages) seenIds.add(String(m.id));

    // Filter by date range
    const filtered = newMessages.filter((m: any) => {
      if (!m?.created_at) return false;
      const t = new Date(m.created_at).getTime();
      return t >= AFTER_DATE && t <= BEFORE_DATE;
    });

    allMessages.push(...filtered);

    // Fix #5 — check date boundary on FILTERED result first
    // If nothing passed the filter, all messages are out of range → stop now
    if (filtered.length === 0 && newMessages.length > 0) {
      const firstTime = new Date(newMessages[0].created_at).getTime();
      const lastTime  = new Date(newMessages[newMessages.length - 1].created_at).getTime();

      // Entire page is before our window → no point fetching further back
      if (lastTime < AFTER_DATE) {
        console.log(`Date boundary reached for convo: ${convo.id}`);
        break;
      }

      // Entire page is after our window → keep paginating forward
      if (firstTime > BEFORE_DATE) {
        // advance cursor and continue
      }
    }

    // Advance ID cursor
    const lastMsg = newMessages[newMessages.length - 1];
    if (!lastMsg?.id) break;
    beforeId = lastMsg.id;

    // Stop if oldest message on this page is before our range
    const lastTime = new Date(lastMsg.created_at).getTime();
    if (lastTime < AFTER_DATE) break;

    // Fix #4 — single clean last-page check, no commented twin above it
    if (messages.length < MESSAGE_LIMIT) {
      console.log(`Last page reached for convo: ${convo.id}`);
      break;
    }
  }

  return allMessages;
}

// ---------------- SAVE ----------------
async function saveAllMessages(messages: any[]) {
  let batch = firebase.batch();
  let count = 0;

  for (const msg of messages) {
    let payload: any = null;

    if (msg.user_id && msg.type === "sms") {
      payload = {
        id: String(msg.id),
        communication_type: "Message OutBound",
        sender_id: msg.user_id,
        receiver_id: msg.contact?.id ?? msg.contact_id ?? null,
        conversation_id: msg.conversation_id,
        team_id: msg.inbox_id ?? 0,
        createdAt: new Date(msg.created_at),
      };
    }

    if (msg.type === "call" && msg.status === "record" && msg.user_id) {
      payload = {
        id: String(msg.id),
        communication_type: "Call OutBound",
        caller_id: msg.user_id,
        receiver_id: msg.contact?.id ?? msg.contact_id ?? null,
        conversation_id: msg.conversation_id,
        team_id: msg.inbox_id ?? 0,
        createdAt: new Date(msg.created_at),
      };
    }

    if (!payload) continue;

    const ref = firebase.collection("SalesMessageLogs").doc(payload.id);

    batch.set(ref, payload, { merge: true });
    count++;

    if (count >= FIRESTORE_BATCH_LIMIT) {
        try {
            await batch.commit();
            batch = firebase.batch(); // this line is MISSING
            count = 0;
        } catch (error) {
            console.error("Firestore batch commit error:", error);
            batch = firebase.batch();
            count = 0;
        }
    }
  }

  if (count > 0) {
    try {
        await batch.commit();
    } catch (error) {
        console.error("Final Firestore batch commit error:", error);
  }
}
}

// ---------------- MAIN ----------------
export async function POST() {
  try {
    console.log("STARTING SYNC");

    const token = await getSMToken();
    if (!token) throw new Error("Missing token");

    const filters = [
      "open",
      "unread",
      "pending",
      "unassigned",
      "assigned",
      "scheduled",
      "outbound",
      "closed",
      "mentions",
      "draft",
    ];

    const convoResults = await Promise.all(
      filters.map((f) => fetchConversationsByFilter({ token, filter: f }))
    );

    const convoMap = new Map();

    for (const group of convoResults) {
      for (const c of group) {
        convoMap.set(c.id, c);
      }
    }

    const conversations = Array.from(convoMap.values());

    console.log("Conversations:", conversations.length);

    let totalSaved = 0;

    for (let i = 0; i < conversations.length; i += CONCURRENT_BATCH) {
      const chunk = conversations.slice(i, i + CONCURRENT_BATCH);

      const results = await Promise.allSettled(
        chunk.map((convo) =>
          fetchMessagesForConversation(token, convo)
        )
      );

    for (const r of results) {
        if (r.status !== "fulfilled") continue;

        const messages = r.value;
        await saveAllMessages(messages);

        totalSaved += messages.length;
    }

      console.log(
        `Progress: ${Math.min(
          i + CONCURRENT_BATCH,
          conversations.length
        )} / ${conversations.length}`
      );

      await new Promise((r) => setTimeout(r, 400));
    }

    return NextResponse.json({
      success: true,
      conversations: conversations.length,
      messages: totalSaved,
    });
  } catch (err) {
    console.error("PROCESS ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}