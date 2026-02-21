import { useEffect, useState } from "react";

const useSocket = () => {
  const [socket, setSocket] = useState<WebSocket | undefined>();
  useEffect(() => {
    const webSocket = new WebSocket("ws://localhost:8000");
    if (!webSocket) {
      console.log("test here if not init");
    }
    setSocket(webSocket);
    return () => {
      setSocket(undefined);
      webSocket.close();
    };
  }, []);
  return socket;
};

export default useSocket;
