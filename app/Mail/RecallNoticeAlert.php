<?php

namespace App\Mail;

use App\Modules\Recalls\Models\RecallNotice;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RecallNoticeAlert extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly RecallNotice $recall,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Recall Notice — ' . $this->recall->title,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.recall-notice',
            with: [
                'recall'     => $this->recall,
                'recallsUrl' => config('app.url') . '/recalls',
            ],
        );
    }
}
