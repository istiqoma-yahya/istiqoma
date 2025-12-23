import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AuthWrapper from "@/pages/AuthWrapper";
import CategoryManagement from "@/pages/CategoryManagement";
import CreateDeedPage from "@/pages/CreateDeedPage";
import EditDeedPage from "@/pages/EditDeedPage";
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
      <Route path="/categories" component={CategoryManagement} />
      <Route path="/create-deed" component={CreateDeedPage} />
      <Route path="/edit-deed/:id" component={EditDeedRoute} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
