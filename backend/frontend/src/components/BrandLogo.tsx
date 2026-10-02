import logo from "@/images/logo.png";

export function BrandLogo({ className = "h-10 w-10" }: { className?: string }) {
  return <img src={logo} alt="Bulan SeniorCare logo" className={`rounded-full object-cover ${className}`} />;
}