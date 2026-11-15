import "server-only";

export { gateDecision, gateIsActive } from "./core/gate";
export {
  accessCookieValue,
  isAccessCodeCorrect,
  isValidAccessCookie,
} from "./server/access";
