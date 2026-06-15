type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="max-w-3xl">
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-coral">{eyebrow}</p>
      <h2 className="font-display text-3xl font-semibold text-ivory sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-beige">{description}</p>
    </div>
  );
}
