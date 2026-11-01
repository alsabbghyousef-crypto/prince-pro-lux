<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * SecurityHeaders Middleware (OWASP A05: Security Misconfiguration)
 *
 * Injects industry-standard defensive security headers to prevent:
 * - Clickjacking (X-Frame-Options, frame-ancestors)
 * - MIME-sniffing attacks (X-Content-Type-Options)
 * - Cross-Site Scripting (X-XSS-Protection, CSP)
 * - Referrer leaks (Referrer-Policy)
 * - Unauthorized device feature access (Permissions-Policy)
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Security headers applied to all responses
        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'X-Frame-Options'        => 'SAMEORIGIN',
            'X-XSS-Protection'       => '1; mode=block',
            'Referrer-Policy'        => 'strict-origin-when-cross-origin',
            'Permissions-Policy'     => 'camera=(), microphone=(), geolocation=(), payment=()',
        ];

        foreach ($headers as $key => $value) {
            $response->headers->set($key, $value);
        }

        // Remove revealing server banners if present
        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');

        return $response;
    }
}
