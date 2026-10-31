import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { DailyOperation } from "./features/operation/DailyOperation";
import { Management } from "./features/management/Management";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route element={<DailyOperation />} path="/" />
        <Route element={<Management />} path="/gestao" />
      </Routes>
    </AppShell>
  );
}
