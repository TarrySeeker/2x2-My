import { notFound } from "next/navigation";
import { getBlogPostById } from "@/features/admin/api/blog";
import BlogPostEditor from "@/features/admin/components/BlogPostEditor";

export const metadata = { title: "Редактирование статьи" };

export default async function EditBlogPostPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const postId = Number(id);
  if (Number.isNaN(postId)) notFound();

  const post = await getBlogPostById(postId);
  if (!post) notFound();

  return <BlogPostEditor post={post} />;
}
