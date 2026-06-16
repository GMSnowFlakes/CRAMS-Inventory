@extends('emails.layout')

@section('subject', 'Approval Requested — ' . $referenceId)

@section('content')
    <h1>Approval Request</h1>
    <p>A new approval request has been submitted and requires your review.</p>

    <table class="info-table">
        <tr>
            <td>Type</td>
            <td><strong>{{ $type }}</strong></td>
        </tr>
        <tr>
            <td>Reference</td>
            <td>{{ $referenceId }}</td>
        </tr>
        <tr>
            <td>Requested By</td>
            <td>{{ $requestedBy }}</td>
        </tr>
        <tr>
            <td>Status</td>
            <td><span class="badge badge-yellow">Pending Review</span></td>
        </tr>
    </table>

    <a href="{{ $approvalsUrl }}" class="btn">Review Request</a>
@endsection
