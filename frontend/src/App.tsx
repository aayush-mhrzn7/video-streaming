import { BrowserRouter, Routes, Route } from "react-router";
import UploadPage from "./pages/UploadPage";
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UploadPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
