import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, Instagram, Facebook } from "lucide-react";

export default function Conversas() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Central de Conversas</h1>
        <p className="text-muted-foreground">
          Todas as suas conversas em um só lugar
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Integração em desenvolvimento
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Instagram className="h-5 w-5 text-white" />
              </div>
              Instagram
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Integração em desenvolvimento
            </p>
          </CardContent>
        </Card>

        <Card className="transition-all hover:shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Facebook className="h-5 w-5 text-white" />
              </div>
              Facebook
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Integração em desenvolvimento
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
