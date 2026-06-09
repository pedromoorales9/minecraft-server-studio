import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Logo } from './Logo';
import { OWNER_NAME } from '../../lib/branding';

const SPLASH_MS = 2200;

/**
 * Boot splash: dark veil, glowing logo, personalised greeting.
 * Renders once per app launch and fades out over the routed UI.
 */
export function Splash({ onDone }: { onDone?: () => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone?.();
    }, SPLASH_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] grid place-items-center bg-[hsl(248_18%_4%)]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
        >
          {/* ambient violet halo */}
          <div
            aria-hidden
            className="pointer-events-none absolute h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, hsl(261 83% 58% / 0.55) 0%, transparent 70%)',
            }}
          />
          <div className="relative flex flex-col items-center gap-5">
            <motion.div
              initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <Logo size={88} glow />
            </motion.div>
            <motion.div
              className="text-center"
              initial={{ y: 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.6, ease: 'easeOut' }}
            >
              <div className="text-2xl font-semibold tracking-tight text-white">
                Bienvenido,{' '}
                <span className="bg-gradient-to-r from-[hsl(263_90%_72%)] to-[hsl(258_85%_55%)] bg-clip-text text-transparent">
                  {OWNER_NAME}
                </span>
              </div>
              <div className="mt-1 text-sm text-white/40">Minecraft Server Studio</div>
            </motion.div>
            <motion.div
              className="h-0.5 w-40 overflow-hidden rounded-full bg-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[hsl(263_90%_72%)] to-[hsl(258_85%_55%)]"
                initial={{ x: '-100%' }}
                animate={{ x: '0%' }}
                transition={{ duration: SPLASH_MS / 1000 - 0.7, ease: 'easeInOut', delay: 0.5 }}
              />
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
