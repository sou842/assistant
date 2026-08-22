import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jarvis | Studio",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
