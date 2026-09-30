'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitUserResearch, UserResearchConflictError } from '@/lib/api';
import type { UserResearchRole } from '@/lib/api-types';

const STORAGE_KEY = 'calbioscape:user-research:v1';
const ID_KEY = `${STORAGE_KEY}:pending-id`;
const fieldClass = 'mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 sm:text-sm';
const buttonClass = 'rounded-md px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60';

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
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [role, setRole] = useState<UserResearchRole | ''>('');
  const [otherRole, setOtherRole] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [goal, setGoal] = useState('');
  const [allowFollowUp, setAllowFollowUp] = useState(false);
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const submissionId = useRef<string | null>(null);
  const submitting = useRef(false);

  useEffect(() => { setVisible(readStorage(STORAGE_KEY) === null); }, []);
  useEffect(() => {
    // The invitation occupies its own row; let the map adjust to the available height.
    const frame = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    return () => cancelAnimationFrame(frame);
  }, [visible]);

  function dismiss() {
    writeStorage(STORAGE_KEY, 'dismissed');
    setVisible(false);
  }

  async function sendFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !role) return;
    setError(null);
    if (!goal.trim() || (role === 'other' && !otherRole.trim())) {
      setError('Please tell us your role and what you hope to accomplish.');
      return;
    }
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
        allowFollowUp,
        email: allowFollowUp ? email.trim() : null,
        website,
      });
      if (!result?.success) {
        setError('We couldn’t save your feedback. Your answers are still here; please try again in a moment.');
        return;
      }
      writeStorage(STORAGE_KEY, 'submitted');
      writeStorage(ID_KEY, null);
      setVisible(false);
      setSubmitted(true);
    } catch (error) {
      if (error instanceof UserResearchConflictError) {
        setConflict(true);
        setError('Your earlier response was saved. You can send these answers as a new response, or close this form.');
      } else {
        setError('We couldn’t save your feedback. Your answers are still here; please try again in a moment.');
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {variant === 'link' && <DialogTrigger asChild><button type="button" className="rounded text-sm font-medium text-blue-700 underline underline-offset-4 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Share your input</button></DialogTrigger>}
      {visible && variant === 'invitation' && (
        <aside aria-label="Help improve Cal BioScape" className="flex shrink-0 items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2 text-gray-600 sm:gap-3 sm:px-6">
          <p className="min-w-0 flex-1 text-xs leading-5 sm:text-sm">
            <span className="font-medium text-gray-800">Help shape Cal BioScape.</span>{' '}
            <span className="hidden sm:inline">Tell us a little about your work and what brings you here.</span>
          </p>
          <DialogTrigger asChild><button type="button" className="shrink-0 rounded px-2 py-1.5 text-xs font-medium text-blue-700 underline decoration-blue-300 underline-offset-4 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:text-sm">
            Share your input
          </button></DialogTrigger>
          <button type="button" aria-label="Dismiss research invitation" onClick={dismiss} className="shrink-0 rounded p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </aside>
      )}
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-y-auto p-5 text-gray-900 sm:p-6">
        {submitted ? (
          <div className="py-5">
            <Check className="mb-4 h-7 w-7 text-green-700" aria-hidden="true" />
            <DialogHeader>
              <DialogTitle className="leading-6">Thanks for sharing your perspective.</DialogTitle>
              <DialogDescription className="pt-2 leading-6">Your feedback helps our team decide what to improve next.</DialogDescription>
            </DialogHeader>
            <button type="button" onClick={() => setOpen(false)} className={`${buttonClass} mt-6 bg-blue-600 text-white hover:bg-blue-700`}>Back to the map</button>
          </div>
        ) : (
          <>
            <DialogHeader className="pr-6">
              <DialogTitle className="leading-6">Help shape Cal BioScape</DialogTitle>
              <DialogDescription className="pt-1 leading-5">What brings you here? A little context helps us build a more useful tool. This is entirely optional.</DialogDescription>
            </DialogHeader>
            <form onSubmit={sendFeedback} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="research-role">Your role</Label>
                <select id="research-role" required value={role} onChange={event => setRole(event.target.value as UserResearchRole | '')} className={fieldClass} disabled={busy}>
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
              </div>
              {role === 'other' && <div>
                <Label htmlFor="research-other-role">Describe your role</Label>
                <Input id="research-other-role" value={otherRole} onChange={event => setOtherRole(event.target.value)} maxLength={120} required disabled={busy} className={fieldClass} />
              </div>}
              <div>
                <Label htmlFor="research-affiliation">Affiliation <span className="font-normal text-gray-500">(optional)</span></Label>
                <Input id="research-affiliation" value={affiliation} onChange={event => setAffiliation(event.target.value)} placeholder="Organization, institution, or independent" autoComplete="organization" maxLength={200} disabled={busy} className={fieldClass} />
              </div>
              <div>
                <Label htmlFor="research-goal" className="leading-5">What are you hoping to accomplish with Cal BioScape?</Label>
                <textarea id="research-goal" value={goal} onChange={event => setGoal(event.target.value)} placeholder="For example, compare feedstock near a potential facility." rows={3} maxLength={2000} required disabled={busy} className={`${fieldClass} resize-y`} />
              </div>
              <div>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm leading-5 text-gray-700">
                  <input type="checkbox" checked={allowFollowUp} onChange={event => setAllowFollowUp(event.target.checked)} disabled={busy} className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500" />
                  <span>I’m open to a follow-up conversation <span className="text-gray-500">(optional)</span></span>
                </label>
                {allowFollowUp && <div className="mt-3">
                  <Label htmlFor="research-email">Email address</Label>
                  <Input id="research-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={254} required disabled={busy} aria-describedby="research-email-help" className={fieldClass} />
                  <p id="research-email-help" className="mt-1.5 text-xs leading-5 text-gray-500">The Cal BioScape team may email you about your feedback or a user interview.</p>
                </div>}
              </div>
              <div className="hidden" aria-hidden="true">
                <label htmlFor="research-website">Leave this field empty</label>
                <input id="research-website" name="website" value={website} onChange={event => setWebsite(event.target.value)} tabIndex={-1} autoComplete="off" />
              </div>
              <p className="text-xs leading-5 text-gray-500">Responses are private to the Cal BioScape team and used to improve the tool. Please leave out sensitive or confidential details.</p>
              {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-5 text-red-800">{error}</p>}
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => setOpen(false)} className={`${buttonClass} text-gray-600 hover:bg-gray-100`}>Not now</button>
                <button type="submit" disabled={busy} className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700`}>{busy ? 'Sending…' : conflict ? 'Send as a new response' : 'Send feedback'}</button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
