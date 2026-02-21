// App.tsx
import { BrowserRouter, Routes, Route, Link } from "react-router";
import UploadPage from "./UploadPage";
import VideosPage from "./VideosPage";

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <nav className="border-b">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-primary">
              HLS.Stream
            </Link>
            <div className="space-x-4">
              <Link to="/" className="hover:text-primary transition-colors">
                Upload
              </Link>
              <Link
                to="/videos"
                className="hover:text-primary transition-colors"
              >
                Videos
              </Link>
            </div>
          </div>
        </nav>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/videos" element={<VideosPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
