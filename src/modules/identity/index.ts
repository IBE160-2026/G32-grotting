import "server-only";

export { gateDecision, gateIsActive } from "./core/gate";
export { sessionDecision } from "./core/session-gate";
export {
  accessCookieValue,
  isAccessCodeCorrect,
  isValidAccessCookie,
} from "./server/access";
export {
  clearedSessionCookie,
  readSessionToken,
  sessionCookie,
} from "./server/cookie";
export {
  assertAccountsOn,
  handleStudent,
  type StudentContext,
  type StudentSession,
} from "./server/handle-student";
export { loginAccount } from "./server/login";
export {
  getPageSession,
  LOGIN_PATH,
  requireStudentPage,
} from "./server/page-session";
export { registerAccount } from "./server/register";
export { buildSessionView } from "./server/session-view";
export { deleteSessionByToken, renewSession } from "./server/sessions";
