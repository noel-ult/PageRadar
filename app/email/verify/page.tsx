import { EmailAction } from "@/components/notifications/EmailAction";
export const metadata = {
  title: "Verify email — PageRadar",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default function Page() {
  return <EmailAction kind="verify" />;
}
