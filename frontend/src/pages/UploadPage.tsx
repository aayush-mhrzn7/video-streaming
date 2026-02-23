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
import axios from "axios";

interface UploadJob {
  jobId: string;
  fileName: string;
  status: "uploading" | "processing" | "completed" | "failed";
  progress: number;
  message?: string;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const { isConnected, clientId, onMessage } = useSocket();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"] },
    maxFiles: 1,
  });

  useEffect(() => {
    const unsubMessage = onMessage("message", (payload) => {
      const { progress, job_id } = payload;
      if (!job_id) return;

      setJobs((prev) =>
        prev.map((job) => {
          if (job.jobId !== String(job_id)) return job;
          return {
            ...job,
            progress: progress ?? job.progress,
            status: progress === 100 ? "completed" : "processing",
          };
        }),
      );
    });

    const unsubError = onMessage("error", (payload) => {
      const { message, job_id } = payload;
      if (!job_id) return;

      setJobs((prev) =>
        prev.map((job) => {
          if (job.jobId !== String(job_id)) return job;
          return {
            ...job,
            status: "failed",
            message: message ?? "An error occurred during processing",
          };
        }),
      );
    });

    return () => {
      unsubMessage();
      unsubError();
    };
  }, [onMessage]);

  const handleUpload = async () => {
    if (!file || !clientId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("client_id", String(clientId));

    try {
      const response = await axios.post(
        "http://localhost:4000/upload",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      if (response.status === 200) {
        const newJob: UploadJob = {
          jobId: String(response.data.jobId),
          fileName: file.name,
          status: "processing",
          progress: 0,
        };

        setJobs((prev) => [newJob, ...prev]);
        setActiveJobId(newJob.jobId);
        setFile(null);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      let errorMessage = "Failed to upload file";
      if (error instanceof Error) errorMessage = error.message;
      console.error("Upload Failed:", errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const activeJobs = jobs.filter(
    (j) => j.status === "processing" || j.status === "uploading",
  );

  const selectedJob = jobs.find((j) => j.jobId === activeJobId) ?? null;

  if (!isConnected || !clientId) {
    return (
      <div className="container mx-auto px-4 py-8">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
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

          {/* ✅ All active jobs shown simultaneously */}
          {activeJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Currently Processing ({activeJobs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {activeJobs.map((job) => (
                  <div key={job.jobId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{job.fileName}</p>
                        <p className="text-sm text-muted-foreground">
                          Job ID: {job.jobId}
                        </p>
                      </div>
                      <Badge variant="secondary">{job.status}</Badge>
                    </div>
                    <Progress value={job.progress} className="w-full" />
                    <p className="text-sm text-muted-foreground text-right">
                      {job.progress}%
                    </p>
                    {job.message && (
                      <Alert>
                        <AlertDescription>{job.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Uploads</CardTitle>
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
                      onClick={() => setActiveJobId(job.jobId)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors
}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{job.fileName}</p>
                          <p className="text-xs text-muted-foreground mb-1">
                            Job ID: {job.jobId}
                          </p>
                          <div className="flex items-center gap-2">
                            {job.status === "completed" && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            {job.status === "failed" && (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                            {(job.status === "processing" ||
                              job.status === "uploading") && (
                              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                            )}
                            <span className="text-xs text-muted-foreground capitalize">
                              {job.status}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-2 shrink-0">
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
