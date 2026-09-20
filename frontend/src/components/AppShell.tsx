import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  return <div className="flex min-h-screen bg-slate-900"><Sidebar /><main className="flex-1 min-w-0 overflow-y-auto preview-surface"><Outlet /></main></div>;
}