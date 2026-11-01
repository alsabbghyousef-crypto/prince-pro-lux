<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/**
 * SanitizeInput Middleware (OWASP A03: Injection / Cross-Site Scripting XSS)
 *
 * Sanitizes incoming user inputs to neutralize malicious script injection
 * while preserving legitimate Arabic and English business data and formatting.
 */
class SanitizeInput
{
    public function handle(Request $request, Closure $next)
    {
        $input = $request->all();

        if (!empty($input) && is_array($input)) {
            array_walk_recursive($input, function (&$value, $key) {
                // Do not sanitize passwords, binary tokens, or raw file objects
                if (in_array(strtolower($key), ['password', 'password_confirmation', 'token', 'file'])) {
                    return;
                }

                if (is_string($value)) {
                    // Strip dangerous script tags and event handlers
                    $sanitized = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $value);
                    $sanitized = preg_replace('/on[a-z]+\s*=\s*["\'][^"\']*["\']/i', '', $sanitized);
                    $sanitized = preg_replace('/javascript:\s*/i', '', $sanitized);
                    $value = trim($sanitized);
                }
            });

            $request->merge($input);
        }

        return $next($request);
    }
}
