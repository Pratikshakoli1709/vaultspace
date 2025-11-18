"use client"

import { useEffect } from "react"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { handleGenerateNotification } from "@/app/actions"
import { useToast } from "@/hooks/use-toast"
import { Bot, Clipboard, Loader2 } from "lucide-react"

const initialState = {
  message: 'idle' as const,
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
      Generate Notification
    </Button>
  );
}

export function KeyRotationNotificationDialog({ children }: { children: React.ReactNode }) {
  const [state, formAction] = useActionState(handleGenerateNotification, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.message === 'error' && state.errors?._form) {
      toast({
        variant: "destructive",
        title: "Error",
        description: state.errors._form.join(", "),
      });
    }
  }, [state, toast]);
  
  const copyToClipboard = () => {
    if (state.data?.notificationDraft) {
      navigator.clipboard.writeText(state.data.notificationDraft);
      toast({
        title: "Copied!",
        description: "Notification draft copied to clipboard.",
      });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Generate Key Rotation Notification</DialogTitle>
          <DialogDescription className="text-sm">
            Use AI to generate a notification draft for API key rotations. You can copy the message and send it to your users.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="apiKeyType" className="text-sm sm:text-base">API Key Type</Label>
            <Input id="apiKeyType" name="apiKeyType" placeholder="e.g., OpenAI, Google Cloud" required className="text-sm sm:text-base h-9 sm:h-10"/>
            {state.errors?.apiKeyType && <p className="text-xs sm:text-sm text-destructive">{state.errors.apiKeyType[0]}</p>}
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="affectedUsers" className="text-sm sm:text-base">Affected Users/Teams</Label>
            <Input id="affectedUsers" name="affectedUsers" placeholder="e.g., 'frontend-team', 'all'" required className="text-sm sm:text-base h-9 sm:h-10"/>
            {state.errors?.affectedUsers && <p className="text-xs sm:text-sm text-destructive">{state.errors.affectedUsers[0]}</p>}
          </div>
          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="rotationDeadline" className="text-sm sm:text-base">Rotation Deadline</Label>
            <Input id="rotationDeadline" name="rotationDeadline" type="date" required className="text-sm sm:text-base h-9 sm:h-10"/>
            {state.errors?.rotationDeadline && <p className="text-xs sm:text-sm text-destructive">{state.errors.rotationDeadline[0]}</p>}
          </div>

          {state.message === 'success' && state.data && (
            <div className="space-y-2 pt-4">
              <Label className="text-sm sm:text-base">Generated Notification</Label>
              <div className="relative">
                <Textarea readOnly value={state.data.notificationDraft} rows={8} className="pr-10 text-sm sm:text-base min-h-[150px]"/>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={copyToClipboard} type="button">
                  <Clipboard className="h-4 w-4"/>
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
