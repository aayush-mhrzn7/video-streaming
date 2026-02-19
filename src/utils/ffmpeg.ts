import fs from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
interface HLSInterface {
  outdir?: string;
  input_path: string;
}
const generateHLSOutput = async ({
  input_path,
  outdir = "./src/public/hls_output",
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

  for (const res of resolutions) {
    await new Promise((resolve, reject) => {
      ffmpeg(input_path)
        .output(path.join(fileDir, `${res.name}.m3u8`))
        .videoCodec("libx264")
        .size(res.size)
        .videoBitrate(res.videoBitrate)
        .audioCodec("aac")
        .audioBitrate(res.audioBitrate)
        .format("hls")
        .outputOptions(["-hls_time 6", "-hls_playlist_type vod"])
        .on("end", () => resolve(null))
        .on("error", reject)
        .run();
    });
  }

  await new Promise((resolve, reject) => {
    const readStream = fs.createReadStream("./src/public/masterm3u8demo.txt");
    const writeStream = fs.createWriteStream(`${fileDir}/master.m3u8`);
    readStream.pipe(writeStream);
    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });

  console.log("HLS Generation Completed");
};

export default generateHLSOutput;
