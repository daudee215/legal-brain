import { seed } from '../../../../data/seed';
import { CaseDetail } from './CaseDetail';

export function generateStaticParams() {
  return seed.cases.map((c) => ({ id: c.id }));
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseDetail id={id} />;
}
