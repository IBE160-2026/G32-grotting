import "server-only";

export { formatCatalogueNumber } from "./core/catalogue-number";
export type { ExampleAnalysis } from "./server/analyse";
export { analyseExample, analyseInputs } from "./server/analyse";
export { checkLetterFor } from "./server/check-letter";
export {
  type ApplicationMeta,
  countApplications,
  getApplicationDetail,
  getApplicationLetterText,
  getApplicationMeta,
  listApplications,
  nextSeq,
  type SaveAnalysisResult,
  saveAnalysis,
  saveGaps,
  saveLetter,
  saveLetterCheck,
} from "./server/repository";
