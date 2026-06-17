<?php
/**
 * CRAMS — Server Requirements Checker
 * Drop this file in your web root, visit it in a browser,
 * then delete it once you confirm everything passes.
 */

$checks = [];
$pass   = true;

function check(string $label, bool $ok, string $fix = ''): array {
    return ['label' => $label, 'ok' => $ok, 'fix' => $fix];
}

// PHP version
$phpOk = version_compare(PHP_VERSION, '8.2.0', '>=');
$checks[] = check(
    'PHP ' . PHP_VERSION . ' (requires 8.2+)',
    $phpOk,
    'Upgrade PHP to 8.2 or higher. Contact your host or use a PHP version manager.'
);

// Required extensions
$extensions = [
    'pdo'       => 'Core database layer',
    'pdo_mysql' => 'MySQL database support',
    'mbstring'  => 'Multi-byte string handling',
    'openssl'   => 'Encryption and HTTPS',
    'tokenizer' => 'Laravel core requirement',
    'xml'       => 'XML processing',
    'ctype'     => 'Character type functions',
    'json'      => 'JSON support',
    'curl'      => 'HTTP requests (API calls, updater)',
    'zip'       => 'ZIP extraction (required for system updater)',
    'bcmath'    => 'Arbitrary precision math',
    'intl'      => 'Internationalisation',
    'gd'        => 'Image processing',
    'fileinfo'  => 'File type detection',
];

foreach ($extensions as $ext => $purpose) {
    $loaded = extension_loaded($ext);
    $checks[] = check(
        "ext-{$ext} ({$purpose})",
        $loaded,
        "Enable php_{$ext} in your php.ini or install php8.x-{$ext} on your server."
    );
    if (!$loaded) $pass = false;
}

// PHP settings
$uploadMax = ini_get('upload_max_filesize');
$uploadOk  = (int) $uploadMax >= 8;
$checks[] = check(
    "upload_max_filesize = {$uploadMax} (recommend 10M+)",
    $uploadOk,
    'Set upload_max_filesize = 10M in php.ini'
);

// Writable directories
$dirs = [
    'storage/app'          => 'File uploads',
    'storage/framework'    => 'Cache, sessions, views',
    'storage/logs'         => 'Application logs',
    'bootstrap/cache'      => 'Config cache',
];

foreach ($dirs as $dir => $purpose) {
    $path    = __DIR__ . '/../' . $dir;
    $exists  = is_dir($path);
    $writable = $exists && is_writable($path);
    $checks[] = check(
        "{$dir} writable ({$purpose})",
        $writable,
        "Run: chmod -R 775 {$dir} && chown -R www-data:www-data {$dir}"
    );
    if (!$writable) $pass = false;
}

// Composer availability (optional)
$composerAvailable = (shell_exec('composer --version 2>/dev/null') !== null);
$checks[] = check(
    'Composer available (required for install)',
    $composerAvailable,
    'Install Composer: https://getcomposer.org/download/'
);

if (!$phpOk) $pass = false;

?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>CRAMS — Server Requirements Check</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #f1f5f9; color: #1e293b; padding: 2rem; }
  .card { background: #fff; border-radius: 12px; max-width: 680px; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,.08); }
  .header { background: #0f172a; padding: 2rem; }
  .header h1 { color: #fff; font-size: 1.5rem; font-weight: 700; }
  .header p  { color: #94a3b8; font-size: .875rem; margin-top: .25rem; }
  .banner { padding: 1rem 2rem; font-size: .9rem; font-weight: 600; }
  .banner.pass { background: #f0fdf4; color: #16a34a; border-bottom: 1px solid #bbf7d0; }
  .banner.fail { background: #fef2f2; color: #dc2626; border-bottom: 1px solid #fecaca; }
  .list { padding: 1.5rem 2rem; display: flex; flex-direction: column; gap: .75rem; }
  .item { display: flex; align-items: flex-start; gap: .75rem; }
  .dot { flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-top: 2px; }
  .dot.ok   { background: #dcfce7; color: #16a34a; }
  .dot.fail { background: #fee2e2; color: #dc2626; }
  .dot svg  { width: 12px; height: 12px; }
  .label { font-size: .875rem; color: #334155; line-height: 1.4; }
  .fix   { font-size: .8rem; color: #64748b; margin-top: .2rem; font-family: monospace; background: #f8fafc; padding: .2rem .4rem; border-radius: 4px; display: inline-block; }
  .footer { padding: 1.5rem 2rem; border-top: 1px solid #e2e8f0; font-size: .8rem; color: #94a3b8; }
  .footer strong { color: #dc2626; }
</style>
</head>
<body>
<div class="card">
  <div class="header">
    <h1>CRAMS — Server Requirements</h1>
    <p>Verify your server is ready before installing CRAMS</p>
  </div>

  <div class="banner <?= $pass ? 'pass' : 'fail' ?>">
    <?= $pass
        ? '✓ All requirements met — ready to install CRAMS'
        : '✗ Some requirements are not met — review the items below' ?>
  </div>

  <div class="list">
    <?php foreach ($checks as $c): ?>
    <div class="item">
      <div class="dot <?= $c['ok'] ? 'ok' : 'fail' ?>">
        <?php if ($c['ok']): ?>
          <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
        <?php else: ?>
          <svg fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
        <?php endif; ?>
      </div>
      <div>
        <div class="label"><?= htmlspecialchars($c['label']) ?></div>
        <?php if (!$c['ok'] && $c['fix']): ?>
          <div class="fix"><?= htmlspecialchars($c['fix']) ?></div>
        <?php endif; ?>
      </div>
    </div>
    <?php endforeach; ?>
  </div>

  <div class="footer">
    <strong>Security:</strong> Delete this file from your server after checking requirements.
    It should not remain accessible in production.
  </div>
</div>
</body>
</html>
