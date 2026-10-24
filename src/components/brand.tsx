import Image from "next/image";
import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="public-brand">
      <Image
        src="/assets/logos/bantuin-horizontal-primary.svg"
        alt="Bantuin"
        width={176}
        height={56}
        loading="eager"
        unoptimized
      />
    </Link>
  );
}

export function Artwork({
  name,
  width = 640,
  height = 480,
  className,
  eager = false,
}: {
  name: string;
  width?: number;
  height?: number;
  className?: string;
  eager?: boolean;
}) {
  return (
    <Image
      src={`/assets/illustrations/${name}.svg`}
      alt=""
      width={width}
      height={height}
      className={className}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      unoptimized
    />
  );
}
