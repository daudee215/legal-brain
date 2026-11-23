'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Loading } from '../../../components/ui/Loading';
import { CaseDetail } from '../cases/[id]/CaseDetail';

/** Any case — including ones created on this device — opened by id: /app/case/?id=… */
function Inner() {
  const id = useSearchParams().get('id') ?? '';
  return <CaseDetail key={id} id={id} />;
}

export default function CaseByIdPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Inner />
    </Suspense>
  );
}
