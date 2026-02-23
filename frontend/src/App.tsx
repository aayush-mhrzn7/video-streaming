import { BrowserRouter, Routes, Route } from "react-router";
import UploadPage from "./pages/UploadPage";
import VideoPage from "./pages/VideoPage";
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/videos" element={<VideoPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
