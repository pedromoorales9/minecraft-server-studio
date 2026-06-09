import type { Loader } from '../../../shared/types/loader';
import type { ServerContentMode, AuthMode } from '../../../shared/types/server';

export interface WizardState {
  loader: Loader;
  minecraftVersion: string;
  loaderVersion: string | null;
  authMode: AuthMode;
  name: string;
  port: number;
  ramMinMb: number;
  ramMaxMb: number;
  worldName: string;
  contentMode: ServerContentMode;
  motd: string;
  maxPlayers: number;
  eulaAccepted: boolean;
}

export type WizardSetter = (next: WizardState) => void;

export interface StepProps {
  value: WizardState;
  onChange: WizardSetter;
}
