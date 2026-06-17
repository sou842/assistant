import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vault Item",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
