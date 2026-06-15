import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { routes } from '@/routes';

interface RouteGuardProps {
  children: React.ReactNode;
}

const SYSTEM_PUBLIC_ROUTES = ['/login', '/403', '/404'];
const routePublicPaths = routes.filter((r) => r.public).map((r) => r.path);
const PUBLIC_ROUTES = [...SYSTEM_PUBLIC_ROUTES, ...routePublicPaths];

function matchPublicRoute(path: string, patterns: string[]) {
  return patterns.some((pattern) => {
    if (pattern.includes('*')) {
      return new RegExp('^' + pattern.replace('*', '.*') + '$').test(path);
    }
    return path === pattern;
  });
}

export function RouteGuard({ children }: RouteGuardProps) {
  const { isAuthenticated } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    const isPublic = matchPublicRoute(location.pathname, PUBLIC_ROUTES);
    if (!isAuthenticated && !isPublic) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
    // Redirect authenticated users away from /login
    if (isAuthenticated && location.pathname === '/login') {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  return <>{children}</>;
}