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
  networkFailure:
    "Fikk ikke kontakt med serveren. Sjekk tilkoblingen og prøv igjen.",
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
  application: {
    heading: "Ny søknad",
    jobTitle: "Stillingstittel",
    employer: "Arbeidsgiver",
    jobAd: "Stillingsannonse",
    jobAdHint: "Lim inn hele annonseteksten, minst 200 tegn.",
    counter: (used: string, max: string) => `${used} av ${max} tegn`,
    submit: "Analyser og skriv utkast",
    errors: {
      JOB_AD_LENGTH: "Stillingsannonsen må være mellom 200 og 15 000 tegn.",
      JOB_TITLE_REQUIRED: "Fyll inn stillingstittelen.",
      EMPLOYER_REQUIRED: "Fyll inn arbeidsgiveren.",
      TOO_LONG: "Maks 200 tegn.",
    },
  },
  notFound: {
    heading: "Fant ikke siden",
    body: "Den finnes ikke, eller du har ikke tilgang til den.",
    home: "Til Hjem",
  },
} as const;
