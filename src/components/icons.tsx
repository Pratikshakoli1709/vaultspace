import { FileText, Link, KeyRound, Image, type LucideProps, type Icon as LucideIcon } from 'lucide-react';
import type { DataItemType } from '@/lib/types';

export const AssetTypeIcons: Record<DataItemType, LucideIcon> = {
  document: FileText,
  link: Link,
  key: KeyRound,
  image: Image,
};

export const AssetTypeIcon = ({ type, ...props }: { type: DataItemType } & LucideProps) => {
  const IconComponent = AssetTypeIcons[type];
  if (!IconComponent) return null;
  return <IconComponent {...props} />;
};
