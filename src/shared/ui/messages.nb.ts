// Every UI string lives here (AD-7, NFR-1). Components import it; the server
// sends codes, never prose. Wording follows EXPERIENCE.md, Key strings.
export const messages = {
  siteName: "JobAssistant",
  skipLink: "Hopp til hovedinnholdet",
  nav: {
    label: "Hovedmeny",
    home: "Hjem",
    application: "Søknad",
    menuOpen: "Meny",
    menuClose: "Lukk",
  },
  errorStrip: "Feil",
  // The Test-mode banner under the app bar (FR-27, UX-DR16).
  testBanner: {
    strip: "Testmodus",
    text: "Testmodus – KI-svarene er forhåndslagret",
    note: "Samsvaret regnes likevel ut av koden.",
  },
  // The AI notice (FR-24, UX-DR17). It names the two companies the text reaches:
  // OpenRouter, and the model's host. With `zdr: true` only Google Vertex and
  // Amazon Bedrock serve the model (docs/qa/ai-provider-terms.md), so the host
  // is Google or Amazon, never Anthropic. Change this text, or the routing it
  // describes, and the version prefix in config.ts must change too.
  aiNotice: {
    title: "Teksten din sendes til en KI-tjeneste",
    // «Ingenting sendes før du godtar» is the promise the server also keeps:
    // runAi refuses without the accepted version.
    body: (provider: string, host: string) =>
      `For å skrive søknadsbrevet sender vi CV-teksten og annonsen til ${provider}, en mellomtjeneste som sender dem videre til ${host}, som kjører KI-modellen. Ingenting er sendt ennå, og ingenting sendes før du godtar.`,
    // Names of the companies, as the Student reads them.
    provider: { openrouter: "OpenRouter" } as Record<string, string>,
    host: "Google (Vertex AI) eller Amazon (Bedrock)",
    // A short form for the list point: «OpenRouter og modellverten».
    hostShort: "modellverten (Google eller Amazon)",
    points: {
      local: "Samsvaret regnes ut her i appen, uten KI.",
      stripped: "E-postadresser og telefonnumre fjernes før teksten sendes.",
      // `when` is `retention(days)`.
      noTraining: (provider: string, hostShort: string, when: string) =>
        `${provider} og ${hostShort} trener ikke på teksten og sletter den ${when}.`,
      sensitive:
        "Ta ikke med sensitive opplysninger som helse eller fødselsnummer.",
      once: "Du blir bare spurt denne ene gangen i denne nettleserøkten.",
    },
    // `null` or 0: no fixed period is set, and the text goes at once because
    // every request asks only for zero-retention endpoints.
    retention: (days: number | null) =>
      days === null || days === 0
        ? "så snart svaret er skrevet"
        : `senest etter ${days} ${days === 1 ? "dag" : "dager"}`,
    accept: "Godta og fortsett",
    cancel: "Avbryt",
  },
  // «612 av 20 000 tegn»: the counter under a long text field.
  counter: (used: string, max: string) => `${used} av ${max} tegn`,
  networkFailure:
    "Fikk ikke kontakt med serveren. Sjekk tilkoblingen og prøv igjen.",
  // «184 kB»: the size shown beside a chosen file.
  fileSize: (kilobytes: string) => `${kilobytes} kB`,
  passwordToggle: { show: "Vis", hide: "Skjul" },
  access: {
    heading: "Tilgangskode",
    body: "Denne nettversjonen av JobAssistant er stengt. Den er bare åpen for utvikleren og sensor. Skriv inn koden for å fortsette.",
    label: "Tilgangskode",
    hint: "Minst 16 tegn. Du blir spurt én gang per nettleserøkt.",
    submit: "Åpne",
    wrong: "Feil tilgangskode.",
    tooShort: "Koden har minst 16 tegn.",
  },
  cv: {
    label: "CV-tekst",
    confirm: "Bekreft CV-teksten",
    confirmed: (count: string) => `CV-tekst bekreftet · ${count} tegn`,
    reopen: "Endre CV-teksten",
    pasteHint: "Lim inn teksten her. Minst 200 tegn.",
    file: {
      choose: "Velg fil",
      chooseAnother: "Velg en annen fil",
      inputName: "Velg fil, PDF eller TXT, maks 2 MB",
      extracting: "Henter ut teksten fra CV-en …",
      scanned:
        "Vi fant ingen tekst i denne PDF-en. Den kan være skannet. Lim inn teksten fra CV-en din i stedet.",
      errors: {
        FILE_TYPE: "Bare PDF- og TXT-filer støttes.",
        FILE_TOO_LARGE: "Filen er for stor.",
      },
    },
    errors: {
      CV_LENGTH: "CV-teksten må være mellom 200 og 20 000 tegn.",
      CV_NOT_CONFIRMED: "Bekreft CV-teksten før du går videre.",
    },
  },
  application: {
    heading: "Ny søknad",
    jobTitle: "Stillingstittel",
    employer: "Arbeidsgiver",
    jobAd: "Stillingsannonse",
    jobAdHint: "Lim inn hele annonseteksten, minst 200 tegn.",
    submit: "Analyser og skriv utkast",
    // Fills the form with the Example pair (FR-27).
    useExample: "Bruk eksempelet",
    exampleFilled: "Eksempelet er fylt inn.",
    // The server judged the ad to hold too few Keywords (FR-4).
    adUnclear:
      "Annonsen er for kort eller uklar til å analyseres. Lim inn hele stillingsannonsen, også kravene.",
    errors: {
      JOB_AD_LENGTH: "Stillingsannonsen må være mellom 200 og 15 000 tegn.",
      JOB_TITLE_REQUIRED: "Fyll inn stillingstittelen.",
      EMPLOYER_REQUIRED: "Fyll inn arbeidsgiveren.",
      TOO_LONG: "Maks 200 tegn.",
    },
  },
  // The phase-1 result on Søknad (FR-7, FR-8). Percent sign with a space and
  // sjevroner for quotes, as in EXPERIENCE.md, Key strings.
  result: {
    editAd: "Endre annonsen",
    credits: { position: "Stilling", date: "Dato", ad: "Annonse" },
    // «14 avsnitt · 7 nøkkelord»
    adSummary: (paragraphs: string, keywords: string) =>
      `${paragraphs} avsnitt · ${keywords} nøkkelord`,
    // «71 % samsvar – 5 av 7 nøkkelord»
    score: (score: number, matched: number, total: number) =>
      `${score} % samsvar – ${matched} av ${total} nøkkelord`,
    verdict: {
      strong: "Sterkt samsvar",
      "needs-work": "Bør forbedres",
    },
    threshold: {
      strong: "70 % eller mer gir «Sterkt samsvar».",
      "needs-work":
        "Under 70 % gir «Bør forbedres». Se hva som mangler nedenfor.",
    },
    formulaLabel: "Formel",
    // «5 av 7 nøkkelord funnet = 71 %»
    formula: (matched: number, total: number, score: number) =>
      `${matched} av ${total} nøkkelord funnet = ${score} %`,
    disclaimer:
      "Et anslag på hvor mange av annonsens nøkkelord CV-en din dekker. Ikke en ekte ATS-vurdering, og ingen spådom om intervjusjanser.",
    // The before-S3 form of the phase-1 line, without the AI sentence.
    live: (score: number, verdict: string, matched: number, total: number) =>
      `Samsvaret er klart: ${score} %, ${verdict.toLowerCase()}, ${matched} av ${total} nøkkelord.`,
    found: {
      heading: "Funnet i CV-en",
      strip: "Funnet",
      // «Bevis · CV-linje 8 · annonsen avsnitt 03»
      source: (line: number, paragraph: string | undefined) =>
        paragraph === undefined
          ? `Bevis · CV-linje ${line}`
          : `Bevis · CV-linje ${line} · annonsen avsnitt ${paragraph}`,
    },
    missing: {
      heading: "Mangler i CV-en",
      strip: "Mangler",
      line: (keyword: string) =>
        `Annonsen ber om «${keyword}». CV-en din viser det ikke ennå.`,
      // «Fra annonsen · avsnitt 08»
      source: (paragraph: string) => `Fra annonsen · avsnitt ${paragraph}`,
    },
  },
  // The pulse plot (FR-8, UX-DR22). The state words are written in capitals
  // because the plot measures them as drawn.
  plot: {
    state: { matched: "FUNNET", missing: "MANGLER" },
    // «14 avsnitt i annonsen tegnet som puls. Funnet i CV-en: A, B. Mangler: C.»
    // Compact: «6 av 14 avsnitt i annonsen …». An empty list has no sentence.
    label: (
      total: number,
      shown: number | undefined,
      matched: readonly string[],
      missing: readonly string[],
    ) =>
      [
        `${shown === undefined ? total : `${shown} av ${total}`} avsnitt i annonsen tegnet som puls.`,
        matched.length > 0 ? `Funnet i CV-en: ${matched.join(", ")}.` : "",
        missing.length > 0 ? `Mangler: ${missing.join(", ")}.` : "",
      ]
        .filter((sentence) => sentence !== "")
        .join(" "),
    // «Viser de 6 av 14 avsnittene som har nøkkelord. Tallet til venstre er avsnittet.»
    compactCaption: (shown: number, total: number) =>
      `Viser de ${shown} av ${total} avsnittene som har nøkkelord. Tallet til venstre er avsnittet.`,
    legend: {
      thin: "Tynn linje: ett avsnitt i annonsen",
      matched: "Tykk linje: nøkkelord funnet i CV-en",
      missing: "Stiplet linje: nøkkelord som mangler",
    },
    homeIntro:
      "Eksempelannonsen tegnet som puls. Hver linje er ett avsnitt, og hvert nøkkelord får linjen til å hoppe.",
  },
  home: {
    headline: "Se hvilke av annonsens ord CV-en din dekker.",
    lede: "Lim inn CV-en din og en stillingsannonse. Du får et samsvar du kan etterprøve, en ærlig gjennomgang av det som mangler, og et utkast til søknadsbrev som bare bygger på det CV-en din viser.",
    primaryAction: "Lag skreddersydd søknad",
    tryExample: "Du kan prøve med eksempelet først. Det krever ingen konto.",
    outputsHeading: "Dette får du for hver annonse",
    outputs: [
      {
        title: "ATS-samsvar",
        body: "Hvor mange av annonsens nøkkelord CV-en din dekker. Vanlig kode regner det ut, ikke KI, og du ser formelen og CV-linjen bak hvert treff.",
      },
      {
        title: "Gapanalyse med omformuleringer",
        body: "For hvert ord som mangler: kan noe du allerede har gjort, sies med annonsens ord? Hvert forslag siterer CV-en din ordrett. Det du ikke har gjort, kalles et reelt gap.",
      },
      {
        title: "Utkast til søknadsbrev",
        body: "Et kort brev i tonen du velger – formell, personlig eller direkte. Du leser det gjennom og tilpasser det i ditt eget program.",
      },
    ],
    stanceHeading: "Viser arbeidet. Finner aldri på.",
    stancePoints: [
      "Samsvaret er et anslag på hvor mange nøkkelord CV-en dekker. Det er ikke en ekte ATS-vurdering, og ingen spådom om intervjusjanser.",
      "Har du ikke en ferdighet annonsen ber om, sier vi det rett ut. Vi skriver ingen tekst som fyller hullet.",
      "Ingenting sendes til KI-tjenesten før du har sagt ja. Du kopierer bare det du selv velger.",
    ],
  },
  notFound: {
    heading: "Fant ikke siden",
    body: "Den finnes ikke, eller du har ikke tilgang til den.",
    home: "Til Hjem",
  },
} as const;
