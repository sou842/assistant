import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Node Editor",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
