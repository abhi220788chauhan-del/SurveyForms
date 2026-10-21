import { Link } from 'react-router-dom';

const CARDS = [
  {
    to: '/customer',
    emoji: '🛒',
    title: "I'm a Customer",
    text: 'Share how you buy vegetables and what would make it better for your family.',
    cta: 'Take the customer survey',
  },
  {
    to: '/partner',
    emoji: '🌾',
    title: "I'm a Partner",
    text: 'Farmer, mandi trader, vendor or delivery partner - tell us about your work and what you need.',
    cta: 'Take the partner survey',
  },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <img src="/assets/sahi-sahi-logo.png" alt="Sahi-Sahi" className="hero-logo" />
        <h1>
          Freshness You Can See.
          <br />
          Quality You Can Trust.
        </h1>
        <p className="lead">Bringing fresh market produce closer to your everyday kitchen.</p>
      </section>

      <section className="about" aria-labelledby="about-heading">
        <p className="eyebrow">About Sahi-Sahi</p>
        <h2 id="about-heading" className="about-title">
          Taazgi.<br />
          Bharosa.<br />
          <span>Sahi.</span>
        </h2>
        <p>
          In today's fast-paced world, time is one of our most valuable resources. We asked a simple question — why should families spend precious hours searching for fresh vegetables when technology can bring freshness, quality, and value directly to their doorstep?
        </p>
        <p className="about-statement">That question gave birth to SAHI-SAHI.</p>
      </section>

      <section className="cards" aria-label="Choose your survey">
        {CARDS.map((c) => (
          <Link key={c.to} to={c.to} className="card">
            <span className="card-emoji" aria-hidden="true">{c.emoji}</span>
            <h2>{c.title}</h2>
            <p>{c.text}</p>
            <span className="card-cta">{c.cta} →</span>
          </Link>
        ))}
      </section>
    </>
  );
}
