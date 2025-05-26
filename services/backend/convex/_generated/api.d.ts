/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as appinfo from "../appinfo.js";
import type * as auth from "../auth.js";
import type * as chat from "../chat.js";
import type * as chatSummarization from "../chatSummarization.js";
import type * as cleanupTasks from "../cleanupTasks.js";
import type * as commands from "../commands.js";
import type * as crypto from "../crypto.js";
import type * as discussions from "../discussions.js";
import type * as invite from "../invite.js";
import type * as migration from "../migration.js";
import type * as presentations from "../presentations.js";
import type * as serviceDesk from "../serviceDesk.js";
import type * as settings from "../settings.js";
import type * as tokens from "../tokens.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  appinfo: typeof appinfo;
  auth: typeof auth;
  chat: typeof chat;
  chatSummarization: typeof chatSummarization;
  cleanupTasks: typeof cleanupTasks;
  commands: typeof commands;
  crypto: typeof crypto;
  discussions: typeof discussions;
  invite: typeof invite;
  migration: typeof migration;
  presentations: typeof presentations;
  serviceDesk: typeof serviceDesk;
  settings: typeof settings;
  tokens: typeof tokens;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
