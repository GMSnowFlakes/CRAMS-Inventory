<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

class ComplianceExpiryWarning extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Collection $products,
        public readonly Collection $documents,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Compliance Expiry Warning — Action Required',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.compliance-expiry',
            with: [
                'products'      => $this->products,
                'documents'     => $this->documents,
                'complianceUrl' => config('app.url') . '/compliance',
            ],
        );
    }
}
