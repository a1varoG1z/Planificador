import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/BottomNav';
import { SignOutButton } from '@/components/SignOutButton';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-leaf-50 pb-20">
      <header className="flex items-center justify-between border-b border-leaf-100 bg-white px-4 py-3">
        <span className="text-lg font-bold text-leaf-800">🌿 Plantario</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-leaf-500">{user?.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
