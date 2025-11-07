import { Navigate, Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

export function MainLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const bypassAuth = ((import.meta as any).env?.VITE_BYPASS_AUTH === '1') || ((import.meta as any).env?.DEV === true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    // Verificar modo offline SUPER ADMIN primeiro
    const offlineMode = localStorage.getItem('offline_mode');
    const offlineSession = localStorage.getItem('offline_session');
    const isSuperAdmin = localStorage.getItem('is_super_admin');
    
    console.log("🔍 [MainLayout] Verificando autenticação...", {
      offlineMode,
      isSuperAdmin,
      hasOfflineSession: !!offlineSession
    });
    
    if (offlineMode === 'true' && offlineSession && isSuperAdmin === 'true') {
      // Usar sessão offline de super admin
      const parsedSession = JSON.parse(offlineSession);
      console.log("✅ [MainLayout] Usando sessão offline SUPER ADMIN:", parsedSession.user.email);
      setSession(parsedSession as any);
      setLoading(false);
      return;
    }

    // Check current session via Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("🔐 [MainLayout] Sessão Supabase:", session?.user?.email || "Nenhuma");
      setSession(session);
      setLoading(false);
    }).catch((error) => {
      console.error("❌ [MainLayout] Erro ao buscar sessão:", error);
      // Se falhar, NÃO ativar modo offline automaticamente
      // Redirecionar para auth
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("🔄 [MainLayout] Auth state changed:", session?.user?.email || "Logout");
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session && !bypassAuth) {
    return <Navigate to="/auth" replace />;
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('sidebar-collapsed', String(newValue));
      return newValue;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={sidebarCollapsed} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} sidebarCollapsed={sidebarCollapsed} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
