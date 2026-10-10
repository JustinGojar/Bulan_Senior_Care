<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>{{ $heading }}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #eef2f6; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
<div style="display: none; max-height: 0; overflow: hidden;">{{ $preheader }}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #eef2f6;">
<tr>
<td align="center" style="padding: 32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(23, 58, 82, 0.08);">

{{-- Header --}}
<tr>
<td align="center" style="background-color: #173A52; padding: 28px 24px 24px;">
<img src="{{ $logoUrl }}" width="88" height="86" alt="Bulan Senior Care logo" style="display: block; width: 88px; height: auto; border: 0; margin: 0 auto 12px;">
<div style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: 0.3px;">Bulan Senior Care</div>
<div style="font-size: 12px; color: #e8c766; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px;">Office for Senior Citizens Affairs</div>
</td>
</tr>
<tr><td style="height: 4px; background-color: #d4a72c; line-height: 4px; font-size: 0;">&nbsp;</td></tr>

{{-- Body --}}
<tr>
<td style="padding: 36px 40px 8px;">
<h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #173A52;">{{ $heading }}</h1>
<p style="margin: 0 0 20px; font-size: 15px; line-height: 24px; color: #4b5563;">Hello {{ $name }},</p>
<p style="margin: 0 0 28px; font-size: 15px; line-height: 24px; color: #4b5563;">{{ $intro }}</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin: 0 auto 28px;">
<tr>
<td align="center" bgcolor="#173A52" style="border-radius: 8px;">
<a href="{{ $url }}" target="_blank" rel="noopener" style="display: inline-block; padding: 14px 36px; font-size: 15px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px; background-color: #173A52;">{{ $actionText }}</a>
</td>
</tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px;">
<tr>
<td style="background-color: #fdf8ea; border-left: 4px solid #d4a72c; border-radius: 6px; padding: 14px 16px; font-size: 14px; line-height: 21px; color: #6b5310;">
{{ $notice }}
</td>
</tr>
</table>

<p style="margin: 0 0 4px; font-size: 15px; line-height: 24px; color: #4b5563;">Regards,</p>
<p style="margin: 0 0 28px; font-size: 15px; line-height: 24px; font-weight: 600; color: #173A52;">Bulan Senior Care Team</p>
</td>
</tr>

{{-- Fallback link --}}
<tr>
<td style="padding: 0 40px 32px;">
<div style="border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 12px; line-height: 19px; color: #6b7280;">
Having trouble with the button? Copy and paste this link into your web browser:<br>
<a href="{{ $url }}" target="_blank" rel="noopener" style="color: #173A52; word-break: break-all;">{{ $url }}</a>
</div>
</td>
</tr>
</table>

{{-- Footer --}}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px;">
<tr>
<td align="center" style="padding: 20px 16px 0; font-size: 12px; line-height: 18px; color: #8a94a6;">
Office for Senior Citizens Affairs &middot; Municipality of Bulan, Sorsogon<br>
This is an automated message. Please do not reply to this email.<br>
&copy; {{ date('Y') }} Bulan Senior Care. All rights reserved.
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
