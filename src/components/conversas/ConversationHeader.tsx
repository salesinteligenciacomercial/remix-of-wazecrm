import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, Video, Info, User, MessageSquare, Instagram, Facebook, FileText, DollarSign } from "lucide-react";

interface ConversationHeaderProps {
  contactName: string;
  channel: "whatsapp" | "instagram" | "facebook";
  avatarUrl?: string;
  produto?: string;
  valor?: string;
  responsavel?: string;
  showInfoPanel: boolean;
  onToggleInfoPanel: () => void;
}

export function ConversationHeader({
  contactName,
  channel,
  avatarUrl,
  produto,
  valor,
  responsavel,
  showInfoPanel,
  onToggleInfoPanel,
}: ConversationHeaderProps) {
  const getChannelIcon = () => {
    switch (channel) {
      case "whatsapp":
        return <MessageSquare className="h-4 w-4 text-[#25D366]" />;
      case "instagram":
        return <Instagram className="h-4 w-4 text-pink-500" />;
      case "facebook":
        return <Facebook className="h-4 w-4 text-blue-600" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="sticky top-0 z-20 bg-background border-b border-border shadow-md backdrop-blur-sm">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Avatar do Lead com Indicador de Rede */}
            <div className="relative">
              <Avatar className="h-14 w-14 border-2 border-primary/20">
                <AvatarImage src={avatarUrl} alt={contactName} />
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold text-lg">
                  {getInitials(contactName)}
                </AvatarFallback>
              </Avatar>
              {/* Badge da Rede Social */}
              <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border-2 border-background shadow-sm">
                {getChannelIcon()}
              </div>
            </div>
            
            {/* Nome e Canal */}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-foreground">
                  {contactName}
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="capitalize font-medium">{channel}</span>
              </div>
            </div>
          </div>
          
          {/* Ações */}
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="hover:bg-primary/10"
              title="Ligar"
            >
              <Phone className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              className="hover:bg-primary/10"
              title="Videochamada"
            >
              <Video className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onToggleInfoPanel}
              className={showInfoPanel ? "bg-primary/10 text-primary" : "hover:bg-primary/10"}
              title="Informações"
            >
              <Info className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Informações do Lead */}
        {(produto || valor || responsavel) && (
          <div className="flex items-center gap-3 pt-2 border-t border-border/50">
            {produto && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-md">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-foreground">{produto}</span>
              </div>
            )}
            {valor && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 rounded-md">
                <DollarSign className="h-3.5 w-3.5 text-green-600" />
                <span className="text-xs font-semibold text-green-700">{valor}</span>
              </div>
            )}
            {responsavel && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 rounded-md">
                <User className="h-3.5 w-3.5 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">{responsavel}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
