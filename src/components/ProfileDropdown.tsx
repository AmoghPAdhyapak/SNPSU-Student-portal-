import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  User, Settings, Bell, LogOut, ChevronDown,
  Shield, HelpCircle, Moon, Sun, BookOpen,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  sublabel?: string;
  to?: string;
  action?: () => void;
  danger?: boolean;
  dividerBefore?: boolean;
}

export default function ProfileDropdown({ unreadCount }: { unreadCount: number }) {
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);
  const { studentMeta, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const menuItems: MenuItem[] = [
    { icon: User,      label: 'My Profile',     sublabel: 'View your profile',      to: '/profile'       },
    { icon: BookOpen,  label: 'Academic Info',  sublabel: 'Marks, attendance',      to: '/dashboard'     },
    { icon: Bell,      label: 'Notifications',  sublabel: `${unreadCount} unread`,  to: '/notifications' },
    { icon: Settings,  label: 'Settings',       sublabel: 'Preferences',            to: '/settings',     dividerBefore: true },
    { icon: HelpCircle,label: 'Help & Support', sublabel: 'FAQs, contact'                               },
    {
      icon: theme === 'dark' ? Sun : Moon,
      label: theme === 'dark' ? 'Light Mode' : 'Dark Mode',
      sublabel: 'Switch appearance',
      action: toggleTheme,
    },
    {
      icon: LogOut,
      label: 'Sign Out',
      sublabel: 'Logout from portal',
      action: () => { logout(); navigate('/login'); },
      danger: true,
      dividerBefore: true,
    },
  ];

  const name     = studentMeta?.name     ?? 'Student';
  const srn      = studentMeta?.srn      ?? 'SRN: —';
  const initials = studentMeta?.initials ?? 'AA';

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Profile menu"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 pl-2 border-l border-border rounded-lg px-2 py-1.5 transition-all',
          'hover:bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/30',
          open && 'bg-secondary/60 ring-2 ring-primary/30',
        )}>
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ring-2 ring-primary/30"
          style={{ background: 'linear-gradient(135deg, hsl(258 78% 60%), hsl(258 78% 42%))' }}>
          {initials}
        </div>
        {/* Name + SRN */}
        <div className="hidden md:block min-w-0 text-left">
          <p className="text-xs font-semibold text-foreground truncate leading-tight max-w-[130px]">{name}</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[130px]">{srn}</p>
        </div>
        <ChevronDown className={cn(
          'hidden md:block w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-200',
          open && 'rotate-180',
        )} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            'absolute right-0 top-full mt-2 w-72 z-50',
            'bg-card border border-border rounded-2xl overflow-hidden',
            'shadow-[0_8px_40px_hsl(258_78%_60%/0.15),0_4px_16px_rgba(0,0,0,0.15)]',
            'animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150',
          )}>

          {/* Profile header card */}
          <div className="relative px-4 py-4 overflow-hidden"
            style={{ background: 'linear-gradient(135deg, hsl(258 78% 60% / 0.15), hsl(258 78% 42% / 0.08))' }}>
            {/* Subtle background orb */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 pointer-events-none"
              style={{ background: 'radial-gradient(circle, hsl(258 78% 60%), transparent)' }} />

            <div className="flex items-center gap-3 relative">
              {/* Large avatar */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold text-white shrink-0 ring-2 ring-primary/40"
                style={{ background: 'linear-gradient(135deg, hsl(258 78% 60%), hsl(258 78% 42%))', boxShadow: '0 4px 16px hsl(258 78% 60%/0.4)' }}>
                {initials}
              </div>
              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-foreground truncate text-balance leading-tight">{name}</p>
                <p className="text-[11px] text-primary font-medium mt-0.5 truncate">{srn}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                  <p className="text-[10px] text-muted-foreground truncate">B.Tech CSE · Semester 2</p>
                </div>
              </div>
            </div>

            {/* Role badge */}
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Shield className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-semibold text-primary">Student Account</span>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1.5">
            {menuItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx}>
                  {item.dividerBefore && <div className="my-1.5 mx-3 border-t border-border/60" />}
                  <button
                    onClick={() => {
                      setOpen(false);
                      if (item.to) navigate(item.to);
                      else if (item.action) item.action();
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group',
                      item.danger
                        ? 'hover:bg-danger/8 text-danger'
                        : 'hover:bg-secondary/60 text-foreground',
                    )}>
                    {/* Icon wrapper */}
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                      item.danger
                        ? 'bg-danger/10 group-hover:bg-danger/15'
                        : 'bg-secondary group-hover:bg-primary/10',
                    )}>
                      <Icon className={cn(
                        'w-4 h-4 transition-colors',
                        item.danger ? 'text-danger' : 'text-muted-foreground group-hover:text-primary',
                      )} />
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-medium leading-none',
                        item.danger ? 'text-danger' : 'text-foreground',
                      )}>
                        {item.label}
                      </p>
                      {item.sublabel && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {item.sublabel}
                          {item.label === 'Notifications' && unreadCount > 0 && (
                            <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-danger text-white text-[9px] font-bold">
                              {unreadCount}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-border/60 bg-secondary/20">
            <p className="text-[10px] text-muted-foreground text-center">
              SNPSU Academic Intelligence Portal · v6
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
