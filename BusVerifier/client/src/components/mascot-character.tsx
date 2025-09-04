import { Search, Lightbulb, Settings, CheckCircle } from "lucide-react";

interface MascotCharacterProps {
  message: string;
  icon?: "search" | "lightbulb" | "cog" | "check";
  animate?: boolean;
}

export function MascotCharacter({ message, icon = "search", animate = false }: MascotCharacterProps) {
  const getIcon = () => {
    switch (icon) {
      case "lightbulb":
        return <Lightbulb size={48} />;
      case "cog":
        return <Settings size={48} className={animate ? "animate-spin" : ""} />;
      case "check":
        return <CheckCircle size={48} />;
      default:
        return <Search size={48} />;
    }
  };

  return (
    <div className="relative" data-testid="mascot-character">
      <div className="speech-bubble" data-testid="speech-bubble">
        {message}
      </div>
      <div className="mascot-character">
        {getIcon()}
      </div>
    </div>
  );
}
