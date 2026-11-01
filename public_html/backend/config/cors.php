<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration (OWASP A10)
    |--------------------------------------------------------------------------
    */

    'paths' => ['backend/api/*', 'api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_filter(array_map('trim', explode(',', env(
        'CORS_ALLOWED_ORIGINS',
        'http://95.111.228.30,https://95.111.228.30,http://vmi3717110.contaboserver.net,https://vmi3717110.contaboserver.net,http://localhost:5173,http://127.0.0.1:5173'
    )))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'X-Requested-With', 'Authorization', 'Accept', 'X-CSRF-TOKEN'],

    'exposed_headers' => ['Cache-Control', 'Content-Language', 'Content-Type', 'Expires', 'Last-Modified', 'Pragma'],

    'max_age' => 86400,

    'supports_credentials' => true,
];
