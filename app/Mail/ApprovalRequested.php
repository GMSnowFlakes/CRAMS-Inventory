<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ApprovalRequested extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $type,
        public readonly string $referenceId,
        public readonly string $requestedBy,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Approval Requested — ' . $this->referenceId,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.approval-requested',
            with: [
                'type'         => $this->type,
                'referenceId'  => $this->referenceId,
                'requestedBy'  => $this->requestedBy,
                'approvalsUrl' => config('app.url') . '/approvals',
            ],
        );
    }
}
