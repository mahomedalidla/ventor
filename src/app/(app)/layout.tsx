import { AppNav } from "@/components/AppNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">{children}</main>
    </>
  );
}
