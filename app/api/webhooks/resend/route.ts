import { forwardEmailRequest } from "@/lib/server/email-proxy";
export const dynamic = "force-dynamic";
export const POST = (request: Request) =>
  forwardEmailRequest(request, "webhook");
