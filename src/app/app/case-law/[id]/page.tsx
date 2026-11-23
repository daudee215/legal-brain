import { seed } from '../../../../data/seed';
import { JudgmentDetail } from './JudgmentDetail';

export function generateStaticParams() {
  return seed.judgments.map((j) => ({ id: j.id }));
}

export default async function JudgmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <JudgmentDetail id={id} />;
}
