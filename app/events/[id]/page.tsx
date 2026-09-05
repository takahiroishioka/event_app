"use client";

import Link from "next/link";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import EventApplicationQuestions, {
  type EventAnswers,
  type EventQuestion,
  type QuestionOption,
  type QuestionType,
} from "@/components/EventApplicationQuestions";
import ImageCarousel, { type CarouselImage } from "@/components/ImageCarousel";
import SiteHeader from "@/components/SiteHeader";

const supabase = createClient();

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
  status: string;
};

type UserEventData = {
  id: string;
  status: string;
  refund_method?: string | null;
};

type PaymentData = {
  id: string;
  status: string;
  method: string | null;
  note: string | null;
};

type QuestionRow = {
  id: string;
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  sort_order: number;
};

type OptionRow = {
  id: string;
  question_id: string;
  option_text: string;
  sort_order: number;
};

type EventTask = {
  id: string;
  title: string;
  details: string | null;
  due_at: string | null;
  assignee_user_id: string | null;
  assignee_name: string | null;
  completion_message: string | null;
  completed_at: string | null;
};

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const eventId = params.id;

  const [event, setEvent] =
    useState<EventData | null>(null);

  const [eventImages, setEventImages] =
    useState<CarouselImage[]>([]);

  const [userEvent, setUserEvent] =
    useState<UserEventData | null>(null);

  const [payment, setPayment] =
    useState<PaymentData | null>(null);

  const [isLoggedIn, setIsLoggedIn] =
    useState(false);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);
  const [eventTasks, setEventTasks] = useState<EventTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<EventTask | null>(null);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);
  const [completingTask, setCompletingTask] = useState(false);

  const [refundMethod, setRefundMethod] = useState<"bank" | "hand" | "">("");

  /*
   * 参加人数は画面には表示しません。
   * 定員判定・キャンセル待ち判定のためだけに使います。
   */
  const [
    participantCount,
    setParticipantCount,
  ] = useState(0);

  const [questions, setQuestions] =
    useState<EventQuestion[]>([]);

  const [answers, setAnswers] =
    useState<EventAnswers>({});

  const [guestApplicationOpen, setGuestApplicationOpen] = useState(false);
  const [guestName, setGuestName] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isError, setIsError] =
    useState(false);

  const loadEvent = useCallback(
    async function loadEvent() {
      setLoading(true);
      setMessage("");
      setIsError(false);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      setIsLoggedIn(Boolean(user));
      setCurrentUserId(user?.id ?? null);

      if (userError) {
        console.error(
          "ログイン情報取得エラー:",
          userError
        );
      }

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
          "イベント情報を取得できませんでした。"
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

      setEvent(eventData);

      if (user) {
        const [manageResult, adminResult] = await Promise.all([
          supabase.rpc("can_manage_event", { p_event_id: eventId, p_edit_required: false }),
          supabase.rpc("is_global_admin"),
        ]);
        setIsGlobalAdmin(Boolean(adminResult.data));
        if (manageResult.data) {
          const [taskResult, assigneeResult] = await Promise.all([
            supabase
              .from("event_tasks")
              .select("id, title, details, due_at, assignee_user_id, completion_message, completed_at")
              .eq("event_id", eventId)
              .order("completed_at", { ascending: true, nullsFirst: true })
              .order("due_at", { ascending: true, nullsFirst: false }),
            supabase.rpc("get_event_task_assignees", { p_event_id: eventId }),
          ]);
          if (taskResult.error) {
            console.error("イベントタスク取得エラー:", taskResult.error);
          } else {
            if (assigneeResult.error) console.error("タスク担当者取得エラー:", assigneeResult.error);
            const assigneeRows = (assigneeResult.data ?? []) as Array<{ user_id: string; name: string }>;
            const assigneeNames = new Map(assigneeRows.map((person) => [person.user_id, person.name]));
            setEventTasks((taskResult.data ?? []).map((task) => ({
              ...task,
              assignee_name: task.assignee_user_id ? assigneeNames.get(task.assignee_user_id) ?? "担当者不明" : null,
            })) as EventTask[]);
          }
        } else {
          setEventTasks([]);
        }
      } else {
        setIsGlobalAdmin(false);
        setEventTasks([]);
      }

      const { data: imageData, error: imageError } = await supabase
        .from("site_images")
        .select("id, image_url, alt_text")
        .eq("placement", "event")
        .eq("event_id", eventId)
        .eq("is_active", true)
        .order("sort_order");

      if (imageError) {
        console.error("イベント画像取得エラー:", imageError);
      } else {
        setEventImages((imageData ?? []) as CarouselImage[]);
      }

      if (user) {
        const {
          data: registrationData,
          error: registrationError,
        } = await supabase
          .from("user_events")
          .select("id, status, refund_method")
          .eq("user_id", user.id)
          .eq("event_id", eventId)
          .maybeSingle();

        if (registrationError) {
          console.error(
            "参加情報取得エラー:",
            registrationError
          );
        }

        setUserEvent(registrationData ?? null);
        setRefundMethod((registrationData?.refund_method as "bank" | "hand" | null) ?? "");

        if (registrationData) {
          const { data: paymentData, error: paymentError } = await supabase
            .from("payments")
            .select("id, status, method, note")
            .eq("user_event_id", registrationData.id)
            .maybeSingle();

          if (paymentError) {
            console.error("支払い情報取得エラー:", paymentError);
          }
          setPayment(paymentData ?? null);
        } else {
          setPayment(null);
        }
      } else {
        setUserEvent(null);
        setPayment(null);
      }

      const {
        count,
        error: countError,
      } = await supabase
        .from("user_events")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("event_id", eventId)
        .in("status", [
          "reserved",
          "waiting",
          "joined",
        ]);

      if (countError) {
        console.error(
          "参加人数取得エラー:",
          countError
        );
      }

      setParticipantCount(count ?? 0);

      if (!user) {
        setQuestions([]);
        setLoading(false);
        return;
      }

      const {
        data: questionRows,
        error: questionError,
      } = await supabase
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
        });

      if (questionError) {
        console.error(
          "質問取得エラー:",
          questionError
        );

        setIsError(true);
        setMessage(
          "参加申請の質問を取得できませんでした。"
        );
        setLoading(false);
        return;
      }

      const typedQuestions =
        (questionRows ??
          []) as QuestionRow[];

      let optionRows: OptionRow[] = [];

      if (typedQuestions.length > 0) {
        const questionIds =
          typedQuestions.map(
            (question) => question.id
          );

        const {
          data: optionsData,
          error: optionsError,
        } = await supabase
          .from(
            "event_question_options"
          )
          .select(`
            id,
            question_id,
            option_text,
            sort_order
          `)
          .in(
            "question_id",
            questionIds
          )
          .order("sort_order", {
            ascending: true,
          });

        if (optionsError) {
          console.error(
            "選択肢取得エラー:",
            optionsError
          );

          setIsError(true);
          setMessage(
            "参加申請の選択肢を取得できませんでした。"
          );
          setLoading(false);
          return;
        }

        optionRows =
          (optionsData ??
            []) as OptionRow[];
      }

      const formattedQuestions:
        EventQuestion[] =
        typedQuestions.map(
          (question) => ({
            ...question,

            options: optionRows
              .filter(
                (option) =>
                  option.question_id ===
                  question.id
              )
              .map(
                (option): QuestionOption => ({
                  id: option.id,
                  option_text:
                    option.option_text,
                  sort_order:
                    option.sort_order,
                })
              ),
          })
        );

      setQuestions(formattedQuestions);
      setLoading(false);
    },
    [eventId, router]
  );

  useEffect(() => {
    loadEvent();
  }, [loadEvent]);

  function handleAnswerChange(
    questionId: string,
    value: string | string[]
  ) {
    setAnswers((current) => ({
      ...current,
      [questionId]: value,
    }));
  }

  const unansweredRequiredQuestions =
    useMemo(() => {
      return questions.filter(
        (question) => {
          if (!question.is_required) {
            return false;
          }

          const answer =
            answers[question.id];

          if (
            question.question_type ===
            "multiple_choice"
          ) {
            return (
              !Array.isArray(answer) ||
              answer.length === 0
            );
          }

          return (
            typeof answer !==
              "string" ||
            answer.trim() === ""
          );
        }
      );
    }, [answers, questions]);

  const hasCompletedRequiredQuestions =
    unansweredRequiredQuestions.length === 0;

  const isFull =
    event?.capacity !== null &&
    event?.capacity !== undefined &&
    participantCount >= event.capacity;

  const canJoin =
    event?.status === "published" &&
    (!userEvent ||
      userEvent.status ===
        "cancelled" ||
      userEvent.status ===
        "noshow");

  const isJoined =
    userEvent?.status ===
      "reserved" ||
    userEvent?.status ===
      "joined" ||
    userEvent?.status ===
      "waiting" ||
    userEvent?.status ===
      "cancel_requested";

  const canManagePayment =
    event !== null &&
    event.fee > 0 &&
    event.payment_management_required &&
    (userEvent?.status === "reserved" ||
      userEvent?.status === "joined");

  async function handlePaymentConfirmation() {
    if (!payment || !event || event.fee <= 0 || payment.status !== "pending") return;

    setProcessing(true);
    setMessage("");
    setIsError(false);

    const { data, error } = await supabase
      .from("payments")
      .update({ status: "confirmation_requested", updated_at: new Date().toISOString() })
      .eq("id", payment.id)
      .select("id, status, method, note")
      .single();

    if (error) {
      setIsError(true);
      setMessage(`支払済み申請を送信できませんでした：${error.message}`);
    } else {
      setPayment(data as PaymentData);
      setMessage("");
    }
    setProcessing(false);
  }

  async function saveAnswers(
    userEventId: string
  ) {
    const answerRows = questions
      .map((question) => {
        const answer =
          answers[question.id];

        if (
          Array.isArray(answer)
        ) {
          if (answer.length === 0) {
            return null;
          }

          return {
            user_event_id:
              userEventId,

            question_id:
              question.id,

            answer_text:
              JSON.stringify(answer),
          };
        }

        const normalizedAnswer =
          answer?.trim() ?? "";

        if (!normalizedAnswer) {
          return null;
        }

        return {
          user_event_id:
            userEventId,

          question_id:
            question.id,

          answer_text:
            normalizedAnswer,
        };
      })
      .filter(
        (
          row
        ): row is {
          user_event_id: string;
          question_id: string;
          answer_text: string;
        } => row !== null
      );

    /*
     * 以前の回答がある再申請にも対応します。
     */
    const {
      error: deleteAnswerError,
    } = await supabase
      .from("user_event_answers")
      .delete()
      .eq(
        "user_event_id",
        userEventId
      );

    if (deleteAnswerError) {
      throw new Error(
        `以前の回答を整理できませんでした：${deleteAnswerError.message}`
      );
    }

    if (answerRows.length === 0) {
      return;
    }

    const {
      error: answerError,
    } = await supabase
      .from("user_event_answers")
      .insert(answerRows);

    if (answerError) {
      throw new Error(
        `回答を保存できませんでした：${answerError.message}`
      );
    }
  }

  async function handleGuestJoin() {
    if (!event) return;
    const normalizedName = guestName.trim();
    setMessage("");
    setIsError(false);
    if (!normalizedName) { setIsError(true); setMessage("お名前を入力してください。"); return; }
    if (!hasCompletedRequiredQuestions) { setIsError(true); setMessage("必須の質問に回答してください。"); return; }
    setProcessing(true);
    const answerPayload = questions.reduce<Record<string, string | string[]>>((current, question) => {
      const answer = answers[question.id];
      if (typeof answer === "string" && answer.trim()) current[question.id] = answer.trim();
      if (Array.isArray(answer) && answer.length > 0) current[question.id] = answer;
      return current;
    }, {});
    const { error } = await supabase.rpc("submit_guest_event_application", { p_event_id: event.id, p_guest_name: normalizedName, p_answers: answerPayload });
    if (error) { setIsError(true); setMessage(`ゲスト申込みに失敗しました：${error.message}`); }
    else { setGuestApplicationOpen(false); setMessage("ゲストとして参加申込みを受け付けました。"); }
    setProcessing(false);
  }
  async function handleJoin() {
    if (!event) {
      return;
    }

    setMessage("");
    setIsError(false);

    setProcessing(true);

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
        "ログイン情報を確認できませんでした。通信状態を確認してください。"
      );
      setProcessing(false);
      return;
    }

    if (!user) {
      router.replace(
        `/login?redirect=${encodeURIComponent(
          `/events/${event.id}#application`
        )}`
      );
      return;
    }

    if (
      !hasCompletedRequiredQuestions
    ) {
      setIsError(true);
      setMessage(
        "必須の質問に回答してください。"
      );
      setProcessing(false);
      document
        .getElementById("application")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (
      event.status !== "published"
    ) {
      setIsError(true);
      setMessage(
        "現在、このイベントには参加できません。"
      );
      setProcessing(false);
      return;
    }

    const nextStatus = isFull
      ? "waiting"
      : "reserved";

    const {
      data: existingRegistration,
      error: existingError,
    } = await supabase
      .from("user_events")
      .select("id, status")
      .eq("user_id", user.id)
      .eq("event_id", event.id)
      .maybeSingle();

    if (existingError) {
      console.error(
        "既存参加情報取得エラー:",
        existingError
      );

      setIsError(true);
      setMessage(
        "参加情報を確認できませんでした。"
      );
      setProcessing(false);
      return;
    }

    let savedRegistration:
      UserEventData | null = null;

    let createdNewRegistration =
      false;

    let previousStatus:
      string | null = null;

    try {
      if (existingRegistration) {
        if (
          existingRegistration.status !==
            "cancelled" &&
          existingRegistration.status !==
            "noshow"
        ) {
          throw new Error(
            "すでにこのイベントへ参加登録されています。"
          );
        }

        previousStatus =
          existingRegistration.status;

        const {
          data,
          error,
        } = await supabase
          .from("user_events")
          .update({
            status: nextStatus,
            cancellation_requested_at:
              null,
            cancellation_reason: null,
            checked_in_at: null,
          })
          .eq(
            "id",
            existingRegistration.id
          )
          .select("id, status")
          .single();

        if (error || !data) {
          throw new Error(
            error?.message ||
              "イベントへ再登録できませんでした。"
          );
        }

        savedRegistration = data;
      } else {
        const {
          data,
          error,
        } = await supabase
          .from("user_events")
          .insert({
            user_id: user.id,
            event_id: event.id,
            status: nextStatus,
          })
          .select("id, status")
          .single();

        if (error || !data) {
          throw new Error(
            error?.message ||
              "参加登録できませんでした。"
          );
        }

        savedRegistration = data;
        createdNewRegistration =
          true;
      }

      await saveAnswers(
        savedRegistration.id
      );

      setUserEvent(
        savedRegistration
      );

      if (
        nextStatus === "waiting"
      ) {
        setMessage(
          "キャンセル待ちとして登録しました。"
        );
      } else {
        setMessage(
          "イベントへの参加登録が完了しました。"
        );

        setParticipantCount(
          (current) => current + 1
        );
      }
    } catch (error) {
      console.error(
        "イベント参加エラー:",
        error
      );

      /*
       * 回答保存に失敗した場合、
       * 中途半端な参加登録をできる範囲で元に戻します。
       */
      if (savedRegistration) {
        if (
          createdNewRegistration
        ) {
          const {
            error: rollbackError,
          } = await supabase
            .from("user_events")
            .delete()
            .eq(
              "id",
              savedRegistration.id
            );

          if (rollbackError) {
            console.error(
              "新規登録の巻き戻しエラー:",
              rollbackError
            );
          }
        } else if (
          previousStatus
        ) {
          const {
            error: rollbackError,
          } = await supabase
            .from("user_events")
            .update({
              status: previousStatus,
            })
            .eq(
              "id",
              savedRegistration.id
            );

          if (rollbackError) {
            console.error(
              "再登録の巻き戻しエラー:",
              rollbackError
            );
          }
        }
      }

      setIsError(true);

      setMessage(
        error instanceof Error
          ? error.message
          : "参加登録できませんでした。"
      );
    } finally {
      setProcessing(false);
    }
  }

  async function handleCancelRequest() {
    if (!userEvent) {
      return;
    }

    if (payment?.status === "paid" && !refundMethod) {
      setIsError(true);
      setMessage("返金方法を選択してください。");
      return;
    }

    const confirmed =
      window.confirm(
        "キャンセルを申請します。\n管理者が確認するまで参加状態は確定しません。\nよろしいですか？"
      );

    if (!confirmed) {
      return;
    }

    setProcessing(true);
    setMessage("");
    setIsError(false);

    const {
      data,
      error,
    } = await supabase
      .from("user_events")
      .update({
        status:
          "cancel_requested",

        cancellation_requested_at:
          new Date().toISOString(),
        refund_method: payment?.status === "paid" ? refundMethod : null,
      })
      .eq("id", userEvent.id)
      .select("id, status, refund_method")
      .single();

    if (error) {
      console.error(
        "キャンセル申請エラー:",
        error
      );

      setIsError(true);

      setMessage(
        `キャンセルを申請できませんでした：${error.message}`
      );

      setProcessing(false);
      return;
    }

    setUserEvent(data);

    setMessage(
      "キャンセル申請を受け付けました。管理者の確認をお待ちください。"
    );

    setProcessing(false);
  }

  function openTask(task: EventTask) {
    setSelectedTask(task);
    setShowCompletionMessage(false);
  }

  async function completeTask() {
    if (!selectedTask) return;
    setCompletingTask(true);
    const { error } = await supabase.rpc("complete_event_task", { p_task_id: selectedTask.id });
    if (error) {
      setIsError(true);
      setMessage(`タスクを完了できませんでした：${error.message}`);
      setCompletingTask(false);
      return;
    }
    const completed = { ...selectedTask, completed_at: new Date().toISOString() };
    setSelectedTask(completed);
    setEventTasks((current) => current.map((task) => task.id === completed.id ? completed : task));
    setShowCompletionMessage(true);
    setCompletingTask(false);
  }

  function openNextTask() {
    if (!selectedTask) return;
    const nextTask = eventTasks.find((task) => !task.completed_at && task.id !== selectedTask.id);
    if (nextTask) openTask(nextTask);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-neutral-600">
          イベント情報を読み込んでいます...
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
            href="/mypage"
            className="mt-7 inline-block rounded-xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white"
          >
            マイページへ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
    <SiteHeader />
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href="/mypage"
            className="text-sm font-bold text-neutral-600 underline underline-offset-4"
          >
            ← マイページへ戻る
          </Link>
        </div>

        <article className="overflow-hidden rounded-3xl bg-white shadow-sm">
          {eventImages.length > 0 && (
            <ImageCarousel
              images={eventImages}
            />
          )}

          <div className="border-b border-neutral-100 p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                status={event.status}
              />

              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-600">
                {formatFee(event.fee)}
              </span>

              {isJoined && (
                <UserEventBadge
                  status={
                    userEvent?.status ??
                    ""
                  }
                />
              )}
            </div>

            <h1 className="mt-5 text-3xl font-bold leading-tight text-neutral-900 sm:text-4xl">
              {event.title}
            </h1>

            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-neutral-600 sm:text-base">
              {event.description ||
                "イベントの詳細はまだ登録されていません。"}
            </p>
          </div>

          <div className="p-6 sm:p-10">
            <section>
              <h2 className="text-xl font-bold text-neutral-900">
                イベント情報
              </h2>

              <dl className="mt-5 divide-y divide-neutral-100 rounded-2xl border border-neutral-200">
                <DetailRow
                  label="開始日時"
                  value={formatDate(
                    event.start_at
                  )}
                />

                <DetailRow
                  label="終了日時"
                  value={formatDate(
                    event.end_at
                  )}
                />

                <DetailRow
                  label="会場"
                  value={
                    event.location ||
                    "未定"
                  }
                />

                <DetailRow
                  label="参加費"
                  value={
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{formatFee(event.fee)}</span>
                      {isJoined && event.payment_management_required && event.fee > 0 && <PaymentStatusBadge fee={event.fee} status={payment?.status ?? null} />}
                    </div>
                  }
                />
                {event.payment_note && (
                  <DetailRow label="参加費の備考" value={event.payment_note} />
                )}
              </dl>
            </section>
          </div>
        </article>

        {eventTasks.length > 0 && (
          <section className="mt-6 rounded-3xl border border-violet-200 bg-violet-50 p-6 shadow-sm sm:p-8">
            <p className="text-sm font-bold text-violet-600">ADMIN TASKS</p>
            <h2 className="mt-2 text-xl font-bold text-neutral-900">イベントタスク</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {eventTasks.map((task) => (
                <button key={task.id} type="button" onClick={() => openTask(task)} className={`rounded-xl border bg-white px-5 py-4 text-left transition hover:border-violet-400 hover:bg-violet-50 ${task.completed_at ? "border-green-200 text-neutral-500" : "border-violet-200 text-neutral-900"}`}>
                  <span className={`block font-bold ${task.completed_at ? "line-through" : ""}`}>{task.title}</span>
                  <span className="mt-2 block text-xs font-medium text-neutral-500">期日：{task.due_at ? formatDate(task.due_at) : "未設定"}</span>
                  <span className="mt-1 block text-xs font-medium text-neutral-500">担当：{task.assignee_name ?? "未設定"}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {canManagePayment && (
          <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-bold text-blue-600">PAYMENT</p>
            <h2 className="mt-2 text-xl font-bold text-neutral-900">参加費のお支払い</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-600">
              参加費は{formatFee(event.fee)}です。支払い方法を登録してください。
            </p>
            {payment?.status !== "confirmation_requested" && payment?.status !== "paid" && (
              <Link
                href={`/events/${event.id}/payment`}
                className="mt-5 block rounded-xl bg-blue-600 px-5 py-4 text-center font-bold text-white transition hover:bg-blue-700"
              >
                {payment ? "支払方法変更" : "支払い方法を選ぶ"}
              </Link>
            )}
            {event.fee > 0 && payment?.status === "pending" && (
              <button
                type="button"
                onClick={handlePaymentConfirmation}
                disabled={processing}
                className="mt-3 w-full rounded-xl border border-blue-600 bg-white px-5 py-4 font-bold text-blue-700 disabled:opacity-50"
              >
                {processing ? "申請中…" : "支払済み申請"}
              </button>
            )}
            {payment?.status === "confirmation_requested" && (
              <p className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                お支払い有難うございます。確認完了までお待ちください
              </p>
            )}
            {payment?.status === "paid" && (
              <p className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-700">
                お支払いの確認が完了しています。
              </p>
            )}
          </section>
        )}

        {canJoin && (
          <div id="application" className="mt-6 scroll-mt-24">
            {!isLoggedIn && !guestApplicationOpen && (
              <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-2xl font-bold text-neutral-900">参加方法を選択</h2>
                <p className="mt-3 text-sm text-neutral-500">ゲストとして申し込むか、ログインして申し込めます。</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button type="button" onClick={() => setGuestApplicationOpen(true)} className="rounded-xl bg-blue-600 px-5 py-4 font-bold text-white hover:bg-blue-700">ゲストとして申し込む</button>
                  <button type="button" onClick={() => router.push(`/login?redirect=${encodeURIComponent(`/events/${event.id}#application`)}`)} className="rounded-xl border border-blue-600 bg-white px-5 py-4 font-bold text-blue-700 hover:bg-blue-50">ログインして申し込む</button>
                </div>
              </section>
            )}
            {(isLoggedIn || guestApplicationOpen) && (
              <>
                {guestApplicationOpen && !isLoggedIn && (
                  <section className="mb-5 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
                    <label className="block text-sm font-bold text-neutral-900">お名前 <span className="text-red-500">必須</span>
                      <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} disabled={processing} className="mt-3 w-full rounded-xl border border-neutral-300 px-4 py-3 font-normal" placeholder="参加者のお名前" />
                    </label>
                  </section>
                )}
                <EventApplicationQuestions questions={questions} answers={answers} disabled={processing} onChange={handleAnswerChange} />
                {!hasCompletedRequiredQuestions && <p className="mt-4 rounded-2xl bg-orange-50 px-5 py-4 text-sm font-medium text-orange-700">必須の質問に回答すると、参加ボタンを押せるようになります。</p>}
                <button type="button" onClick={guestApplicationOpen && !isLoggedIn ? handleGuestJoin : handleJoin} disabled={processing || !hasCompletedRequiredQuestions || (guestApplicationOpen && !isLoggedIn && !guestName.trim())} className="mt-5 w-full rounded-xl bg-blue-600 px-5 py-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-400">
                  {processing ? "処理中..." : guestApplicationOpen && !isLoggedIn ? "ゲストとして参加を申し込む" : isFull ? "キャンセル待ちに登録" : "このイベントに参加する"}
                </button>
                {guestApplicationOpen && !isLoggedIn && <button type="button" onClick={() => setGuestApplicationOpen(false)} disabled={processing} className="mt-3 w-full px-5 py-3 text-sm font-bold text-neutral-500">参加方法の選択へ戻る</button>}
              </>
            )}
          </div>
        )}
        {isJoined &&
          userEvent?.status !==
            "cancel_requested" && (
            <div className="mt-6">
            {payment?.status === "paid" && (
              <div className="mb-4 rounded-2xl bg-white p-5 shadow-sm">
                <p className="font-bold text-neutral-900">返金方法</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className={`rounded-xl border-2 p-4 ${refundMethod === "bank" ? "border-blue-600 bg-blue-50" : "border-neutral-200"}`}>
                    <input type="radio" name="refund-method" checked={refundMethod === "bank"} onChange={() => setRefundMethod("bank")} className="mr-2" />銀行振込
                    <p className="mt-2 text-xs text-neutral-500">振込手数料は参加者負担となり、返金額から差し引かれます。</p>
                  </label>
                  <label className={`rounded-xl border-2 p-4 ${refundMethod === "hand" ? "border-blue-600 bg-blue-50" : "border-neutral-200"}`}>
                    <input type="radio" name="refund-method" checked={refundMethod === "hand"} onChange={() => setRefundMethod("hand")} className="mr-2" />手渡し
                    <p className="mt-2 text-xs text-neutral-500">主催者から直接返金します。</p>
                  </label>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={
                handleCancelRequest
              }
              disabled={processing}
              className="mt-6 w-full rounded-xl border border-red-300 bg-white px-5 py-4 font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing
                ? "処理中..."
                : "キャンセルを申請する"}
            </button>
            </div>
          )}

        {userEvent?.status ===
          "cancel_requested" && (
          <div className="mt-6 rounded-xl bg-orange-50 px-4 py-4 text-center text-sm font-bold text-orange-700">
            キャンセル申請中です。管理者の確認をお待ちください。
          </div>
        )}

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

        {selectedTask && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="task-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTask(null); }}>
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
              {showCompletionMessage ? (
                <>
                  <p className="text-sm font-bold text-green-600">TASK COMPLETE</p>
                  <h2 id="task-modal-title" className="mt-2 text-2xl font-bold text-neutral-900">タスク完了</h2>
                  <p className="mt-6 whitespace-pre-wrap rounded-2xl bg-green-50 p-5 text-sm leading-7 text-green-800">{selectedTask.completion_message || "お疲れさまでした。次のタスクを確認してください。"}</p>
                  {eventTasks.some((task) => !task.completed_at && task.id !== selectedTask.id) && <button type="button" onClick={openNextTask} className="mt-6 w-full rounded-xl bg-violet-600 px-5 py-4 font-bold text-white">次のタスクを確認</button>}
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-violet-600">TASK DETAIL</p><h2 id="task-modal-title" className="mt-2 text-2xl font-bold text-neutral-900">{selectedTask.title}</h2></div><button type="button" onClick={() => setSelectedTask(null)} aria-label="閉じる" className="text-2xl text-neutral-400">×</button></div>
                  <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-neutral-600">{selectedTask.details || "詳細は登録されていません。"}</p>
                  <p className="mt-5 text-sm text-neutral-500">締め切り：{selectedTask.due_at ? formatDate(selectedTask.due_at) : "未設定"}</p>
                  <p className="mt-2 text-sm text-neutral-500">担当：{selectedTask.assignee_name ?? "未設定"}</p>
                  {selectedTask.completed_at ? <p className="mt-6 rounded-xl bg-green-50 p-4 text-center font-bold text-green-700">完了済み</p> : (isGlobalAdmin || selectedTask.assignee_user_id === currentUserId) ? <button type="button" onClick={() => void completeTask()} disabled={completingTask} className="mt-6 w-full rounded-xl bg-green-600 px-5 py-4 font-bold text-white disabled:bg-neutral-400">{completingTask ? "完了処理中..." : "完了済みにする"}</button> : <p className="mt-6 rounded-xl bg-neutral-100 p-4 text-center text-sm font-bold text-neutral-600">担当者のみ完了にできます。</p>}
                </>
              )}
              <button type="button" onClick={() => setSelectedTask(null)} className="mt-4 w-full px-5 py-3 text-sm font-bold text-neutral-500">閉じる</button>
            </div>
          </div>
        )}
      </div>
    </main>
    </>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-2 px-5 py-4 sm:grid-cols-[120px_1fr]">
      <dt className="text-sm font-medium text-neutral-400">
        {label}
      </dt>

      <dd className="text-sm font-medium text-neutral-800">
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({
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
    draft: {
      label: "下書き",
      className:
        "bg-neutral-100 text-neutral-600",
    },

    published: {
      label: "受付中",
      className:
        "bg-green-100 text-green-700",
    },

    closed: {
      label: "受付終了",
      className:
        "bg-orange-100 text-orange-700",
    },

    cancelled: {
      label: "中止",
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
      className={`rounded-full px-3 py-1 text-xs font-bold ${current.className}`}
    >
      {current.label}
    </span>
  );
}

function UserEventBadge({
  status,
}: {
  status: string;
}) {
  const statusMap: Record<
    string,
    string
  > = {
    reserved: "参加予定",
    waiting: "キャンセル待ち",
    joined: "参加済み",
    cancelled: "キャンセル済み",
    noshow: "欠席",
    cancel_requested:
      "キャンセル申請中",
  };

  return (
    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
      {statusMap[status] ??
        status}
    </span>
  );
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
  ).format(new Date(dateValue));
}

function formatFee(fee: number) {
  if (fee === 0) {
    return "無料";
  }

  return `${fee.toLocaleString(
    "ja-JP"
  )}円`;
}

function PaymentStatusBadge({ fee, status }: { fee: number; status: string | null }) {
  const current = fee === 0
    ? { label: "無料", className: "bg-neutral-100 text-neutral-700" }
    : status === "paid"
      ? { label: "支払済み", className: "bg-green-100 text-green-700" }
      : status === "confirmation_requested"
        ? { label: "確認待ち", className: "bg-blue-100 text-blue-700" }
        : status === "pending"
          ? { label: "支払い待ち", className: "bg-orange-100 text-orange-700" }
          : { label: "未選択", className: "bg-neutral-100 text-neutral-600" };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${current.className}`}>
      {current.label}
    </span>
  );
}
