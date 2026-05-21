import Link from 'next/link';

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-[-120px] left-1/2 h-[350px] w-[350px] -translate-x-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[-100px] right-0 h-[300px] w-[300px] rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      {/* Content */}
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-sm text-gray-300 backdrop-blur">
            AI Powered Assistant
          </p>

          <h1 className="text-5xl font-extrabold leading-tight tracking-tight md:text-7xl">
            Hi, I’m Jarvis
          </h1>

          <p className="mt-6 text-lg text-gray-400 md:text-2xl">
            Your personal AI assistant for smarter conversations,
            productivity, and automation.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href="/ai"
              className="rounded-full bg-white px-8 py-4 text-lg font-semibold text-black transition-all duration-300 hover:scale-105 hover:bg-gray-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}