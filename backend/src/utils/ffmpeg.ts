import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";

interface HLSInterface {
  outdir?: string;
  input_path: string;
  onProgress?: (percent: number) => void;
}

const generateHLSOutput = async ({
  input_path,
  outdir = "./src/public/hls_output",
  onProgress,
}: HLSInterface) => {
  const baseName = path.parse(input_path).name;
  const fileDir = path.join(outdir, baseName);
  if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true });

  const resolutions = [
    {
      name: "360p",
      size: "640x360",
      videoBitrate: "800k",
      audioBitrate: "128k",
    },
    {
      name: "480p",
      size: "854x480",
      videoBitrate: "1200k",
      audioBitrate: "128k",
    },
    {
      name: "720p",
      size: "1280x720",
      videoBitrate: "2500k",
      audioBitrate: "128k",
    },
    {
      name: "1080p",
      size: "1920x1080",
      videoBitrate: "5000k",
      audioBitrate: "192k",
    },
  ];

  for (let i = 0; i < resolutions.length; i++) {
    const res = resolutions[i];
    if (!res) {
      throw new Error("The resolution doesn't exist");
    }
    await new Promise((resolve, reject) => {
      ffmpeg(input_path)
        .output(path.join(fileDir, `${res.name}.m3u8`))
        .videoCodec("libx264")
        .size(res.size)
        .videoBitrate(res.videoBitrate)
        .audioCodec("aac")
        .audioBitrate(res.audioBitrate)
        .format("hls")
        .outputOptions(["-hls_time 6", "-threads 2", "-hls_playlist_type vod"])
        .on("end", () => {
          const percent = Math.round(((i + 1) / resolutions.length) * 95);
          onProgress?.(percent);
          resolve(null);
        })
        .on("error", reject)
        .run();
    });
  }

  await new Promise((resolve, reject) => {
    const readStream = fs.createReadStream("./src/public/masterm3u8demo.txt");
    const writeStream = fs.createWriteStream(`${fileDir}/master.m3u8`);
    readStream.pipe(writeStream);
    writeStream.on("finish", () => {
      onProgress?.(100);
      resolve(null);
    });
    writeStream.on("error", reject);
  });

  console.log("HLS Generation Completed");

  fs.unlink(input_path, (error) => {
    if (error) {
      console.log(
        "Error with deleting the file with id " + input_path,
        +": ",
        error.message,
      );
    }
  });
  console.log("Deleted the uploaded file");
};

export default generateHLSOutput;
