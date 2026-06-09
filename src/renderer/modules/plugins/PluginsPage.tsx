import { useParams } from 'react-router-dom';
import { CatalogBrowser } from '../catalog/CatalogBrowser';
import { PageHeader } from '../../components/layout/PageHeader';

export function PluginsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <PageHeader title="Plugins" description="Busca, instala y actualiza plugins desde Modrinth, Hangar y Spigot." />
      <CatalogBrowser serverId={id!} kind="plugin" />
    </>
  );
}
