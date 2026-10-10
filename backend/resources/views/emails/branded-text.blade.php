Bulan Senior Care — {!! $heading !!}

Hello {!! $name !!},

{!! $intro !!}

@if ($code)
Your verification code: {!! $code !!}
@else
{!! $url !!}
@endif

{!! strip_tags((string) $notice) !!}

Regards,
Bulan Senior Care Team
