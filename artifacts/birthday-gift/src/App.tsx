import { BrowserRouter, Routes, Route } from "react-router-dom";
import BirthdayGift from "@/pages/BirthdayGift";
import Countdown from "@/pages/Countdown";
import SecretChat from "@/pages/SecretChat";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BirthdayGift />} />
        <Route path="/countdown" element={<Countdown />} />
        <Route path="/secret-chat" element={<SecretChat />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
