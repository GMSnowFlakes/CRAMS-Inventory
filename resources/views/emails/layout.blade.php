<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>@yield('subject', 'CRAMS Notification')</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f1f5f9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
        }
        .wrapper {
            width: 100%;
            background-color: #f1f5f9;
            padding: 32px 16px;
            box-sizing: border-box;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .header {
            background-color: #ffffff;
            padding: 28px 40px 20px;
            border-bottom: 1px solid #e2e8f0;
        }
        .logo {
            font-size: 22px;
            font-weight: 800;
            color: #6366f1;
            letter-spacing: -0.5px;
            text-decoration: none;
        }
        .logo span {
            color: #0f172a;
        }
        .body {
            padding: 36px 40px;
            color: #374151;
            font-size: 15px;
            line-height: 1.7;
        }
        .body h1 {
            margin: 0 0 8px;
            font-size: 20px;
            font-weight: 700;
            color: #0f172a;
            line-height: 1.3;
        }
        .body p {
            margin: 0 0 16px;
        }
        .badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge-red    { background: #fee2e2; color: #991b1b; }
        .badge-orange { background: #ffedd5; color: #9a3412; }
        .badge-yellow { background: #fef9c3; color: #854d0e; }
        .badge-green  { background: #dcfce7; color: #166534; }
        .badge-indigo { background: #e0e7ff; color: #3730a3; }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }
        .info-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        .info-table td:first-child {
            font-weight: 600;
            color: #6b7280;
            width: 38%;
            white-space: nowrap;
        }
        .info-table td:last-child {
            color: #111827;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: #6366f1;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            margin-top: 8px;
        }
        .divider {
            border: none;
            border-top: 1px solid #e2e8f0;
            margin: 28px 0;
        }
        .alert-box {
            background-color: #fef2f2;
            border-left: 4px solid #ef4444;
            border-radius: 4px;
            padding: 14px 16px;
            margin: 20px 0;
            font-size: 14px;
            color: #7f1d1d;
        }
        .footer {
            background-color: #0f172a;
            padding: 24px 40px;
            text-align: center;
        }
        .footer p {
            margin: 0;
            color: #94a3b8;
            font-size: 12px;
            line-height: 1.6;
        }
        .footer strong {
            color: #e2e8f0;
        }
    </style>
</head>
<body>
<div class="wrapper">
    <div class="container">

        <div class="header">
            <span class="logo">CRAMS<span> Inventory</span></span>
        </div>

        <div class="body">
            @yield('content')
        </div>

        <div class="footer">
            <p><strong>CRAMS Inventory Platform</strong></p>
            <p>This is an automated notification. Please do not reply to this email.</p>
        </div>

    </div>
</div>
</body>
</html>
