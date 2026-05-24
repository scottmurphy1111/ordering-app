<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Terms of Service — Order Local</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-6 py-16">
	<!-- TODO(copy): confirm with legal team before publishing -->
	<h1 class="text-3xl font-bold text-foreground">Terms of Service</h1>
	<p class="mt-2 text-sm text-muted-foreground">Effective [EFFECTIVE_DATE]</p>

	<p class="mt-6 text-foreground">
		These Terms of Service ("Terms") are a legal agreement between you and [COMPANY_NAME] ("Order
		Local," "we," "us," or "our") and govern your use of our website, our pre-order and pickup
		platform, and related services (collectively, the "Service"). By creating an account or using
		the Service, you agree to these Terms. If you do not agree, do not use the Service.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">1. Definitions</h2>
	<ul class="mt-4 ml-6 list-disc space-y-2 text-foreground">
		<li>
			<strong>"Vendor"</strong> means a business or individual who uses the Service to sell pre-orders
			for pickup.
		</li>
		<li>
			<strong>"Customer"</strong> means a person who places an order through a Vendor's storefront on
			the Service.
		</li>
		<li>
			<strong>"Vendor Content"</strong> means catalog items, descriptions, photos, brand assets, and other
			content that a Vendor uploads to the Service.
		</li>
		<li>
			<strong>"Order"</strong> means a transaction placed by a Customer through a Vendor's storefront.
		</li>
	</ul>

	<h2 class="mt-10 text-xl font-semibold text-foreground">2. The Service</h2>
	<p class="mt-4 text-foreground">
		Order Local provides software that allows Vendors to create a branded online storefront, accept
		pre-orders, manage pickup windows, and receive payments through Stripe.
	</p>
	<p class="mt-4 text-foreground">
		<strong>We are not a party to transactions between Vendors and Customers.</strong>
		Vendors sell directly to Customers. Order Local provides the technology platform. Vendors are responsible
		for their products, fulfillment, customer service, taxes, and compliance with applicable laws and
		regulations.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">3. Eligibility and Accounts</h2>
	<p class="mt-4 text-foreground">
		You must be at least 18 years old and able to enter into a binding contract to use the Service.
		By creating an account, you represent that you meet these requirements.
	</p>
	<p class="mt-4 text-foreground">
		You are responsible for maintaining the confidentiality of your login credentials and for all
		activity under your account. Notify us immediately if you suspect unauthorized access.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">4. Vendor Responsibilities</h2>
	<p class="mt-4 text-foreground">As a Vendor using the Service, you agree to:</p>
	<ul class="mt-4 ml-6 list-disc space-y-2 text-foreground">
		<li>provide accurate information about your business and your products;</li>
		<li>fulfill orders as represented in your catalog and within the pickup windows you set;</li>
		<li>
			comply with all applicable laws, including food safety, labeling, licensing, tax, and consumer
			protection laws;
		</li>
		<li>collect and remit any applicable sales tax, excise tax, or other taxes on your sales;</li>
		<li>handle Customer personal information in accordance with applicable privacy laws;</li>
		<li>resolve disputes with your Customers directly and in good faith;</li>
		<li>
			not list or sell items that are illegal, unsafe, infringing, or prohibited by Section 8 below.
		</li>
	</ul>
	<p class="mt-4 text-foreground">
		Order Local is not responsible for the quality, safety, legality, or fulfillment of Vendor
		products.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">5. Payments, Fees, and Refunds</h2>

	<h3 class="mt-6 text-lg font-semibold text-foreground">Customer Payments</h3>
	<p class="mt-4 text-foreground">
		Customers pay for orders through Stripe. Funds are routed directly from the Customer to the
		Vendor's connected Stripe account on Stripe's normal payout schedule. Order Local does not hold
		or escrow Customer funds.
	</p>

	<h3 class="mt-6 text-lg font-semibold text-foreground">Stripe Processing Fees</h3>
	<p class="mt-4 text-foreground">
		Stripe charges its standard payment processing fees (currently 2.9% + $0.30 per successful card
		charge in the United States; rates may vary). These fees are paid by the Vendor and are deducted
		from each transaction by Stripe.
	</p>

	<h3 class="mt-6 text-lg font-semibold text-foreground">Subscription Fees</h3>
	<p class="mt-4 text-foreground">
		Vendors on paid plans (such as Market or Pro) are billed on a recurring basis at the rate shown
		at the time of subscription. We may change subscription prices at any time; we will provide
		reasonable advance notice for material changes affecting active subscriptions. Founding-rate
		offers, where granted, will remain at the rate stated in writing at the time of offer for as
		long as the subscription remains active and in good standing.
	</p>
	<p class="mt-4 text-foreground">
		Subscriptions renew automatically until canceled. You can cancel at any time from your account
		settings; cancellation takes effect at the end of the current billing period. We do not provide
		refunds for partial billing periods unless required by law.
	</p>

	<h3 class="mt-6 text-lg font-semibold text-foreground">Refunds, Chargebacks, and Disputes</h3>
	<p class="mt-4 text-foreground">
		Refunds to Customers are the Vendor's responsibility and are processed through the Vendor's
		Stripe account. Chargebacks initiated by Customers are handled per Stripe's chargeback process;
		chargeback fees and amounts are the Vendor's responsibility. We may suspend or terminate
		accounts with excessive chargeback activity.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">6. Customer Terms</h2>
	<p class="mt-4 text-foreground">
		When you place an order on a Vendor's storefront, you are entering into a transaction with the
		Vendor, not with Order Local. The Vendor is responsible for the products listed, for
		fulfillment, and for any refunds. Disputes about products or fulfillment should be directed to
		the Vendor first.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">7. Vendor Content and License</h2>
	<p class="mt-4 text-foreground">
		You retain all rights to Vendor Content you upload. By uploading Vendor Content, you grant Order
		Local a non-exclusive, worldwide, royalty-free license to host, display, reproduce, and
		distribute that content for the limited purpose of operating the Service on your behalf.
	</p>
	<p class="mt-4 text-foreground">
		You represent and warrant that you own or have the necessary rights to your Vendor Content and
		that it does not infringe any third party's rights.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">8. Acceptable Use</h2>
	<p class="mt-4 text-foreground">You agree not to use the Service to:</p>
	<ul class="mt-4 ml-6 list-disc space-y-2 text-foreground">
		<li>sell items that are illegal where the Vendor or Customer is located;</li>
		<li>
			sell firearms, ammunition, controlled substances, prescription drugs, or items requiring
			special licensing the Vendor does not hold;
		</li>
		<li>sell items that are unsafe, fraudulent, or misrepresented;</li>
		<li>infringe any third party's intellectual property, privacy, or other rights;</li>
		<li>harass, threaten, or defraud other users;</li>
		<li>
			attempt to circumvent security or access controls, scrape the Service, or interfere with its
			operation;
		</li>
		<li>send spam or unauthorized commercial communications through the Service;</li>
		<li>impersonate another person or entity.</li>
	</ul>
	<p class="mt-4 text-foreground">
		We may suspend or terminate accounts that violate this section.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">9. Intellectual Property</h2>
	<p class="mt-4 text-foreground">
		The Service, including its software, design, and branding, is owned by Order Local and protected
		by intellectual property laws. We grant you a limited, non-exclusive, non-transferable license
		to use the Service in accordance with these Terms. You may not copy, modify, distribute, reverse
		engineer, or create derivative works of the Service except as expressly permitted.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">10. Termination</h2>
	<p class="mt-4 text-foreground">
		You may close your account at any time. We may suspend or terminate your account or access to
		the Service if we believe you have violated these Terms, if your use poses a risk to us or to
		others, or as required by law. Upon termination, the rights granted to you under these Terms
		cease, but provisions that by their nature should survive (including ownership, disclaimers,
		liability limitations, and dispute resolution) will survive.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">11. Disclaimers</h2>
	<p class="mt-4 text-foreground">
		<strong>
			THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER
			EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
			AND NON-INFRINGEMENT.
		</strong>
		We do not warrant that the Service will be uninterrupted, error-free, or secure, or that defects will
		be corrected. We are not responsible for the products, conduct, or content of Vendors or Customers.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">12. Limitation of Liability</h2>
	<p class="mt-4 text-foreground">
		<strong>
			TO THE FULLEST EXTENT PERMITTED BY LAW, ORDER LOCAL AND ITS AFFILIATES, OFFICERS, EMPLOYEES,
			AND AGENTS WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
			PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL ARISING FROM YOUR USE OF
			THE SERVICE.
		</strong>
	</p>
	<p class="mt-4 text-foreground">
		<strong>
			OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A)
			THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM, OR
			(B) ONE HUNDRED U.S. DOLLARS ($100).
		</strong> Some jurisdictions do not allow the exclusion or limitation of certain damages, so these
		limitations may not apply to you.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">13. Indemnification</h2>
	<p class="mt-4 text-foreground">
		You agree to indemnify, defend, and hold harmless Order Local and its affiliates from any
		claims, damages, losses, liabilities, and expenses (including reasonable attorneys' fees)
		arising from your use of the Service, your Vendor Content, your products and fulfillment, your
		interactions with Customers, or your violation of these Terms or applicable law.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">14. Governing Law and Disputes</h2>
	<p class="mt-4 text-foreground">
		These Terms are governed by the laws of the State of [STATE], United States, without regard to
		its conflict-of-laws rules. Any dispute arising from these Terms or the Service will be brought
		exclusively in the state or federal courts located in [STATE], and you consent to the personal
		jurisdiction of those courts.
		<!-- TODO(legal): consider an arbitration / class-action waiver clause and a 30-day cure period. Discuss with lawyer. -->
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">15. Changes to These Terms</h2>
	<p class="mt-4 text-foreground">
		We may update these Terms from time to time. If we make material changes, we will notify Vendors
		by email and update the Effective Date at the top of this page. Continued use of the Service
		after a change indicates acceptance of the updated Terms.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">16. Miscellaneous</h2>
	<p class="mt-4 text-foreground">
		These Terms, together with our Privacy Policy, constitute the entire agreement between you and
		Order Local with respect to the Service. If any provision is held unenforceable, the remaining
		provisions will remain in full effect. Our failure to enforce a right or provision is not a
		waiver of that right or provision. You may not assign these Terms without our prior written
		consent.
	</p>

	<h2 class="mt-10 text-xl font-semibold text-foreground">17. Contact Us</h2>
	<p class="mt-4 text-foreground">
		Questions about these Terms? Email
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
