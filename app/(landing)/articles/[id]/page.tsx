import Link from "next/link";
import { notFound } from "next/navigation";
import { EditorRenderer } from "@/components/editor-renderer";
import dbConnect from "@/lib/mongodb";
import Article from "@/lib/models/article";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default async function ArticlePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  let article: any = null;

  try {
    await dbConnect();
    const doc = await Article.findById(params.id).lean();
    if (doc) {
      article = {
        ...doc,
        _id: doc._id.toString(),
        createdAt: doc.createdAt?.toString(),
        updatedAt: doc.updatedAt?.toString(),
      };
    }
  } catch (error) {
    console.error("Failed to fetch article:", error);
  }

  if (!article || article.error) {
    notFound();
  }

  const date = new Date(article.createdAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto py-32 px-4 max-w-3xl grow">
        <div className="mb-10">
          <Link href="/articles" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10">
            &larr; Back to all articles
          </Link>
        </div>
        <article className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight tracking-tight text-white">{article.title}</h1>
          <p className="text-white/60 mb-10 text-lg">Published on {date}</p>
          
          {article.thumbnail && (
            <div className="mb-12 relative w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <img 
                src={article.thumbnail} 
                alt={article.title} 
                className="w-full h-auto object-cover max-h-150"
              />
            </div>
          )}

          <div className="mt-8 text-white/80 leading-relaxed font-light">
            <EditorRenderer content={article.content} />
          </div>
        </article>
      </div>
      <Footer />
    </div>
  );
}
