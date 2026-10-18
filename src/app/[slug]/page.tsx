import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { BackButton } from "@/components/back-button";

const pages: Record<string, { kicker: string; title: string; emphasis: string; intro: string; sections: { title: string; text: string }[] }> = {
  about: {
    kicker: "A MORE THOUGHTFUL LAND MARKETPLACE",
    title: "Land is a big decision.",
    emphasis: "We get that.",
    intro: "NILAY brings land seekers and owners together with more clarity, more useful information, and a little less noise.",
    sections: [
      { title: "Clarity, from the first click.", text: "We make the details buyers need easy to find: where a property is, what kind of land it is, how much it costs, and who is listing it." },
      { title: "People before paperwork.", text: "A land purchase deserves a real conversation. We help buyers and owners connect directly, without getting in the way." },
      { title: "A grounded approach.", text: "Online listings are a starting point, not a substitute for due diligence. We encourage every buyer to check original title, approvals, and local records with a qualified professional." },
    ],
  },
  contact: {
    kicker: "WE'RE HERE TO HELP",
    title: "A real person,",
    emphasis: "one hello away.",
    intro: "Questions about a listing, a property you want to share, or how NILAY works? Message our team on WhatsApp and we will be glad to help.",
    sections: [
      { title: "For listing help.", text: "If you are an owner, you can start a listing in just a few minutes. Sign in first so you can manage your property details." },
      { title: "Good to know.", text: "For legal, title, or survey advice, please consult an independent qualified professional in your area." },
    ],
  },
  faq: {
    kicker: "A FEW GOOD QUESTIONS",
    title: "Clear answers,",
    emphasis: "before you begin.",
    intro: "Buying or selling land can feel like a lot. Here are a few of the things people ask us most often.",
    sections: [
      { title: "Is NILAY a property broker?", text: "NILAY is a marketplace where property owners can publish listings and buyers can enquire directly. We are not a party to the transaction." },
      { title: "Are listings legally verified?", text: "Some seller details may be reviewed, but a listing badge is not legal verification or a guarantee of title. Independently verify all documents and approvals before purchase." },
      { title: "How do I ask about a listing?", text: "Submit the enquiry form on the listing page. Guests provide their name, email, and mobile number; signed-in members can use their account details. NILAY receives those contact details and the listing information." },
      { title: "How do I list my property?", text: "Create a free account, add your property details, and publish your listing. You can contact us if you need a hand." },
      { title: "Is it free to browse?", text: "Yes. You can browse listings without an account. Sign in to save places or publish a property." },
    ],
  },
  guides: {
    kicker: "THE FIELD NOTES",
    title: "A little knowledge",
    emphasis: "goes a long way.",
    intro: "A grounded starting point for conversations about land, paperwork, and the places you might call your own.",
    sections: [
      { title: "Before you buy a plot", text: "Ask for the original title chain, encumbrance certificate, current revenue records, approved layout plan, and proof of access. Ask a local property lawyer to review them." },
      { title: "Know the approvals", text: "HMDA, DTCP, RERA, and local-body approvals cover different things. Check the current status directly with the issuing authority before relying on a seller's description." },
      { title: "Walk the boundaries", text: "Visit in person, compare survey numbers against records, confirm road access and boundaries, and get an independent survey when needed." },
      { title: "Plan for the full cost", text: "Beyond the asking price, account for stamp duty, registration, survey, legal review, and any infrastructure or maintenance charges." },
    ],
  },
  terms: {
    kicker: "THE PRACTICAL DETAILS",
    title: "A few ground",
    emphasis: "rules.",
    intro: "NILAY provides a platform for property owners and prospective buyers to connect. Listings are submitted by third parties, and you are responsible for independently assessing each property and counterparty.",
    sections: [
      { title: "Marketplace role", text: "We are not a real-estate agent, title insurer, legal adviser, or party to any sale. A listing or review badge is not a representation that a property is legally compliant." },
      { title: "Your account", text: "Keep your account credentials private and ensure your listing details are accurate, current, and authorized for publication. The seller name is public. The contact phone is displayed on published listings while the administrator phone-display setting is on." },
      { title: "Use of the service", text: "Do not misrepresent a property, misuse another person's information, or use the service in a way that breaks applicable law." },
    ],
  },
  privacy: {
    kicker: "YOUR INFORMATION",
    title: "Privacy,",
    emphasis: "plainly put.",
    intro: "We use the information needed to run the marketplace: account details, the property details owners submit, and the messages buyers send to sellers.",
    sections: [
      { title: "Account details", text: "We store your name, email address, mobile number, and a securely hashed password to provide account features and protect your sign-in." },
      { title: "Enquiries", text: "You can enquire without signing in. Guests provide a name, email address, and mobile number; signed-in members provide a mobile number if their account does not already have one. We send the contact details, property details, and optional message to the NILAY team at pavansai580@gmail.com." },
      { title: "Contacting NILAY", text: "Use the contact page or send a listing enquiry. Listing enquiries include the details you provide so the NILAY team can follow up." },
      { title: "Listing contact details", text: "The name supplied for a published property listing is public. The phone number is displayed while the administrator phone-display setting is on, so interested people can contact the seller directly. Request listing removal if those details should no longer be public; the listing stays online until an administrator approves the request." },
      { title: "Your choices", text: "You may contact hello@terraland.in with questions about your information or account. Do not submit sensitive identity or financial documents through public listing forms." },
      { title: "Optional page translation", text: "The English, Hindi, and Telugu selector translates supported interface text in your browser. Your language choice is saved in this browser. Seller-entered listing titles and descriptions remain in their original language." },
    ],
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) return { title: "Explore land" };
  const title = `${page.title} ${page.emphasis}`;
  const description = page.intro.replace(/\s+/g, " ").trim().slice(0, 160);
  return {
    title,
    description,
    alternates: { canonical: `/${encodeURIComponent(slug)}` },
    openGraph: { title, description, siteName: "NILAY", locale: "en_IN", type: "website" },
  };
}

export default async function ContentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();
  return <><SiteHeader /><main className="content-page"><div className="content-hero"><BackButton className="back-link" fallbackHref="/" label="Back to home" /><span className="eyebrow">{page.kicker}</span><h1>{page.title}<br /><em>{page.emphasis}</em></h1><p>{page.intro}</p></div><div className="content-sections">{page.sections.map((section, index) => <article key={section.title}><span>0{index + 1}</span><div><h2>{section.title}</h2><p>{section.text}</p></div><Check size={18} /></article>)}</div><div className="content-cta"><div><span className="eyebrow">{slug === "contact" ? "WE'RE ONE MESSAGE AWAY" : "READY WHEN YOU ARE"}</span><h2>{slug === "contact" ? "Need a hand?" : "Let's find your place."}</h2></div><a className="button button-dark" href="https://wa.me/918074399963?text=Hello%20NILAY%2C%20I%20would%20like%20to%20contact%20your%20team." target="_blank" rel="noreferrer">Contact our team <ArrowUpRight size={16} /></a></div></main><SiteFooter /></>;
}
