import { AIButton } from "@/components/ui/ai-button";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <AIButton />
    </>
  );
}
