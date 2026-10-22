import type { Icon } from '@phosphor-icons/react';
import { PROVIDER_ICONS } from '../../lib/icons';

export interface OrigenSection {
  to: string;
  label: string;
  icon: Icon;
}

export const ORIGEN_SECTIONS: OrigenSection[] = [
  { to: '/origen/google', label: 'Google Forms', icon: PROVIDER_ICONS.google_forms },
  { to: '/origen/nexus', label: 'Nexus', icon: PROVIDER_ICONS.nexus_fuel },
];
