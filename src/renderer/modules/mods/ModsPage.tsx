import { useParams } from 'react-router-dom';
import { CatalogBrowser } from '../catalog/CatalogBrowser';
import { PageHeader } from '../../components/layout/PageHeader';

export function ModsPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <>
      <PageHeader title="Mods" description="Catálogo de mods con resolución automática de dependencias." />
      <CatalogBrowser serverId={id!} kind="mod" />
    </>
  );
}
