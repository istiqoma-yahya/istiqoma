import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthWrapper from "@/pages/AuthWrapper";
import CategoryManagement from "@/pages/CategoryManagement";
import CreateDeedPage from "@/pages/CreateDeedPage";
import EditDeedPage from "@/pages/EditDeedPage";
import ProgressPage from "@/pages/ProgressPage";
import DzikirPage from "@/pages/DzikirPage";
import QiblaPage from "@/pages/QiblaPage";
import TargetsPage from "@/pages/TargetsPage";
import CreateTargetPage from "@/pages/CreateTargetPage";
import EditTargetPage from "@/pages/EditTargetPage";
import NotificationsPage from "@/pages/NotificationsPage";
import { useDeeds } from "@/hooks/use-deeds";
import NotFound from "@/pages/not-found";

function EditDeedRoute({ params }: { params: { id: string } }) {
  const { data: deeds } = useDeeds();
  const deed = deeds?.find(d => d.id === parseInt(params.id));
  
  if (!deed) {
    return <NotFound />;
  }
  
  return <EditDeedPage deed={deed} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthWrapper} />
      <Route path="/progress" component={ProgressPage} />
      <Route path="/dzikir" component={DzikirPage} />
      <Route path="/qibla" component={QiblaPage} />
      <Route path="/targets" component={TargetsPage} />
      <Route path="/targets/new" component={CreateTargetPage} />
      <Route path="/targets/:id/edit" component={EditTargetPage} />
      <Route path="/categories" component={CategoryManagement} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/create-deed" component={CreateDeedPage} />
      <Route path="/edit-deed/:id" component={EditDeedRoute} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
