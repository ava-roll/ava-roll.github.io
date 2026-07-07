import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';

const RECIPIENT = 'runo.zizlak@gmail.com';

export const ContactForm = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const disabled = !name.trim() || !message.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    const subject = `Board Game Adventure — feedback from ${name.trim()}`;
    const body = `From: ${name.trim()}${email.trim() ? ` <${email.trim()}>` : ''}\n\n${message.trim()}`;
    const href = `mailto:${RECIPIENT}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
  };

  return (
    <Card className="mt-6 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Mail className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Contact & Feedback</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Have a suggestion or found a bug? Send us a message — it opens your email app addressed to {RECIPIENT}.
      </p>
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="cf-name">Name</Label>
          <Input
            id="cf-name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 100))}
            placeholder="Your name"
            maxLength={100}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cf-email">Email (optional)</Label>
          <Input
            id="cf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.slice(0, 255))}
            placeholder="you@example.com"
            maxLength={255}
          />
        </div>
        <div className="grid gap-1.5 sm:col-span-2">
          <Label htmlFor="cf-message">Message</Label>
          <Textarea
            id="cf-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 2000))}
            placeholder="What's on your mind?"
            rows={5}
            maxLength={2000}
            required
          />
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={disabled}>
            Send message
          </Button>
        </div>
      </form>
    </Card>
  );
};
