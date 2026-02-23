import { useEffect, useRef, useState } from "react";
import {
  Film,
  RefreshCw,
  Search,
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import axios from "axios";
import Plyr from "plyr";
import Hls from "hls.js";
import "plyr/dist/plyr.css";

interface Video {
  id: string;
  name: string;
  status: "ready" | "processing" | "failed";
  createdAt: string;
}

function VideoPlayer({
  video,
  onPlay,
  isPlaying,
}: {
  video: Video;
  onPlay: () => void;
  isPlaying: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const plyrRef = useRef<Plyr | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!isPlaying || !containerRef.current) return;

    const videoEl = document.createElement("video");
    videoEl.playsInline = true;
    videoEl.crossOrigin = "anonymous";
    videoEl.className = "w-full h-full";
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(videoEl);

    const src = `http://localhost:4000/hls/${video.id}/master.m3u8`;

    plyrRef.current = new Plyr(videoEl, {
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "duration",
        "mute",
        "volume",
        "settings",
        "pip",
        "fullscreen",
      ],
      settings: ["quality", "speed"],
      quality: { default: 720, options: [1080, 720, 480, 360] },
    });

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoEl.play().catch(() => {});
      });
    } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      videoEl.src = src;
      videoEl.play().catch(() => {});
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      plyrRef.current?.destroy();
      plyrRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [isPlaying, video.id]);

  return (
    <div className="relative rounded-lg bg-black aspect-video ">
      {!isPlaying && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/60">
          <Film className="h-14 w-14 text-white/30" />
          <p className="text-sm text-white/60 max-w-xs text-center px-4 truncate">
            {video.name}
          </p>
          <Button size="lg" onClick={onPlay} className="gap-2">
            <Play className="h-5 w-5 fill-current" />
            Play Video
          </Button>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full aspect-video" />
    </div>
  );
}

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:4000/videos");
      const transformed: Video[] = response.data.videos.map((v: any) => ({
        id: v.id,
        name: v.name,
        status: v.status ?? "ready",
        createdAt: v.createdAt,
      }));
      setVideos(transformed);
    } catch {
      console.error("Failed to fetch videos");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (video: Video) => {
    if (video.status !== "ready") return;
    if (selectedVideo?.id === video.id) return;
    setIsPlaying(false);
    setSelectedVideo(video);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const filteredVideos = videos.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Player */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Film className="h-5 w-5" />
                Video Player
              </CardTitle>
              <CardDescription>
                {selectedVideo
                  ? selectedVideo.name
                  : "Select a video from the list to get started"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedVideo ? (
                <div className="space-y-4">
                  {/*
                    key={selectedVideo.id} forces React to fully unmount and
                    remount VideoPlayer when the video changes, so Plyr's DOM
                    mutations never conflict with React's reconciler.
                  */}
                  <VideoPlayer
                    key={selectedVideo.id}
                    video={selectedVideo}
                    isPlaying={isPlaying}
                    onPlay={() => setIsPlaying(true)}
                  />

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedVideo.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(selectedVideo.createdAt)}
                      </p>
                    </div>
                    <Badge variant="default">{selectedVideo.status}</Badge>
                  </div>
                </div>
              ) : (
                <div className="aspect-video rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-3">
                  <Film className="h-12 w-12 text-muted-foreground" />
                  <p className="text-lg font-medium">No video selected</p>
                  <p className="text-sm text-muted-foreground">
                    Pick a video from the list on the right
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">My Videos</CardTitle>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={fetchVideos}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <CardDescription>
                {videos.length} video{videos.length !== 1 ? "s" : ""} available
              </CardDescription>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex gap-3 p-2">
                      <Skeleton className="h-14 w-24 rounded-md shrink-0" />
                      <div className="flex-1 space-y-2 py-1">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))
                ) : filteredVideos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Film className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground text-center">
                      {searchQuery
                        ? "No results found"
                        : "No videos yet. Upload one first."}
                    </p>
                  </div>
                ) : (
                  filteredVideos.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => handleSelect(video)}
                      className={`flex gap-3 p-2.5 rounded-lg border transition-colors
                        ${
                          video.status !== "ready"
                            ? "opacity-50 cursor-not-allowed"
                            : "cursor-pointer"
                        }
                        ${
                          selectedVideo?.id === video.id
                            ? "border-primary bg-primary/5"
                            : "border-transparent hover:bg-muted/50 hover:border-border"
                        }
                      `}
                    >
                      <div
                        className={`h-14 w-24 shrink-0 rounded-md bg-muted flex items-center justify-center border-2 transition-colors
                          ${
                            selectedVideo?.id === video.id
                              ? "border-primary"
                              : "border-transparent"
                          }
                        `}
                      >
                        {video.status === "processing" && (
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        )}
                        {video.status === "failed" && (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        {video.status === "ready" &&
                          selectedVideo?.id === video.id && (
                            <Play className="h-5 w-5 text-primary fill-current" />
                          )}
                        {video.status === "ready" &&
                          selectedVideo?.id !== video.id && (
                            <Film className="h-5 w-5 text-muted-foreground" />
                          )}
                      </div>

                      <div className="flex-1 min-w-0 py-0.5">
                        <p
                          className={`text-sm font-medium leading-snug line-clamp-2 ${
                            selectedVideo?.id === video.id ? "text-primary" : ""
                          }`}
                        >
                          {video.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          {video.status === "ready" && (
                            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                          )}
                          {video.status === "failed" && (
                            <XCircle className="h-3 w-3 text-destructive shrink-0" />
                          )}
                          {video.status === "processing" && (
                            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />
                          )}
                          <span className="text-xs text-muted-foreground capitalize">
                            {video.status === "ready"
                              ? formatDate(video.createdAt)
                              : video.status}
                          </span>
                        </div>
                        {video.status !== "ready" && (
                          <Badge
                            variant={
                              video.status === "failed"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-[10px] px-1.5 py-0 h-4 mt-1"
                          >
                            {video.status}
                          </Badge>
                        )}
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
