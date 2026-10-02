import { LoginForm } from "@/components/auth/LoginForm";
import { AuthLayout } from "@/components/auth/AuthLayout";
export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign in"
      description="Your pages, updates, and next opportunities are waiting."
    >
      <LoginForm />
    </AuthLayout>
  );
}
