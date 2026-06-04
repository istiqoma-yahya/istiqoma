import { useLocation, useParams } from "wouter";
import { useTranslation } from "react-i18next";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, LogIn, LogOut, Pencil, Trash2, Trophy, Users } from "lucide-react";
import {
  useCommunityTarget,
  useCommunityTargetLeaderboard,
  useDeleteCommunityTarget,
  useJoinCommunityTarget,
  useLeaveCommunityTarget,
} from "@/hooks/use-community-targets";
import { getLeaderboardDisplayName, getLeaderboardInitials } from "@/lib/leaderboard";
import { formatNumber, cn } from "@/lib/utils";
import { useState } from "react";

export default function CommunityTargetDetailPage() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const id = params.id ? parseInt(params.id, 10) : null;
  const { toast } = useToast();

  const { data: target, isLoading } = useCommunityTarget(id);
  const { data: leaderboardData, isLoading: leaderboardLoading } = useCommunityTargetLeaderboard(id, { limit: 50 });
  const leaderboard = leaderboardData?.entries ?? [];
  const leaderboardTotal = leaderboardData?.total ?? 0;
  const joinMutation = useJoinCommunityTarget();
  const leaveMutation = useLeaveCommunityTarget();
  const deleteMutation = useDeleteCommunityTarget();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <BottomNavigation />
      </div>
    );
  }

  if (!target || id == null) {
    return (
      <div className="min-h-screen bg-background text-foreground pb-20">
        <main className="container max-w-2xl mx-auto px-4 py-12">
          <Card className="p-6 text-center space-y-4">
            <h2 className="text-lg font-semibold">{t("community.notFound")}</h2>
            <Button onClick={() => navigate("/targets?tab=community")} data-testid="button-back-to-community">
              {t("common.back")}
            </Button>
          </Card>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const periodWord =
    target.period === "weekly"
      ? t("targets.periodWeek")
      : target.period === "monthly"
        ? t("targets.periodMonth")
        : t("targets.periodDay");

  const handleJoin = async () => {
    try {
      await joinMutation.mutateAsync(id);
      toast({ title: t("community.joined"), description: t("community.joinedDesc") });
    } catch (e) {
      toast({
        title: t("common.error"),
        description: e instanceof Error ? e.message : t("community.joinError"),
        variant: "destructive",
      });
    }
  };

  const handleLeave = async () => {
    setConfirmLeave(false);
    try {
      await leaveMutation.mutateAsync(id);
      toast({ title: t("community.left"), description: t("community.leftDesc") });
    } catch (e) {
      toast({
        title: t("common.error"),
        description: e instanceof Error ? e.message : t("community.leaveError"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(false);
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: t("community.deleted") });
      navigate("/targets?tab=community");
    } catch (e) {
      toast({
        title: t("common.error"),
        description: e instanceof Error ? e.message : t("community.deleteError"),
        variant: "destructive",
      });
    }
  };

  const unitPart = target.unitLabel ? ` ${target.unitLabel}` : "";

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container max-w-2xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <button
            onClick={() => navigate("/targets?tab=community")}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            data-testid="button-back-community-detail"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display font-bold text-xl flex-1 truncate" data-testid="text-community-detail-title">
            {target.name}
          </h1>
          {target.isCreator && (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => navigate(`/community-targets/${id}/edit`)}
                data-testid="button-edit-community"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                data-testid="button-delete-community"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        <Card className="p-4 space-y-3">
          <p className="text-sm text-muted-foreground" data-testid="text-community-target-line">
            {t("targets.targetLabel")} {formatNumber(target.targetValue)}
            {unitPart} {t("targets.perPeriod", { period: periodWord })}
          </p>
          <p className="text-sm text-muted-foreground" data-testid="text-community-category">
            {t("targets.categoryLabel")} {target.category}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4" />
            <span data-testid="text-community-participant-count">
              {t("community.participantCount", { count: target.participantCount })}
            </span>
          </div>
          {target.creatorName && (
            <p className="text-xs text-muted-foreground" data-testid="text-community-creator">
              {t("community.createdBy", { name: target.creatorName })}
            </p>
          )}

          <div className="pt-2">
            {target.isCreator ? (
              <p className="text-xs text-muted-foreground">{t("community.youAreCreator")}</p>
            ) : target.isMember ? (
              <Button
                variant="outline"
                onClick={() => setConfirmLeave(true)}
                disabled={leaveMutation.isPending}
                className="w-full"
                data-testid="button-leave-community"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t("community.leave")}
              </Button>
            ) : (
              <Button
                onClick={handleJoin}
                disabled={joinMutation.isPending}
                className="w-full"
                data-testid="button-join-community"
              >
                <LogIn className="w-4 h-4 mr-2" />
                {t("community.join")}
              </Button>
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="font-display font-bold text-lg" data-testid="text-leaderboard-heading">
              {t("community.leaderboard")}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("community.leaderboardScope", { period: periodWord.toLowerCase() })}
          </p>

          {leaderboardLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-participants">
              {target.isMember || target.isCreator
                ? t("community.noParticipants")
                : t("community.membersOnly")}
            </p>
          ) : (
            <ul className="space-y-2" data-testid="list-community-leaderboard">
              {leaderboard.map((entry) => {
                const displayName = getLeaderboardDisplayName(entry, t("leaderboard.anonymous"));
                return (
                  <li
                    key={entry.userId}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg",
                      entry.isCurrentUser && "bg-primary/10",
                    )}
                    data-testid={`row-community-leaderboard-${entry.userId}`}
                  >
                    <span className="w-6 text-center font-mono text-sm" data-testid={`text-rank-${entry.userId}`}>
                      {entry.rank}
                    </span>
                    <Avatar className="w-9 h-9">
                      {entry.profileImageUrl && (
                        <AvatarImage src={entry.profileImageUrl} alt={displayName} />
                      )}
                      <AvatarFallback>{getLeaderboardInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-name-${entry.userId}`}>
                        {displayName}
                      </p>
                      <p className="text-xs text-muted-foreground" data-testid={`text-progress-${entry.userId}`}>
                        {formatNumber(entry.progress)} / {formatNumber(target.targetValue)}
                        {unitPart} ({entry.percent}%)
                      </p>
                      <Progress
                        value={entry.percent}
                        className="h-1.5 mt-1.5"
                        data-testid={`progress-${entry.userId}`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {leaderboardTotal > leaderboard.length && (
            <p className="text-xs text-muted-foreground text-center" data-testid="text-leaderboard-truncated">
              {t("community.showingTopN", { shown: leaderboard.length, total: leaderboardTotal })}
            </p>
          )}
        </Card>
      </main>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("community.confirmLeave")}</AlertDialogTitle>
            <AlertDialogDescription>{t("community.confirmLeaveDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-leave">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeave} data-testid="button-confirm-leave">
              {t("community.leave")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("community.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("community.confirmDeleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} data-testid="button-confirm-delete">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNavigation />
    </div>
  );
}
