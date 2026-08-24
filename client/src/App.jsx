import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth";
import Home from "./pages/Home";
import SpotBoard from "./pages/SpotBoard";
import SpotThreads from "./pages/SpotThreads";
import SpotRules from "./pages/SpotRules";
import ThreadDetail from "./pages/ThreadDetail";
import TripNew from "./pages/TripNew";
import Login from "./pages/Login";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/spots/:slug" element={<SpotBoard />} />
        <Route path="/spots/:slug/threads" element={<SpotThreads />} />
        <Route path="/spots/:slug/rules" element={<SpotRules />} />
        <Route path="/threads/:id" element={<ThreadDetail />} />
        <Route path="/trips/new" element={<TripNew />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
