import { seed } from '../../../../data/seed';
import { StatuteDetail } from './StatuteDetail';

export function generateStaticParams() {
  return seed.statutes.map((s) => ({ id: s.id }));
}

export default async function StatutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <StatuteDetail id={id} />;
}
