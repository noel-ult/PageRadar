import Link from "next/link";
import { Brand } from "@/components/common/Brand";
export default function NotFound() {
  return (
    <main className="min-h-dvh grid place-content-center px-6">
      <div className="max-w-md">
        <Brand />
        <p className="eyebrow mt-12 mb-3">Page not found</p>
        <h1 className="text-3xl font-bold">This page is off the radar.</h1>
        <p className="text-muted mt-4 mb-6">
          The link may be incorrect or the page may have moved.
        </p>
        <Link href="/" className="btn btn-primary">
          Back to PageRadar
        </Link>
      </div>
    </main>
  );
}
