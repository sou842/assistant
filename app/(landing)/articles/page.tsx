import Link from "next/link";
import Image from "next/image";
import dbConnect from "@/lib/mongodb";
import Article from "@/lib/models/article";
import { ArticleSearch } from "@/components/article-search";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default async function ArticlesPage(props: { searchParams?: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams;
  const query = searchParams?.q || "";
  let articles: any[] = [];

  try {
    await dbConnect();

    // Build DB query
    const dbQuery: any = { isPublic: true };
    if (query) {
      dbQuery.$or = [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } }
      ];
    }

    const docs = await Article.find(dbQuery).sort({ createdAt: -1 }).lean();

    articles = docs.map((doc: any) => ({
      ...doc,
      _id: doc._id.toString(),
      createdAt: doc.createdAt?.toString(),
      updatedAt: doc.updatedAt?.toString(),
    }));
  } catch (error) {
    console.error("Failed to fetch articles:", error);
  }

  const publicArticles = articles;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {/* Hero Section */}
      <section className="relative w-full h-[80vh] min-h-[600px] flex items-center justify-center overflow-hidden bg-background">
        {/* Background Image with less dark overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero.png"
            alt="Articles Hero"
            fill
            className="object-cover opacity-90"
            priority
          />
          {/* A more vibrant, subtle gradient instead of solid dark */}
          {/* <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent mix-blend-overlay" /> */}
        </div>

        {/* Hero Content */}
        <div className="relative z-10 text-center px-4 w-full max-w-5xl mt-10">
          <h1 className="text-6xl font-extrabold tracking-tighter mb-6 text-white drop-shadow-2xl">
            Discover <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Insights</span>
          </h1>
          <p className="text-2xl md:text-3xl text-white/90 mb-12 max-w-3xl mx-auto font-medium drop-shadow-md">
            Explore the latest thoughts, updates, and deep-dives from our team.
          </p>
          <div className="transform scale-110 origin-top">
            <ArticleSearch />
          </div>
        </div>
      </section>

      {/* Articles List */}
      <div className="container mx-auto px-4 max-w-6xl mt-16">
        {query && (
          <h2 className="text-2xl font-semibold mb-8 border-b pb-4">
            Search results for <span className="text-primary">"{query}"</span>
          </h2>
        )}

        {publicArticles.length === 0 ? (
          <div className="text-center py-20 bg-card/50 rounded-2xl border border-border/50">
            <h3 className="text-2xl font-semibold mb-2">No articles found</h3>
            <p className="text-muted-foreground">Try adjusting your search to find what you're looking for.</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {publicArticles.map((article) => (
              <div key={article._id} className="group border border-border/50 bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1">
                {article.thumbnail && (
                  <div className="relative w-full h-56 overflow-hidden">
                    <img
                      src={article.thumbnail}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold mb-3 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    <Link href={`/articles/${article._id}`} className="focus:outline-none">
                      <span className="absolute inset-0" aria-hidden="true" />
                      {article.title}
                    </Link>
                  </h3>
                  <p className="text-muted-foreground mb-6 line-clamp-3 text-sm flex-grow leading-relaxed">
                    {article.description}
                  </p>
                  <div className="mt-auto pt-4 border-t border-border/50">
                    <span className="text-primary font-semibold hover:underline text-sm inline-flex items-center gap-1">
                      Read article <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
