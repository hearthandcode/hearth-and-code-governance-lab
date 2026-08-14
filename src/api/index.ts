export {
  HCC_AUTHORING_API,
  HCC_AUTHORING_API_VERSION,
  createHccAuthoringApi,
  parseHccViewSource
} from "./authoring";
export type { HccAuthoringApi } from "./authoring";
export { runAuthoringApiSelfTest } from "./self-test";
export type { AuthoringApiSelfTestCase, AuthoringApiSelfTestReport } from "./self-test";
