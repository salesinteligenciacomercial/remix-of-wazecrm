import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  Calendar, 
  Bot, 
  BarChart3,
  Settings,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Funil de Vendas", href: "/kanban", icon: LayoutDashboard },
  { name: "Conversas", href: "/conversas", icon: MessageSquare },
  { name: "Agenda", href: "/agenda", icon: Calendar },
  { name: "Tarefas", href: "/tarefas", icon: Calendar },
  { name: "Fluxos e Automação", href: "/ia", icon: Bot },
  { name: "Relatórios", href: "/relatorios", icon: BarChart3 },
  { name: "Configurações", href: "/configuracoes", icon: Settings },
];

export function Sidebar() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: error.message,
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-sidebar border-r border-sidebar-border shadow-xl">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white font-bold text-xl">C</span>
          </div>
          <div>
            <span className="text-sidebar-foreground font-bold text-lg block leading-tight">CEUSIA</span>
            <span className="text-sidebar-foreground/60 text-xs">CRM & Automação</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-primary/20"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-1"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-lg transition-colors ${
                  isActive 
                    ? "bg-white/20" 
                    : "bg-sidebar-accent/30 group-hover:bg-sidebar-accent"
                }`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="flex-1">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border/50 p-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive transition-all duration-200 group"
          onClick={handleLogout}
        >
          <div className="p-1.5 rounded-lg bg-sidebar-accent/30 group-hover:bg-destructive/30 mr-3 transition-colors">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="font-medium">Sair do Sistema</span>
        </Button>
      </div>
    </div>
  );
}
