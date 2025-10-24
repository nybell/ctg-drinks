import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DrinkLogging from "./pages/drink-logging";
import PaymentPage from "./pages/payment";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DrinkLogging />} />
        <Route path="/pay" element={<PaymentPage />} />
      </Routes>
    </BrowserRouter>
  );
}
