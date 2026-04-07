import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function safeInternalPath(next: string): string {
	if (!next.startsWith("/") || next.startsWith("//")) return "/dashboard";
	return next;
}

export async function POST(request: NextRequest) {
	const form = await request.formData();
	const email = String(form.get("email") || "").trim();
	const password = String(form.get("password") || "");
	const nextRaw = String(form.get("next") || "/dashboard");

	if (!email || !password) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		url.searchParams.set("error", "auth.required");
		return NextResponse.redirect(url, { status: 303 });
	}

	const dest = safeInternalPath(nextRaw);
	const response = NextResponse.redirect(new URL(dest, request.url), {
		status: 303,
	});

	const supabase = createServerClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		{
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) =>
						response.cookies.set(name, value, options),
					);
				},
			},
		},
	);

	const { error } = await supabase.auth.signInWithPassword({ email, password });

	if (error) {
		const url = request.nextUrl.clone();
		url.pathname = "/login";
		url.searchParams.set(
			"error",
			error.message === "Invalid login credentials"
				? "auth.invalidCredentials"
				: error.message,
		);
		url.searchParams.set("email", email);
		url.searchParams.set("next", dest);
		return NextResponse.redirect(url, { status: 303 });
	}

	return response;
}
