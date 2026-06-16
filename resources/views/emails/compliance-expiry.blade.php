@extends('emails.layout')

@section('subject', 'Compliance Expiry Warning — Action Required')

@section('content')
    <h1>Compliance Expiry Warning</h1>
    <p>The following products and compliance documents are expiring within the next 30 days. Please review and take action.</p>

    @if($products->isNotEmpty())
    <hr class="divider">
    <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 12px;">Expiring Products</h2>
    <table class="info-table">
        <tr>
            <td style="font-weight:700;color:#374151;">Product</td>
            <td style="font-weight:700;color:#374151;">SKU</td>
            <td style="font-weight:700;color:#374151;">Expiry Date</td>
            <td style="font-weight:700;color:#374151;">Days Left</td>
        </tr>
        @foreach($products as $product)
        @php $daysLeft = now()->diffInDays($product->expiry_date, false); @endphp
        <tr>
            <td>{{ $product->name }}</td>
            <td>{{ $product->sku }}</td>
            <td>{{ \Carbon\Carbon::parse($product->expiry_date)->format('M d, Y') }}</td>
            <td>
                <span class="badge {{ $daysLeft <= 7 ? 'badge-red' : ($daysLeft <= 14 ? 'badge-orange' : 'badge-yellow') }}">
                    {{ $daysLeft }} days
                </span>
            </td>
        </tr>
        @endforeach
    </table>
    @endif

    @if($documents->isNotEmpty())
    <hr class="divider">
    <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 12px;">Expiring Documents</h2>
    <table class="info-table">
        <tr>
            <td style="font-weight:700;color:#374151;">Document</td>
            <td style="font-weight:700;color:#374151;">Product</td>
            <td style="font-weight:700;color:#374151;">Expiry Date</td>
            <td style="font-weight:700;color:#374151;">Days Left</td>
        </tr>
        @foreach($documents as $doc)
        @php $daysLeft = now()->diffInDays($doc->expiry_date, false); @endphp
        <tr>
            <td>{{ $doc->document_type ?? $doc->title ?? 'Document' }}</td>
            <td>{{ $doc->product->name ?? '—' }}</td>
            <td>{{ \Carbon\Carbon::parse($doc->expiry_date)->format('M d, Y') }}</td>
            <td>
                <span class="badge {{ $daysLeft <= 7 ? 'badge-red' : ($daysLeft <= 14 ? 'badge-orange' : 'badge-yellow') }}">
                    {{ $daysLeft }} days
                </span>
            </td>
        </tr>
        @endforeach
    </table>
    @endif

    <hr class="divider">
    <a href="{{ $complianceUrl }}" class="btn">View Compliance</a>
@endsection
