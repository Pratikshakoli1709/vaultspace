import { FileText, Link, KeyRound, Image, type LucideProps, type Icon as LucideIcon } from 'lucide-react';
import type { AssetType } from '@/lib/types';

export const AssetTypeIcons: Record<AssetType, LucideIcon> = {
  document: FileText,
  link: Link,
  key: KeyRound,
  image: Image,
};

export const AssetTypeIcon = ({ type, ...props }: { type: AssetType } & LucideProps) => {
  const IconComponent = AssetTypeIcons[type];
  if (!IconComponent) return null;
  return <IconComponent {...props} />;
};
