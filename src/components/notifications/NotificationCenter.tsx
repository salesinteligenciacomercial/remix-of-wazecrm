import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NotificationCenter() {
  return (
    <Button variant="ghost" size="icon">
      <Bell className="h-5 w-5" />
    </Button>
  );
}
