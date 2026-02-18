import fs, { read, write } from "fs";
import ffmpeg from "fluent-ffmpeg";
import path from "path";
interface HLSInterface {
  outdir?: string;
  input_path: string;
}
const generateHLSOutput = async ({
  outdir = "./public/hls_output",
  input_path,
}: HLSInterface) => {
  const baseName = path.parse(input_path).name;
  const fileDir = path.join(outdir, baseName);
  await new Promise((resolve, reject) => {
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    ffmpeg(input_path)
      .output(`${fileDir}/360p.m3u8`)
      .videoCodec("libx264")
      .size("640x360")
      .videoBitrate("800k")
      .audioCodec("aac")
      .audioBitrate("128k")
      .format("hls")
      .outputOptions(["-hls_time 6", "-hls_playlist_type vod"])
      .output(`${fileDir}/480p.m3u8`)
      .videoCodec("libx264")
      .size("854x480")
      .videoBitrate("1200k")
      .audioCodec("aac")
      .audioBitrate("128k")
      .format("hls")
      .outputOptions(["-hls_time 6", "-hls_playlist_type vod"])

      .output(`${fileDir}/720p.m3u8`)
      .videoCodec("libx264")
      .size("1280x720")
      .videoBitrate("2500k")
      .audioCodec("aac")
      .audioBitrate("128k")
      .format("hls")
      .outputOptions(["-hls_time 6", "-hls_playlist_type vod"])

      .output(`${fileDir}/1080p.m3u8`)
      .videoCodec("libx264")
      .size("1920x1080")
      .videoBitrate("5000k")
      .audioCodec("aac")
      .audioBitrate("192k")
      .format("hls")
      .outputOptions(["-hls_time 6", "-hls_playlist_type vod"])

      .on("end", () => {
        console.log("HLS converted");
        const readStream = fs.createReadStream(`./public/masterm3u8demo.txt`);
        const writeStream = fs.createWriteStream(`${fileDir}/master.m3u8`);
        readStream.pipe(writeStream);
        resolve("completed the HLS Generation");
      })
      .on("error", (err) => {
        console.log("HLS conversion Failed");
        reject(err);
      })
      .run();
  });
};

export default generateHLSOutput;
