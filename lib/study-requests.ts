export type StudyTopic = {
  id: string; title: string; description: string | null;
  image_url: string | null;
  meeting_format: "zoom" | "in_person" | null;
  fee: number | null;
  is_active: boolean; sort_order: number;
};

export function studyTopicDetails(topic: Pick<StudyTopic, "meeting_format" | "fee">) {
  const format = topic.meeting_format === "zoom" ? "Zoom" : topic.meeting_format === "in_person" ? "リアル" : "開催形式未定";
  const fee = topic.fee == null ? "金額未定" : topic.fee === 0 ? "無料" : `${topic.fee.toLocaleString("ja-JP")}円`;
  return `${format} ・ ${fee}`;
}

export const requestStatuses = { new: "未対応", contacted: "連絡済み", completed: "対応完了" } as const;
export type StudyRequestStatus = keyof typeof requestStatuses;
export type StudyHoldingRequest = {
  id: string; topic_id: string; topic_title: string; line_name: string;
  preferred_schedule: string | null; message: string | null;
  status: StudyRequestStatus; created_at: string;
};

export function normalizeStudyRequest(values: { lineName: string; schedule: string; message: string }) {
  const normalized = { lineName: values.lineName.trim(), schedule: values.schedule.trim(), message: values.message.trim() };
  if (!normalized.lineName || normalized.lineName.length > 100) throw new Error("LINE登録名は1〜100文字で入力してください。");
  if (normalized.schedule.length > 1000 || normalized.message.length > 2000) throw new Error("希望日時は1000文字、メッセージは2000文字以内で入力してください。");
  return normalized;
}
