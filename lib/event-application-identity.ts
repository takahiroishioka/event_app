type IdentityField = "name" | "sns";

type Question = {
  id: string;
  application_field?: IdentityField | null;
  question_text: string;
  question_type: string;
};

const legacyLabels: Record<IdentityField, readonly string[]> = {
  name: ["名前", "お名前"],
  sns: ["連絡の取れるSNSアドレス", "連絡用アカウント"],
};

function identityField(question: Question): IdentityField | undefined {
  if (question.application_field) return question.application_field;
  if (question.question_type !== "text") return undefined;
  return (Object.keys(legacyLabels) as IdentityField[]).find((field) =>
    legacyLabels[field].includes(question.question_text.trim()),
  );
}

// Only merge old labels when the event has the corresponding built-in field.
export function getVisibleApplicationQuestions<T extends Question>(questions: T[]): T[] {
  return questions.filter((question) => {
    const field = identityField(question);
    return !field || question.application_field === field ||
      !questions.some((candidate) => candidate.application_field === field);
  });
}

// Keep every question ID in the payload: the existing RPC validates old fields too.
export function setApplicationAnswer(
  questions: Question[],
  answers: Record<string, string | string[]>,
  questionId: string,
  value: string | string[],
): Record<string, string | string[]> {
  const question = questions.find((candidate) => candidate.id === questionId);
  const field = question && identityField(question);
  const next = { ...answers, [questionId]: value };
  if (field && questions.some((candidate) => candidate.application_field === field)) {
    for (const candidate of questions) {
      if (identityField(candidate) === field) next[candidate.id] = value;
    }
  }
  return next;
}
