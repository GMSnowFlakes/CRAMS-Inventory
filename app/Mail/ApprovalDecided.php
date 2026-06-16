<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ApprovalDecided extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $decision,
        public readonly string $type,
        public readonly string $referenceId,
        public readonly string $approverName,
        public readonly ?string $notes,
        public readonly string $resourceUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: ucfirst($this->decision) . ' — ' . $this->referenceId,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.approval-decided',
            with: [
                'decision'    => $this->decision,
                'type'        => $this->type,
                'referenceId' => $this->referenceId,
                'approverName'=> $this->approverName,
                'notes'       => $this->notes,
                'resourceUrl' => $this->resourceUrl,
            ],
        );
    }
}
