import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthWrapper from "@/pages/AuthWrapper";
import CategoryManagement from "@/pages/CategoryManagement";
import CreateDeedPage from "@/pages/CreateDeedPage";
import VoiceCaptureDeedPage from "@/pages/VoiceCaptureDeedPage";
import EditDeedPage from "@/pages/EditDeedPage";
import ProgressPage from "@/pages/ProgressPage";
import DzikirPage from "@/pages/DzikirPage";
import QiblaPage from "@/pages/QiblaPage";
import SholatPage from "@/pages/SholatPage";
import TargetsPage from "@/pages/TargetsPage";
import CreateTargetPage from "@/pages/CreateTargetPage";
import EditTargetPage from "@/pages/EditTargetPage";
import TargetDetailPage from "@/pages/TargetDetailPage";
import CreateCommunityTargetPage from "@/pages/CreateCommunityTargetPage";
import EditCommunityTargetPage from "@/pages/EditCommunityTargetPage";
import CommunityTargetDetailPage from "@/pages/CommunityTargetDetailPage";
import NotificationsPage from "@/pages/NotificationsPage";
import ProfilePage from "@/pages/ProfilePage";
import LoginUsername from "@/pages/LoginUsername";
import OnboardingSettingsPage from "@/pages/OnboardingSettingsPage";
import DeedHistoryPage from "@/pages/DeedHistoryPage";
import StreakFreezerPage from "@/pages/StreakFreezerPage";
import StreakDetailPage from "@/pages/StreakDetailPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import QuizPage from "@/pages/QuizPage";
import QuizLeaderboardPage from "@/pages/QuizLeaderboardPage";
import QuranHomePage from "@/pages/QuranHomePage";
import QuranSurahPage from "@/pages/QuranSurahPage";
import QuranBookmarksPage from "@/pages/QuranBookmarksPage";
import QuranMemorizationProgressPage from "@/pages/QuranMemorizationProgressPage";
import AdminCampaignsPage from "@/pages/AdminCampaignsPage";
import { QuranAudioProvider } from "@/components/QuranAudioProvider";
import { QuranFontProvider } from "@/components/QuranFontProvider";
import { useDeeds } from "@/hooks/use-deeds";
import NotFound from "@/pages/not-found";
import { NotificationPrompt } from "@/components/NotificationPrompt";
import { BadgeCelebration } from "@/components/BadgeCelebration";
import { registerNotificationSoundListener, setupAudioUnlock } from "@/lib/sounds";

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
      <Route path="/sholat" component={SholatPage} />
      <Route path="/qibla" component={QiblaPage} />
      <Route path="/targets" component={TargetsPage} />
      <Route path="/targets/new" component={CreateTargetPage} />
      <Route path="/targets/:id" component={TargetDetailPage} />
      <Route path="/targets/:id/edit" component={EditTargetPage} />
      <Route path="/community-targets/new" component={CreateCommunityTargetPage} />
      <Route path="/community-targets/:id/edit" component={EditCommunityTargetPage} />
      <Route path="/community-targets/:id" component={CommunityTargetDetailPage} />
      <Route path="/categories" component={CategoryManagement} />
      <Route path="/notifications" component={NotificationsPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/login/username" component={LoginUsername} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/quiz" component={QuizPage} />
      <Route path="/quiz/leaderboard" component={QuizLeaderboardPage} />
      <Route path="/quran" component={QuranHomePage} />
      <Route path="/quran/bookmarks" component={QuranBookmarksPage} />
      <Route path="/quran/memorization" component={QuranMemorizationProgressPage} />
      <Route path="/quran/:id" component={QuranSurahPage} />
      <Route path="/profile/onboarding" component={OnboardingSettingsPage} />
      <Route path="/deeds" component={DeedHistoryPage} />
      <Route path="/streak" component={StreakDetailPage} />
      <Route path="/streak-freezer" component={StreakFreezerPage} />
      <Route path="/create-deed" component={CreateDeedPage} />
      <Route path="/create-deed/voice" component={VoiceCaptureDeedPage} />
      <Route path="/edit-deed/:id" component={EditDeedRoute} />
      <Route path="/admin/campaigns" component={AdminCampaignsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    setupAudioUnlock();
    return registerNotificationSoundListener();
  }, []);

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <QuranFontProvider>
            <QuranAudioProvider>
              <Toaster />
              <Router />
              <BadgeCelebration />
              <NotificationPrompt />
            </QuranAudioProvider>
          </QuranFontProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
