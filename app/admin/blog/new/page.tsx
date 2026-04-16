import BlogPostEditor from "@/features/admin/components/BlogPostEditor";

export const metadata = { title: "Новая статья" };

export default function NewBlogPostPage() {
  return <BlogPostEditor post={null} />;
}
