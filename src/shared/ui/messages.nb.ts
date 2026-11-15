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
  notFound: {
    heading: "Fant ikke siden",
    body: "Den finnes ikke, eller du har ikke tilgang til den.",
    home: "Til Hjem",
  },
} as const;
