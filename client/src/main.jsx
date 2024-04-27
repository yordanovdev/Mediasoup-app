import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Home } from "./Home.jsx";
import "./index.css";
import Room from "./Room.jsx";
import { MainLayout } from "./MainLayout.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="room/:roomId" element={<Room />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
