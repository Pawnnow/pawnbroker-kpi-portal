import { KPI_INFO_IMAGES } from "@/lib/kpiInfoBubbles";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface KpiInfoBubbleProps {
  fieldName: string;
}

const KpiInfoBubble = ({ fieldName }: KpiInfoBubbleProps) => {
  const imagePath = KPI_INFO_IMAGES[fieldName];
  if (!imagePath) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none cursor-pointer hover:bg-primary/80 transition-colors flex-shrink-0"
          aria-label="More info"
        >
          P
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-sm p-2" side="right" align="center">
        <img
          src={imagePath}
          alt="KPI field info"
          className="max-w-[300px] max-h-[400px] rounded object-contain"
        />
      </PopoverContent>
    </Popover>
  );
};

export default KpiInfoBubble;
