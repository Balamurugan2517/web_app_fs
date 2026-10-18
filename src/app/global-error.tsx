'use client';

/** Last line of defence: used only if the root layout itself crashes. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ fontFamily: 'system-ui', textAlign: 'center', padding: '6rem 1rem', background: '#FAF6F0', color: '#4A151B' }}>
        <h1>Something went wrong</h1>
        <p>Please refresh the page.</p>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  );
}
