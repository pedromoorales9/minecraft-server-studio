import { Input } from '../../../components/ui/input';
import type { StepProps } from '../wizardState';

export function StepIdentity({ value, onChange }: StepProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-semibold">Identidad y recursos</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define cómo se identifica el servidor y la memoria asignada a la JVM.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre del servidor">
          <Input
            placeholder="Mi servidor de SMP"
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </Field>
        <Field label="Puerto">
          <Input
            type="number"
            min={1024}
            max={65535}
            value={value.port}
            onChange={(e) => onChange({ ...value, port: Number(e.target.value) || 25565 })}
          />
        </Field>
        <Field label="RAM mínima (MB)">
          <Input
            type="number"
            min={512}
            step={512}
            value={value.ramMinMb}
            onChange={(e) => onChange({ ...value, ramMinMb: Number(e.target.value) || 1024 })}
          />
        </Field>
        <Field label="RAM máxima (MB)">
          <Input
            type="number"
            min={value.ramMinMb}
            step={512}
            value={value.ramMaxMb}
            onChange={(e) => onChange({ ...value, ramMaxMb: Number(e.target.value) || 4096 })}
          />
        </Field>
        <Field label="Nombre del mundo">
          <Input
            value={value.worldName}
            onChange={(e) => onChange({ ...value, worldName: e.target.value })}
          />
        </Field>
        <Field label="MOTD">
          <Input value={value.motd} onChange={(e) => onChange({ ...value, motd: e.target.value })} />
        </Field>
        <Field label="Jugadores máximos">
          <Input
            type="number"
            min={1}
            max={500}
            value={value.maxPlayers}
            onChange={(e) => onChange({ ...value, maxPlayers: Number(e.target.value) || 20 })}
          />
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
