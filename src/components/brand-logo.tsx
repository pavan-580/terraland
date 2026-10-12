import Image from "next/image";

export function BrandLogo({ placement = "header" }: { placement?: "header" | "footer" }) {
  return (
    <Image
      className={`brand-logo brand-logo-${placement}`}
      src="/nilay-logo.png"
      width={1536}
      height={1024}
      alt="NILAY Real Estate"
      unoptimized
    />
  );
}
