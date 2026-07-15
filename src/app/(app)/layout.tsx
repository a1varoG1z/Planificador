import { createClient } from '@/lib/supabase/server';
import { BottomNav } from '@/components/BottomNav';
import { SignOutButton } from '@/components/SignOutButton';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-r from-leaf-600 to-leaf-500 px-4 py-3.5 shadow-soft">
        <span className="font-display text-lg font-bold text-white">🌿 Plantario</span>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-leaf-100 sm:inline">{user?.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 py-5">{children}</main>
      <BottomNav />
    </div>
  );
}
