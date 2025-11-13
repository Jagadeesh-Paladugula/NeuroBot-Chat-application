export interface SummaryRecord {
  _id?: string;
  id?: string;
  summaryId?: string;
  key?: string;
  text?: string;
  summary?: string;
  messageCount?: number | string;
  messages?: number | string;
  generatedAt?: string | Date;
  generated_at?: string | Date;
  createdAt?: string | Date;
  created_at?: string | Date;
  lastMessageCreatedAt?: string | Date;
  last_message_created_at?: string | Date;
  messageWindowEnd?: string | Date;
  requestedBy?: string;
  requested_by?: string;
  requestedByName?: string;
  requested_by_name?: string;
  summaryMessageId?: string;
  summary_message_id?: string;
  messageId?: string;
  message_id?: string;
  rangeStart?: string | Date;
  range_start?: string | Date;
  rangeEnd?: string | Date;
  range_end?: string | Date;
  requestedAt?: string | Date;
  requested_at?: string | Date;
}

export interface NormalizedSummary {
  _id: string;
  text: string;
  messageCount: number;
  generatedAt: string;
  lastMessageCreatedAt: string | null;
  requestedBy: string | null;
  requestedByName: string;
  summaryMessageId: string | null;
  rangeStart: string | null;
  rangeEnd: string | null;
  requestedAt: string | null;
}

const createSummaryId = (prefix = 'summary'): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const toISOStringOrNull = (value: string | Date | null | undefined): string | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const toStringOrNull = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    return value.toString();
  }
  try {
    return String(value);
  } catch (error) {
    return null;
  }
};

export const normalizeSummaryRecord = (summary: SummaryRecord | null | undefined, fallbackPrefix = 'summary'): NormalizedSummary | null => {
  if (!summary) {
    return null;
  }

  const text = summary.text ?? summary.summary;
  if (!text) {
    return null;
  }

  const idCandidate = summary._id ?? summary.id ?? summary.summaryId ?? summary.key;
  const normalized: NormalizedSummary = {
    _id: toStringOrNull(idCandidate) ?? createSummaryId(fallbackPrefix),
    text,
    messageCount: Number.isFinite(summary.messageCount)
      ? (summary.messageCount as number)
      : Number.parseInt(String(summary.messageCount ?? summary.messages ?? 0), 10) || 0,
    generatedAt:
      toISOStringOrNull(summary.generatedAt) ||
      toISOStringOrNull(summary.generated_at) ||
      toISOStringOrNull(summary.createdAt) ||
      toISOStringOrNull(summary.created_at) ||
      new Date().toISOString(),
    lastMessageCreatedAt:
      toISOStringOrNull(summary.lastMessageCreatedAt) ||
      toISOStringOrNull(summary.last_message_created_at) ||
      toISOStringOrNull(summary.messageWindowEnd) ||
      null,
    requestedBy: toStringOrNull(summary.requestedBy ?? summary.requested_by),
    requestedByName: summary.requestedByName ?? summary.requested_by_name ?? '',
    summaryMessageId: toStringOrNull(
      summary.summaryMessageId ??
        summary.summary_message_id ??
        summary.messageId ??
        summary.message_id
    ),
    rangeStart:
      toISOStringOrNull(summary.rangeStart) ||
      toISOStringOrNull(summary.range_start) ||
      null,
    rangeEnd:
      toISOStringOrNull(summary.rangeEnd) ||
      toISOStringOrNull(summary.range_end) ||
      null,
    requestedAt:
      toISOStringOrNull(summary.requestedAt) ||
      toISOStringOrNull(summary.requested_at) ||
      null,
  };

  return normalized;
};

export const mergeSummaries = (existing: SummaryRecord[] = [], incoming: SummaryRecord[] = []): NormalizedSummary[] => {
  const map = new Map<string, NormalizedSummary>();
  [...(existing || []), ...(incoming || [])].forEach((summary) => {
    const normalized = normalizeSummaryRecord(summary);
    if (normalized) {
      map.set(normalized._id, normalized);
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    const aTime = new Date(a.lastMessageCreatedAt || a.generatedAt || 0).getTime();
    const bTime = new Date(b.lastMessageCreatedAt || b.generatedAt || 0).getTime();
    return aTime - bTime;
  });
};

export const normalizeSummaryCollection = (rawSummaries: SummaryRecord[] | null | undefined, fallbackSummary: SummaryRecord | null | undefined): NormalizedSummary[] => {
  const combined: SummaryRecord[] = [];

  if (Array.isArray(rawSummaries)) {
    combined.push(...rawSummaries);
  }

  if (fallbackSummary) {
    combined.push(fallbackSummary);
  }

  return mergeSummaries([], combined);
};

interface Conversation {
  aiSummaries?: SummaryRecord[];
  aiSummary?: SummaryRecord;
  [key: string]: unknown;
}

export const enrichConversationSummaries = (conversation: Conversation | null | undefined): Conversation | null | undefined => {
  if (!conversation) {
    return conversation;
  }

  const normalizedSummaries = normalizeSummaryCollection(
    conversation.aiSummaries,
    conversation.aiSummary
  );

  return {
    ...conversation,
    aiSummaries: normalizedSummaries,
    aiSummary:
      normalizedSummaries.length > 0
        ? normalizedSummaries[normalizedSummaries.length - 1]
        : null,
  };
};

