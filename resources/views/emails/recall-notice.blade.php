@extends('emails.layout')

@section('subject', 'Recall Notice — ' . $recall->title)

@section('content')
    <h1>Recall Notice Issued</h1>
    <p>A new product recall has been initiated and requires immediate attention.</p>

    <table class="info-table">
        <tr>
            <td>Product</td>
            <td><strong>{{ $recall->product->name ?? 'N/A' }}</strong></td>
        </tr>
        <tr>
            <td>Recall Title</td>
            <td>{{ $recall->title }}</td>
        </tr>
        <tr>
            <td>Severity</td>
            <td>
                @php
                    $badgeClass = match($recall->severity ?? '') {
                        'critical' => 'badge-red',
                        'high'     => 'badge-orange',
                        'medium'   => 'badge-yellow',
                        default    => 'badge-indigo',
                    };
                @endphp
                <span class="badge {{ $badgeClass }}">{{ ucfirst($recall->severity ?? 'low') }}</span>
            </td>
        </tr>
        <tr>
            <td>Affected Quantity</td>
            <td><strong>{{ $recall->affected_qty }}</strong></td>
        </tr>
        <tr>
            <td>Reason</td>
            <td>{{ $recall->reason }}</td>
        </tr>
        <tr>
            <td>Status</td>
            <td><span class="badge badge-red">Active</span></td>
        </tr>
    </table>

    <a href="{{ $recallsUrl }}" class="btn">View Recall</a>
@endsection
