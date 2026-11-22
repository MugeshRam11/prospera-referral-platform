'use client';
import { useEffect, useState } from 'react';
import { ApiClient } from '@/lib/api';

export default function CommissionsPage() {
  const [entries, setEntries] = useState<Awaited<ReturnType<typeof ApiClient.getCommissions>>>();
  const [error, setError] = useState('');
  useEffect(() => { ApiClient.getCommissions().then(setEntries).catch(e => setError(e.message)); }, []);
  return <section className="space-y-4 rounded-2xl border bg-white p-6"><h1 className="text-2xl font-bold">Available commission entries</h1>
    <p className="text-sm text-slate-600">Up to 100 available ledger entries for your account, most recent first.</p>
    {error ? <p role="alert">{error}</p> : !entries ? <p>Loading statement…</p> : entries.length === 0 ? <p>No available entries.</p> :
    <ul className="divide-y">{entries.map(e => <li key={e.id} className="flex flex-wrap justify-between gap-3 py-3">
      <span>{e.lead.referenceNo} · {e.entryType}</span><time>{new Date(e.availableAt).toLocaleDateString()}</time><strong>{e.currency} {Number(e.amount).toLocaleString()}</strong></li>)}</ul>}
  </section>;
}
