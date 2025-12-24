import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { type Deed } from "@shared/schema";
import { useDeleteDeed } from "@/hooks/use-deeds";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion } from "framer-motion";

interface DeedCardProps {
  deed: Deed;
  index: number;
}

export function DeedCard({ deed, index }: DeedCardProps) {
  const [, navigate] = useLocation();
  const { mutate: deleteDeed, isPending } = useDeleteDeed();

  const isGood = deed.deedType === "good";
  const isIstighfar = deed.category === "Istighfar";
  const date = deed.createdAt ? new Date(deed.createdAt) : new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`
        group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer
        ${isGood 
          ? "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 hover:border-emerald-500/30" 
          : "bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10 hover:border-rose-500/30"
        }
      `}
      onClick={() => navigate(`/edit-deed/${deed.id}`)}
    >
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span 
              className={`
                inline-block px-2 py-0.5 rounded-full text-xs font-medium
                ${isGood ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/20 text-rose-600 dark:text-rose-400"}
              `}
            >
              {isGood ? "+ Good Deed" : isIstighfar ? "- Bad Deed" : "+ Bad Deed"}
            </span>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-600 dark:text-blue-400">
              {deed.category}
            </span>
          </div>
          <h3 className="text-lg font-medium text-foreground leading-tight mb-1">
            {deed.description}
          </h3>
          <p className="text-sm text-muted-foreground">
            {format(date, "PPP p")}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className={`text-xl font-bold ${isGood ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {isGood ? "+" : isIstighfar ? "-" : "+"}{deed.points}
          </span>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button 
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 rounded-lg"
                disabled={isPending}
                onClick={(e) => e.stopPropagation()}
                data-testid="button-delete-deed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border text-card-foreground">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This action cannot be undone. This will permanently delete this deed from your history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-secondary border-border hover:bg-muted text-foreground">Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => deleteDeed(deed.id)}
                  className="bg-rose-500 hover:bg-rose-600 text-white"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  );
}
