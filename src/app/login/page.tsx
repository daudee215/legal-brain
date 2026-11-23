'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '../../components/marketing/AuthCard';
import { btn, inputCls } from '../../components/ui';

export default function LoginPage() {
  const router = useRouter();
  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your chamber."
      footer={
        <>
          New to Legal Brain?{' '}
          <Link href="/signup/" className="font-medium text-bronze hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          router.push('/app/');
        }}
      >
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Email</span>
          <input type="email" className={inputCls} placeholder="you@chamber.pk" autoComplete="email" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Password</span>
          <input type="password" className={inputCls} autoComplete="current-password" />
        </label>
        <button type="submit" className={`${btn.primary} w-full py-2.5`}>
          Log in
        </button>
      </form>
    </AuthCard>
  );
}
