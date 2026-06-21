import { BrowserRouter, Routes, Route } from "react-router-dom";
import BirthdayGift from "@/pages/BirthdayGift";
import Countdown from "@/pages/Countdown";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BirthdayGift />} />
        <Route path="/countdown" element={<Countdown />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
