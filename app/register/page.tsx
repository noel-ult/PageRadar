import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthLayout } from "@/components/auth/AuthLayout";
export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create an account"
      description="Start following the webpages that matter to you."
    >
      <RegisterForm />
    </AuthLayout>
  );
}
