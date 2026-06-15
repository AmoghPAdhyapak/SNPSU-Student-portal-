import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth }  from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { NotificationsAPI } from '@/services/api';
import { cn } from '@/lib/utils';
import ProfileDropdown from '@/components/ProfileDropdown';
import {
  LayoutDashboard, User, BookOpen, CalendarCheck, FileText,
  CalendarDays, ClipboardList, Library, Briefcase,
  Bell, Bot, MessageSquare, Settings, LogOut, Menu,
  GraduationCap, Sun, Moon, Search, ChevronDown, ChevronRight, Mail,
  ClipboardCheck, UserCheck, Inbox,
} from 'lucide-react';

type NavItem = {
  to?: string;
  icon: React.ElementType;
  label: string;
  badge?: number | string;
  children?: { to: string; label: string; icon: React.ElementType }[];
};

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard'                     },
  { to: '/profile',       icon: User,            label: 'My Profile'                    },
  {
    icon: BookOpen, label: 'Academics',
    children: [
      { to: '/attendance', icon: CalendarCheck,  label: 'Attendance' },
      { to: '/internals',  icon: FileText,       label: 'Internals'  },
      { to: '/analytics',  icon: ClipboardList,  label: 'Analytics'  },
    ],
  },
  { to: '/timetable',     icon: CalendarDays,    label: 'Timetable'                     },
  { to: '/assignments',   icon: ClipboardCheck,  label: 'Assignments'                   },
  { to: '/library',       icon: Library,         label: 'Library'                       },
  { to: '/placements',    icon: Briefcase,       label: 'Placements'                    },
  { to: '/class-advisor', icon: UserCheck,       label: 'Class Advisor', badge: 'New'   },
  { to: '/messages',      icon: Inbox,           label: 'Messages',      badge: 3       },
  { to: '/notifications', icon: Bell,            label: 'Notifications', badge: 2       },
  { to: '/ai-mentor',     icon: Bot,             label: 'AI Mentor'                     },
  { to: '/feedback',      icon: MessageSquare,   label: 'Feedback'                      },
  { to: '/settings',      icon: Settings,        label: 'Settings'                      },
];

function SidebarContent({ onNavClick, unreadCount }: { onNavClick?: () => void; unreadCount: number }) {
  const { studentMeta, logout } = useAuth();
  const { theme, toggleTheme }  = useTheme();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [academicsOpen, setAcademicsOpen] = useState(
    ['/attendance', '/internals', '/analytics'].some((p) => location.pathname.startsWith(p))
  );

  return (
    <div className="flex flex-col h-full py-4" style={{ background: 'hsl(222 47% 9%)' }}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 pb-4 border-b border-sidebar-border">
        {/* Gold shield crest */}
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: 'linear-gradient(145deg, hsl(42 95% 55%), hsl(36 88% 42%))',
            boxShadow: '0 3px 12px hsl(42 95% 50%/0.50)',
          }}>
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-extrabold text-sm leading-tight tracking-wide" style={{ color: 'hsl(210 20% 95%)' }}>
            SAPTHAGIRI <span style={{ color: 'hsl(43 89% 55%)' }}>NPS</span>
          </p>
          <p className="text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: 'hsl(210 15% 58%)' }}>UNIVERSITY</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 pt-3 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          if (item.children) {
            const isChildActive = item.children.some((c) => location.pathname === c.to);
            return (
              <div key={item.label}>
                <button
                  onClick={() => setAcademicsOpen((o) => !o)}
                  className={cn(
                    'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
                    isChildActive
                      ? 'bg-primary/20 text-white'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-white'
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {academicsOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-60" /> : <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                </button>
                {academicsOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border/60 pl-3">
                    {item.children.map((child) => (
                      <NavLink key={child.to} to={child.to} onClick={onNavClick}
                        className={({ isActive }) => cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all',
                          isActive
                            ? 'bg-primary text-white font-semibold shadow-sm'
                            : 'text-sidebar-foreground/55 hover:bg-sidebar-accent hover:text-white'
                        )}>
                        <child.icon className="w-3.5 h-3.5 shrink-0" />
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          const badgeEl = item.badge !== undefined ? (
            typeof item.badge === 'string' ? (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-success/20 text-success border border-success/30">{item.badge}</span>
            ) : (
              <span className="text-[10px] font-bold px-1.5 min-w-[1.2rem] py-0.5 rounded-full text-center leading-none"
                style={{ background: item.to === '/notifications' ? 'hsl(var(--danger))' : 'hsl(var(--info))', color: 'white' }}>
                {item.badge > 9 ? '9+' : item.badge}
              </span>
            )
          ) : null;

          return (
            <NavLink key={item.to} to={item.to!} onClick={onNavClick}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/25 text-white font-semibold'
                  : 'text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-white'
              )}>
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {badgeEl}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom: academic year + theme + logout */}
      <div className="px-3 pt-3 mt-2 border-t border-sidebar-border space-y-2">
        <div className="mx-1 rounded-xl px-3 py-3" style={{ background: 'hsl(224 30% 13%)', border: '1px solid hsl(224 28% 19%)' }}>
          <div className="flex items-center gap-1.5 mb-2">
            <GraduationCap className="w-3 h-3 shrink-0" style={{ color: 'hsl(42 95% 55%)' }} />
            <p className="text-[10px] font-bold tracking-[0.14em] uppercase" style={{ color: 'hsl(210 15% 52%)' }}>Academic Year</p>
          </div>
          <p className="text-base font-bold leading-tight" style={{ color: 'hsl(210 20% 95%)' }}>2025 – 2026</p>
          <p className="text-[11px] mt-1" style={{ color: 'hsl(210 15% 58%)' }}>Even Semester</p>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={toggleTheme}
            className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-all hover:bg-sidebar-accent"
            style={{ color: 'hsl(210 15% 58%)' }}>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>Theme</span>
          </button>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg transition-all hover:bg-red-500/10 hover:text-red-400"
            style={{ color: 'hsl(210 15% 58%)' }}>
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { studentMeta } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    NotificationsAPI.getAll()
      .then((d) => setUnreadCount(d.notifications.filter((n) => !n.is_read).length))
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-sidebar-border" style={{ background: 'hsl(222 47% 9%)' }}>
        <SidebarContent unreadCount={unreadCount} />
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 overflow-x-hidden flex flex-col">
        {/* Top header */}
        <header className="flex items-center gap-3 px-4 md:px-6 h-14 border-b border-border bg-card shrink-0">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-muted-foreground hover:text-foreground shrink-0">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0 bg-sidebar">
              <SidebarContent onNavClick={() => setMobileOpen(false)} unreadCount={unreadCount} />
            </SheetContent>
          </Sheet>

          {/* Search */}
          <div className="flex-1 min-w-0 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full pl-9 pr-16 h-9 rounded-lg border border-border bg-secondary/60 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border font-mono">Ctrl K</span>
            </div>
          </div>

          {/* Right: icons + profile dropdown */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Bell → Notifications */}
            <button
              onClick={() => navigate('/notifications')}
              aria-label="Notifications"
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-0.5">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {/* Mail → Messages */}
            <button
              onClick={() => navigate('/messages')}
              aria-label="Messages"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Mail className="w-4 h-4" />
            </button>
            {/* Profile dropdown */}
            <ProfileDropdown unreadCount={unreadCount} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
