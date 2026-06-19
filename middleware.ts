import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isApiAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');
  const isScheduleRoute = req.nextUrl.pathname.startsWith('/api/schedule');
  const isShareApiRoute = req.nextUrl.pathname.startsWith('/api/share');
  const isExtensionRoute = req.nextUrl.pathname.startsWith('/api/extension');
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');
  
  if (isApiRoute && !isApiAuthRoute && !isScheduleRoute && !isShareApiRoute && !isExtensionRoute && !isLoggedIn) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAuthRoute = req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register';
  if (isAuthRoute && isLoggedIn) {
    return Response.redirect(new URL('/ai', req.nextUrl));
  }

  const isAiRoute = req.nextUrl.pathname.startsWith('/ai');
  if (isAiRoute && !isLoggedIn) {
    return Response.redirect(new URL('/login', req.nextUrl));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
