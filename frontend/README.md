# Frontend for the HLS conversion

1. This is the frontend for the HLS conversion project. it is built using React and Vite. it uses the `hls.js` library to play the HLS streams. it also has an uploader component that allows you to upload video files to the server, which will then convert them to HLS format and serve them from the `hls-output` folder.
2. implements websocket connection to the backend to receive real-time updates on the conversion progress. the progress is displayed as a percentage on the uploader page. once the conversion is complete, the player page will automatically refresh to show the new HLS stream.
