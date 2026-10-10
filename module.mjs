// @ts-check
import { module } from "@prisma/composer";
import prosperaReferralPlatformService from "./service.mjs";

export default module("prospera-referral-platform", ({ provision }) => {
  provision(prosperaReferralPlatformService, { id: "prosperareferralplatform" });
});
