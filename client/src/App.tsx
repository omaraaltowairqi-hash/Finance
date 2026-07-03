import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FinanceProvider } from "./contexts/FinanceContext";
import Dashboard from "./pages/Dashboard";
import Entry from "./pages/Entry";
import Insights from "./pages/Insights";
import SettingsPage from "./pages/SettingsPage";
import BankSms from "./pages/BankSms";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/entry"} component={Entry} />
      <Route path={"/sms"} component={BankSms} />
      <Route path={"/insights"} component={Insights} />
      <Route path={"/settings"} component={SettingsPage} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <FinanceProvider>
          <TooltipProvider>
            <Toaster position="top-center" richColors />
            <WouterRouter hook={useHashLocation}>
              <Router />
            </WouterRouter>
          </TooltipProvider>
        </FinanceProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
