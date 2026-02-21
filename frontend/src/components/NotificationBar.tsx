// components/NotificationBar.tsx
import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Loader2, X, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import useSocket from "@/hooks/useSocket";

interface Notification {
  id: string;
  type: "info" | "success" | "error" | "warning";
  message: string;
  timestamp: Date;
  jobId?: string;
  progress?: number;
}

export default function NotificationBar() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [expanded, setExpanded] = useState(false);
  const { socket } = useSocket(); // Destructure socket from the returned object

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        // Don't show the initial connection message as a notification
        if (data.type === "message" && data.payload?.client_id !== undefined) {
          return; // Skip the connection message
        }

        if (data.type === "message" || data.type === "error") {
          const { progress, source, message, originalJobId } = data.payload;

          const notification: Notification = {
            id: Math.random().toString(36).substring(7),
            type:
              data.type === "error"
                ? "error"
                : progress === 100
                  ? "success"
                  : "info",
            message:
              message ||
              (data.type === "error"
                ? "Job failed"
                : progress === 100
                  ? "Job completed successfully"
                  : "Job processing"),
            timestamp: new Date(),
            jobId: originalJobId,
            progress: progress,
          };

          setNotifications((prev) => [notification, ...prev].slice(0, 5));

          // Auto-remove success notifications after 5 seconds
          if (notification.type === "success") {
            setTimeout(() => {
              setNotifications((prev) =>
                prev.filter((n) => n.id !== notification.id),
              );
            }, 5000);
          }
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket]);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 w-80">
      {notifications.map((notification) => (
        <Alert
          key={notification.id}
          variant={notification.type === "error" ? "destructive" : "default"}
          className={`
            shadow-lg transition-all duration-300 animate-in slide-in-from-right
            ${notification.type === "success" ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}
            ${notification.type === "info" ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : ""}
            ${notification.type === "warning" ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-950" : ""}
          `}
        >
          <div className="flex items-start gap-2">
            {notification.type === "success" && (
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            )}
            {notification.type === "error" && (
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            )}
            {notification.type === "info" && (
              <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            )}
            {notification.type === "warning" && (
              <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            )}

            <div className="flex-1 min-w-0">
              <AlertDescription className="text-sm">
                <p className="font-medium line-clamp-2">
                  {notification.message}
                </p>
                {notification.progress !== undefined &&
                  notification.progress < 100 && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${notification.progress}%` }}
                        />
                      </div>
                      <p className="text-xs mt-1 text-muted-foreground">
                        {notification.progress}% complete
                      </p>
                    </div>
                  )}
                <p className="text-xs text-muted-foreground mt-1">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
              </AlertDescription>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => removeNotification(notification.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </Alert>
      ))}

      {notifications.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          onClick={() => setNotifications([])}
        >
          Clear All
        </Button>
      )}
    </div>
  );
}
