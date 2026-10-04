import { Logo } from "./ui";

/** Shown when the Supabase env vars are missing (the app requires Supabase). */
export function SetupScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-line bg-surface p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Connect Supabase to continue
          </h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            Nouri uses Supabase for authentication and your data. Add your project
            credentials, then restart the dev server.
          </p>

          <ol className="mt-5 flex flex-col gap-4">
            <Step n={1} title="Create a Supabase project">
              Go to{" "}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand hover:underline"
              >
                supabase.com/dashboard
              </a>{" "}
              and create a new project.
            </Step>
            <Step n={2} title="Run the database schema">
              Open the SQL Editor and run the contents of{" "}
              <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[13px] text-ink">
                supabase/schema.sql
              </code>
              .
            </Step>
            <Step n={3} title="Add your keys to .env.local">
              From <span className="text-ink">Project Settings → API</span>, copy
              the values into{" "}
              <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[13px] text-ink">
                .env.local
              </code>
              :
              <pre className="mt-2 overflow-x-auto rounded-xl border border-line bg-surface-muted p-3 font-mono text-[12px] leading-relaxed text-ink-soft">
                {`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...`}
              </pre>
            </Step>
            <Step n={4} title="Restart the dev server">
              Stop and re-run{" "}
              <code className="rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[13px] text-ink">
                bun run dev
              </code>{" "}
              so the new environment variables load.
            </Step>
          </ol>
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
        {n}
      </span>
      <div>
        <div className="font-semibold text-ink">{title}</div>
        <div className="mt-0.5 text-sm leading-relaxed text-ink-soft">
          {children}
        </div>
      </div>
    </li>
  );
}
