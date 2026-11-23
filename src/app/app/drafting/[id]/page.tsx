import { seed } from '../../../../data/seed';
import { DraftEditor } from './DraftEditor';

export function generateStaticParams() {
  return seed.templates.map((t) => ({ id: t.id }));
}

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DraftEditor id={id} />;
}
