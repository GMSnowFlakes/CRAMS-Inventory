<?php

return [
    /*
     * RSA-2048 public key used to verify license signatures.
     * The matching private key is held by the vendor only — never committed here.
     */
    'public_key' => <<<EOT
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2ksJET6jxWVt9vqTbLmf
aBqFKEqvQ5YfBMGIDztVhtoMCgWSZvqwoxwwUzrAZq0yDjFQDuGQYkWnW2TAZgNR
EZCPMHhL1Py7Jc/m6VvPIWiYml2on2t7ViqkjqkXj+PjIz+Qrwaie1oozHZwjGA3
mZZTw8HlYxXVJgxnYyUihhRaQ8YXmOAPhUkuKEPIf/k+RGnr4WZHrt/rsy5QVty8
EMx+MIZOSO+DHXA8S3Qq7tRWZQQMC02x49rXQpr3tQh3VLHj0wo3z7bOns2MUn8g
LTRXEwgUWEHx+gmYBkKsXxRKEb95XFNUMMow0jkN23V7DW79lMm23KtlyYmunm33
dwIDAQAB
-----END PUBLIC KEY-----
EOT,

    /*
     * Days before expiry to start showing the renewal warning banner.
     */
    'warning_days' => 30,

    /*
     * Grace period (days) after expiry before hard-blocking access.
     */
    'grace_days' => 7,
];
