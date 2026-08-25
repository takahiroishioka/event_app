"use client";

import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AdminImageManager from "@/components/AdminImageManager";
import AdminEventManagers from "@/components/AdminEventManagers";

const supabase = createClient();

type EventStatus =
  | "draft"
  | "published"
  | "closed"
  | "cancelled";

type TabType = "edit" | "answers";

type EventData = {
  id: string;
  title: string;
  description: string | null;
  start_at: string | null;
  end_at: string | null;
  location: string | null;
  capacity: number | null;
  fee: number;
  payment_management_required: boolean;
  payment_note: string | null;
  is_ubm: boolean;
  status: EventStatus;
};

type QuestionRow = {
  id: string;
  question_text: string;
  question_type: string;
  is_required: boolean;
  sort_order: number;
};

type UserEventDatabaseRow = {
  id: string;
  user_id: string;
  status: string;
  created_at: string | null;
};

type UserRow = {
  id: string;
  name: string | null;
};

type UserEventRow = UserEventDatabaseRow & {
  user_name: string | null;
};

type AnswerRow = {
  id: string;
  user_event_id: string;
  question_id: string;
  answer_text: string | null;
};

export default function AdminEventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const eventId = params.id;

  const [activeTab, setActiveTab] =
    useState<TabType>("edit");

  const [event, setEvent] =
    useState<EventData | null>(null);

  const [questions, setQuestions] =
    useState<QuestionRow[]>([]);

  const [registrations, setRegistrations] =
    useState<UserEventRow[]>([]);

  const [answers, setAnswers] =
    useState<AnswerRow[]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] =
    useState("");
  const [startAt, setStartAt] =
    useState("");
  const [endAt, setEndAt] =
    useState("");
  const [location, setLocation] =
    useState("");
  const [capacity, setCapacity] =
    useState("");
  const [fee, setFee] = useState("0");
  const [paymentManagementRequired, setPaymentManagementRequired] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");
  const [isUbm, setIsUbm] = useState(false);

  const [status, setStatus] =
    useState<EventStatus>("draft");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const [canEditEvent, setCanEditEvent] = useState(false);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setMessage("");
    setIsError(false);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        "ログイン情報取得エラー:",
        userError
      );

      setIsError(true);
      setMessage(
        "ログイン情報を確認できませんでした。"
      );
      setLoading(false);
      return;
    }

    if (!user) {
      router.replace(
        `/login?redirect=${encodeURIComponent(
          `/admin/events/${eventId}`
        )}`
      );
      return;
    }

    const { data: viewAccess } = await supabase.rpc("can_manage_event", { p_event_id: eventId, p_edit_required: false });
    if (!viewAccess) {
      router.replace("/admin/events");
      return;
    }
    const { data: editAccess } = await supabase.rpc("can_manage_event", { p_event_id: eventId, p_edit_required: true });
    setCanEditEvent(Boolean(editAccess));
    const { data: globalAdminAccess } = await supabase.rpc("is_global_admin");
    setIsGlobalAdmin(Boolean(globalAdminAccess));

    /*
     * イベント情報を取得
     */
    const {
      data: eventData,
      error: eventError,
    } = await supabase
      .from("events")
      .select(`
        id,
        title,
        description,
        start_at,
        end_at,
        location,
        capacity,
        fee,
        payment_management_required,
        payment_note,
        is_ubm,
        status
      `)
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      console.error(
        "イベント取得エラー:",
        eventError
      );

      setIsError(true);
      setMessage(
        `イベントを取得できませんでした：${eventError.message}`
      );
      setLoading(false);
      return;
    }

    if (!eventData) {
      setIsError(true);
      setMessage(
        "イベントが見つかりませんでした。"
      );
      setLoading(false);
      return;
    }

    const typedEvent =
      eventData as EventData;

    setEvent(typedEvent);

    setTitle(typedEvent.title);
    setDescription(
      typedEvent.description ?? ""
    );
    setStartAt(
      toDateTimeLocal(
        typedEvent.start_at
      )
    );
    setEndAt(
      toDateTimeLocal(
        typedEvent.end_at
      )
    );
    setLocation(
      typedEvent.location ?? ""
    );
    setCapacity(
      typedEvent.capacity === null
        ? ""
        : String(
            typedEvent.capacity
          )
    );
    setFee(
      String(typedEvent.fee)
    );
    setPaymentManagementRequired(typedEvent.payment_management_required);
    setPaymentNote(typedEvent.payment_note ?? "");
    setIsUbm(typedEvent.is_ubm);
    setStatus(typedEvent.status);

    /*
     * 質問と参加情報を取得
     */
    const [
      questionResult,
      registrationResult,
    ] = await Promise.all([
      supabase
        .from("event_questions")
        .select(`
          id,
          question_text,
          question_type,
          is_required,
          sort_order
        `)
        .eq("event_id", eventId)
        .order("sort_order", {
          ascending: true,
        }),

      supabase
        .from("user_events")
        .select(`
          id,
          user_id,
          status,
          created_at
        `)
        .eq("event_id", eventId)
        .order("created_at", {
          ascending: true,
        }),
    ]);

    if (questionResult.error) {
      console.error(
        "質問取得エラー:",
        questionResult.error
      );

      setIsError(true);
      setMessage(
        `質問を取得できませんでした：${questionResult.error.message}`
      );
      setLoading(false);
      return;
    }

    if (registrationResult.error) {
      console.error(
        "参加者取得エラー:",
        registrationResult.error
      );

      setIsError(true);
      setMessage(
        `参加情報を取得できませんでした：${registrationResult.error.message}`
      );
      setLoading(false);
      return;
    }

    const questionData =
      (questionResult.data ??
        []) as QuestionRow[];

    const registrationData =
      (registrationResult.data ??
        []) as UserEventDatabaseRow[];

    setQuestions(questionData);

    /*
     * 参加者のuser_idからusers.nameを取得
     */
    const uniqueUserIds = [
      ...new Set(
        registrationData.map(
          (registration) =>
            registration.user_id
        )
      ),
    ];

    let userRows: UserRow[] = [];

    if (uniqueUserIds.length > 0) {
      const {
        data: usersData,
        error: usersError,
      } = await supabase
        .from("users")
        .select("id, name")
        .in("id", uniqueUserIds);

      if (usersError) {
        console.error(
          "参加者名取得エラー:",
          usersError
        );

        setIsError(true);
        setMessage(
          `参加者名を取得できませんでした：${usersError.message}`
        );
        setLoading(false);
        return;
      }

      userRows =
        (usersData ?? []) as UserRow[];
    }

    /*
     * user_idをキーにした名前辞書を作成
     */
    const userNameMap =
      new Map<string, string | null>();

    userRows.forEach((userRow) => {
      userNameMap.set(
        userRow.id,
        userRow.name
      );
    });

    /*
     * user_eventsとusersを画面側で結合
     */
    const registrationsWithName:
      UserEventRow[] =
      registrationData.map(
        (registration) => ({
          ...registration,
          user_name:
            userNameMap.get(
              registration.user_id
            ) ?? null,
        })
      );

    setRegistrations(
      registrationsWithName
    );

    /*
     * 参加登録がなければ回答取得は不要
     */
    const userEventIds =
      registrationData.map(
        (registration) =>
          registration.id
      );

    if (
      userEventIds.length === 0
    ) {
      setAnswers([]);
      setLoading(false);
      return;
    }

    /*
     * アンケート回答を取得
     */
    const {
      data: answerData,
      error: answerError,
    } = await supabase
      .from("user_event_answers")
      .select(`
        id,
        user_event_id,
        question_id,
        answer_text
      `)
      .in(
        "user_event_id",
        userEventIds
      );

    if (answerError) {
      console.error(
        "回答取得エラー:",
        answerError
      );

      setIsError(true);
      setMessage(
        `アンケート回答を取得できませんでした：${answerError.message}`
      );
      setLoading(false);
      return;
    }

    setAnswers(
      (answerData ??
        []) as AnswerRow[]
    );

    setLoading(false);
  }, [eventId, router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadPage(), 0);
    return () => window.clearTimeout(timer);
  }, [loadPage]);

