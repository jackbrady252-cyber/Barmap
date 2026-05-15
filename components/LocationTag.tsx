import { PinIcon } from '@/components/icons';
import type { Park } from '@/types/park';

type LocationTagProps = {
  park: Park;
  compact?: boolean;
};

export default function LocationTag({ park, compact = false }: LocationTagProps) {
  return (
    <span className={`location-tag${compact ? ' location-tag--compact' : ''}`}>
      <PinIcon small />
      <span>{park.name}</span>
    </span>
  );
}
