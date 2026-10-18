'use client';

import { useActionState } from 'react';
import { loginAction, type LoginState } from '../actions';

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  return (
    <form action={action} className="mx-auto max-w-sm space-y-4 rounded-2xl border border-rose-200 bg-white/80 p-8">
      <h1 className="font-serif text-3xl">Admin login</h1>
      <label htmlFor="email" className="block text-sm">E-mail</label>
      <input id="email" name="email" type="email" required autoComplete="username" className="w-full rounded-lg border border-rose-200 px-3 py-2.5" />
      <label htmlFor="password" className="block text-sm">Password</label>
      <input id="password" name="password" type="password" required autoComplete="current-password" className="w-full rounded-lg border border-rose-200 px-3 py-2.5" />
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-rose-950 py-3 text-sm uppercase tracking-wide text-white disabled:opacity-60">{pending ? 'Checking…' : 'Sign in'}</button>
    </form>
  );
}
