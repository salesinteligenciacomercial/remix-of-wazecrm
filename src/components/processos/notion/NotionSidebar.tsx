import { useState, useEffect } from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  MoreHorizontal,
  Star,
  StarOff,
  Trash2,
  Copy,
  FileText,
  Folder,
  CheckSquare,
  BookOpen,
  Workflow,
  GitBranch,
  LayoutGrid,
  CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ProcessPage {
  id: string;
  title: string;
  icon: string;
  parent_id: string | null;
  page_type: string;
  is_favorite: boolean;
  is_template: boolean;
  position: number;
  children?: ProcessPage[];
}

interface NotionSidebarProps {
  companyId: string | null;
  selectedPageId: string | null;
  onSelectPage: (page: ProcessPage | null) => void;
  onCreatePage: (parentId?: string | null, type?: string) => void;
  onViewKanban: () => void;
  onViewCalendar: () => void;
  showKanban: boolean;
  showCalendar: boolean;
}

interface Stats {
  pages: number;
  tasks: number;
  playbooks: number;
  cadences: number;
  stages: number;
}

export function NotionSidebar({ 
  companyId, 
  selectedPageId, 
  onSelectPage, 
  onCreatePage,
  onViewKanban,
  onViewCalendar,
  showKanban,
  showCalendar
}: NotionSidebarProps) {
  const [pages, setPages] = useState<ProcessPage[]>([]);
  const [tasks, setTasks] = useState<ProcessPage[]>([]);
  const [favorites, setFavorites] = useState<ProcessPage[]>([]);
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [cadences, setCadences] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['pages', 'tasks', 'playbooks', 'cadences', 'stages']));
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ pages: 0, tasks: 0, playbooks: 0, cadences: 0, stages: 0 });

  useEffect(() => {
    if (companyId) {
      loadAllData();
    }
  }, [companyId]);

  const loadAllData = async () => {
    if (!companyId) return;
    
    try {
      const [pagesRes, playbooksRes, cadencesRes, stagesRes] = await Promise.all([
        supabase
          .from('process_pages')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_template', false)
          .order('position', { ascending: true }),
        supabase
          .from('processes_playbooks')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false }),
        supabase
          .from('processes_routines')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false }),
        supabase
          .from('processes_stages')
          .select('*')
          .eq('company_id', companyId)
          .order('stage_order', { ascending: true })
      ]);

      // Process pages
      const pagesData = pagesRes.data || [];
      const pagesMap = new Map<string, ProcessPage>();
      const rootPages: ProcessPage[] = [];
      const taskPages: ProcessPage[] = [];
      const favoritePages: ProcessPage[] = [];

      pagesData.forEach(page => {
        pagesMap.set(page.id, { ...page, children: [] });
      });

      pagesData.forEach(page => {
        const currentPage = pagesMap.get(page.id)!;
        if (page.is_favorite) {
          favoritePages.push(currentPage);
        }
        
        if (page.page_type === 'task') {
          taskPages.push(currentPage);
        } else if (page.parent_id && pagesMap.has(page.parent_id)) {
          pagesMap.get(page.parent_id)!.children!.push(currentPage);
        } else if (!page.parent_id && page.page_type !== 'task') {
          rootPages.push(currentPage);
        }
      });

      setPages(rootPages);
      setTasks(taskPages);
      setFavorites(favoritePages);
      setPlaybooks(playbooksRes.data || []);
      setCadences(cadencesRes.data || []);
      setStages(stagesRes.data || []);
      
      setStats({
        pages: rootPages.length,
        tasks: taskPages.length,
        playbooks: playbooksRes.data?.length || 0,
        cadences: cadencesRes.data?.length || 0,
        stages: stagesRes.data?.length || 0
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleFavorite = async (page: ProcessPage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('process_pages')
        .update({ is_favorite: !page.is_favorite })
        .eq('id', page.id);

      if (error) throw error;
      await loadAllData();
      toast.success(page.is_favorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    } catch (error) {
      toast.error('Erro ao atualizar favorito');
    }
  };

  const deletePage = async (page: ProcessPage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('process_pages')
        .delete()
        .eq('id', page.id);

      if (error) throw error;
      await loadAllData();
      if (selectedPageId === page.id) {
        onSelectPage(null);
      }
      toast.success('Item excluído');
    } catch (error) {
      toast.error('Erro ao excluir item');
    }
  };

  const deletePlaybook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('processes_playbooks').delete().eq('id', id);
      if (error) throw error;
      await loadAllData();
      toast.success('Playbook excluído');
    } catch (error) {
      toast.error('Erro ao excluir playbook');
    }
  };

  const deleteCadence = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('processes_routines').delete().eq('id', id);
      if (error) throw error;
      await loadAllData();
      toast.success('Cadência excluída');
    } catch (error) {
      toast.error('Erro ao excluir cadência');
    }
  };

  const deleteStage = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('processes_stages').delete().eq('id', id);
      if (error) throw error;
      await loadAllData();
      toast.success('Etapa excluída');
    } catch (error) {
      toast.error('Erro ao excluir etapa');
    }
  };

  const duplicatePage = async (page: ProcessPage, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('process_pages')
        .insert({
          company_id: companyId,
          parent_id: page.parent_id,
          title: `${page.title} (cópia)`,
          icon: page.icon,
          page_type: page.page_type,
          created_by: user.user?.id
        });

      if (error) throw error;
      await loadAllData();
      toast.success('Item duplicado');
    } catch (error) {
      toast.error('Erro ao duplicar item');
    }
  };

  const renderPageItem = (page: ProcessPage, depth: number = 0) => {
    const hasChildren = page.children && page.children.length > 0;
    const isExpanded = expandedIds.has(page.id);
    const isSelected = selectedPageId === page.id;

    return (
      <div key={page.id}>
        <div
          className={cn(
            "group flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors",
            isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted/50",
            depth > 0 && "ml-4"
          )}
          onClick={() => onSelectPage(page)}
        >
          <button
            className="p-0.5 hover:bg-muted rounded opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpand(page.id);
            }}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <div className="w-3.5" />
            )}
          </button>
          
          <span className="text-base">{page.icon}</span>
          
          <span className="flex-1 text-sm truncate">{page.title}</span>
          
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-1 hover:bg-muted rounded"
              onClick={(e) => {
                e.stopPropagation();
                onCreatePage(page.id, 'page');
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-muted rounded" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuItem onClick={(e) => toggleFavorite(page, e as any)}>
                  {page.is_favorite ? (
                    <><StarOff className="h-4 w-4 mr-2" /> Remover favorito</>
                  ) : (
                    <><Star className="h-4 w-4 mr-2" /> Adicionar favorito</>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => duplicatePage(page, e as any)}>
                  <Copy className="h-4 w-4 mr-2" /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={(e) => deletePage(page, e as any)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-2">
            {page.children!.map(child => renderPageItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderSimpleItem = (
    id: string, 
    title: string, 
    icon: React.ReactNode, 
    onDelete: (id: string, e: React.MouseEvent) => void
  ) => (
    <div
      key={id}
      className="group flex items-center gap-1 py-1 px-2 rounded-md cursor-pointer transition-colors hover:bg-muted/50"
    >
      <div className="w-3.5" />
      {icon}
      <span className="flex-1 text-sm truncate">{title}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1 hover:bg-muted rounded" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuItem 
              className="text-destructive"
              onClick={(e) => onDelete(id, e as any)}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const filteredPages = searchQuery
    ? pages.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : pages;

  const filteredTasks = searchQuery
    ? tasks.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : tasks;

  return (
    <div className="w-64 border-r border-border bg-muted/30 flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-border">
        <Input
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-sm bg-background"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {/* Quick Views */}
          <div className="space-y-1">
            <div
              className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
                showKanban ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
              )}
              onClick={onViewKanban}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="text-sm">Kanban</span>
            </div>
            <div
              className={cn(
                "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
                showCalendar ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
              )}
              onClick={onViewCalendar}
            >
              <CalendarDays className="h-4 w-4" />
              <span className="text-sm">Calendário</span>
            </div>
          </div>

          <div className="h-px bg-border my-2" />

          {/* Favorites */}
          {favorites.length > 0 && (
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
                <Star className="h-3 w-3" />
                <span>FAVORITOS</span>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-1">
                {favorites.map(page => renderPageItem(page))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Pages */}
          <Collapsible open={expandedIds.has('pages')} onOpenChange={() => toggleExpand('pages')}>
            <CollapsibleTrigger className="flex items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
              <div className="flex items-center gap-2">
                <Folder className="h-3 w-3" />
                <span>PÁGINAS</span>
              </div>
              {stats.pages > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{stats.pages}</Badge>}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              {loading ? (
                <div className="text-center py-2 text-muted-foreground text-xs">Carregando...</div>
              ) : filteredPages.length === 0 ? (
                <div className="text-center py-2 text-muted-foreground text-xs">Nenhuma página</div>
              ) : (
                filteredPages.map(page => renderPageItem(page))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Tasks */}
          <Collapsible open={expandedIds.has('tasks')} onOpenChange={() => toggleExpand('tasks')}>
            <CollapsibleTrigger className="flex items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-3 w-3" />
                <span>TAREFAS</span>
              </div>
              {stats.tasks > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{stats.tasks}</Badge>}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-2 text-muted-foreground text-xs">Nenhuma tarefa</div>
              ) : (
                filteredTasks.map(task => renderPageItem(task))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Playbooks */}
          <Collapsible open={expandedIds.has('playbooks')} onOpenChange={() => toggleExpand('playbooks')}>
            <CollapsibleTrigger className="flex items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
              <div className="flex items-center gap-2">
                <BookOpen className="h-3 w-3" />
                <span>PLAYBOOKS</span>
              </div>
              {stats.playbooks > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{stats.playbooks}</Badge>}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              {playbooks.length === 0 ? (
                <div className="text-center py-2 text-muted-foreground text-xs">Nenhum playbook</div>
              ) : (
                playbooks.map(pb => renderSimpleItem(pb.id, pb.title, <BookOpen className="h-4 w-4 text-blue-500" />, deletePlaybook))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Cadences */}
          <Collapsible open={expandedIds.has('cadences')} onOpenChange={() => toggleExpand('cadences')}>
            <CollapsibleTrigger className="flex items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
              <div className="flex items-center gap-2">
                <Workflow className="h-3 w-3" />
                <span>CADÊNCIAS</span>
              </div>
              {stats.cadences > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{stats.cadences}</Badge>}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              {cadences.length === 0 ? (
                <div className="text-center py-2 text-muted-foreground text-xs">Nenhuma cadência</div>
              ) : (
                cadences.map(c => renderSimpleItem(c.id, c.name, <Workflow className="h-4 w-4 text-purple-500" />, deleteCadence))
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Stages */}
          <Collapsible open={expandedIds.has('stages')} onOpenChange={() => toggleExpand('stages')}>
            <CollapsibleTrigger className="flex items-center justify-between px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
              <div className="flex items-center gap-2">
                <GitBranch className="h-3 w-3" />
                <span>ETAPAS</span>
              </div>
              {stats.stages > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">{stats.stages}</Badge>}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-1">
              {stages.length === 0 ? (
                <div className="text-center py-2 text-muted-foreground text-xs">Nenhuma etapa</div>
              ) : (
                stages.map(s => renderSimpleItem(s.id, s.stage_name, <GitBranch className="h-4 w-4 text-green-500" />, deleteStage))
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* New Item Button */}
      <div className="p-2 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem onClick={() => onCreatePage(null, 'page')}>
              <FileText className="h-4 w-4 mr-2" />
              Página
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreatePage(null, 'task')}>
              <CheckSquare className="h-4 w-4 mr-2" />
              Tarefa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onCreatePage(null, 'playbook')}>
              <BookOpen className="h-4 w-4 mr-2" />
              Playbook
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreatePage(null, 'cadence')}>
              <Workflow className="h-4 w-4 mr-2" />
              Cadência
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCreatePage(null, 'stage')}>
              <GitBranch className="h-4 w-4 mr-2" />
              Etapa
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
