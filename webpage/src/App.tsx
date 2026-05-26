import { useState } from 'react';
import type { ReactElement } from 'react';

type Language = 'no' | 'en';

type Card = {
  title: string;
  text: string;
  icon?: IconName;
};

type IconName =
  | 'rhythm'
  | 'heart'
  | 'shield'
  | 'neural'
  | 'spark'
  | 'eye'
  | 'person'
  | 'cube'
  | 'wave'
  | 'bulb'
  | 'cycle'
  | 'check'
  | 'lines'
  | 'sliders'
  | 'layers';

const content = {
  no: {
    navLabel: 'Hovednavigasjon',
    nav: {
      experience: 'Opplevelse',
      niva: 'NIVA',
      design: 'Design',
      trust: 'Tillit',
      contact: 'Kontakt',
      demo: 'Be om demo',
    },
    hero: {
      eyebrow: 'For ditt hjem',
      title: 'Lynell',
      lead: 'Et roligere grensesnitt mot et mer intelligent hjem. Lynell samler komfort, lys, klima, solskjerming, media og energi i én gjennomført opplevelse – bygget for boliger der teknologi skal føles naturlig.',
      primaryCta: 'Kontakt / Be om demo',
      secondaryCta: 'Oppdag visjonen',
    },
    experience: {
      eyebrow: 'Opplevelsen',
      title: 'Et hjem som forstår mer, men forstyrrer mindre.',
      text: 'Lynell handler ikke om flere apper, flere menyer eller mer teknologi i hverdagen. Det handler om å samle hjemmets viktigste funksjoner i et rolig, visuelt og forståelig system – der komfort, stemning og kontroll oppleves som én helhet.',
      cards: [
        {
          title: 'Roligere hverdag',
          text: 'Lys, temperatur, solskjerming og media kan følge rytmen i hjemmet uten at alt må justeres manuelt.',
          icon: 'rhythm',
        },
        {
          title: 'Premium komfort',
          text: 'Rommene kan oppleves mer balanserte, lune og presise – med mindre støy fra teknologi.',
          icon: 'heart',
        },
        {
          title: 'Kontroll med tillit',
          text: 'Brukeren skal forstå hva systemet gjør, hvorfor det skjer og når noe krever oppmerksomhet.',
          icon: 'shield',
        },
      ],
    },
    niva: {
      eyebrow: 'NIVA',
      title: 'NIVA – intelligensen som gjør hjemmet forståelig.',
      subtitle: 'Neural Intelligent Visual Assistant',
      text: 'NIVA er Lynells assistentlag. Den skal hjelpe hjemmet med å observere, forstå og forklare – slik at brukeren får bedre oversikt uten å måtte bli tekniker.',
      nameParts: [
        {
          title: 'Neural',
          text: 'Lærer rytmer og mønstre over tid.',
          icon: 'neural',
        },
        {
          title: 'Intelligent',
          text: 'Ser sammenhenger mellom komfort, energi, rom og bruk.',
          icon: 'spark',
        },
        {
          title: 'Visual',
          text: 'Gjør informasjon rolig, tydelig og visuelt forståelig.',
          icon: 'eye',
        },
        {
          title: 'Assistant',
          text: 'Foreslår og forklarer, men lar mennesket beholde kontrollen.',
          icon: 'person',
        },
      ],
      capabilitiesTitle: 'Retningen vi bygger mot',
      capabilities: [
        {
          title: 'Forstår rommene',
          text: 'Leser stemning, komfort og status på tvers av boligens viktigste soner.',
          icon: 'cube',
        },
        {
          title: 'Forklarer avvik',
          text: 'Gjør det enklere å se hvorfor et rom oppleves varmt, mørkt, kaldt eller urolig.',
          icon: 'wave',
        },
        {
          title: 'Foreslår forbedringer',
          text: 'Gir rolige anbefalinger som kan bedre komfort, energibruk eller opplevelse.',
          icon: 'bulb',
        },
        {
          title: 'Holder mennesket i kontroll',
          text: 'Skiller mellom informasjon, forslag og handling, slik at beslutningen forblir tydelig.',
          icon: 'person',
        },
        {
          title: 'Lærer av rytmen i hjemmet',
          text: 'Retningen er et hjem som gradvis forstår vaner, døgnrytme og ønsket komfort.',
          icon: 'cycle',
        },
        {
          title: 'Gjør kompleks teknologi enkel',
          text: 'Oversetter avanserte systemer til et grensesnitt som føles rolig og forståelig.',
          icon: 'check',
        },
      ],
      cardLabel: 'NIVA',
      quote: '“Stuen varmes raskere enn forventet. Soltilskudd er sannsynlig, og vestvendt solskjerming er fortsatt åpen.”',
      tags: ['92% sikkerhet', 'høy tillit', 'forslag – ikke handling'],
    },
    design: {
      eyebrow: 'Design',
      title: 'Teknologi som føles arkitektonisk, ikke pålimt.',
      text: 'Lynell skal oppleves som en del av boligen – ikke som en teknisk installasjon du må forholde deg til. Grensesnittet skal være rolig, presist og vakkert nok til å høre hjemme i premiumboliger, samtidig som det gir reell kontroll under overflaten.',
      cards: [
        {
          title: 'Rolig visuelt språk',
          text: 'Mørke flater, nordisk lys og presise signaler gir et uttrykk som kan leve i boligen over tid.',
          icon: 'eye',
        },
        {
          title: 'Færre valg når du ikke trenger dem',
          text: 'Systemet skal løfte frem det som er relevant i øyeblikket, ikke tvinge brukeren inn i menyer.',
          icon: 'lines',
        },
        {
          title: 'Dypere kontroll når du faktisk vil ha det',
          text: 'For de som vil forstå mer, skal detaljer, historikk og forklaringer være tilgjengelige uten å dominere.',
          icon: 'sliders',
        },
      ],
    },
    trust: {
      eyebrow: 'Tillit',
      title: 'Kontroll uten kompleksitet.',
      text: 'Lynell skal gjøre det enklere å forstå, bruke og drifte hjemmet. Systemet skal samle funksjoner som ofte oppleves fragmenterte – og presentere dem rolig, tydelig og forståelig.',
      items: [
        { title: 'Enklere drift', text: 'Hjemmets viktigste funksjoner samles i ett tydelig grensesnitt.', icon: 'layers' },
        { title: 'Forklarbar intelligens', text: 'Du får vite hvorfor noe skjer, ikke bare at det skjer.', icon: 'check' },
        { title: 'Trygg kontroll', text: 'Forslag og handlinger skal være forståelige og mulige å overstyre.', icon: 'shield' },
        { title: 'Mindre fragmentering', text: 'Færre separate systemer, menyer og signaler å forholde seg til.', icon: 'lines' },
      ],
    },
    technicalFoundation: {
      eyebrow: 'Fundament',
      title: 'Bygget på et seriøst teknisk fundament.',
      text: 'Bak den enkle opplevelsen ligger en retning for lokal styring, robuste integrasjoner og profesjonell romkontroll. Den tekniske delen av Lynell presenteres på en egen side for integratorer, rådgivere og tekniske miljøer.',
      cta: 'Se teknisk fundament',
    },
    contact: {
      eyebrow: 'Kontakt',
      title: 'Nysgjerrig på Lynell?',
      text: 'Lynell er under utvikling for hjem, byggherrer og tekniske miljøer som ønsker et roligere, mer helhetlig og mer intelligent grensesnitt mot hjemmets viktigste funksjoner.',
      cta: 'Kontakt / Be om demo',
    },
  },
  en: {
    navLabel: 'Main navigation',
    nav: {
      experience: 'Experience',
      niva: 'NIVA',
      design: 'Design',
      trust: 'Trust',
      contact: 'Contact',
      demo: 'Request demo',
    },
    hero: {
      eyebrow: 'For your home',
      title: 'Lynell',
      lead: 'A calmer interface for a more intelligent home. Lynell brings comfort, lighting, climate, shading, media and energy into one designed experience – built for homes where technology should feel natural.',
      primaryCta: 'Contact / Request demo',
      secondaryCta: 'Discover the vision',
    },
    experience: {
      eyebrow: 'Experience',
      title: 'A home that understands more, and interrupts less.',
      text: 'Lynell is not about more apps, more menus or more technology in everyday life. It is about bringing the home’s most important functions into a calm, visual and understandable system where comfort, atmosphere and control feel like one whole.',
      cards: [
        {
          title: 'A calmer everyday',
          text: 'Light, temperature, shading and media can follow the rhythm of the home without everything being adjusted manually.',
          icon: 'rhythm',
        },
        {
          title: 'Premium comfort',
          text: 'Rooms can feel more balanced, warm and precise, with less noise from technology.',
          icon: 'heart',
        },
        {
          title: 'Control with trust',
          text: 'The user should understand what the system is doing, why it is happening and when something needs attention.',
          icon: 'shield',
        },
      ],
    },
    niva: {
      eyebrow: 'NIVA',
      title: 'NIVA – intelligence that makes the home understandable.',
      subtitle: 'Neural Intelligent Visual Assistant',
      text: 'NIVA is Lynell’s assistant layer. It should help the home observe, understand and explain, giving the user better overview without asking them to become technical.',
      nameParts: [
        {
          title: 'Neural',
          text: 'Learns rhythms and patterns over time.',
          icon: 'neural',
        },
        {
          title: 'Intelligent',
          text: 'Sees relationships between comfort, energy, rooms and use.',
          icon: 'spark',
        },
        {
          title: 'Visual',
          text: 'Makes information calm, clear and visually understandable.',
          icon: 'eye',
        },
        {
          title: 'Assistant',
          text: 'Suggests and explains while keeping the human in control.',
          icon: 'person',
        },
      ],
      capabilitiesTitle: 'The direction we are building toward',
      capabilities: [
        {
          title: 'Understands rooms',
          text: 'Reads atmosphere, comfort and status across the home’s most important zones.',
          icon: 'cube',
        },
        {
          title: 'Explains deviations',
          text: 'Makes it easier to see why a room feels warm, dark, cold or unsettled.',
          icon: 'wave',
        },
        {
          title: 'Suggests improvements',
          text: 'Gives calm recommendations that can improve comfort, energy use or experience.',
          icon: 'bulb',
        },
        {
          title: 'Keeps people in control',
          text: 'Separates information, suggestion and action so the decision remains clear.',
          icon: 'person',
        },
        {
          title: 'Learns the rhythm of the home',
          text: 'The direction is a home that gradually understands habits, daily rhythm and desired comfort.',
          icon: 'cycle',
        },
        {
          title: 'Makes complex technology simple',
          text: 'Translates advanced systems into an interface that feels calm and understandable.',
          icon: 'check',
        },
      ],
      cardLabel: 'NIVA',
      quote: '“The living room is warming faster than expected. Solar gain is likely, and the west-facing shading is still open.”',
      tags: ['92% certainty', 'high trust', 'suggestion – not action'],
    },
    design: {
      eyebrow: 'Design',
      title: 'Technology that feels architectural, not attached.',
      text: 'Lynell should feel like part of the home, not a technical installation you have to manage. The interface should be calm, precise and beautiful enough for premium homes, while still giving real control beneath the surface.',
      cards: [
        {
          title: 'A calm visual language',
          text: 'Dark surfaces, Nordic light and precise signals create an expression that can live in the home over time.',
          icon: 'eye',
        },
        {
          title: 'Fewer choices when you do not need them',
          text: 'The system should surface what matters in the moment instead of forcing the user into menus.',
          icon: 'lines',
        },
        {
          title: 'Deeper control when you want it',
          text: 'For those who want to understand more, details, history and explanations should be available without dominating.',
          icon: 'sliders',
        },
      ],
    },
    trust: {
      eyebrow: 'Trust',
      title: 'Control without complexity.',
      text: 'Lynell should make the home easier to understand, use and operate. The system should bring together functions that often feel fragmented, and present them calmly, clearly and understandably.',
      items: [
        { title: 'Simpler operation', text: 'The home’s most important functions come together in one clear interface.', icon: 'layers' },
        { title: 'Explainable intelligence', text: 'You understand why something happens, not only that it happens.', icon: 'check' },
        { title: 'Safe control', text: 'Suggestions and actions should be understandable and easy to override.', icon: 'shield' },
        { title: 'Less fragmentation', text: 'Fewer separate systems, menus and signals to manage.', icon: 'lines' },
      ],
    },
    technicalFoundation: {
      eyebrow: 'Foundation',
      title: 'Built on a serious technical foundation.',
      text: 'Behind the simple experience is a direction for local control, robust integrations and professional room control. The technical side of Lynell will be presented on a dedicated page for integrators, advisors and technical teams.',
      cta: 'See technical foundation',
    },
    contact: {
      eyebrow: 'Contact',
      title: 'Curious about Lynell?',
      text: 'Lynell is under development for homes, developers and technical environments that want a calmer, more complete and more intelligent interface to the home’s most important functions.',
      cta: 'Contact / Request demo',
    },
  },
} satisfies Record<
  Language,
  {
    navLabel: string;
    nav: Record<string, string>;
    hero: { eyebrow: string; title: string; lead: string; primaryCta: string; secondaryCta: string };
    experience: { eyebrow: string; title: string; text: string; cards: Card[] };
    niva: {
      eyebrow: string;
      title: string;
      subtitle: string;
      text: string;
      nameParts: Card[];
      capabilitiesTitle: string;
      capabilities: Card[];
      cardLabel: string;
      quote: string;
      tags: string[];
    };
    design: { eyebrow: string; title: string; text: string; cards: Card[] };
    trust: { eyebrow: string; title: string; text: string; items: Card[] };
    technicalFoundation: { eyebrow: string; title: string; text: string; cta: string };
    contact: { eyebrow: string; title: string; text: string; cta: string };
  }
