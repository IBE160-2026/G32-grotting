// Every UI string lives here (AD-7, NFR-1). Components import it; the server
// sends codes, never prose. Wording follows EXPERIENCE.md, Key strings.
export const messages = {
  siteName: "JobAssistant",
  skipLink: "Hopp til hovedinnholdet",
  nav: {
    label: "Hovedmeny",
    home: "Hjem",
    application: "Søknad",
    // The items accounts add (Story 6.4, UX-DR5): logged out and logged in.
    login: "Logg inn",
    register: "Registrer deg",
    profile: "Profil",
    history: "Historikk",
    account: "Konto",
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
      // Only while the Keyword fallback is on (FR-5b, FR-26): the ad is also
      // sent, alone, to pick out its keywords.
      keywords:
        "For å hente ut nøkkelord sendes bare stillingsannonsen, aldri CV-en.",
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
  // Profil (Story 6.3): the CV kept on the account. The heading is «CV · navn».
  profile: {
    title: "Profil",
    headingLead: "CV",
    placeholder: "Lim inn CV-teksten din",
    save: "Lagre",
    saveHint: "Lagre blir tilgjengelig når feltet har tekst.",
    saved: "Lagret.",
    cvHint:
      "PDF-er med to kolonner kan blande linjene. Les gjennom og rett det som har havnet feil før du lagrer.",
    pickerHint:
      "PDF eller TXT, maks 2 MB. Du kan også lime inn teksten direkte i feltet.",
    // The text the Student did not save, kept across a session that ended.
    restored: "Vi tok vare på endringene du ikke hadde lagret.",
  },
  // The session (Story 6.5, FR-18): the warning two minutes before the end, the
  // alert on «Logg inn» once it has ended, and what Søknad says after login.
  session: {
    ended: "Økten din er avsluttet. Logg inn igjen for å fortsette.",
    restoredLabel: "Tatt vare på",
    restoredAd: "Vi tok vare på stillingsannonsen du limte inn.",
    warning: {
      title: "Økten din avsluttes snart",
      body: "Du blir logget ut om 2 minutter fordi du ikke har gjort noe på en stund. Det du har skrevet, tas vare på.",
      continue: "Fortsett økten",
      logOut: "Logg ut",
    },
  },
  // Registrer deg and Logg inn (Story 6.4). Wording follows EXPERIENCE.md, Key
  // strings; the field errors that the Key strings do not name are the simplest
  // sentence that says what to fix.
  register: {
    title: "Registrer deg",
    name: "Navn",
    email: "E-post",
    password: "Passord",
    passwordHint: "Minst 8 tegn. Velg et passord du ikke bruker andre steder.",
    accessCodeHint: "Minst 16 tegn. Koden får du av utvikleren.",
    trust: "CV-en din og dokumentene som lages, lagres kryptert.",
    submit: "Registrer deg",
    haveAccount: "Har du allerede en konto? Logg inn",
    errors: {
      nameRequired: "Skriv inn navnet ditt.",
      nameTooLong: "Navnet kan ha høyst 200 tegn.",
      emailRequired: "Skriv inn e-postadressen din.",
      emailInvalid: "Skriv inn en gyldig e-postadresse.",
      emailTaken: "Denne e-postadressen er allerede registrert.",
      passwordShort: "Passordet må ha minst 8 tegn.",
      passwordLong: "Passordet kan ha høyst 1000 tegn.",
    },
  },
  login: {
    title: "Logg inn",
    email: "E-post",
    password: "Passord",
    submit: "Logg inn",
    noAccount: "Har du ingen konto? Registrer deg",
    errors: {
      emailRequired: "Skriv inn e-postadressen din.",
      passwordRequired: "Skriv inn passordet ditt.",
      credentials: "Feil e-post eller passord.",
    },
  },
  // Historikk and Konto stand as plain pages until Story 6.8 and 6.10 build
  // them: a title and one honest line, no promise.
  placeholderPage: {
    history: "Historikk",
    account: "Konto",
    body: "Denne siden er ikke ferdig ennå.",
    toApplication: "Til Søknad",
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
    // Phase 1 waits for the Keyword request on a new ad (FR-5b). Plain text, not
    // announced: the first live region speaks the result.
    keywordProgress: "Henter nøkkelord fra annonsen …",
    // The server judged the ad to hold too few Keywords (FR-4).
    adUnclear:
      "Annonsen er for kort eller uklar til å analyseres. Lim inn hele stillingsannonsen, også kravene.",
    errors: {
      JOB_AD_LENGTH: "Stillingsannonsen må være mellom 200 og 15 000 tegn.",
      JOB_TITLE_REQUIRED: "Fyll inn stillingstittelen.",
      EMPLOYER_REQUIRED: "Fyll inn arbeidsgiveren.",
      TOO_LONG: "Maks 200 tegn.",
    },
    // Story 6.7: with accounts on the form heading shows the next catalogue
    // number dimmed («JA-003 · Ny søknad») and this lede stands under it.
    lede: "Neste nummer i katalogen. Fyll inn annonsen, så regner vi ut hvilke av nøkkelordene CV-en din dekker.",
    // The save failed (Story 6.7): the score stands, nothing is promised that
    // is not stored. `live` is spoken after the phase-1 line.
    notSaved: {
      label: "Ikke lagret",
      text: "Søknaden ble ikke lagret i Historikk. Samsvaret over er riktig, men brevet og gapanalysen skrives ikke nå. Prøv igjen om litt.",
      live: "Søknaden ble ikke lagret i Historikk. Brevet og gapanalysen skrives ikke nå.",
    },
    // Søknad with accounts on (Story 6.6): the CV comes from Profil, read-only,
    // in a native `<details>`; «Bruk eksempelet» swaps in the Example CV for
    // this application only.
    cvDisclosure: {
      summary: "CV-tekst fra Profil",
      exampleSummary: "CV-tekst fra eksempelet",
      hint: "Teksten hentes fra Profil.",
      editLink: "Du endrer den i Profil",
      exampleHint: "Bare til denne søknaden. Profilen din er ikke endret.",
      textLabel: "CV-tekst, bare lesing",
      meta: (count: string, date: string | null) =>
        date === null ? `${count} tegn` : `${count} tegn · ${date}`,
    },
    // No CV in Profil yet: submit is unavailable until there is one.
    noCv: {
      label: "CV mangler",
      text: "Du har ikke lagt inn CV-en din ennå.",
      link: "Gå til Profil",
    },
  },
  // The copy button (FR-12, UX-DR13): one label, the 1.8 s feedback, the
  // second live region, and the notice when the clipboard is blocked.
  copy: {
    label: "Kopier",
    copied: "Kopiert",
    live: "Kopiert til utklippstavlen.",
    blocked: "Kopier med Ctrl+C, eller hold inne på mobil.",
  },
  // «Tone i brevet» on Søknad (FR-10, UX-DR25). The name and the hint are one
  // accessible name, «Formell – Høflig og saklig».
  tone: {
    legend: "Tone i brevet",
    options: {
      Formell: { name: "Formell", hint: "Høflig og saklig" },
      Personlig: { name: "Personlig", hint: "Varm, med «jeg» i front" },
      Direkte: { name: "Direkte", hint: "Kort, rett på sak" },
    },
  },
  // The Letter on the result, phase 2 (FR-9, UX-DR28, UX-DR30). The variant
  // before S4 has this one slot and no Gapanalyse.
  letter: {
    heading: "Søknadsbrev",
    // The progress line while the Letter is written.
    progress: "Skriver søknadsbrevet … dette tar under ett minutt.",
    placeholderHint: "Kommer om under ett minutt.",
    pendingStrip: "Skrives",
    aiLabel: "Utkast skrevet med KI – les gjennom og tilpass før du sender.",
    // The phase-2 line, spoken once in the first live region (NFR-2).
    live: {
      done: "Søknadsbrevet er klart.",
      failed: "Søknadsbrevet kunne ikke lages. Samsvaret står fortsatt.",
      cap: "Dagens grense for KI er nådd. Samsvaret står fortsatt.",
      testMode: "Søknadsbrevet er ikke tilgjengelig i testmodus.",
    },
    failed:
      "Søknadsbrevet kunne ikke lages. Samsvaret over er fortsatt riktig.",
    retry: "Prøv igjen",
    // The action stack under the Letter (FR-12, UX-DR28).
    actions: {
      download: "Last ned (.docx)",
      downloadFailed:
        "Filen kunne ikke lages. Kopier brevet i stedet, og lim det inn i ditt eget program.",
      hint: "Brevet kan ikke redigeres her. Kopier det eller last det ned, og tilpass det i ditt eget program. «Lag nytt utkast» skriver et nytt brev i samme tone.",
    },
    // «Lag nytt utkast» (FR-12, UX-DR39): the old Letter stays until the new
    // one has arrived.
    regenerate: {
      label: "Lag nytt utkast",
      progress: "Skriver et nytt utkast …",
      live: {
        done: "Det nye utkastet er klart.",
        failed:
          "Det nye utkastet kunne ikke lages. Det forrige brevet står fortsatt.",
        cap: "Dagens grense for KI er nådd. Det forrige brevet står fortsatt.",
        testMode:
          "Et nytt utkast er ikke tilgjengelig i testmodus. Det forrige brevet står fortsatt.",
      },
    },
    cap: {
      label: "Dagens grense",
      text: "Du har brukt dagens 30 KI-forespørsler. Grensen nullstilles ved midnatt.",
    },
    testMode: {
      label: "Testmodus",
      text: "Ikke tilgjengelig i testmodus. Bruk eksempelet for å se hele flyten.",
    },
    // The integrity guard on the Letter (FR-11, UX-DR28): a warning per word
    // the CV does not support, between the AI label and the Letter. Flag only;
    // nothing in the Letter is removed or rewritten.
    check: {
      sectionName: "Sjekk av brevet mot CV-en",
      strip: "Sjekk",
      unsupported: (word: string) =>
        `Brevet nevner «${word}», men CV-en din viser det ikke. Sjekk at brevet ikke påstår noe CV-en din ikke støtter.`,
      upgrade: (word: string) =>
        `Brevet bruker ordet «${word}», men CV-en din bruker det ikke. Sjekk at brevet ikke gjør rollen din større enn den var.`,
      unchecked: "Brevet er ikke sjekket mot CV-en. Les det ekstra nøye.",
      retry: "Sjekk igjen",
      // The outcome of «Sjekk igjen», in the second live region. Nothing is
      // spoken for the automatic check.
      live: {
        found: (count: string) => `Fant ${count} ord å sjekke i brevet.`,
        none: "Fant ingenting å sjekke i brevet.",
        still: "Brevet er fortsatt ikke sjekket mot CV-en.",
      },
    },
  },
  // The Gap analysis (FR-13, FR-14). The server sends a key and its parameters
  // for a Real gap it wrote itself (AD-7); the UI maps the key here.
  gaps: {
    template: {
      REAL_GAP: (keyword: string) =>
        `Annonsen ber om «${keyword}». CV-en din viser ikke dette, og vi fant ingen linje i den som dekker det.`,
    },
    heading: "Gapanalyse",
    // The progress line while the Gap analysis and the Letter are written.
    progress: "Skriver gapanalyse og søknadsbrev … dette tar under ett minutt.",
    // The same line with rewording on (FR-16): the suggestions are written in
    // the same request as the Gaps.
    progressRewording:
      "Skriver gapanalyse, omformuleringer og søknadsbrev … dette tar under ett minutt.",
    aiStrip: "Skrevet med KI",
    strip: { rewordable: "Omformulerbart gap", real: "Reelt gap" },
    citationSource: "Sitert ordrett fra CV-en din · sjekket mot CV-teksten",
    hedge: "Linjen din dekker trolig dette – vurder å ta det med.",
    // The box under the citation of a Rewordable gap (FR-16, UX-DR13): one
    // suggestion and a small «Kopier». Nothing adds it to the CV (P3).
    suggestion: {
      heading: "Omformuleringsforslag",
      // The accessible name of «Kopier» where several boxes share the page.
      copyLabel: (keyword: string) => `Kopier forslaget for «${keyword}»`,
      // FR-17 discarded the suggestion: this stands where the box would be.
      none: "Ingen forslag her. Vurder selv om og hvordan du vil formulere det.",
    },
    noCopy:
      "Ingen tekst å kopiere. Vi skriver ikke tekst for det CV-en ikke viser.",
    failed: "Gapanalysen kunne ikke lages. Samsvaret over er fortsatt riktig.",
    retry: "Prøv igjen",
    // The outcome of «Prøv igjen», in the second live region.
    live: {
      done: "Gapanalysen er klar.",
      failed: "Gapanalysen kunne ikke lages. Samsvaret står fortsatt.",
      cap: "Dagens grense for KI er nådd. Samsvaret står fortsatt.",
      testMode: "Gapanalysen er ikke tilgjengelig i testmodus.",
    },
  },
  // The phase-2 line when the Gap analysis and the Letter settle together,
  // spoken once in the first live region (NFR-2).
  phaseTwo: {
    both: {
      done: "Gapanalysen og søknadsbrevet er klare.",
      failed:
        "Gapanalysen og søknadsbrevet kunne ikke lages. Samsvaret står fortsatt.",
      cap: "Dagens grense for KI er nådd. Samsvaret står fortsatt.",
      testMode:
        "Gapanalysen og søknadsbrevet er ikke tilgjengelige i testmodus.",
    },
    letter: {
      done: "Søknadsbrevet er klart.",
      failed: "Søknadsbrevet kunne ikke lages.",
      cap: "Dagens grense for KI er nådd.",
      testMode: "Søknadsbrevet er ikke tilgjengelig i testmodus.",
    },
    gaps: {
      done: "Gapanalysen er klar.",
      failed: "Gapanalysen kunne ikke lages.",
      cap: "Dagens grense for KI er nådd.",
      testMode: "Gapanalysen er ikke tilgjengelig i testmodus.",
    },
  },
  // The phase-1 result on Søknad (FR-7, FR-8). Percent sign with a space and
  // sjevroner for quotes, as in EXPERIENCE.md, Key strings.
  result: {
    editAd: "Endre annonsen",
    // Under the heading once the Application is saved (Story 6.7), and spoken
    // after the phase-2 line: «Lagret i Historikk som JA-002.»
    saved: (number: string) => `Lagret i Historikk som ${number}.`,
    credits: {
      position: "Stilling",
      date: "Dato",
      tone: "Tone",
      ad: "Annonse",
    },
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
    // Under the formula when the Keywords came from code alone because AI was
    // not allowed or failed (FR-5b, UX-DR23).
    lessPrecise: "Mindre presist: nøkkelordene er hentet ut uten KI.",
    formulaLabel: "Formel",
    // «5 av 7 nøkkelord funnet = 71 %»
    formula: (matched: number, total: number, score: number) =>
      `${matched} av ${total} nøkkelord funnet = ${score} %`,
    disclaimer:
      "Et anslag på hvor mange av annonsens nøkkelord CV-en din dekker. Ikke en ekte ATS-vurdering, og ingen spådom om intervjusjanser.",
    // The phase-1 line (NFR-2): the score and the Verdict. When the Letter is
    // being written (before S4), `liveAiNext` ends it.
    liveAiNext: "Søknadsbrevet skrives nå.",
    // The same, when the Gap analysis is written with the Letter.
    liveAiNextWithGaps: "Gapanalysen og søknadsbrevet skrives nå.",
    live: (score: number, verdict: string, matched: number, total: number) =>
      `Samsvaret er klart: ${score} %, ${verdict.toLowerCase()}, ${matched} av ${total} nøkkelord.`,
    // Spoken in the second live region when a silent rerun of phase 1 (the
    // server's inputs had changed since the first answer) gave another result.
    liveUpdated: (
      score: number,
      verdict: string,
      matched: number,
      total: number,
    ) =>
      `Samsvaret er oppdatert: ${score} %, ${verdict.toLowerCase()}, ${matched} av ${total} nøkkelord.`,
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
      // The link to the Gap of this Keyword; the suffix is for screen readers.
      gapLink: "Se gapanalysen",
      gapLinkFor: (keyword: string) => ` for ${keyword}`,
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
