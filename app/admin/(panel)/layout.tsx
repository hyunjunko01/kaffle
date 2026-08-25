import { AdminHeader } from "./header";

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AdminHeader />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 py-10">{children}</div>
    </div>
  );
}
