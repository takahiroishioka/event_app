"use client";

import Link from "next/link";
import {
  FormEvent,
  ReactNode,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type EventStatus =
  | "draft"
  | "published"
  | "closed"
  | "cancelled";

type QuestionType =
  | "text"
  | "textarea"
  | "single_choice"
  | "multiple_choice";

type QuestionForm = {
  localId: string;
  questionText: string;
  questionType: QuestionType;
  isRequired: boolean;
  options: string[];
};

function createLocalId() {
  return crypto.randomUUID();
}

function createEmptyQuestion(): QuestionForm {
  return {
    localId: createLocalId(),
    questionText: "",
    questionType: "text",
    isRequired: false,
    options: [],
  };
}

export default function NewEventPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [fee, setFee] = useState("0");
  const [paymentManagementRequired, setPaymentManagementRequired] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");

  const [status, setStatus] =
    useState<EventStatus>("draft");

  const [questions, setQuestions] = useState<
    QuestionForm[]
  >([]);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      try {
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
            "ログイン情報を確認できませんでした。回線を確認して再読み込みしてください。"
          );
          setCheckingAuth(false);
          return;
        }

        if (!user) {
          router.replace(
            "/login?redirect=/admin/events/new"
          );
          return;
        }

        const {
          data: adminRole,
          error: adminRoleError,
        } = await supabase
          .from("roles")
          .select("id")
          .eq("name", "admin")
          .maybeSingle();

        if (adminRoleError || !adminRole) {
          console.error(
            "adminロール取得エラー:",
            adminRoleError
          );

          router.replace("/mypage");
          return;
        }

        const {
          data: userAdminRole,
          error: userRoleError,
        } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", user.id)
          .eq("role_id", adminRole.id)
          .maybeSingle();

        if (userRoleError) {
          console.error(
            "管理者権限確認エラー:",
            userRoleError
          );

          setIsError(true);
          setMessage(
            "管理者権限を確認できませんでした。"
          );
          setCheckingAuth(false);
          return;
        }

        if (!userAdminRole) {
          router.replace("/mypage");
          return;
        }

        setCheckingAuth(false);
      } catch (error) {
        console.error(
          "管理者確認中の通信エラー:",
          error
        );

        setIsError(true);
        setMessage(
          "通信に失敗しました。回線を確認して再読み込みしてください。"
        );
        setCheckingAuth(false);
      }
    }

    checkAdmin();
  }, [router]);

  function addQuestion() {
    setQuestions((current) => [
      ...current,
      createEmptyQuestion(),
    ]);
  }

  function removeQuestion(localId: string) {
    setQuestions((current) =>
      current.filter(
        (question) =>
          question.localId !== localId
      )
    );
  }

  function updateQuestion(
    localId: string,
    updates: Partial<QuestionForm>
  ) {
    setQuestions((current) =>
      current.map((question) =>
        question.localId === localId
          ? {
              ...question,
              ...updates,
            }
          : question
      )
    );
  }

  function changeQuestionType(
    localId: string,
    questionType: QuestionType
  ) {
    const needsOptions =
      questionType === "single_choice" ||
      questionType === "multiple_choice";

    updateQuestion(localId, {
      questionType,
      options: needsOptions ? ["", ""] : [],
    });
  }

  function addOption(questionId: string) {
    setQuestions((current) =>
      current.map((question) =>
        question.localId === questionId
          ? {
              ...question,
              options: [
                ...question.options,
                "",
              ],
            }
          : question
      )
    );
  }

  function updateOption(
    questionId: string,
    optionIndex: number,
    value: string
  ) {
    setQuestions((current) =>
      current.map((question) => {
        if (
          question.localId !== questionId
        ) {
          return question;
        }

        const nextOptions = [
          ...question.options,
        ];

        nextOptions[optionIndex] = value;

        return {
          ...question,
          options: nextOptions,
        };
      })
    );
  }

  function removeOption(
    questionId: string,
    optionIndex: number
  ) {
    setQuestions((current) =>
      current.map((question) => {
        if (
          question.localId !== questionId
        ) {
          return question;
        }

        return {
          ...question,
          options:
            question.options.filter(
              (_, index) =>
                index !== optionIndex
            ),
        };
      })
    );
  }

  function validateQuestions() {
    for (
      let index = 0;
      index < questions.length;
      index += 1
    ) {
      const question = questions[index];

      if (!question.questionText.trim()) {
        return `質問${index + 1}の内容を入力してください。`;
      }

      const isChoiceQuestion =
        question.questionType ===
          "single_choice" ||
        question.questionType ===
          "multiple_choice";

      if (isChoiceQuestion) {
        const validOptions =
          question.options
            .map((option) => option.trim())
            .filter(Boolean);

        if (validOptions.length < 2) {
          return `質問${index + 1}の選択肢を2つ以上入力してください。`;
        }
      }
    }

    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setIsError(false);

    const trimmedTitle = title.trim();
    const trimmedDescription =
      description.trim();

    const trimmedImageUrl =
      imageUrl.trim();

    const trimmedLocation =
      location.trim();

    if (!trimmedTitle) {
      setIsError(true);
      setMessage(
        "イベント名を入力してください。"
      );
      return;
    }

    if (startAt && endAt) {
      const startDate = new Date(startAt);
      const endDate = new Date(endAt);

      if (endDate < startDate) {
        setIsError(true);
        setMessage(
          "終了日時は開始日時より後にしてください。"
        );
        return;
      }
    }

    const capacityNumber =
      capacity === ""
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

    const feeNumber = Number(fee);

    if (
      !Number.isInteger(feeNumber) ||
      feeNumber < 0
    ) {
      setIsError(true);
      setMessage(
        "参加費は0以上の整数で入力してください。"
      );
      return;
    }

    const questionError =
      validateQuestions();

    if (questionError) {
      setIsError(true);
      setMessage(questionError);
      return;
    }

    setSaving(true);

    let createdEventId:
      | string
      | null = null;

    try {
      const {
        data: createdEvent,
        error: eventError,
      } = await supabase
        .from("events")
        .insert({
          title: trimmedTitle,

          description:
            trimmedDescription || null,

          image_url:
            trimmedImageUrl || null,

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
            trimmedLocation || null,

          capacity: capacityNumber,
          fee: feeNumber,
          payment_management_required: paymentManagementRequired,
          payment_note: paymentNote.trim() || null,
          status,
        })
        .select("id")
        .single();

      if (
        eventError ||
        !createdEvent
      ) {
        throw new Error(
          eventError?.message ||
            "イベントを作成できませんでした。"
        );
      }

      createdEventId =
        createdEvent.id;

      for (
        let questionIndex = 0;
        questionIndex <
        questions.length;
        questionIndex += 1
      ) {
        const question =
          questions[questionIndex];

        const {
          data: createdQuestion,
          error: questionError,
        } = await supabase
          .from("event_questions")
          .insert({
            event_id:
              createdEvent.id,

            question_text:
              question.questionText.trim(),

            question_type:
              question.questionType,

            is_required:
              question.isRequired,

            sort_order:
              questionIndex + 1,
          })
          .select("id")
          .single();

        if (
          questionError ||
          !createdQuestion
        ) {
          throw new Error(
            questionError?.message ||
              `質問${questionIndex + 1}を登録できませんでした。`
          );
        }

        const isChoiceQuestion =
          question.questionType ===
            "single_choice" ||
          question.questionType ===
            "multiple_choice";

        if (isChoiceQuestion) {
          const optionRows =
            question.options
              .map((option) =>
                option.trim()
              )
              .filter(Boolean)
              .map(
                (
                  optionText,
                  optionIndex
                ) => ({
                  question_id:
                    createdQuestion.id,

                  option_text:
                    optionText,

                  sort_order:
                    optionIndex + 1,
                })
              );

          const { error: optionError } =
            await supabase
              .from(
                "event_question_options"
              )
              .insert(optionRows);

          if (optionError) {
            throw new Error(
              optionError.message
            );
          }
        }
      }

      router.push("/admin");
      router.refresh();
    } catch (error) {
      console.error(
        "イベント作成エラー:",
        error
      );

      /*
       * 質問登録途中で失敗した場合は、
       * 作成途中のイベントを削除します。
       * 子テーブルはon delete cascadeで削除されます。
       */
      if (createdEventId) {
        const { error: deleteError } =
          await supabase
            .from("events")
            .delete()
            .eq(
              "id",
              createdEventId
            );

        if (deleteError) {
          console.error(
            "作成途中イベントの削除エラー:",
            deleteError
          );
        }
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : "イベントを作成できませんでした。";

      setIsError(true);
      setMessage(
        `イベントを作成できませんでした：${errorMessage}`
      );
      setSaving(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-neutral-600">
          管理者権限を確認しています...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-medium text-blue-600">
            ADMIN
          </p>

          <h1 className="mt-2 text-3xl font-bold text-neutral-900">
            イベント作成
          </h1>

          <p className="mt-3 text-sm leading-6 text-neutral-500">
            イベント情報と参加申請時の質問を登録します。
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-8"
        >
          <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <p className="text-sm font-medium text-neutral-500">
                EVENT INFORMATION
              </p>

              <h2 className="mt-1 text-2xl font-bold text-neutral-900">
                基本情報
              </h2>
            </div>

            <div className="space-y-6">
              <FormField
                label="イベント名"
                required
              >
                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="例：管理職のためのExcel勉強会"
                  disabled={saving}
                  className={inputClass}
                />
              </FormField>

              <FormField label="イベント画像URL">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) =>
                    setImageUrl(
                      event.target.value
                    )
                  }
                  placeholder="https://example.com/event-image.jpg"
                  disabled={saving}
                  className={inputClass}
                />

                <p className="mt-2 text-xs leading-5 text-neutral-500">
                  現在は画像URLを登録します。後でSupabase Storageへの画像アップロードにも変更できます。
                </p>

                {imageUrl.trim() && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="イベント画像プレビュー"
                      className="aspect-[16/7] w-full object-cover"
                    />
                  </div>
                )}
              </FormField>

              <FormField label="説明">
                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="イベントの内容、対象者、当日の流れなど"
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
                    onChange={(event) =>
                      setStartAt(
                        event.target.value
                      )
                    }
                    disabled={saving}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="終了日時">
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(event) =>
                      setEndAt(
                        event.target.value
                      )
                    }
                    disabled={saving}
                    className={inputClass}
                  />
                </FormField>
              </div>

              <FormField label="会場">
                <input
                  type="text"
                  value={location}
                  onChange={(event) =>
                    setLocation(
                      event.target.value
                    )
                  }
                  placeholder="例：オンライン、柏○○会議室"
                  disabled={saving}
                  className={inputClass}
                />
              </FormField>

              <div className="grid gap-6 sm:grid-cols-2">
                <FormField label="定員">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={capacity}
                    onChange={(event) =>
                      setCapacity(
                        event.target.value
                      )
                    }
                    placeholder="未入力なら定員なし"
                    disabled={saving}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="参加費">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={fee}
                      onChange={(event) =>
                        setFee(
                          event.target.value
                        )
                      }
                      disabled={saving}
                      className={`${inputClass} pr-12`}
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-neutral-500">
                      円
                    </span>
                  </div>
                </FormField>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-5">
                <label className="flex items-center gap-3 text-sm font-bold">
                  <input type="checkbox" checked={paymentManagementRequired} onChange={(event) => setPaymentManagementRequired(event.target.checked)} disabled={saving} />
                  支払管理を行う
                </label>
                <FormField label="参加費の備考">
                  <textarea value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="例：ご自分の飲食代のみ／会場費は割り勘" rows={3} disabled={saving} className={inputClass} />
                </FormField>
              </div>

              <FormField label="公開状態">
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target
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
          </section>

          <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-500">
                  APPLICATION QUESTIONS
                </p>

                <h2 className="mt-1 text-2xl font-bold text-neutral-900">
                  参加申請時の質問
                </h2>

                <p className="mt-3 text-sm leading-6 text-neutral-500">
                  質問を設定しない場合は、そのままイベントを作成できます。
                </p>
              </div>

              <button
                type="button"
                onClick={addQuestion}
                disabled={saving}
                className="shrink-0 rounded-xl bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50"
              >
                ＋ 質問を追加
              </button>
            </div>

            {questions.length === 0 ? (
              <div className="mt-7 rounded-2xl border border-dashed border-neutral-300 px-6 py-10 text-center">
                <p className="font-medium text-neutral-700">
                  質問は設定されていません
                </p>

                <p className="mt-2 text-sm text-neutral-500">
                  必要な場合は「質問を追加」を押してください。
                </p>
              </div>
            ) : (
              <div className="mt-7 space-y-5">
                {questions.map(
                  (
                    question,
                    questionIndex
                  ) => (
                    <QuestionEditor
                      key={
                        question.localId
                      }
                      question={
                        question
                      }
                      questionIndex={
                        questionIndex
                      }
                      saving={saving}
                      onUpdate={
                        updateQuestion
                      }
                      onTypeChange={
                        changeQuestionType
                      }
                      onRemove={
                        removeQuestion
                      }
                      onAddOption={
                        addOption
                      }
                      onUpdateOption={
                        updateOption
                      }
                      onRemoveOption={
                        removeOption
                      }
                    />
                  )
                )}
              </div>
            )}
          </section>

          {message && (
            <p
              className={`rounded-2xl px-5 py-4 text-sm leading-6 ${
                isError
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {message}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Link
              href="/admin"
              className="rounded-xl border border-neutral-300 bg-white px-5 py-3 text-center text-sm font-bold text-neutral-800 transition hover:bg-neutral-50"
            >
              キャンセル
            </Link>

            <button
              type="submit"
              disabled={
                saving ||
                !title.trim()
              }
              className="rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
            >
              {saving
                ? "作成しています..."
                : status ===
                    "published"
                  ? "作成して公開"
                  : "イベントを作成"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

function QuestionEditor({
  question,
  questionIndex,
  saving,
  onUpdate,
  onTypeChange,
  onRemove,
  onAddOption,
  onUpdateOption,
  onRemoveOption,
}: {
  question: QuestionForm;
  questionIndex: number;
  saving: boolean;

  onUpdate: (
    localId: string,
    updates: Partial<QuestionForm>
  ) => void;

  onTypeChange: (
    localId: string,
    questionType: QuestionType
  ) => void;

  onRemove: (
    localId: string
  ) => void;

  onAddOption: (
    localId: string
  ) => void;

  onUpdateOption: (
    localId: string,
    optionIndex: number,
    value: string
  ) => void;

  onRemoveOption: (
    localId: string,
    optionIndex: number
  ) => void;
}) {
  const hasOptions =
    question.questionType ===
      "single_choice" ||
    question.questionType ===
      "multiple_choice";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <p className="font-bold text-neutral-900">
          質問{questionIndex + 1}
        </p>

        <button
          type="button"
          onClick={() =>
            onRemove(question.localId)
          }
          disabled={saving}
          className="text-sm font-bold text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          削除
        </button>
      </div>

      <div className="mt-5 space-y-5">
        <FormField
          label="質問内容"
          required
        >
          <input
            type="text"
            value={question.questionText}
            onChange={(event) =>
              onUpdate(
                question.localId,
                {
                  questionText:
                    event.target.value,
                }
              )
            }
            placeholder="例：このイベントをどこで知りましたか？"
            disabled={saving}
            className={inputClass}
          />
        </FormField>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="回答形式">
            <select
              value={
                question.questionType
              }
              onChange={(event) =>
                onTypeChange(
                  question.localId,
                  event.target
                    .value as QuestionType
                )
              }
              disabled={saving}
              className={`${inputClass} bg-white`}
            >
              <option value="text">
                一行入力
              </option>

              <option value="textarea">
                複数行入力
              </option>

              <option value="single_choice">
                単一選択
              </option>

              <option value="multiple_choice">
                複数選択
              </option>
            </select>
          </FormField>

          <FormField label="回答設定">
            <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-neutral-300 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={
                  question.isRequired
                }
                onChange={(event) =>
                  onUpdate(
                    question.localId,
                    {
                      isRequired:
                        event.target
                          .checked,
                    }
                  )
                }
                disabled={saving}
                className="h-4 w-4"
              />

              <span className="text-sm font-medium text-neutral-700">
                回答を必須にする
              </span>
            </label>
          </FormField>
        </div>

        {hasOptions && (
          <div>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-neutral-700">
                選択肢
              </p>

              <button
                type="button"
                onClick={() =>
                  onAddOption(
                    question.localId
                  )
                }
                disabled={saving}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                ＋ 選択肢を追加
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {question.options.map(
                (
                  option,
                  optionIndex
                ) => (
                  <div
                    key={optionIndex}
                    className="flex gap-3"
                  >
                    <input
                      type="text"
                      value={option}
                      onChange={(event) =>
                        onUpdateOption(
                          question.localId,
                          optionIndex,
                          event.target
                            .value
                        )
                      }
                      placeholder={`選択肢${optionIndex + 1}`}
                      disabled={saving}
                      className={inputClass}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        onRemoveOption(
                          question.localId,
                          optionIndex
                        )
                      }
                      disabled={
                        saving ||
                        question.options
                          .length <= 2
                      }
                      className="shrink-0 rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      削除
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
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

const inputClass =
  "w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-blue-600 disabled:bg-neutral-100 disabled:text-neutral-500";
