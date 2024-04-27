import { Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";

const queryClient = new QueryClient();

export const MainLayout = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="dark bg-slate-700 min-h-screen text-white">
        <Outlet />
      </div>
    </QueryClientProvider>
  );
};
