'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { todayKey } from '../../lib/dates';
import { addPayment, upsertFee } from '../../lib/mutations';
import type { FeePayment } from '../../types';
import { btn, inputCls } from '../ui';

const MODES: FeePayment['mode'][] = ['Cash', 'Cheque', 'Bank transfer', 'Online'];

/** Set the agreed fee and/or record a payment received from the client. */
export function PaymentForm({ caseId, agreed, initialAmount, initialNote, onDone }: { caseId: string; agreed?: number; initialAmount?: number; initialNote?: string; onDone: (msg: string) => void }) {
  const [fee, setFee] = useState(agreed ? String(agreed) : '');
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [mode, setMode] = useState<FeePayment['mode']>('Cash');
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState(initialNote ?? '');
  const [err, setErr] = useState('');

  return (
    <motion.form
      id="payment-form"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="mb-5 overflow-hidden rounded-xl border border-bronze/30 bg-bronze/5 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setErr('');
        try {
          const f = Number(fee.replace(/,/g, ''));
          const a = Number(amount.replace(/,/g, ''));
          if (fee && f !== agreed) upsertFee(caseId, f);
          if (amount) addPayment(caseId, { date, amount: a, mode, note: note.trim() || undefined });
          if (!amount && !(fee && f !== agreed)) throw new Error('Enter an amount received or the agreed fee');
          onDone(amount ? `Rs ${a.toLocaleString('en-PK')} recorded` : 'Agreed fee saved');
        } catch (x) {
          setErr((x as Error).message);
        }
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          <span className="mb-1 block font-medium">Agreed fee (Rs)</span>
          <input className={inputCls} inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="e.g. 150000" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Amount received (Rs)</span>
          <input className={inputCls} inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 25000" />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Mode</span>
          <select className={inputCls} value={mode} onChange={(e) => setMode(e.target.value as FeePayment['mode'])}>
            {MODES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Date</span>
          <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">Note</span>
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Retainer, instalment…" />
        </label>
      </div>
      {err && <p className="mt-2 text-sm text-danger">{err}</p>}
      <div className="mt-3 flex justify-end">
        <button type="submit" className={btn.primary}>
          Save
        </button>
      </div>
    </motion.form>
  );
}
