import StudyTopicEditor from "@/components/StudyTopicEditor";
export default async function Page({ params }: { params: Promise<{id: string}> }) { const {id} = await params; return <StudyTopicEditor editingId={id} />; }
