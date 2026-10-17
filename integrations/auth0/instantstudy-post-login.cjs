"use strict";

/**
 * Auth0 Post Login Action for the InstantStudy ChatGPT MCP API.
 * 
 * Add as a Post Login Action in the Auth0 tenant, after configuring an Auth0
 * API with identifier https://instantstudy-api.vercel.app. This is not a
 * substitute for linking users to existing InstantStudy accounts.
 *
 * Required Auth0 Action secret: INSTANTSTUDY_MCP_AUDIENCE
 *   value: https://instantstudy-api.vercel.app
 *
 * Account binding is set by a trusted server-side account linking operation
 * using the Auth0 Management API:
 *   user.app_metadata.instantstudy_learner_id = <canonical InstantStudy ID>
 *
 * Never read this value from user_metadata, query strings, ID token,
 * a prompt/tool argument, or another untrusted source.
 */
exports.onExecutePostLogin = async (event, api) => {
  const resource = event.secrets?.INSTANTSTUDY_MCP_AUDIENCE;
  if (!resource || !/^https:\/\/[^\s]+$/.test(resource)) {
    // Fail closed when this Action is invoked without its required secret.
    api.access.deny("instantstudy_mcp_configuration_missing");
    return;
  }

  // Do not affect other Auth0 applications/API audiences within the tenant.
  if (event.resource_server?.identifier !== resource) return;

  const learnerId = event.user?.app_metadata?.instantstudy_learner_id;

  // A valid login does not automatically imply authorization to access
  // another account's learning documents, quizzes or mastery history.
  if (typeof learnerId !== "string" || !/^[A-Za-z0-9:_-]{3,200}$/.test(learnerId)) {
    api.access.deny("instantstudy_account_link_required");
    return;
  }

  const claim = resource.replace(/\/$/, "") + "/learner_id";
  api.accessToken.setCustomClaim(claim, learnerId);
};
