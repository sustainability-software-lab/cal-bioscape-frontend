'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Download, LogOut, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiAuthError, exportUserResearch, getUserResearch, signInResearchAdmin, signOutResearchAdmin } from '@/lib/api';
import type { UserResearchResponse, UserResearchRole } from '@/lib/api-types';

const roleLabels: Record<UserResearchRole, string> = {
  researcher: 'Researcher / Student', consultant: 'Consultant', grower: 'Farmer / Grower',
  processor: 'Processor / Facility operator', developer: 'Project / Technology developer', software: 'Software / Data professional', policy: 'Policy professional', other: 'Other',
};
const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';
const fieldClass = 'mt-2 border-gray-300 bg-white text-base text-gray-900 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 sm:text-sm';

export default function ResearchAdmin() {
  const [mode, setMode] = useState<'loading' | 'login' | 'responses'>('loading');
  const [responses, setResponses] = useState<UserResearchResponse[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [previousCursors, setPreviousCursors] = useState<(string | null)[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const clearSession = useCallback((message: string | null) => {
    setResponses([]);
    setCursor(null);
    setNextCursor(null);
    setPreviousCursors([]);
    setPassword('');
    setMode('login');
    setError(message);
  }, []);

  const loadPage = useCallback(async (pageCursor: string | null, history: (string | null)[], initial = false) => {
    const id = ++requestId.current;
    setBusy(true);
    setError(null);
    try {
      const result = await getUserResearch(pageCursor);
      if (id !== requestId.current) return;
      if (!result) {
        if (initial) setMode('login');
        setError('We couldn’t load responses. Please try again in a moment.');
        return;
      }
      setResponses(result.responses);
      setCursor(pageCursor);
      setNextCursor(result.nextCursor);
      setPreviousCursors(history);
      setMode('responses');
    } catch (error) {
      if (id !== requestId.current) return;
      if (error instanceof ApiAuthError) clearSession(initial ? null : 'Your session has expired. Please sign in again.');
      else setError('We couldn’t load responses. Please try again in a moment.');
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }, [clearSession]);

  useEffect(() => {
    void loadPage(null, [], true);
    return () => { requestId.current += 1; };
  }, [loadPage]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signInResearchAdmin(username.trim(), password);
    setPassword('');
    if (!result?.success) {
      setError('Sign-in failed. Check your username and password, or try again in a moment.');
      setBusy(false);
      return;
    }
    await loadPage(null, []);
  }

  async function signOut() {
    setBusy(true);
    setError(null);
    try {
      const result = await signOutResearchAdmin();
      if (result?.success) clearSession(null);
      else setError('We couldn’t sign you out. Please try again.');
    } catch (error) {
      if (error instanceof ApiAuthError) clearSession(null);
    } finally { setBusy(false); }
  }

  async function downloadPage() {
    setBusy(true);
    setError(null);
    try {
      const data = await exportUserResearch(cursor);
      if (!data) {
        setError('We couldn’t export this page. Please try again.');
        return;
      }
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = `calbioscape-user-research-page-${previousCursors.length + 1}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (error instanceof ApiAuthError) clearSession('Your session has expired. Please sign in again.');
    } finally { setBusy(false); }
  }

  if (mode === 'loading') return <p role="status" className="py-16 text-center text-sm text-gray-600">Checking your session…</p>;

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 text-gray-900 sm:px-6 sm:py-12">
      {mode === 'login' ? (
        <div className="mx-auto max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Team sign in</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">Review the feedback people have shared with Cal BioScape.</p>
          <form onSubmit={signIn} className="mt-6 space-y-5">
            <div><Label htmlFor="admin-username">Username</Label><Input id="admin-username" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} maxLength={200} required disabled={busy} className={fieldClass} /></div>
            <div><Label htmlFor="admin-password">Password</Label><Input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} maxLength={512} required disabled={busy} className={fieldClass} /></div>
            {error && <p role="alert" className="text-sm leading-5 text-red-700">{error}</p>}
            <button type="submit" disabled={busy} className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
          </form>
          <Link href="/" className="mt-5 inline-block rounded text-sm text-gray-600 hover:text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">Back to the map</Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><h1 className="text-2xl font-semibold">User feedback</h1><p className="mt-2 text-sm text-gray-600">Private to the Cal BioScape team.</p></div>
            <button type="button" onClick={signOut} disabled={busy} className={buttonClass}><LogOut className="h-4 w-4" aria-hidden="true" />Sign out</button>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-y border-gray-200 py-4">
            <p role="status" className="text-sm text-gray-600">{busy ? 'Working…' : `${responses.length} ${responses.length === 1 ? 'response' : 'responses'} on page ${previousCursors.length + 1}`}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void loadPage(cursor, previousCursors)} disabled={busy} className={buttonClass}><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh</button>
              <button type="button" onClick={downloadPage} disabled={busy || responses.length === 0} className={buttonClass}><Download className="h-4 w-4" aria-hidden="true" />Export this page</button>
            </div>
          </div>
          {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {responses.length === 0 ? <div className="rounded-lg border border-gray-200 bg-white p-8 text-center mt-6"><h2 className="font-medium">No feedback yet</h2><p className="mt-2 text-sm text-gray-600">Responses will appear here after someone shares their input.</p></div> : (
            <div role="region" aria-label="User feedback table" tabIndex={0} className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
              <table className="w-full min-w-[1040px] table-fixed text-left text-sm">
                <caption className="sr-only">User feedback responses</caption>
                <thead className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                  <tr>
                    <th scope="col" className="w-[16%] px-4 py-3 font-medium">Institution/Affiliation</th>
                    <th scope="col" className="w-[16%] px-4 py-3 font-medium">Role</th>
                    <th scope="col" className="w-[25%] px-4 py-3 font-medium">Intended use</th>
                    <th scope="col" className="w-[18%] px-4 py-3 font-medium">Email</th>
                    <th scope="col" className="w-[11%] px-4 py-3 font-medium">Tool updates</th>
                    <th scope="col" className="w-[14%] px-4 py-3 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {responses.map(response => (
                    <tr key={response.id} className="align-top hover:bg-gray-50/70">
                      <td className="break-words px-4 py-4 font-medium text-gray-900">{response.affiliation || '—'}</td>
                      <td className="break-words px-4 py-4 text-gray-700">{response.role === 'other' ? response.otherRole || 'Other' : roleLabels[response.role]}</td>
                      <td className="whitespace-pre-wrap break-words px-4 py-4 leading-6 text-gray-700">{response.goal || '—'}</td>
                      <td className="break-words px-4 py-4">{response.email ? <a href={`mailto:${encodeURIComponent(response.email)}`} className="text-blue-700 underline underline-offset-2">{response.email}</a> : <span className="text-gray-500">—</span>}</td>
                      <td className="px-4 py-4 text-gray-700">{response.allowUpdates ? 'Opted in' : 'Not opted in'}{response.allowUpdates && !response.email && <span className="mt-1 block text-xs text-gray-500">(no email provided)</span>}</td>
                      <td className="px-4 py-4 text-xs leading-5 text-gray-500"><time dateTime={response.createdAt}>{new Date(response.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">Up to 50 responses per page. Exports contain this page only.</p>
            <div className="flex gap-2">
              <button type="button" disabled={busy || previousCursors.length === 0} onClick={() => void loadPage(previousCursors[previousCursors.length - 1], previousCursors.slice(0, -1))} className={buttonClass}>Previous page</button>
              <button type="button" disabled={busy || !nextCursor} onClick={() => void loadPage(nextCursor, [...previousCursors, cursor])} className={buttonClass}>Next page</button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
