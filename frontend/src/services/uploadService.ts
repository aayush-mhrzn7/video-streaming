import axiosInstance from "@/utils/axios";
import type { AxiosInstance } from "axios";

class VideoService {
  private api: AxiosInstance;
  constructor() {
    this.api = axiosInstance;
  }
  async uploadFile(formData: FormData) {
    return await this.api.post("/", {
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  }
  async getAllFiles() {
    return await this.api("/");
  }
  async playVideo() {
    return await this.api("/");
  }
}

const videoService = new VideoService();

export default videoService;
