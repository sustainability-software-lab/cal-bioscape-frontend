'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitUserResearch, UserResearchConflictError } from '@/lib/api';
import type { UserResearchRole } from '@/lib/api-types';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'calbioscape:user-research:v1';
const ID_KEY = `${STORAGE_KEY}:pending-id`;
let completedForVisit = false;
const fieldClass = 'mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm';
const buttonClass = 'rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

function readStorage(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* Storage can be blocked; the form still works for this visit. */ }
}

export default function UserResearchPoll({ variant = 'invitation' }: { variant?: 'invitation' | 'link' }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [role, setRole] = useState<UserResearchRole | ''>('');
  const [otherRole, setOtherRole] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [goal, setGoal] = useState('');
  const [allowUpdates, setAllowUpdates] = useState(false);
  const [email, setEmail] = useState('');
  const [validEmail, setValidEmail] = useState(false);
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const submissionId = useRef<string | null>(null);
  const submitting = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (variant === 'invitation' && !completedForVisit && readStorage(STORAGE_KEY) !== 'submitted') setOpen(true);
  }, [variant]);

  async function sendFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !role) return;
    setError(null);
    submitting.current = true;
    setBusy(true);
    try {
      if (conflict) {
        submissionId.current = null;
        writeStorage(ID_KEY, null);
        setConflict(false);
      }
      if (!submissionId.current) {
        const storedId = readStorage(ID_KEY);
        submissionId.current = storedId && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storedId) ? storedId : crypto.randomUUID();
        writeStorage(ID_KEY, submissionId.current);
      }
      const result = await submitUserResearch({
        submissionId: submissionId.current,
        version: 1,
        role,
        otherRole: role === 'other' ? otherRole.trim() : null,
        affiliation: affiliation.trim() || null,
        goal: goal.trim(),
        allowFollowUp: false,
        allowUpdates,
        email: email.trim() || null,
        website,
      });
      if (!result?.success) {
        setError('We couldn’t save your feedback. Your answers are still here; please try again in a moment.');
        return;
      }
      writeStorage(STORAGE_KEY, 'submitted');
      writeStorage(ID_KEY, null);
      completedForVisit = true;
      setOpen(false);
      if (variant === 'link') router.push('/');
    } catch (error) {
      if (error instanceof UserResearchConflictError) {
        setConflict(true);
        setError('Your earlier response was saved. Choose Explore the tool again to send these answers as a new response.');
      } else {
        setError('We couldn’t save your feedback. Your answers are still here; please try again in a moment.');
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (nextOpen) setOpen(true); }}>
      {variant === 'link' && <DialogTrigger asChild><button type="button" className="rounded text-sm font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Share your input</button></DialogTrigger>}
      <DialogContent showCloseButton={false} onEscapeKeyDown={event => event.preventDefault()} onPointerDownOutside={event => event.preventDefault()} onInteractOutside={event => event.preventDefault()} onOpenAutoFocus={event => { event.preventDefault(); titleRef.current?.focus(); }} className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto p-5 text-gray-900 sm:p-6">
        <DialogHeader>
          <DialogTitle ref={titleRef} tabIndex={-1} className="px-5 text-center leading-6 focus:outline-none">Help us improve CalBioScape</DialogTitle>
          <DialogDescription className="sr-only">Select your role to explore the map. All other fields are optional.</DialogDescription>
        </DialogHeader>
        <form onSubmit={sendFeedback} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="research-role">Your role <span aria-hidden="true" className="text-red-600">*</span></Label>
            <div className="relative mt-2">
              <select id="research-role" required value={role} onChange={event => setRole(event.target.value as UserResearchRole | '')} className={cn(fieldClass, 'mt-0 appearance-none pr-10')} disabled={busy}>
                <option value="" disabled>Select the closest fit</option>
                <option value="researcher">Researcher / student</option>
                <option value="consultant">Consultant</option>
                <option value="grower">Grower / farmer</option>
                <option value="processor">Processor / facility operator</option>
                <option value="developer">Project / technology developer</option>
                <option value="software">Software / data professional</option>
                <option value="policy">Policy / public agency</option>
                <option value="other">Other</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
            </div>
          </div>
          {role === 'other' && <div>
            <Label htmlFor="research-other-role">Describe your role <span className="font-normal text-gray-500">(optional)</span></Label>
            <Input id="research-other-role" value={otherRole} onChange={event => setOtherRole(event.target.value)} maxLength={120} disabled={busy} className={fieldClass} />
          </div>}
          <div>
            <Label htmlFor="research-affiliation">Affiliation <span className="font-normal text-gray-500">(optional)</span></Label>
            <Input id="research-affiliation" value={affiliation} onChange={event => setAffiliation(event.target.value)} placeholder="organization, institution, company, etc." autoComplete="organization" maxLength={200} disabled={busy} className={fieldClass} />
          </div>
          <div>
            <Label htmlFor="research-goal" className="block leading-5">What are you hoping to accomplish with Cal BioScape? <span className="font-normal text-gray-500">(optional)</span></Label>
            <textarea id="research-goal" value={goal} onChange={event => setGoal(event.target.value)} placeholder="e.g., compare feedstock availability mixes near potential bio-refinery sites." rows={3} maxLength={2000} disabled={busy} className={`${fieldClass} resize-y`} />
          </div>
          <div>
            <Label htmlFor="research-email">Email address <span className="font-normal text-gray-500">(optional)</span></Label>
            <Input id="research-email" type="email" autoComplete="email" value={email} onChange={event => {
              const valid = event.currentTarget.value.trim() !== '' && event.currentTarget.validity.valid;
              setEmail(event.target.value);
              setValidEmail(valid);
              if (!valid) setAllowUpdates(false);
            }} maxLength={254} pattern="[^@\s]+@[^@\s]+\.[^@\s]+" title="Enter a complete email address, such as name@example.org." disabled={busy} className={fieldClass} />
            {validEmail && <div className="mt-3">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-gray-700">
                <input type="checkbox" checked={allowUpdates} onChange={event => setAllowUpdates(event.target.checked)} disabled={busy} className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500" />
                <span>I&apos;d like to stay informed about tool updates.</span>
              </label>
            </div>}
          </div>
          <div className="hidden" aria-hidden="true">
            <label htmlFor="research-website">Leave this field empty</label>
            <input id="research-website" name="website" value={website} onChange={event => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
          </div>
          <p className="text-xs leading-5 text-gray-500">Your responses will only be shared with the Cal BioScape development team for improving the tool.</p>
          {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-800">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <span title={!role ? 'Please select your role to continue.' : undefined} className="inline-flex">
              <button type="submit" disabled={busy || !role} className={cn(buttonClass, 'inline-flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700', !role && 'pointer-events-none')}>{busy ? 'Saving…' : 'Explore the tool'}<ArrowRight className="h-4 w-4" aria-hidden="true" /></button>
            </span>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
