export interface SkeletonRowProps {
  readonly landscape?: boolean;
  readonly count?: number;
}

export function SkeletonRow({ landscape = false, count = 8 }: SkeletonRowProps): React.JSX.Element {
  return (
    <section className="row">
      <div className="row-head">
        <div className="sk sk-title" />
      </div>
      <div className="row-scroll scrollbar-none">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={landscape ? 'sk-ccard' : 'sk-pcard'}
            style={{ animationDelay: `${String(index * 70)}ms` }}
          >
            <div className="sk sk-thumb" />
            <div className="sk sk-line" />
            <div className="sk sk-line sk-short" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function SkeletonHero(): React.JSX.Element {
  return (
    <div className="hero hero-sk">
      <div className="sk hero-sk-bg" />
      <div className="hero-content">
        <div className="sk sk-line" style={{ width: 120, height: 24, borderRadius: 99 }} />
        <div
          className="sk"
          style={{ width: 'min(540px,46vw)', height: 64, borderRadius: 12, marginTop: 18 }}
        />
        <div className="sk sk-line" style={{ width: 'min(420px,38vw)', marginTop: 18 }} />
        <div className="sk sk-line" style={{ width: 'min(380px,32vw)' }} />
        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <div className="sk" style={{ width: 170, height: 48, borderRadius: 12 }} />
          <div className="sk" style={{ width: 48, height: 48, borderRadius: 12 }} />
        </div>
      </div>
    </div>
  );
}