function handleExportCsv() {
  if (registrations.length === 0) {
    setIsError(true);
    setMessage("出力できる参加者データがありません。");
    return;
  }

  const headers = [
    "参加者名",
    "ユーザーID",
    "参加状態",
    "申請日時",
    ...questions.map((question) => question.question_text),
  ];

  const rows = registrations.map((registration) => {
    const registrationAnswers = answers.filter(
      (answer) =>
        answer.user_event_id === registration.id
    );

    const questionAnswers = questions.map((question) => {
      const answer = registrationAnswers.find(
        (item) => item.question_id === question.id
      );

      return formatAnswerForCsv(
        answer?.answer_text ?? null
      );
    });

    return [
      registration.user_name || "名前未登録",
      registration.user_id,
      getRegistrationStatusLabel(
        registration.status
      ),
      formatDateForCsv(
        registration.created_at
      ),
      ...questionAnswers,
    ];
  });

  const csvRows = [
    headers,
    ...rows,
  ].map((row) =>
    row
      .map((value) =>
        escapeCsvValue(String(value))
      )
      .join(",")
  );

  /*
   * Excelで文字化けしにくいように
   * UTF-8 BOMを付与します。
   */
  const csvContent =
    "\uFEFF" + csvRows.join("\r\n");

  const blob = new Blob(
    [csvContent],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;

  link.download =
    `${sanitizeFileName(
      event?.title ?? "event"
    )}_アンケート回答.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string) {
  const escaped =
    value.replace(/"/g, '""');

  return `"${escaped}"`;
}

function formatAnswerForCsv(
  answerText: string | null
) {
  if (!answerText) {
    return "";
  }

  try {
    const parsed =
      JSON.parse(answerText);

    if (Array.isArray(parsed)) {
      return parsed.join(" / ");
    }
  } catch {
    // 通常の文字列回答
  }

  return answerText;
}

function getRegistrationStatusLabel(
  status: string
) {
  const statusMap: Record<
    string,
    string
  > = {
    reserved: "参加予定",
    waiting: "キャンセル待ち",
    joined: "参加済み",
    cancel_requested:
      "キャンセル申請中",
    cancelled: "キャンセル済み",
    noshow: "欠席",
  };

  return (
    statusMap[status] ??
    status
  );
}

function formatDateForCsv(
  dateValue: string | null
) {
  if (!dateValue) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(dateValue));
}

function sanitizeFileName(
  fileName: string
) {
  return fileName.replace(
    /[\\/:*?"<>|]/g,
    "_"
  );
}

  async function handleSave(
    submitEvent: FormEvent<HTMLFormElement>
  ) {
    submitEvent.preventDefault();

    if (!canEditEvent) {
      setIsError(true);
      setMessage("このイベントは閲覧のみ可能です。");
      return;
    }

    setMessage("");
    setIsError(false);

    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      setIsError(true);
      setMessage(
        "イベント名を入力してください。"
      );
      return;
    }

    if (startAt && endAt) {
      const startDate =
        new Date(startAt);

      const endDate =
        new Date(endAt);

      if (endDate < startDate) {
        setIsError(true);
        setMessage(
          "終了日時は開始日時より後にしてください。"
        );
        return;
      }
    }

    const capacityNumber =
      capacity.trim() === ""
        ? null
        : Number(capacity);

    if (
      capacityNumber !== null &&
      (!Number.isInteger(
        capacityNumber
      ) ||
        capacityNumber < 0)
    ) {
      setIsError(true);
      setMessage(
        "定員は0以上の整数で入力してください。"
      );
      return;
    }

    const feeNumber =
      Number(fee);

    if (
      !Number.isInteger(
        feeNumber
      ) ||
      feeNumber < 0
    ) {
      setIsError(true);
      setMessage(
        "参加費は0以上の整数で入力してください。"
      );
      return;
    }

    setSaving(true);

    const {
      data,
      error,
    } = await supabase
      .from("events")
      .update({
        title: trimmedTitle,

        description:
          description.trim() ||
          null,

        start_at: startAt
          ? new Date(
              startAt
            ).toISOString()
          : null,

        end_at: endAt
          ? new Date(
              endAt
            ).toISOString()
          : null,

        location:
          location.trim() ||
          null,

        capacity:
          capacityNumber,

        fee: feeNumber,
        payment_management_required: feeNumber > 0 || paymentManagementRequired,
        payment_note: paymentNote.trim() || null,
        is_ubm: isUbm,
        status,
      })
      .eq("id", eventId)
      .select(`
        id,
        title,
        description,
        start_at,
        end_at,
        location,
        capacity,
        fee,
        payment_management_required,
        payment_note,
        is_ubm,
        status
      `)
      .single();

    if (error) {
      console.error(
        "イベント更新エラー:",
        error
      );

      setIsError(true);
      setMessage(
        `イベントを更新できませんでした：${error.message}`
      );
      setSaving(false);
      return;
    }

    setEvent(
      data as EventData
    );

    setMessage(
      "イベント情報を更新しました。"
    );

    setSaving(false);
  }

  async function handleDelete() {
    if (!event || !isGlobalAdmin) return;

    const confirmed = window.confirm(
      `「${event.title}」を削除しますか？\n参加情報や回答などの関連データも影響を受けます。この操作は取り消せません。`
    );
    if (!confirmed) return;

    setDeleting(true);
    setMessage("");
    setIsError(false);

    const { data: eventImages } = await supabase
      .from("site_images")
      .select("storage_path")
      .eq("placement", "event")
      .eq("event_id", event.id);

    const { error } = await supabase
      .from("events")
      .delete()
      .eq("id", event.id);

    if (error) {
      console.error("イベント削除エラー:", error);
      setIsError(true);
      setMessage(`イベントを削除できませんでした：${error.message}`);
      setDeleting(false);
      return;
    }

    const storagePaths = (eventImages ?? [])
      .map((image) => image.storage_path)
      .filter((path): path is string => Boolean(path));
    if (storagePaths.length) await supabase.storage.from("event-images").remove(storagePaths);

    router.replace("/admin/events");
    router.refresh();
  }

  const activeRegistrations =
    useMemo(() => {
      return registrations.filter(
        (registration) =>
          registration.status !==
            "cancelled" &&
          registration.status !==
            "noshow"
      );
    }, [registrations]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-neutral-600">
          イベント管理情報を読み込んでいます...
        </p>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-neutral-100 px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-neutral-900">
            イベントを表示できません
          </h1>

          {message && (
            <p className="mt-4 text-sm text-red-700">
              {message}
            </p>
          )}

          <Link
            href="/admin/events"
            className="mt-7 inline-block rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white"
          >
            イベント管理へ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link
            href="/admin/events"
            className="text-sm font-bold text-neutral-600 underline underline-offset-4"
          >
            ← イベント管理へ戻る
          </Link>
        </div>

        <header className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-bold text-blue-600">
            EVENT MANAGEMENT
          </p>

          <h1 className="mt-2 text-3xl font-bold text-neutral-900">
            {event.title}
          </h1>

          <p className="mt-3 text-sm text-neutral-500">
            イベント情報の修正と、参加申請の回答確認ができます。
          </p>

          {canEditEvent && (
            <Link href={`/admin/events/${eventId}/tasks`} className="mt-5 inline-block rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700">
              タスクを登録・管理
            </Link>
          )}
        </header>

        <div className="mt-6 grid grid-cols-2 rounded-2xl bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() =>
              setActiveTab("edit")
            }
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
              activeTab === "edit"
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            イベント情報
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                "answers"
              )
            }
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
              activeTab === "answers"
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            参加者・回答
          </button>
        </div>

        {message && (
          <p
            className={`mt-6 rounded-2xl px-5 py-4 text-sm ${
              isError
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </p>
        )}

        {activeTab === "edit" && (
          <div className="mt-6 space-y-6">
            <AdminImageManager placement="event" eventId={eventId} readOnly={!canEditEvent} />
            <div className="mt-6"><AdminEventManagers eventId={eventId} /></div>

          <form
            onSubmit={handleSave}
            className="rounded-3xl bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="space-y-6">
              <FormField
                label="イベント名"
                required
              >
                <input
                  type="text"
                  value={title}
                  onChange={(
                    inputEvent
                  ) =>
                    setTitle(
                      inputEvent.target
                        .value
                    )
                  }
                  disabled={saving}
                  className={
                    inputClass
                  }
                />
              </FormField>

              <FormField label="説明">
                <textarea
                  value={description}
                  onChange={(
                    inputEvent
                  ) =>
                    setDescription(
                      inputEvent.target
                        .value
                    )
                  }
                  rows={7}
                  disabled={saving}
                  className={`${inputClass} resize-y`}
                />
              </FormField>

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField label="開始日時">
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(
                      inputEvent
                    ) =>
                      setStartAt(
                        inputEvent
                          .target.value
                      )
                    }
                    disabled={saving}
                    className={
                      inputClass
                    }
                  />
                </FormField>

                <FormField label="終了日時">
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(
                      inputEvent
                    ) =>
                      setEndAt(
                        inputEvent
                          .target.value
                      )
                    }
                    disabled={saving}
                    className={
                      inputClass
                    }
                  />
                </FormField>
              </div>

              <FormField label="会場">
                <input
                  type="text"
                  value={location}
                  onChange={(
                    inputEvent
                  ) =>
                    setLocation(
                      inputEvent.target
                        .value
                    )
                  }
                  disabled={saving}
                  className={
                    inputClass
                  }
                />
              </FormField>

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField label="定員">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={capacity}
                    onChange={(
                      inputEvent
                    ) =>
                      setCapacity(
                        inputEvent
                          .target.value
                      )
                    }
                    disabled={saving}
                    className={
                      inputClass
                    }
                  />
                </FormField>

                <FormField label="参加費">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={fee}
                    onChange={(
                      inputEvent
                    ) =>
                      setFee(
                        inputEvent
                          .target.value
                      )
                    }
                    disabled={saving}
                    className={
                      inputClass
                    }
                  />
                </FormField>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-5">
                <label className="flex items-center gap-3 text-sm font-bold">
                  <input type="checkbox" checked={Number(fee) > 0 || paymentManagementRequired} onChange={(inputEvent) => setPaymentManagementRequired(inputEvent.target.checked)} disabled={saving || Number(fee) > 0} />
                  支払管理を行う
                </label>
                <p className="mt-2 text-xs text-neutral-500">有料イベントでは自動的に有効になります。無料の場合のみ変更できます。</p>
                <FormField label="参加費の備考">
                  <textarea value={paymentNote} onChange={(inputEvent) => setPaymentNote(inputEvent.target.value)} placeholder="例：ご自分の飲食代のみ／会場費は割り勘" rows={3} disabled={saving} className={inputClass} />
                </FormField>
              </div>

              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-5">
                <label className="flex items-center gap-3 text-sm font-bold text-violet-950">
                  <input type="checkbox" checked={isUbm} onChange={(inputEvent) => setIsUbm(inputEvent.target.checked)} disabled={saving || !canEditEvent} />
                  UBM対象イベント
                </label>
                <p className="mt-2 text-xs text-violet-700">UBM権限のユーザーに表示・申込みを許可します。</p>
              </div>

              <FormField label="公開状態">
                <select
                  value={status}
                  onChange={(
                    inputEvent
                  ) =>
                    setStatus(
                      inputEvent.target
                        .value as EventStatus
                    )
                  }
                  disabled={saving}
                  className={`${inputClass} bg-white`}
                >
                  <option value="draft">
                    下書き
                  </option>

                  <option value="published">
                    公開中
                  </option>

                  <option value="closed">
                    受付終了
                  </option>

                  <option value="cancelled">
                    中止
                  </option>
                </select>
              </FormField>
            </div>

            {canEditEvent ? <button
              type="submit"
              disabled={saving || !title.trim()}
              className="mt-8 w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {saving ? "保存しています..." : "変更を保存"}
            </button> : <p className="mt-8 rounded-xl bg-neutral-100 p-4 text-center text-sm font-bold text-neutral-600">閲覧権限のため変更は保存できません。</p>}
          </form>

          {isGlobalAdmin && (
            <section className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-red-900">イベントの削除</h2>
              <p className="mt-2 text-sm leading-6 text-red-700">削除したイベントは元に戻せません。必要な場合は、削除ではなく公開状態を「中止」に変更してください。</p>
              <button type="button" onClick={() => void handleDelete()} disabled={deleting || saving} className="mt-5 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:bg-neutral-400">
                {deleting ? "削除しています..." : "このイベントを削除"}
              </button>
            </section>
          )}
          </div>
        )}

        {activeTab ===
          "answers" && (
          <section className="mt-6">
            <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900">
                    参加者・アンケート回答
                  </h2>

                  <p className="mt-3 text-sm text-neutral-500">
                    現在の有効な参加情報は
                    <span className="mx-1 font-bold text-neutral-900">
                      {activeRegistrations.length}
                    </span>
                    件です。
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={registrations.length === 0}
                  className="shrink-0 rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
                >
                  CSVで出力
                </button>
              </div>
            </div>

            {registrations.length ===
            0 ? (
              <div className="mt-5 rounded-3xl bg-white p-10 text-center shadow-sm">
                <p className="font-bold text-neutral-800">
                  参加申請はまだありません
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {registrations.map(
                  (
                    registration,
                    registrationIndex
                  ) => {
                    const registrationAnswers =
                      answers.filter(
                        (answer) =>
                          answer.user_event_id ===
                          registration.id
                      );

                    return (
                      <article
                        key={
                          registration.id
                        }
                        className="rounded-3xl bg-white p-6 shadow-sm sm:p-8"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-bold text-neutral-400">
                              参加者
                              {registrationIndex +
                                1}
                            </p>

                            <h3 className="mt-2 text-xl font-bold text-neutral-900">
                              {registration.user_name ||
                                "名前未登録"}
                            </h3>

                            <p className="mt-2 break-all text-xs text-neutral-400">
                              ユーザーID：
                              {
                                registration.user_id
                              }
                            </p>

                            {registration.created_at && (
                              <p className="mt-1 text-xs text-neutral-400">
                                申請日時：
                                {formatDate(
                                  registration.created_at
                                )}
                              </p>
                            )}
                          </div>

                          <RegistrationStatusBadge
                            status={
                              registration.status
                            }
                          />
                        </div>

                        {questions.length ===
                        0 ? (
                          <p className="mt-6 rounded-2xl bg-neutral-50 px-5 py-4 text-sm text-neutral-500">
                            このイベントには質問が設定されていません。
                          </p>
                        ) : (
                          <dl className="mt-6 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
                            {questions.map(
                              (
                                question,
                                questionIndex
                              ) => {
                                const answer =
                                  registrationAnswers.find(
                                    (
                                      item
                                    ) =>
                                      item.question_id ===
                                      question.id
                                  );

                                return (
                                  <div
                                    key={
                                      question.id
                                    }
                                    className="px-5 py-5"
                                  >
                                    <dt className="text-sm font-bold leading-6 text-neutral-800">
                                      <span className="mr-2 text-neutral-400">
                                        {questionIndex +
                                          1}
                                        .
                                      </span>

                                      {
                                        question.question_text
                                      }

                                      {question.is_required && (
                                        <span className="ml-2 text-xs font-bold text-red-500">
                                          必須
                                        </span>
                                      )}
                                    </dt>

                                    <dd className="mt-3 whitespace-pre-wrap text-sm leading-7 text-neutral-600">
                                      {formatAnswer(
                                        answer?.answer_text ??
                                          null
                                      )}
                                    </dd>
                                  </div>
                                );
                              }
                            )}
                          </dl>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function FormField({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-neutral-700">
        {label}

        {required && (
          <span className="ml-2 rounded bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
            必須
          </span>
        )}
      </label>

      {children}
    </div>
  );
}

function RegistrationStatusBadge({
  status,
}: {
  status: string;
}) {
  const statusMap: Record<
    string,
    {
      label: string;
      className: string;
    }
  > = {
    reserved: {
      label: "参加予定",
      className:
        "bg-blue-100 text-blue-700",
    },

    waiting: {
      label: "キャンセル待ち",
      className:
        "bg-orange-100 text-orange-700",
    },

    joined: {
      label: "参加済み",
      className:
        "bg-green-100 text-green-700",
    },

    cancel_requested: {
      label:
        "キャンセル申請中",
      className:
        "bg-yellow-100 text-yellow-700",
    },

    cancelled: {
      label:
        "キャンセル済み",
      className:
        "bg-neutral-100 text-neutral-500",
    },

    noshow: {
      label: "欠席",
      className:
        "bg-red-100 text-red-700",
    },
  };

  const current =
    statusMap[status] ?? {
      label: status,
      className:
        "bg-neutral-100 text-neutral-600",
    };

  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${current.className}`}
    >
      {current.label}
    </span>
  );
}

function formatAnswer(
  answerText: string | null
) {
  if (!answerText) {
    return "回答なし";
  }

  try {
    const parsed =
      JSON.parse(answerText);

    if (Array.isArray(parsed)) {
      return parsed.length > 0
        ? parsed.join("、")
        : "回答なし";
    }
  } catch {
    // 通常の文字列回答
  }

  return answerText;
}

function toDateTimeLocal(
  dateValue: string | null
) {
  if (!dateValue) {
    return "";
  }

  const date =
    new Date(dateValue);

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  const hour = String(
    date.getHours()
  ).padStart(2, "0");

  const minute = String(
    date.getMinutes()
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function formatDate(
  dateValue: string | null
) {
  if (!dateValue) {
    return "未定";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(dateValue)
  );
}

const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500";
