<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>InventoryOS Demo</title>
    <style>
        body { margin:0; font-family:Inter,system-ui,sans-serif; background:#0f172a; color:#f1f5f9; display:flex; align-items:center; justify-content:center; height:100vh; }
        .card { text-align:center; }
        .spinner { width:40px; height:40px; border:3px solid rgba(255,255,255,.15); border-top-color:#34d399; border-radius:50%; animation:spin 0.8s linear infinite; margin:0 auto 24px; }
        @keyframes spin { to { transform:rotate(360deg); } }
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <h2>Starting your demo…</h2>
        <p style="color:#94a3b8;font-size:14px">Logging you in. You'll be redirected shortly.</p>
    </div>
    <script>
        (function() {
            var token = '{{ $token }}';
            var redirect = '{{ $redirect }}';
            localStorage.setItem('crams_token', token);

            var xhr = new XMLHttpRequest();
            xhr.open('GET', '/api/auth/me');
            xhr.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr.setRequestHeader('Accept', 'application/json');
            xhr.onload = function() {
                if (xhr.status === 200) {
                    var user = JSON.parse(xhr.responseText);
                    localStorage.setItem('crams_user', JSON.stringify(user));
                }
                window.location.href = redirect;
            };
            xhr.onerror = function() {
                window.location.href = redirect;
            };
            xhr.send();
        })();
    </script>
</body>
</html>
