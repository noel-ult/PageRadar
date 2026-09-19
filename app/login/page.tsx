import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090b] px-4 py-12 text-zinc-100">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
        <Link href="/" className="flex items-center gap-2 text-base font-semibold text-white mb-6">
          <span className="grid h-7 w-7 place-items-center rounded bg-zinc-800 text-xs font-bold text-white">
            P
          </span>
          PageRadar
        </Link>

        <h1 className="text-xl font-semibold text-white">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Enter your details to view your monitored pages.
        </p>

        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

