<?php

return [
    /*
     * Set MAIL_ENABLED=true in .env to activate email notifications.
     * When false (default), all mail dispatch calls are silently skipped.
     */
    'mail_enabled' => env('MAIL_ENABLED', false),
];
