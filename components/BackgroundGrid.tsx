export default function BackgroundGrid() {
  return (
    <div className="fixed inset-0 z-0 flex items-center justify-center pointer-events-none">
      <div className="app-hero-glow absolute top-0 left-1/2 h-125 w-full max-w-200 -translate-x-1/2 rounded-full blur-[120px]" />
      <div className="app-grid-overlay absolute inset-0" />
    </div>
  );
}
