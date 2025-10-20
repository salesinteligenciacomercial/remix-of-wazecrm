import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Calendar as CalendarIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_id: string | null;
  assignee_name?: string;
  due_date: string | null;
  lead_id: string | null;
  lead_name?: string;
  created_at: string;
}

const columns = [
  { id: "pendente", title: "Pendente", color: "bg-yellow-500" },
  { id: "em_andamento", title: "Em Andamento", color: "bg-blue-500" },
  { id: "concluida", title: "Concluída", color: "bg-green-500" },
];

export default function Tarefas() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        assignee:profiles!tasks_assignee_id_fkey(full_name),
        lead:leads!tasks_lead_id_fkey(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar tarefas",
        description: error.message,
      });
    } else {
      const formattedTasks = (data || []).map((task: any) => ({
        ...task,
        assignee_name: task.assignee?.full_name,
        lead_name: task.lead?.name,
      }));
      setTasks(formattedTasks);
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      baixa: "bg-gray-500",
      media: "bg-yellow-500",
      alta: "bg-orange-500",
      urgente: "bg-red-500",
    };
    return colors[priority] || "bg-gray-500";
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter((task) => task.status === status);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tarefas</h1>
          <p className="text-muted-foreground">
            Gerencie todas as tarefas da equipe
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {columns.map((column) => (
          <div key={column.id} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${column.color}`} />
              <h3 className="font-semibold text-foreground">
                {column.title}
              </h3>
              <Badge variant="outline" className="ml-auto">
                {getTasksByStatus(column.id).length}
              </Badge>
            </div>

            <div className="space-y-3">
              {getTasksByStatus(column.id).map((task) => (
                <Card
                  key={task.id}
                  className="transition-all hover:shadow-lg cursor-pointer"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-medium">
                        {task.title}
                      </CardTitle>
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {task.assignee_name && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignee_name}
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </div>
                    {task.lead_name && (
                      <div className="text-xs">
                        <Badge variant="outline">Lead: {task.lead_name}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {getTasksByStatus(column.id).length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="flex items-center justify-center py-8">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma tarefa
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
