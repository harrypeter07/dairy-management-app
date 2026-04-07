"use client";

import React, {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

type Lang = "en" | "hi";

type Ctx = {
	lang: Lang;
	setLang: (lang: Lang) => void;
	t: (key: string) => string;
};

const I18nContext = createContext<Ctx | null>(null);

const dict: Record<Lang, Record<string, string>> = {
	en: {
		"lang.english": "English",
		"lang.hindi": "Hindi",
		"nav.dashboard": "Dashboard",
		"nav.customers": "Customers",
		"nav.entries": "Daily Entries",
		"nav.products": "Products",
		"nav.billing": "Billing",
		"nav.settings": "Settings",
		"common.signOut": "Sign out",
		"common.profile": "Profile",
		"common.loading": "Loading…",
		"customers.title": "Customers",
		"customers.add": "Add Customer",
		"products.title": "Manage Products",
		"products.add": "Add Product",
		"entries.title": "Daily Entries",
		"billing.title": "Billing",
		"settings.title": "Dairy settings",
		"dashboard.title": "Dashboard",
		"ledger.addPayment": "Add Payment/Advance",
		"header.language": "Language",
		"common.save": "Save",
		"common.saving": "Saving...",
		"form.fullName": "Full Name",
		"form.phone": "Phone Number",
		"form.address": "Address",
		"form.defaultMilkQty": "Default Milk Qty (Liters)",
		"form.amount": "Amount",
		"form.date": "Date",
		"form.noteOptional": "Note (Optional)",
		"form.productName": "Product name",
		"form.ratePerUnit": "Rate (per unit)",
		"form.unit": "Unit",
		"form.customer": "Customer",
		"form.product": "Product",
		"form.quantity": "Quantity",
		"form.pricePerUnit": "Price Per Unit",
		"form.shift": "Shift",
		"form.morning": "Morning",
		"form.evening": "Evening",
		"tx.type": "Transaction Type",
		"tx.paymentMode": "Payment Mode",
		"tx.payment": "Payment (against bill)",
		"tx.advance": "Advance",
		"tx.adjustment": "Adjustment",
		"tx.cash": "Cash",
		"tx.online": "Online",
		"tx.upi": "UPI",
		"products.edit": "Edit Product",
		"products.new": "Add New Product",
		"products.save": "Save Product",
		"products.savedLower":
			"Saved in lowercase (max 64 characters). Duplicate names are not allowed.",
		"public.signIn": "Sign in",
		"public.openApp": "Open app",
		"public.exploreFeatures": "Explore features",
		"public.heroTitleA": "Fresh operations for your",
		"public.heroTitleB": "dairy business",
		"public.heroBody":
			"Track customers, daily milk entries, payments, and billing in one calm, pasture-inspired workspace — built for clarity, not clutter.",
		"public.featuresTitle": "Everything your dairy desk needs",
		"public.featureCustomersTitle": "Customers & ledger",
		"public.featureCustomersBody":
			"Per-customer balances, payments, and full history in one ledger view.",
		"public.featureAnalyticsTitle": "Analytics",
		"public.featureAnalyticsBody":
			"Sales, milk volume, collections, and outstanding balances by period.",
		"public.featureBillingTitle": "Billing & sharing",
		"public.featureBillingBody":
			"Beautiful statements, PDF export, and time-limited share links from secure storage.",
		"public.builtByTitle": "Built by Shaibya Solutions",
		"public.builtByBodyA":
			"We craft practical software for local businesses — starting with dairy operations where trust, speed, and clear numbers matter every morning.",
		"public.builtByBodyB":
			"Dairy Management Pro is tailored for milk routes, booth sales, and small cooperatives who outgrow notebooks but do not need enterprise complexity.",
		"auth.loginHelp":
			"Use your Supabase Auth email and password (create a user in the Supabase dashboard or run npm run create-demo-user locally).",
		"auth.email": "Email",
		"auth.password": "Password",
		"auth.signingIn": "Signing in…",
		"auth.backHome": "Back to home",
		"auth.invalidCredentials": "Invalid email or password. Please try again.",
		"auth.required": "Email and password are required.",
	},
	hi: {
		"lang.english": "अंग्रेज़ी",
		"lang.hindi": "हिंदी",
		"nav.dashboard": "डैशबोर्ड",
		"nav.customers": "ग्राहक",
		"nav.entries": "दैनिक एंट्री",
		"nav.products": "उत्पाद",
		"nav.billing": "बिलिंग",
		"nav.settings": "सेटिंग्स",
		"common.signOut": "साइन आउट",
		"common.profile": "प्रोफ़ाइल",
		"common.loading": "लोड हो रहा है…",
		"customers.title": "ग्राहक",
		"customers.add": "ग्राहक जोड़ें",
		"products.title": "उत्पाद प्रबंधन",
		"products.add": "उत्पाद जोड़ें",
		"entries.title": "दैनिक एंट्री",
		"billing.title": "बिलिंग",
		"settings.title": "डेयरी सेटिंग्स",
		"dashboard.title": "डैशबोर्ड",
		"ledger.addPayment": "भुगतान/एडवांस जोड़ें",
		"header.language": "भाषा",
		"common.save": "सेव करें",
		"common.saving": "सेव हो रहा है...",
		"form.fullName": "पूरा नाम",
		"form.phone": "फोन नंबर",
		"form.address": "पता",
		"form.defaultMilkQty": "डिफ़ॉल्ट दूध मात्रा (लीटर)",
		"form.amount": "राशि",
		"form.date": "तारीख",
		"form.noteOptional": "नोट (वैकल्पिक)",
		"form.productName": "उत्पाद नाम",
		"form.ratePerUnit": "रेट (प्रति यूनिट)",
		"form.unit": "यूनिट",
		"form.customer": "ग्राहक",
		"form.product": "उत्पाद",
		"form.quantity": "मात्रा",
		"form.pricePerUnit": "प्रति यूनिट कीमत",
		"form.shift": "शिफ्ट",
		"form.morning": "सुबह",
		"form.evening": "शाम",
		"tx.type": "लेनदेन प्रकार",
		"tx.paymentMode": "भुगतान माध्यम",
		"tx.payment": "भुगतान (बिल के खिलाफ)",
		"tx.advance": "एडवांस",
		"tx.adjustment": "समायोजन",
		"tx.cash": "नकद",
		"tx.online": "ऑनलाइन",
		"tx.upi": "यूपीआई",
		"products.edit": "उत्पाद संपादित करें",
		"products.new": "नया उत्पाद जोड़ें",
		"products.save": "उत्पाद सेव करें",
		"products.savedLower":
			"छोटे अक्षरों में सेव होता है (अधिकतम 64 अक्षर)। डुप्लिकेट नाम अनुमति नहीं है।",
		"public.signIn": "साइन इन",
		"public.openApp": "ऐप खोलें",
		"public.exploreFeatures": "फीचर्स देखें",
		"public.heroTitleA": "आपके",
		"public.heroTitleB": "डेयरी बिज़नेस के लिए आसान संचालन",
		"public.heroBody":
			"ग्राहक, दैनिक दूध एंट्री, भुगतान और बिलिंग — सब कुछ एक ही जगह, साफ और आसान तरीके से।",
		"public.featuresTitle": "आपकी डेयरी के लिए ज़रूरी सब कुछ",
		"public.featureCustomersTitle": "ग्राहक और खाता",
		"public.featureCustomersBody":
			"हर ग्राहक का बकाया, भुगतान और पूरी हिस्ट्री एक ही लेजर में।",
		"public.featureAnalyticsTitle": "विश्लेषण",
		"public.featureAnalyticsBody":
			"पीरियड के अनुसार बिक्री, दूध मात्रा, कलेक्शन और बकाया।",
		"public.featureBillingTitle": "बिलिंग और शेयर",
		"public.featureBillingBody":
			"सुंदर स्टेटमेंट, PDF और सुरक्षित स्टोरेज से शेयर लिंक।",
		"public.builtByTitle": "Shaibya Solutions द्वारा बनाया गया",
		"public.builtByBodyA":
			"हम स्थानीय बिज़नेस के लिए तेज़ और भरोसेमंद सॉफ्टवेयर बनाते हैं — खासकर डेयरी के लिए।",
		"public.builtByBodyB":
			"Dairy Management Pro दूध रूट/बूथ और छोटे को-ऑपरेटिव्स के लिए बनाया गया है।",
		"auth.loginHelp":
			"अपना Supabase Auth वाला ईमेल और पासवर्ड इस्तेमाल करें (Supabase डैशबोर्ड में यूज़र बनाएं या लोकली npm run create-demo-user चलाएं)।",
		"auth.email": "ईमेल",
		"auth.password": "पासवर्ड",
		"auth.signingIn": "साइन इन हो रहा है…",
		"auth.backHome": "होम पर वापस",
		"auth.invalidCredentials": "गलत ईमेल या पासवर्ड। कृपया फिर से कोशिश करें।",
		"auth.required": "ईमेल और पासवर्ड ज़रूरी हैं।",
	},
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
	const [lang, setLangState] = useState<Lang>("en");

	useEffect(() => {
		const saved = localStorage.getItem("app_lang");
		if (saved === "hi" || saved === "en") setLangState(saved);
	}, []);

	const setLang = (next: Lang) => {
		setLangState(next);
		localStorage.setItem("app_lang", next);
	};

	const value = useMemo<Ctx>(
		() => ({
			lang,
			setLang,
			t: (key: string) => dict[lang][key] ?? dict.en[key] ?? key,
		}),
		[lang],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
	const ctx = useContext(I18nContext);
	if (!ctx) {
		return {
			lang: "en" as Lang,
			setLang: (_: Lang) => {},
			t: (key: string) => dict.en[key] ?? key,
		};
	}
	return ctx;
}
