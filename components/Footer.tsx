import Link from 'next/link';
import { Bot } from 'lucide-react';

export default function Footer({ showCTA = false }: { showCTA?: boolean }) {
  return (
    <div className="w-full bg-[url('/images/footer.png')] bg-cover bg-center">
      {showCTA && (
        <div className="w-full max-w-300 mx-auto px-4 py-20 md:px-8 md:py-32">
          <div className="mx-auto max-w-6xl relative overflow-hidden">
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 py-16 md:p-24 min-h-[450px]">
              <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-white mb-6">
                Ready to upgrade your workflow?
              </h2>
              <p className="max-w-2xl text-lg text-white/80 mb-10 leading-relaxed">
                Join thousands of teams who are already building faster, smarter, and more securely with Jarvis AI. Get in touch to learn how we can help your enterprise scale.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <Link
                  href="/contact"
                  className="flex items-center gap-2 rounded-full bg-white px-8 py-3.5 font-medium text-black transition-all hover:bg-gray-100 hover:-translate-y-0.5"
                >
                  Contact Sales
                </Link>
                <Link
                  href="/ai"
                  className="flex items-center gap-2 rounded-full border border-white/20 bg-white/5 backdrop-blur-md px-8 py-3.5 font-medium text-white transition-all hover:bg-white/10 hover:-translate-y-0.5"
                >
                  Try Jarvis Free
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`${!showCTA ? "pt-140 " : ""}w-full max-w-300 mx-auto py-8 px-4 md:px-8 bg-app-canvas/10 rounded-full`}>
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between text-xs text-app-text-primary md:flex-row">
          <div className="flex items-center gap-2 mb-4 md:mb-0">
            <Bot className="size-4" />
            <span className="font-medium">Jarvis AI</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="transition-colors hover:text-app-text-secondary">Privacy Policy</Link>
            <Link href="/terms" className="transition-colors hover:text-app-text-secondary">Terms of Service</Link>
            <span>© {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
