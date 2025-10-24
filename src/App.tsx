import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import DrinkLogging from "./pages/drink-logging";
import PaymentPage from "./pages/payment";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<DrinkLogging />} />
        <Route path="/pay" element={<PaymentPage />} />
      </Routes>
    </HashRouter>
  );
}
