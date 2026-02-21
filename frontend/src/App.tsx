import { BrowserRouter, Routes, Route } from "react-router";
const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div className="">yo</div>} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
