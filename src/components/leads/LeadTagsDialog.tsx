import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tag, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useTagsManager } from "@/hooks/useTagsManager";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface LeadTagsDialogProps {
  leadId: string;
  currentTags?: string[];
  onTagsUpdated: () => void;
  triggerButton?: React.ReactNode;
}

export function LeadTagsDialog({ leadId, currentTags = [], onTagsUpdated, triggerButton }: LeadTagsDialogProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(Array.isArray(currentTags) ? currentTags : []);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [tagsPopoverOpen, setTagsPopoverOpen] = useState(false);
  const { allTags: tagsExistentes, addTagToLead, removeTagFromLead, refreshTags } = useTagsManager();

  useEffect(() => {
    if (open) {
      setTags(Array.isArray(currentTags) ? currentTags : []);
      // Recarregar tags existentes quando o dialog for aberto
      refreshTags();
    }
  }, [open, currentTags, refreshTags]);

  const adicionarTag = () => {
    const tagTrimmed = newTag.trim();
    if (!tagTrimmed) {
      toast.error("Digite uma tag");
      return;
    }

    if (tags.includes(tagTrimmed)) {
      toast.error("Tag já existe");
      return;
    }

    setTags([...tags, tagTrimmed]);
    setNewTag("");
  };

  const adicionarTagExistente = (tag: string) => {
    if (tags.includes(tag)) {
      toast.error("Tag já adicionada");
      return;
    }
    setTags([...tags, tag]);
    setTagsPopoverOpen(false);
  };

  const removerTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      // Remover tags antigas que não estão mais na lista
      const tagsToRemove = (currentTags || []).filter(tag => !tags.includes(tag));
      for (const tag of tagsToRemove) {
        await removeTagFromLead(leadId, tag);
      }

      // Adicionar novas tags
      const tagsToAdd = tags.filter(tag => !(currentTags || []).includes(tag));
      for (const tag of tagsToAdd) {
        await addTagToLead(leadId, tag);
      }

      toast.success("Tags atualizadas com sucesso!");
      setOpen(false);
      onTagsUpdated();
    } catch (error) {
      console.error("Erro ao atualizar tags:", error);
      toast.error("Erro ao atualizar tags");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm">
            <Tag className="h-4 w-4 mr-2" />
            Gerenciar Tags
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Tags do Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Popover open={tagsPopoverOpen} onOpenChange={setTagsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-start" disabled={loading}>
                  <Tag className="h-4 w-4 mr-2" />
                  {tagsExistentes.length > 0 ? "Selecionar tag existente" : "Sem tags existentes"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar tag..." />
                  <CommandList>
                    <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
                    <CommandGroup>
                      {tagsExistentes.map((tag) => (
                        <CommandItem
                          key={tag}
                          value={tag}
                          onSelect={() => adicionarTagExistente(tag)}
                        >
                          <Tag className="h-4 w-4 mr-2" />
                          {tag}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Nova tag..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionarTag();
                }
              }}
              disabled={loading}
            />
            <Button onClick={adicionarTag} disabled={loading} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 min-h-[100px] p-4 border rounded-md bg-muted/20">
            {tags.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tag adicionada</p>
            ) : (
              tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {tag}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removerTag(tag)}
                    disabled={loading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Tags"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
