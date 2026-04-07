"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Input from "@/components/ui/Input";
import { useI18n } from "@/components/i18n/LanguageProvider";

export default function LoginPageClient() {
  const sp = useSearchParams();
  const { t } = useI18n();

  const error = sp.get("error");
  const next = sp.get("next") || "/dashboard";
  const email = sp.get("email") || "";

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl bg-white/90 backdrop-blur shadow-lift border border-border p-8 animate-fadeUp">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-primary">Dairy Management Pro</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("auth.loginHelp")}</p>
        </div>

        <form action="/api/auth/login" method="post" className="space-y-4" data-auth-form="login">
          <input type="hidden" name="next" value={next} />
          <Input
            label={t("auth.email")}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={email}
            required
          />

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground/80 mb-1">
              {t("auth.password")}
              <span className="text-destructive ml-1">*</span>
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="flex h-10 w-full rounded-md border border-border bg-white/80 px-3 py-2 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              />
              <button
                type="button"
                data-eye="password"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground"
                aria-label="Toggle password visibility"
              >
                👁
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error.startsWith("auth.") ? t(error) : error}
            </p>
          )}

          <button
            type="submit"
            data-submit
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            {t("public.signIn")}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          <Link href="/" className="hover:text-primary">
            ← {t("auth.backHome")}
          </Link>
        </p>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
(() => {
  const form = document.querySelector('form[data-auth-form="login"]');
  if (!form) return;
  const submitBtn = form.querySelector('button[data-submit]');
  form.addEventListener('submit', () => {
    if (submitBtn) {
      submitBtn.setAttribute('disabled', 'true');
      submitBtn.textContent = '${t("auth.signingIn").replace(/'/g, "\\'")}';
    }
  });
  const eye = form.querySelector('button[data-eye="password"]');
  const pwd = form.querySelector('input[name="password"]');
  if (eye && pwd) {
    eye.addEventListener('click', () => {
      pwd.type = pwd.type === 'password' ? 'text' : 'password';
    });
  }
})();
          `,
        }}
      />
    </div>
  );
}

