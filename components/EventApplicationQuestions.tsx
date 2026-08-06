"use client";

export type QuestionType =
  | "text"
  | "textarea"
  | "single_choice"
  | "multiple_choice";

export type QuestionOption = {
  id: string;
  option_text: string;
  sort_order: number;
};

export type EventQuestion = {
  id: string;
  question_text: string;
  question_type: QuestionType;
  is_required: boolean;
  sort_order: number;
  options: QuestionOption[];
};

export type EventAnswers = Record<
  string,
  string | string[]
>;

type Props = {
  questions: EventQuestion[];
  answers: EventAnswers;
  disabled?: boolean;
  onChange: (
    questionId: string,
    value: string | string[]
  ) => void;
};

export default function EventApplicationQuestions({
  questions,
  answers,
  disabled = false,
  onChange,
}: Props) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-sm font-medium text-blue-600">
          APPLICATION
        </p>

        <h2 className="mt-1 text-2xl font-bold text-neutral-900">
          参加申請
        </h2>

        <p className="mt-3 text-sm leading-6 text-neutral-500">
          以下の質問に回答してから、参加申請を行ってください。
        </p>
      </div>

      <div className="mt-7 space-y-7">
        {questions.map((question, index) => (
          <QuestionField
            key={question.id}
            question={question}
            questionNumber={index + 1}
            value={answers[question.id]}
            disabled={disabled}
            onChange={(value) =>
              onChange(question.id, value)
            }
          />
        ))}
      </div>
    </section>
  );
}

function QuestionField({
  question,
  questionNumber,
  value,
  disabled,
  onChange,
}: {
  question: EventQuestion;
  questionNumber: number;
  value: string | string[] | undefined;
  disabled: boolean;
  onChange: (
    value: string | string[]
  ) => void;
}) {
  const sortedOptions = [...question.options].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm font-bold leading-6 text-neutral-900">
        <span className="mr-2 text-neutral-400">
          {questionNumber}.
        </span>

        {question.question_text}

        {question.is_required && (
          <span className="ml-2 rounded bg-red-50 px-2 py-0.5 text-xs font-bold text-red-600">
            必須
          </span>
        )}
      </legend>

      <div className="mt-3">
        {question.question_type === "text" && (
          <input
            type="text"
            value={
              typeof value === "string"
                ? value
                : ""
            }
            onChange={(event) =>
              onChange(event.target.value)
            }
            placeholder="回答を入力してください"
            className={inputClass}
          />
        )}

        {question.question_type ===
          "textarea" && (
          <textarea
            value={
              typeof value === "string"
                ? value
                : ""
            }
            onChange={(event) =>
              onChange(event.target.value)
            }
            placeholder="回答を入力してください"
            rows={5}
            className={`${inputClass} resize-y`}
          />
        )}

        {question.question_type ===
          "single_choice" && (
          <div className="space-y-3">
            {sortedOptions.map((option) => {
              const checked =
                value === option.option_text;

              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 transition ${
                    checked
                      ? "border-blue-500 bg-blue-50"
                      : "border-neutral-200 bg-white hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value={option.option_text}
                    checked={checked}
                    onChange={() =>
                      onChange(
                        option.option_text
                      )
                    }
                    className="h-4 w-4"
                  />

                  <span className="text-sm font-medium text-neutral-800">
                    {option.option_text}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {question.question_type ===
          "multiple_choice" && (
          <div className="space-y-3">
            {sortedOptions.map((option) => {
              const currentValues =
                Array.isArray(value)
                  ? value
                  : [];

              const checked =
                currentValues.includes(
                  option.option_text
                );

              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 transition ${
                    checked
                      ? "border-blue-500 bg-blue-50"
                      : "border-neutral-200 bg-white hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    value={option.option_text}
                    checked={checked}
                    onChange={() => {
                      if (checked) {
                        onChange(
                          currentValues.filter(
                            (item) =>
                              item !==
                              option.option_text
                          )
                        );
                      } else {
                        onChange([
                          ...currentValues,
                          option.option_text,
                        ]);
                      }
                    }}
                    className="h-4 w-4"
                  />

                  <span className="text-sm font-medium text-neutral-800">
                    {option.option_text}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </fieldset>
  );
}

const inputClass =
  "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-blue-600 disabled:cursor-not-allowed disabled:bg-neutral-100";