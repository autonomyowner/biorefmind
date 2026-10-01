import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Better Auth's routes (sign-in, sign-up, session). The website reaches them
// through its own /api/auth/* proxy so the session cookie stays first-party.
authComponent.registerRoutes(http, createAuth);

export default http;
