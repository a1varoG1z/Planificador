'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/gardens', label: 'Jardines', icon: '🪴' },
  { href: '/calendar', label: 'Calendario', icon: '📅' },
  { href: '/shopping', label: 'Compra', icon: '🛒' },
  { href: '/wild', label: 'Silvestres', icon: '🌼' },
  { href: '/stats', label: 'Stats', icon: '📊' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-leaf-100 bg-white/90 backdrop-blur-md">
      <ul className="mx-auto flex max-w-md justify-around px-1 py-1.5">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`mx-0.5 flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-bold transition-colors ${
                  active ? 'bg-leaf-100 text-leaf-700' : 'text-leaf-300'
                }`}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
