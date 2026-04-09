import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Phone, MessageSquare } from "lucide-react";

export function ContactDeveloperDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md w-[95vw] rounded-lg">
        <DialogHeader>
          <DialogTitle>Contact Developer</DialogTitle>
          <DialogDescription>
            Need help, found a bug, or want to request a feature? Reach out directly!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-5 py-4">
          <a
            href="mailto:developer@lessonai.com"
            className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="bg-primary/10 p-2.5 rounded-full flex-shrink-0">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">Email Support</span>
              <span className="text-xs text-muted-foreground">developer@lessonai.com</span>
            </div>
          </a>
          
          <a
            href="https://wa.me/233240376088"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
          >
            <div className="bg-primary/10 p-2.5 rounded-full flex-shrink-0">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">WhatsApp</span>
              <span className="text-xs text-muted-foreground">+233 24 037 6088</span>
            </div>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
