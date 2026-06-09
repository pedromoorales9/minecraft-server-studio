import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ArrowLeft, ArrowRight } from 'lucide-react';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { StepLoader } from './steps/StepLoader';
import { StepAuth } from './steps/StepAuth';
import { StepIdentity } from './steps/StepIdentity';
import { StepContent } from './steps/StepContent';
import { StepConfirm } from './steps/StepConfirm';
import type { WizardState } from './wizardState';
import { useMutation } from '@tanstack/react-query';
import type { ServerProvisioningProgress } from '../../../shared/types/server';

const INITIAL: WizardState = {
  loader: 'paper',
  minecraftVersion: '',
  loaderVersion: null,
  authMode: 'premium',
  name: '',
  port: 25565,
  ramMinMb: 1024,
  ramMaxMb: 4096,
  worldName: 'world',
  contentMode: 'plugins',
  motd: 'A Minecraft Server',
  maxPlayers: 20,
  eulaAccepted: false,
};

const STEPS = [
  { key: 'loader', title: 'Loader y versión' },
  { key: 'auth', title: 'Autenticación' },
  { key: 'identity', title: 'Identidad' },
  { key: 'content', title: 'Tipo de servidor' },
  { key: 'confirm', title: 'Confirmar' },
] as const;

export function WizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(INITIAL);
  const [progress, setProgress] = useState<ServerProvisioningProgress | null>(null);

  useEffect(() => {
    const off = window.api.servers.onProvisioningProgress((p) => setProgress(p));
    return off;
  }, []);

  const create = useMutation({
    mutationFn: () =>
      window.api.servers.create({
        name: state.name,
        loader: state.loader,
        minecraftVersion: state.minecraftVersion,
        loaderVersion: state.loaderVersion,
        contentMode: state.contentMode,
        authMode: state.authMode,
        port: state.port,
        ramMinMb: state.ramMinMb,
        ramMaxMb: state.ramMaxMb,
        worldName: state.worldName,
        motd: state.motd,
        maxPlayers: state.maxPlayers,
        eulaAccepted: state.eulaAccepted,
      }),
    onSuccess: (rec) => navigate(`/servers/${rec.id}`),
  });

  function next() {
    if (step < STEPS.length - 1) setStep(step + 1);
  }
  function prev() {
    if (step > 0) setStep(step - 1);
  }

  function canAdvance(): boolean {
    if (step === 0) return Boolean(state.loader && state.minecraftVersion);
    if (step === 2) return state.name.trim().length > 0 && state.port > 0;
    if (step === 4) return state.eulaAccepted;
    return true;
  }

  const overall = ((step + 1) / STEPS.length) * 100;

  return (
    <>
      <PageHeader title="Crear servidor" description="Asistente paso a paso. Tardarás menos de un minuto." />

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border/60 px-6 py-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Paso {step + 1} de {STEPS.length} · {STEPS[step]!.title}
              </span>
              <span>{Math.round(overall)}%</span>
            </div>
            <Progress value={overall} className="mt-2" />
          </div>

          <div className="min-h-[420px] px-6 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.18 }}
              >
                {step === 0 && <StepLoader value={state} onChange={setState} />}
                {step === 1 && <StepAuth value={state} onChange={setState} />}
                {step === 2 && <StepIdentity value={state} onChange={setState} />}
                {step === 3 && <StepContent value={state} onChange={setState} />}
                {step === 4 && (
                  <StepConfirm
                    value={state}
                    onChange={setState}
                    creating={create.isPending}
                    progress={progress}
                    error={create.error instanceof Error ? create.error.message : null}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="flex justify-between border-t border-border/60 px-6 py-4">
            <Button variant="ghost" onClick={prev} disabled={step === 0 || create.isPending}>
              <ArrowLeft className="h-4 w-4" /> Atrás
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={next} disabled={!canAdvance()}>
                Siguiente <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => create.mutate()} disabled={!canAdvance() || create.isPending}>
                <Check className="h-4 w-4" />
                {create.isPending ? 'Creando…' : 'Crear servidor'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
