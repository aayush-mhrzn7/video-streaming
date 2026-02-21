// pages/UploadPage.tsx
import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Film, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import useSocket from "@/hooks/useSocket";
import NotificationBar from "@/components/NotificationBar";
import axios from "axios";

interface UploadJob {
  jobId: string;
  fileName: string;
  status: "uploading" | "processing" | "completed" | "failed";
  progress: number;
  source?: string;
  message?: string;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [activeJob, setActiveJob] = useState<UploadJob | null>(null);
  const { socket, clientId } = useSocket();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"],
    },
    maxFiles: 1,
  });

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "message" || data.type === "error") {
          const { progress, source, message } = data.payload;

          setJobs((prev) =>
            prev.map((job) => {
              if (job.status === "processing" || job.status === "uploading") {
                const newStatus:
                  | "uploading"
                  | "processing"
                  | "completed"
                  | "failed" =
                  data.type === "error"
                    ? "failed"
                    : progress === 100
                      ? "completed"
                      : "processing";

                const updatedJob: UploadJob = {
                  ...job,
                  progress: progress || job.progress,
                  source: source || job.source,
                  message: message || job.message,
                  status: newStatus,
                };

                if (updatedJob.jobId === activeJob?.jobId) {
                  setActiveJob(updatedJob);
                }

                if (updatedJob.status === "completed") {
                  console.log(
                    "Processing Complete:",
                    `Video ${job.fileName} has been processed successfully`,
                  );
                }

                if (updatedJob.status === "failed") {
                  console.log(
                    "Processing Failed:",
                    message || "An error occurred during processing",
                  );
                }

                return updatedJob;
              }
              return job;
            }),
          );
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => socket.removeEventListener("message", handleMessage);
  }, [socket, activeJob]);

  const handleUpload = async () => {
    if (!file || !clientId) {
      console.log("Waiting for client ID from WebSocket...");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", String(clientId)); // Use the WebSocket client ID

    try {
      const response = await axios.post(
        "http://localhost:4000/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const data = response.data;

      if (response.status === 200) {
        const newJob: UploadJob = {
          jobId: data.jobId,
          fileName: file.name,
          status: "processing",
          progress: 0,
        };

        setJobs((prev) => [newJob, ...prev]);
        setActiveJob(newJob);
        setFile(null);

        console.log("Upload Successful: Your video is now being processed");
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.log(
        "Upload Failed:",
        error instanceof Error ? error.message : "Failed to upload file",
      );
    } finally {
      setUploading(false);
    }
  };

  // Show loading if clientId not yet received
  if (!clientId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <NotificationBar />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Connecting to server...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <NotificationBar />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5" />
                Upload Video
              </CardTitle>
              <CardDescription>
                Upload your video file for HLS processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center cursor-pointer
                  transition-colors duration-200
                  ${isDragActive ? "border-primary bg-primary/10" : "border-border"}
                  ${file ? "bg-muted/50" : ""}
                `}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className="space-y-2">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-green-500" />
                    <p className="text-lg font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-lg font-medium">
                      {isDragActive
                        ? "Drop your file here"
                        : "Drag & drop your video file"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse (MP4, MOV, AVI, etc.)
                    </p>
                  </div>
                )}
              </div>

              {file && (
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="w-full sm:w-auto"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload Video"
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {activeJob && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Current Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{activeJob.fileName}</p>
                      <p className="text-sm text-muted-foreground">
                        Job ID: {activeJob.jobId}
                      </p>
                    </div>
                    <Badge
                      variant={
                        activeJob.status === "completed"
                          ? "default"
                          : activeJob.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {activeJob.status}
                    </Badge>
                  </div>

                  {activeJob.source && (
                    <p className="text-sm text-muted-foreground">
                      Queue: {activeJob.source}
                    </p>
                  )}

                  <Progress value={activeJob.progress} className="w-full" />

                  {activeJob.message && (
                    <Alert>
                      <AlertDescription>{activeJob.message}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Uploads</CardTitle>
              <CardDescription>Your recently uploaded videos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {jobs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No uploads yet
                  </p>
                ) : (
                  jobs.map((job) => (
                    <div
                      key={job.jobId}
                      className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setActiveJob(job)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{job.fileName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {job.status === "completed" && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {job.status === "failed" && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            {job.status === "processing" && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            )}
                            <span className="text-xs text-muted-foreground capitalize">
                              {job.status}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {job.progress}%
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
