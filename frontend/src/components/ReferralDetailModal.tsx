'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiClient } from '@/lib/api';
import { demoProperties, workflowLabel } from '@/lib/catalogue';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import type { LeadItem, LeadStatus, UserSummary } from '@/types';

const progress: Partial<Record<LeadStatus, LeadStatus[]>> = {
  ASSIGNED: ['CONTACTED', 'QUALIFIED', 'LOST'],
  CONTACTED: ['QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'],
  QUALIFIED: ['PROPOSAL_SENT', 'NEGOTIATION', 'WON', 'LOST'],
  PROPOSAL_SENT: ['NEGOTIATION', 'WON', 'LOST'], NEGOTIATION: ['WON', 'LOST'],
};

export function ReferralDetailModal({ lead, user, isOpen, onClose, onStatusUpdated }: {
  lead: LeadItem; user: UserSummary; isOpen: boolean; onClose: () => void; onStatusUpdated: (lead: LeadItem) => void;
}) {
  const [duplicates, setDuplicates] = useState<number>();
  const [followUps, setFollowUps] = useState<Awaited<ReturnType<typeof ApiClient.getFollowUps>>>([]);
  const [task, setTask] = useState({ note: '', nextAction: '', due: '' });
  const [agents, setAgents] = useState<{ id: string; fullName: string }[]>([]);
  const [agent, setAgent] = useState('');
  const [note, setNote] = useState('');
  const [stage, setStage] = useState<LeadStatus | ''>('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = lead.agencyReviewStage === 'PENDING_AGENCY_APPROVAL';
  const reviewer = pending && user.agencyId === lead.originatingAgencyId && user.id !== lead.partnerId &&
    ['AGENCY_OWNER', 'AGENCY_ADMIN'].includes(user.agencyRole || '');
  const dispatcher = user.role === 'COORDINATOR' || user.role === 'ADMIN';
  const canAssign = dispatcher && lead.status === 'SUBMITTED';
  const stages = (lead.agentId === user.id || dispatcher) ? progress[lead.status] : undefined;
  const property = demoProperties.find(p => p.id === lead.demoPropertyId);
  useEffect(() => {
    if (canAssign) ApiClient.getAssignees().then(setAgents).catch(e => setError(e.message));
  }, [canAssign]);
  const internal = lead.status !== 'DRAFT' && (dispatcher || lead.agentId === user.id);
  useEffect(() => {
    if (reviewer || canAssign) ApiClient.getReferrals({ search: lead.clientPhone })
      .then(rows => setDuplicates(rows.filter(row => row.id !== lead.id && row.clientPhone === lead.clientPhone).length))
      .catch(e => setError(e.message));
    if (internal) ApiClient.getFollowUps(lead.id).then(setFollowUps).catch(e => setError(e.message));
  }, [lead.id, lead.clientPhone, reviewer, canAssign, internal]);

  async function saveFollowUp(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      await ApiClient.recordFollowUp(lead.id, task);
      setFollowUps(await ApiClient.getFollowUps(lead.id));
      setTask({ note: '', nextAction: '', due: '' });
      const refreshed = await ApiClient.getReferralById(lead.id);
      if (refreshed) onStatusUpdated(refreshed);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to record follow-up'); }
    finally { setBusy(false); }
  }
  async function act(action: () => Promise<LeadItem>, success: string) {
    setBusy(true); setError(''); setNotice('');
    try { const result = await action(); onStatusUpdated(result); setNotice(success); setNote(''); setStage(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Action failed'); }
    finally { setBusy(false); }
  }
  return <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto">
      <DialogTitle>{lead.referenceNo}</DialogTitle><DialogDescription>{workflowLabel(lead)} · {lead.service?.name}</DialogDescription>
      <div className="space-y-2 rounded-xl bg-slate-50 p-4"><h3 className="font-bold">{lead.clientName}</h3>
        <p>{lead.clientPhone} {lead.clientEmail}</p><p>{lead.currency} {Number(lead.expectedDealValue).toLocaleString()}</p>
        {property && <p>{property.title} · Illustrative Demo Property</p>}
        <p>Client consent · {lead.consentAt ? new Date(lead.consentAt).toLocaleString() : 'No confirmation recorded'}</p>
        {lead.requirements && <p>{lead.requirements}</p>}{lead.notes && <p className="whitespace-pre-wrap">{lead.notes}</p>}
        {lead.agent && <p>Assigned agent · {lead.agent.fullName}</p>}
      </div>
      {user.id === lead.partnerId && lead.status === 'DRAFT' && !pending && <Link className="font-semibold text-blue-800" href={'/referrals/new?draft=' + lead.id} onClick={onClose}>Edit and submit referral →</Link>}
      {(reviewer || stages?.length || canAssign) && <label>Activity note<textarea className="mt-1 block w-full rounded-lg border p-2" value={note} maxLength={1000} onChange={e => setNote(e.target.value)} placeholder={reviewer ? 'Required when requesting changes' : 'Outcome or next action visible on the referral timeline'}/></label>}
      {(reviewer || canAssign) && <p>Other visible referrals with this phone - {duplicates ?? 'Checking'}</p>}
      {reviewer && <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => act(() => ApiClient.agencyReview(lead.id, { decision: 'approve' }), 'Referral approved and forwarded to Prospera')}>Approve for Prospera</Button>
        <Button variant="outline" disabled={busy || !note.trim()} onClick={() => act(() => ApiClient.agencyReview(lead.id, { decision: 'return', reason: note }), 'Returned to the submitting member')}>Request changes</Button></div>}
      {canAssign && <div className="space-y-2"><label>Assigned agent<select className="block w-full rounded-lg border p-2" value={agent} onChange={e => setAgent(e.target.value)}>
        <option value="">Choose an eligible agent</option>{agents.map(a => <option key={a.id} value={a.id}>{a.fullName}</option>)}</select></label>
        <Button disabled={busy || !agent} onClick={() => act(() => ApiClient.assignReferral(lead.id, { expectedRevision: lead.revision, agentId: agent, coordinatorId: user.role === 'COORDINATOR' ? user.id : undefined, assignmentNote: note || undefined }), 'Agent assigned')}>Assign referral</Button></div>}
      {stages && <div className="space-y-2"><label>Next stage<select className="block w-full rounded-lg border p-2" value={stage} onChange={e => setStage(e.target.value as LeadStatus)}>
        <option value="">Choose progress stage</option>{stages.map(s => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select></label>
        <Button disabled={busy || !stage || !note.trim()} onClick={() => stage && act(() => ApiClient.updateReferralStatus(lead.id, stage, note), 'Progress recorded')}>Record progress</Button></div>}
      {error && <p role="alert" className="text-red-800">{error}</p>}{notice && <p role="status" className="text-green-800">{notice}</p>}
      {internal && <details><summary className="cursor-pointer font-semibold">Internal follow-ups</summary>
        <ul>{followUps.map(f => <li className="mt-2 rounded-lg bg-slate-50 p-3" key={f.id}><strong>{f.newValues.nextAction} - {f.newValues.due}</strong><p>{f.newValues.note}</p></li>)}</ul>
        {!['WON', 'LOST', 'CANCELLED'].includes(lead.status) && <form onSubmit={saveFollowUp} className="mt-3 grid gap-2">
          <label>Internal note<textarea className="block w-full border p-2" required maxLength={1000} value={task.note} onChange={e => setTask({ ...task, note: e.target.value })}/></label>
          <label>Next action<input className="block w-full border p-2" required maxLength={300} value={task.nextAction} onChange={e => setTask({ ...task, nextAction: e.target.value })}/></label>
          <label>Follow-up date<input className="block border p-2" required type="date" value={task.due} onChange={e => setTask({ ...task, due: e.target.value })}/></label>
          <Button disabled={busy}>Save internal follow-up</Button></form>}</details>}
      <h3 className="font-bold">Referral timeline</h3>
      <ol className="space-y-3 border-l-2 border-slate-200 pl-4">{[...(lead.statusHistory || [])].reverse().map(e =>
        <li key={e.id}><strong className="text-sm">{e.newStatus.replaceAll('_', ' ')}</strong>
          <p className="text-xs text-slate-600"><time dateTime={e.createdAt}>{new Date(e.createdAt).toLocaleString()}</time> · {e.changedBy?.fullName} {e.changedBy?.role}</p>
          {e.transitionNote && <p className="text-sm">{e.transitionNote}</p>}</li>)}</ol>
    </DialogContent></Dialog>;
}
