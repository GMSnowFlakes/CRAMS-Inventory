@extends('emails.layout')

@section('subject', ucfirst($decision) . ' — ' . $referenceId)

@section('content')
    <h1>Approval {{ ucfirst($decision) }}</h1>
    <p>Your approval request has been reviewed.</p>

    <table class="info-table">
        <tr>
            <td>Decision</td>
            <td>
                @if($decision === 'approved')
                    <span class="badge badge-green">Approved</span>
                @else
                    <span class="badge badge-red">Rejected</span>
                @endif
            </td>
        </tr>
        <tr>
            <td>Type</td>
            <td>{{ $type }}</td>
        </tr>
        <tr>
            <td>Reference</td>
            <td>{{ $referenceId }}</td>
        </tr>
        <tr>
            <td>Decided By</td>
            <td>{{ $approverName }}</td>
        </tr>
        @if($notes)
        <tr>
            <td>Notes</td>
            <td>{{ $notes }}</td>
        </tr>
        @endif
    </table>

    @if($decision === 'rejected' && $notes)
    <div class="alert-box">
        <strong>Rejection reason:</strong> {{ $notes }}
    </div>
    @endif

    <a href="{{ $resourceUrl }}" class="btn">View Details</a>
@endsection
