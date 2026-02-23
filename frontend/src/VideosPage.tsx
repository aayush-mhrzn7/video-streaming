// pages/VideosPage.tsx
import { useEffect, useState } from "react";
import { Film, Play, MoreVertical, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import NotificationBar from "@/components/NotificationBar";
import axios from "axios";

interface Video {
  id: string;
  name: string;
  duration: string;
  size: string;
  status: "ready" | "processing" | "failed";
  createdAt: string;
  thumbnail?: string;
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const getClientId = () => {
    return localStorage.getItem("clientId") || "";
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);

      const response = await axios.get("http://localhost:4000/videos");

      const transformedVideos: Video[] = response.data.videos.map((v: any) => ({
        id: v.id,
        name: v.name,
        duration: "00:00",
        size: "—",
        status: "ready",
        createdAt: v.createdAt,
      }));

      setVideos(transformedVideos);
    } catch (error) {
      console.error("Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (video: Video) => {
    setSelectedVideo(video);
    setPlayerOpen(true);
  };

  const handleDelete = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    console.log({
      title: "Video Deleted",
      description: "The video has been removed",
    });
  };

  const filteredVideos = videos.filter((video) =>
    video.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <NotificationBar />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5" />
                My Videos
              </CardTitle>
              <CardDescription>
                Manage and play your processed HLS videos
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={fetchVideos}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-40 w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))
            ) : filteredVideos.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No videos found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? "Try a different search term"
                    : "Upload your first video to get started"}
                </p>
              </div>
            ) : (
              filteredVideos.map((video) => (
                <Card key={video.id} className="overflow-hidden group">
                  <div className="relative h-40 bg-muted">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
                        <Film className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-white hover:text-white hover:bg-white/20"
                        onClick={() => handlePlay(video)}
                        disabled={video.status !== "ready"}
                      >
                        <Play className="h-8 w-8" />
                      </Button>
                    </div>
                    <Badge
                      className="absolute top-2 right-2"
                      variant={
                        video.status === "ready"
                          ? "default"
                          : video.status === "failed"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {video.status}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium line-clamp-1">{video.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {video.duration} • {video.size}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handlePlay(video)}>
                            <Play className="mr-2 h-4 w-4" />
                            Play
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(video.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={playerOpen} onOpenChange={setPlayerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedVideo?.name}</DialogTitle>
            <DialogDescription>HLS Video Player</DialogDescription>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {selectedVideo && (
              <video
                id="hls-player"
                controls
                playsInline
                crossOrigin="anonymous"
                className="w-full h-full"
              >
                <source
                  src={`http://localhost:4000/hls/${selectedVideo.id}/master.m3u8`}
                  type="application/x-mpegURL"
                />
              </video>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
