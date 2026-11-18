import { z } from "zod";

// Throwaway prompts for the Bake-off (Story 3.3). They are rough on purpose:
// Story 3.4 writes the real Letter prompt and a later story the real Gap
// prompt, each under a PROMPT_VERSION. The instructions are in English; the
// output is asked for in bokmål.

export const TONES = ["Formell", "Personlig", "Direkte"] as const;
export type Tone = (typeof TONES)[number];

const TONE_RULES: Record<Tone, string> = {
  Formell:
    "Polite and factual, with complete sentences and no personal anecdotes.",
  Personlig:
    "Warmer: show motivation and a little personality, but stay professional.",
  Direkte:
    "Short and concrete: at most 300 words, open with the strongest match with the ad, use few courtesy phrases.",
};

export const letterSchema = z.object({ text: z.string() });
export type LetterOutput = z.infer<typeof letterSchema>;

export const gapSchema = z.object({
  gaps: z.array(
    z.object({
      keyword: z.string(),
      kind: z.enum(["rewordable", "real"]),
      explanation: z.string(),
      // A word-for-word quote from the CV; null for a real gap.
      evidence: z.string().nullable(),
      // A suggested rewording; null for a real gap.
      suggestion: z.string().nullable(),
    }),
  ),
});
export type GapOutput = z.infer<typeof gapSchema>;

export type LetterInput = {
  readonly cvText: string;
  readonly jobAd: string;
  readonly jobTitle: string;
  readonly employer: string;
  readonly tone: Tone;
};

export function letterPrompt(input: LetterInput): string {
  return `You write a draft cover letter in Norwegian bokmål for a student applying for a job.

Job title: ${input.jobTitle}
Employer: ${input.employer}
Tone: ${input.tone}. ${TONE_RULES[input.tone]}

Rules:
- Write in bokmål only. No English sentences.
- Address the letter to ${input.employer} for the job «${input.jobTitle}».
- Length: 250-400 words.
- Build the letter on 2-3 concrete examples from the CV that best match the ad. Do not repeat the CV and do not copy sentences from the ad.
- Use ONLY what the CV text shows. Never invent or upgrade a qualification, tool, employer, date, number or role. Do not mention qualifications the student lacks.
- No emoji and no exclamation marks. Prefer common Norwegian words to English loanwords.
- End with the token {{SIGNATUR}} on its own line. Do not write a name.
- Return the whole letter, including the greeting, as the "text" field.

CV:
"""
${input.cvText}
"""

Job ad:
"""
${input.jobAd}
"""`;
}

export type GapInput = {
  readonly cvText: string;
  readonly jobAd: string;
  // The Keywords the CV does not show, when known. Otherwise the model finds
  // the requirements itself.
  readonly missingKeywords?: readonly string[];
};

export function gapPrompt(input: GapInput): string {
  const missing =
    input.missingKeywords !== undefined && input.missingKeywords.length > 0
      ? `Missing keywords (one gap for each, in this order):\n${input.missingKeywords.map((word) => `- ${word}`).join("\n")}`
      : "Find the skills and requirements in the ad that the CV text does not show, and make one gap for each.";
  return `You help a student see where their CV falls short of a job ad. Write in Norwegian bokmål, in plain language.

${missing}

Rules for each gap:
- kind "rewordable": a CV entry really shows the keyword, so the student could say it in the employer's words. "evidence" is that CV entry copied word for word from the CV. "suggestion" puts the same thing in the employer's words using ONLY facts already in that entry. Never upgrade the kind of work or the role: an exam paper is not research, and taking part is not leading.
- A formal requirement (degree, certification, licence, language level, work permit) is rewordable only if the CV text states it explicitly.
- kind "real": the CV shows nothing that supports the keyword. Say so plainly and honestly. You may invite the student to think about experience the CV does not mention yet, but never give text to insert, and never push the student to add the keyword. "evidence" and "suggestion" are null.
- "explanation": one or two sentences that refer to the ad and say what is missing and why it matters. For a rewordable gap use hedged wording, for example «dekker trolig dette – vurder å ta det med».
- Never claim that an ATS or a recruiter's system will reject or rank the CV.

CV:
"""
${input.cvText}
"""

Job ad:
"""
${input.jobAd}
"""`;
}
