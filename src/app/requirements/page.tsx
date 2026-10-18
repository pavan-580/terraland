import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, MapPin, Eye } from "lucide-react";
import { BackButton } from "@/components/back-button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BuyerRequirementForm } from "@/components/buyer-requirement-form";

export const metadata: Metadata = {
  title: "Register Plot Requirement in Miyapur, Hyderabad",
  description: "Looking for a residential plot in Miyapur, Bachupally, or Ameenpur? Tell us your budget and size requirements. Direct verified matching with genuine landowners.",
};

export default function RequirementsPage() {
  return (
    <>
      <SiteHeader />
      <main className="requirements-page">
        <div className="requirements-container">
          <div className="requirements-sidebar">
            <BackButton className="back-link" fallbackHref="/" label="Back to home" />

            <span className="eyebrow">BUYER ACQUISITION ADVISORY</span>
            <h1>Find your residential plot in Miyapur, Hyderabad.</h1>
            <p>
              Finding genuine residential land without fake listings, unverified middle agents, or distorted prices is tough.
              NILAY connects serious plot buyers directly with verified sellers.
            </p>

            <div className="service-promises">
              <div className="promise-item">
                <div className="promise-icon">
                  <Shield size={18} />
                </div>
                <div>
                  <h4>100% Genuine Landowners</h4>
                  <p>Every listed or matched plot is verified with actual owners and physical site inspections.</p>
                </div>
              </div>

              <div className="promise-item">
                <div className="promise-icon">
                  <MapPin size={18} />
                </div>
                <div>
                  <h4>Hyperlocal Miyapur Focus</h4>
                  <p>In-depth ground knowledge of Miyapur, Bachupally, Ameenpur, Nizampet, and Chandanagar layout developments.</p>
                </div>
              </div>

              <div className="promise-item">
                <div className="promise-icon">
                  <Eye size={18} />
                </div>
                <div>
                  <h4>Assisted Site Visits &amp; Due Diligence</h4>
                  <p>We coordinate physical site visits, provide exact pinpoints, and share document status transparently.</p>
                </div>
              </div>
            </div>

            <div className="corridor-tags">
              <span className="tag-label">Active Corridors:</span>
              <span className="corridor-pill">Miyapur</span>
              <span className="corridor-pill">Bachupally</span>
              <span className="corridor-pill">Ameenpur</span>
              <span className="corridor-pill">Chandanagar</span>
              <span className="corridor-pill">Nizampet</span>
            </div>
          </div>

          <div className="requirements-form-wrapper">
            <BuyerRequirementForm source="requirements_page" />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