>;

function AuroraScene() {
  return (
    <div className="auroraScene" aria-hidden="true">
      <div className="auroraRibbon ribbonOne" />
      <div className="auroraRibbon ribbonTwo" />
      <div className="auroraRibbon ribbonThree" />
      <div className="homeCore">
        <div className="coreRing ringOuter" />
        <div className="coreRing ringMiddle" />
        <div className="coreRing ringInner" />
        <div className="signalGrid">
          {Array.from({ length: 24 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Icon({ name }: { name?: IconName }) {
  if (!name) return null;

  const common = {
    width: 32,
    height: 32,
    viewBox: '0 0 32 32',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    'aria-hidden': true,
  };

  const paths: Record<IconName, ReactElement> = {
    rhythm: (
      <>
        <path d="M7 21c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2" />
        <path d="M7 25c2.2 0 2.2-2 4.4-2s2.2 2 4.4 2 2.2-2 4.4-2 2.2 2 4.4 2" />
        <path d="M16 6v8" />
        <path d="M12.5 10.5 16 6l3.5 4.5" />
      </>
    ),
    heart: <path d="M16 25s-9-5.4-9-12a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6.6-9 12-9 12Z" />,
    shield: (
      <>
        <path d="M16 5 25 8v7.5C25 21.5 20.8 25 16 27c-4.8-2-9-5.5-9-11.5V8l9-3Z" />
        <path d="m12.5 16 2.4 2.4 4.8-5" />
      </>
    ),
    neural: (
      <>
        <path d="M11 8a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4" />
        <path d="M21 8a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4" />
        <path d="M11 8v16M21 8v16M11 13h10M11 19h10" />
      </>
    ),
    spark: (
      <>
        <path d="M16 5v7M16 20v7M5 16h7M20 16h7" />
        <path d="m9 9 3.5 3.5M19.5 19.5 23 23M23 9l-3.5 3.5M12.5 19.5 9 23" />
      </>
    ),
    eye: (
      <>
        <path d="M4.5 16s4-7 11.5-7 11.5 7 11.5 7-4 7-11.5 7S4.5 16 4.5 16Z" />
        <path d="M16 19.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      </>
    ),
    person: (
      <>
        <path d="M16 15a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" />
        <path d="M7 27c.8-5 4-8 9-8s8.2 3 9 8" />
      </>
    ),
    cube: (
      <>
        <path d="m16 5 9 5v12l-9 5-9-5V10l9-5Z" />
        <path d="m7 10 9 5 9-5M16 15v12" />
      </>
    ),
    wave: <path d="M4 17h5l2-7 4 14 3-10 2 3h8" />,
    bulb: (
      <>
        <path d="M11 18a7 7 0 1 1 10 0c-1.4 1.2-2 2.5-2 4h-6c0-1.5-.6-2.8-2-4Z" />
        <path d="M13 26h6M14 22h4" />
      </>
    ),
    cycle: (
      <>
        <path d="M24 10a9 9 0 0 0-15.5-1.5L6 11" />
        <path d="M6 6v5h5" />
        <path d="M8 22a9 9 0 0 0 15.5 1.5L26 21" />
        <path d="M26 26v-5h-5" />
      </>
    ),
    check: (
      <>
        <path d="M16 27a11 11 0 1 0 0-22 11 11 0 0 0 0 22Z" />
        <path d="m11.5 16 3 3 6-6.5" />
      </>
    ),
    lines: (
      <>
        <path d="M8 9h16M8 16h16M8 23h16" />
        <path d="M4 9h.1M4 16h.1M4 23h.1" />
      </>
    ),
    sliders: (
      <>
        <path d="M6 9h20M6 16h20M6 23h20" />
        <path d="M12 6v6M20 13v6M15 20v6" />
      </>
    ),
    layers: (
      <>
        <path d="m16 5 11 6-11 6-11-6 11-6Z" />
        <path d="m5 16 11 6 11-6" />
        <path d="m5 21 11 6 11-6" />
      </>
    ),
  };

  return (
    <svg className="lineIcon" {...common}>
      <g stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </g>
    </svg>
  );
}

export function App() {
  const [language, setLanguage] = useState<Language>('no');
  const page = content[language];

  return (
    <main>
      <section className="hero sectionBand">
        <AuroraScene />
        <nav className="nav" aria-label={page.navLabel}>
          <a className="brand" href="#top" aria-label="Lynell">
            Lynell
          </a>
          <div className="navLinks">
            <a href="#experience">{page.nav.experience}</a>
            <a href="#niva">{page.nav.niva}</a>
            <a href="#design">{page.nav.design}</a>
            <a href="#trust">{page.nav.trust}</a>
            <a href="#contact">{page.nav.contact}</a>
            <div className="languageSwitch" aria-label="Language selector">
              <button
                className={language === 'no' ? 'active' : ''}
                type="button"
                onClick={() => setLanguage('no')}
                aria-pressed={language === 'no'}
              >
                NO
              </button>
              <span>/</span>
              <button
                className={language === 'en' ? 'active' : ''}
                type="button"
                onClick={() => setLanguage('en')}
                aria-pressed={language === 'en'}
              >
                EN
              </button>
            </div>
            <a className="navCta" href="#contact">
              {page.nav.demo}
            </a>
          </div>
        </nav>

        <div className="heroContent" id="top">
          <p className="kicker">{page.hero.eyebrow}</p>
          <h1>{page.hero.title}</h1>
          <p className="heroLead">{page.hero.lead}</p>
          <div className="heroActions">
            <a className="primaryButton" href="#contact">
              {page.hero.primaryCta}
            </a>
            <a className="secondaryButton" href="#experience">
              {page.hero.secondaryCta}
            </a>
          </div>
        </div>
      </section>

      <section className="experience sectionBand" id="experience">
        <div className="sectionInner sectionStack">
          <div className="sectionHeader wide">
            <p className="sectionLabel">{page.experience.eyebrow}</p>
            <h2>{page.experience.title}</h2>
            <p>{page.experience.text}</p>
          </div>
          <div className="cardGrid three">
            {page.experience.cards.map((card) => (
              <article className="featureCard" key={card.title}>
                <Icon name={card.icon} />
                <h3>{card.title}</h3>
                <span>{card.text}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="niva sectionBand" id="niva">
        <div className="sectionInner nivaInner">
          <div className="nivaHero">
            <div className="nivaCopy">
              <p className="sectionLabel">{page.niva.eyebrow}</p>
              <h2>{page.niva.title}</h2>
              <p className="nivaSubtitle">{page.niva.subtitle}</p>
              <p>{page.niva.text}</p>
            </div>
            <div className="nivaPanel">
              <p className="panelPrompt">{page.niva.cardLabel}</p>
              <p>{page.niva.quote}</p>
              <div className="confidenceRow">
                {page.niva.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="nivaNameGrid">
            {page.niva.nameParts.map((part) => (
              <article className="nivaNameCard" key={part.title}>
                <Icon name={part.icon} />
                <h3>{part.title}</h3>
                <p>{part.text}</p>
              </article>
            ))}
          </div>

          <div className="nivaCapabilities">
            <h3>{page.niva.capabilitiesTitle}</h3>
            <div className="nivaCapabilityGrid">
              {page.niva.capabilities.map((capability) => (
                <article className="nivaCapabilityCard" key={capability.title}>
                  <Icon name={capability.icon} />
                  <h4>{capability.title}</h4>
                  <p>{capability.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="design sectionBand" id="design">
        <div className="sectionInner sectionStack">
          <div className="sectionHeader wide">
            <p className="sectionLabel">{page.design.eyebrow}</p>
            <h2>{page.design.title}</h2>
            <p>{page.design.text}</p>
          </div>
          <div className="cardGrid three">
            {page.design.cards.map((card) => (
              <article className="featureCard" key={card.title}>
                <Icon name={card.icon} />
                <h3>{card.title}</h3>
                <span>{card.text}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="trust sectionBand" id="trust">
        <div className="sectionInner trustLayout">
          <div>
            <p className="sectionLabel">{page.trust.eyebrow}</p>
            <h2>{page.trust.title}</h2>
            <p>{page.trust.text}</p>
          </div>
          <div className="trustList">
            {page.trust.items.map((item) => (
              <article className="trustCard" key={item.title}>
                <Icon name={item.icon} />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="technicalFoundation sectionBand" id="technical-foundation">
        <div className="sectionInner roadmapInner">
          <p className="sectionLabel">{page.technicalFoundation.eyebrow}</p>
          <h2>{page.technicalFoundation.title}</h2>
          <p>{page.technicalFoundation.text}</p>
          <a className="secondaryButton technicalButton" href="#technical-foundation">
            {page.technicalFoundation.cta}
          </a>
        </div>
      </section>

      <section className="contact sectionBand" id="contact">
        <div className="sectionInner contactInner">
          <p className="sectionLabel">{page.contact.eyebrow}</p>
          <h2>{page.contact.title}</h2>
          <p>{page.contact.text}</p>
          <a className="primaryButton" href="mailto:post@lynell.no?subject=Demo%20av%20Lynell">
            {page.contact.cta}
          </a>
        </div>
      </section>
    </main>
  );
}
