import { Music } from "lucide-react";

interface MusicLoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  description?: string;
}

const sizeClasses = {
  sm: {
    container: "w-8 h-8",
    icon: "w-4 h-4"
  },
  md: {
    container: "w-12 h-12",
    icon: "w-6 h-6"
  },
  lg: {
    container: "w-16 h-16",
    icon: "w-8 h-8"
  }
};

const MusicLoadingSpinner = ({ size = "md", message, description }: MusicLoadingSpinnerProps) => {
  const classes = sizeClasses[size];
  
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`${classes.container} bg-primary/20 rounded-full flex items-center justify-center`}>
        <Music className={`${classes.icon} text-primary animate-spin`} />
      </div>
      {message && (
        <p className="text-foreground font-medium text-center">{message}</p>
      )}
      {description && (
        <p className="text-sm text-muted-foreground text-center">{description}</p>
      )}
    </div>
  );
};

export default MusicLoadingSpinner;
