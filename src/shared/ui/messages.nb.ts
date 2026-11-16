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
    errors: {
      JOB_AD_LENGTH: "Stillingsannonsen må være mellom 200 og 15 000 tegn.",
      JOB_TITLE_REQUIRED: "Fyll inn stillingstittelen.",
      EMPLOYER_REQUIRED: "Fyll inn arbeidsgiveren.",
      TOO_LONG: "Maks 200 tegn.",
    },
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
