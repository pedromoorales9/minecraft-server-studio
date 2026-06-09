import type { Loader } from '../../../shared/types/loader.js';

export interface JarArtifact {
  url: string;
  filename: string;
  sha1?: string;
  sha256?: string;
  /** When true the jar is an installer (Forge/NeoForge) and `runInstaller` is required. */
  isInstaller: boolean;
  /** Loader version that produced this artifact, when applicable. */
  loaderVersion: string | null;
}

export interface LoaderResolver {
  loader: Loader;
  /** Returns a list of supported loader versions for a given Minecraft version. */
  listLoaderVersions(mcVersion: string): Promise<{ version: string; stable: boolean }[]>;
  /** Returns the artifact to download for the chosen loader+mc combination. */
  resolveArtifact(mcVersion: string, loaderVersion: string | null): Promise<JarArtifact>;
  /** Some loaders (Forge/NeoForge) ship an installer; this performs the post-download install. */
  runInstaller?(args: {
    artifactPath: string;
    serverDir: string;
    javaPath: string;
  }): Promise<{ launchJar: string; jvmExtraArgs?: string[]; serverArgs?: string[] }>;
}
