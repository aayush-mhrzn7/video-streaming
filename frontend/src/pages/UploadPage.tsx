import useSocket from "@/providers/SocketProvider";

const UploadPage = () => {
  const { clientId, socket } = useSocket();

  console.log(clientId, socket);

  return <div>UploadPage {clientId}</div>;
};

export default UploadPage;
