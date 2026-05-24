<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Privacy Policy — Order Local</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-6 py-16">
	<!-- TODO(copy): confirm with legal team before publishing -->
	<h1 class="text-3xl font-bold text-foreground">Privacy Policy</h1>
	<p class="mt-2 text-sm text-muted-foreground">Effective [EFFECTIVE_DATE]</p>

	<p class="mt-6 text-foreground">
		This Privacy Policy describes how [COMPANY_NAME] ("Order Local," "we," "us," or "our")
		collects, uses, and shares information when you use our website, our pre-order and pickup
		platform, and related services (collectively, the "Service"). By using the Service, you
		agree to the practices described in this Policy.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">1. Who We Are</h2>
	<p class="mt-4 text-foreground">
		Order Local is a software platform that lets small businesses ("Vendors") — including
		bakers, makers, growers, and other producers — sell pre-orders for pickup. When a customer
		("Customer") places an order on a Vendor's storefront, the Customer is purchasing from the
		Vendor; Order Local provides the technology that makes the transaction possible.
	</p>
	<p class="mt-4 text-foreground">
		For most Customer information, Order Local acts as a "data processor" on behalf of the
		Vendor (who is the "data controller"). For information collected directly from Vendors
		when they sign up and use the Service, Order Local is the data controller.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">2. Information We Collect</h2>

	<h3 class="mt-6 text-lg font-semibold text-foreground">From Vendors</h3>
	<ul class="mt-4 ml-6 list-disc space-y-2 text-foreground">
		<li>
			<strong>Account information:</strong> name, email address, business name, business address,
			phone number, and password (stored as a one-way hash).
		</li>
		<li>
			<strong>Authentication data:</strong> if you sign in with Google, we receive your name, email,
			and profile photo from Google. We do not receive your Google password.
		</li>
		<li>
			<strong>Business details:</strong> your catalog (product names, descriptions, photos, prices),
			pickup locations and windows, brand assets (logo, colors), and similar storefront content
			you upload.
		</li>
		<li>
			<strong>Stripe Connect information:</strong> when you connect your Stripe account, we receive
			identifiers and account status from Stripe so we can route payments to you. We do not store
			your bank account or tax ID numbers — those live with Stripe.
		</li>
		<li>
			<strong>Subscription billing:</strong> if you're on a paid plan, our payment processor
			(Stripe) handles your payment method. We store your subscription tier and billing status, not
			your card number.
		</li>
	</ul>

	<h3 class="mt-6 text-lg font-semibold text-foreground">From Customers</h3>
	<ul class="mt-4 ml-6 list-disc space-y-2 text-foreground">
		<li>
			<strong>Order information:</strong> name, email address, phone number, items ordered,
			modifier selections, pickup window, order notes, and order total.
		</li>
		<li>
			<strong>Payment information:</strong> payment is processed by Stripe directly. We receive a
			tokenized reference and the last four digits of the card, never the full card number.
		</li>
		<li>
			<strong>Communications:</strong> if you reply to an order confirmation email or SMS, we receive
			your reply.
		</li>
	</ul>

	<h3 class="mt-6 text-lg font-semibold text-foreground">Automatically</h3>
	<ul class="mt-4 ml-6 list-disc space-y-2 text-foreground">
		<li>
			<strong>Device and usage data:</strong> IP address, browser type, operating system, referring
			URL, pages viewed, and timestamps.
		</li>
		<li>
			<strong>Cookies and similar technologies:</strong> see Section 8 below.
		</li>
	</ul>

	<h2 class="mt-10 text-xl font-semibold text-foreground">3. How We Use Information</h2>
	<p class="mt-4 text-foreground">We use information to:</p>
	<ul class="mt-4 ml-6 list-disc space-y-2 text-foreground">
		<li>operate and improve the Service;</li>
		<li>
			process and fulfill orders, including sending order confirmations, pickup reminders, and
			status updates;
		</li>
		<li>process subscription payments and Vendor payouts via Stripe;</li>
		<li>communicate with you about your account, including security and policy updates;</li>
		<li>provide customer support;</li>
		<li>monitor for fraud, abuse, and violations of our Terms of Service;</li>
		<li>comply with legal obligations.</li>
	</ul>

	<h2 class="mt-10 text-xl font-semibold text-foreground">4. Legal Bases for Processing</h2>
	<p class="mt-4 text-foreground">
		For Customers and Vendors located in jurisdictions that require a legal basis for processing
		personal data (such as the European Economic Area and the United Kingdom), we rely on the
		following bases:
	</p>
	<ul class="mt-4 ml-6 list-disc space-y-2 text-foreground">
		<li>
			<strong>Contract:</strong> processing necessary to provide the Service you've requested.
		</li>
		<li>
			<strong>Legitimate interests:</strong> operating, improving, and securing the Service.
		</li>
		<li><strong>Consent:</strong> for optional marketing communications (where applicable).</li>
		<li><strong>Legal obligation:</strong> complying with applicable laws.</li>
	</ul>

	<h2 class="mt-10 text-xl font-semibold text-foreground">5. How We Share Information</h2>
	<p class="mt-4 text-foreground">
		We share information only as described below. We do not sell personal information.
	</p>

	<h3 class="mt-6 text-lg font-semibold text-foreground">With Vendors</h3>
	<p class="mt-4 text-foreground">
		When a Customer places an order, we share the order details with the Vendor whose storefront
		the Customer ordered from. The Vendor is responsible for handling that information in
		accordance with the Vendor's own privacy practices and applicable law.
	</p>

	<h3 class="mt-6 text-lg font-semibold text-foreground">With Service Providers (Sub-Processors)</h3>
	<p class="mt-4 text-foreground">
		We use the following service providers to operate the Service. Each is contractually required
		to protect information consistent with this Policy and applicable law:
	</p>
	<ul class="mt-4 ml-6 list-disc space-y-2 text-foreground">
		<li><strong>Stripe</strong> — payment processing and Vendor payouts.</li>
		<li><strong>Vercel</strong> — application hosting.</li>
		<li><strong>Resend</strong> — transactional email delivery.</li>
		<li><strong>Twilio</strong> — SMS delivery for order notifications.</li>
		<li><strong>Cloudflare R2</strong> — image and file storage.</li>
		<li><strong>Neon</strong> — database hosting.</li>
		<li><strong>Google</strong> — Google Sign-In authentication, when used.</li>
	</ul>
	<p class="mt-4 text-foreground">
		This list may change as we add or replace providers.
		<!-- TODO(legal): consider whether to commit to a notification mechanism for new sub-processors. -->
	</p>

	<h3 class="mt-6 text-lg font-semibold text-foreground">For Legal Reasons</h3>
	<p class="mt-4 text-foreground">
		We may disclose information if required by law, subpoena, or other legal process, or if we
		believe in good faith that disclosure is necessary to protect rights, property, or safety.
	</p>

	<h3 class="mt-6 text-lg font-semibold text-foreground">In a Business Transaction</h3>
	<p class="mt-4 text-foreground">
		If Order Local is involved in a merger, acquisition, or sale of assets, information may be
		transferred as part of that transaction. We will notify Vendors of any change in ownership or
		control of personal information.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">6. Data Retention</h2>
	<p class="mt-4 text-foreground">
		We retain Vendor account information for as long as the account is active and for a
		reasonable period after closure for record-keeping, legal compliance, and dispute resolution.
		We retain Customer order information for as long as the associated Vendor account is active.
		Backups may persist for a short period after deletion.
	</p>
	<p class="mt-4 text-foreground">
		Vendors can request deletion of inactive Customer records at any time by contacting us.
		<!-- TODO(legal): define specific retention windows after lawyer review. -->
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">7. Your Rights and Choices</h2>
	<p class="mt-4 text-foreground">
		Depending on where you live, you may have rights regarding your personal information,
		including:
	</p>
	<ul class="mt-4 ml-6 list-disc space-y-2 text-foreground">
		<li><strong>Access</strong> a copy of the information we hold about you.</li>
		<li><strong>Correct</strong> inaccurate information.</li>
		<li><strong>Delete</strong> information, subject to legal retention requirements.</li>
		<li><strong>Port</strong> your data to another service.</li>
		<li>
			<strong>Object</strong> to certain processing or <strong>withdraw consent</strong>.
		</li>
		<li><strong>Opt out</strong> of certain marketing communications.</li>
	</ul>
	<p class="mt-4 text-foreground">
		To exercise these rights, email us at
		<a href="mailto:hello@getorderlocal.com" class="text-primary underline"
			>hello@getorderlocal.com</a
		>. For information you provided to a Vendor's storefront, please contact the Vendor directly;
		we will assist the Vendor in fulfilling valid requests.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">8. Cookies and Tracking</h2>
	<p class="mt-4 text-foreground">
		We use cookies and similar technologies to keep you signed in, remember your preferences, and
		understand how the Service is used. You can control cookies through your browser settings;
		blocking some cookies may affect Service functionality.
	</p>
	<p class="mt-4 text-foreground">
		We currently use essential cookies for authentication and session management, and limited
		analytics cookies to understand aggregate usage patterns. We do not use third-party
		advertising cookies.
		<!-- TODO(legal): update if analytics or ad cookies are added. -->
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">9. Security</h2>
	<p class="mt-4 text-foreground">
		We use commercially reasonable technical and organizational measures to protect information,
		including encryption in transit (TLS), encryption at rest for sensitive fields, hashed
		passwords, and access controls. No system is perfectly secure; we cannot guarantee the
		security of information transmitted to or stored on the Service.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">10. Children's Privacy</h2>
	<p class="mt-4 text-foreground">
		The Service is not directed to children under 13, and we do not knowingly collect personal
		information from children under 13. If we learn we have collected such information, we will
		delete it. If you believe a child has provided us information, please contact us.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">11. International Data Transfers</h2>
	<p class="mt-4 text-foreground">
		Order Local is based in the United States. If you access the Service from outside the United
		States, your information may be transferred to, stored, and processed in the United States.
		By using the Service, you consent to such transfer.
		<!-- TODO(legal): if you onboard EU/UK customers, add SCCs / UK addendum details. -->
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">12. Changes to This Policy</h2>
	<p class="mt-4 text-foreground">
		We may update this Policy from time to time. If we make material changes, we will notify
		Vendors by email and update the Effective Date at the top of this page. Continued use of the
		Service after a change indicates acceptance of the updated Policy.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">13. Contact Us</h2>
	<p class="mt-4 text-foreground">
		If you have questions about this Policy or our privacy practices, contact us at
		<a href="mailto:hello@getorderlocal.com" class="text-primary underline"
			>hello@getorderlocal.com</a
		> or write to us at [COMPANY_ADDRESS].
	</p>
</main>

<footer class="border-t px-6 py-8">
	<div class="mx-auto flex max-w-2xl items-center justify-between gap-4">
		<a href={resolve('/')} class="text-sm font-bold tracking-tight text-foreground">
			Order<span class="text-primary">Local</span>
		</a>
		<p class="text-xs text-muted-foreground">
			© {new Date().getFullYear()} Order Local. All rights reserved.
		</p>
	</div>
</footer>
