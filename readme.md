# HLS player

hls is a streaming protocol built on top of (HTTP) TCP. it basically allows the web to download the video files not as a .mp4 but as segments of .ts files. the player then downloads the .ts files and plays them in sequence. this allows for adaptive streaming, where the player can switch between different quality levels based on the network conditions.
this project is a simple hls player built using the `hls.js` library. it is a pure JavaScript implementation of the HLS protocol, and it can be used in any modern web browser.

currently the project just serves the file locally from the hls-output folder. implementation of uploading to the AWS or any other cloud storage is in the works.

## Usage

1. clone the repository
2. run `npm install` to install the dependencies
   2.2. run `docker compose up` to start the redis instance (optional, only if you want to use the uploader)
3. run `npm start` to start the development server
4. open `http://localhost:4000` in your web browser to see the player
5. open `http://localhost:4000/upload` in your web browser to see the uploader
