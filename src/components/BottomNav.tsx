'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/gardens', label: 'Jardines', icon: '🪴' },
  { href: '/calendar', label: 'Calendario', icon: '📅' },
  { href: '/shopping', label: 'Compra', icon: '🛒' },
  { href: '/wild', label: 'Silvestres', icon: '🌼' },
  { href: '/stats', label: 'Estadisticas', icon: '📊' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-leaf-100 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md justify-around">
        {ITEMS.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs ${
                  active ? 'text-leaf-700 font-semibold' : 'text-leaf-400'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
