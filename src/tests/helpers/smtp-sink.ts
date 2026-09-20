import { AddressInfo, Server, Socket, createServer } from 'net';

export interface CapturedMessage {
  /** Envelope sender, as given in MAIL FROM. */
  mailFrom: string;
  /** Envelope recipients, as given in RCPT TO - this is who the server would actually deliver to. */
  rcptTo: string[];
  /** Raw RFC 822 message, headers and body. */
  raw: string;
}

/**
 * A throwaway in-process SMTP server that accepts everything and records it.
 *
 * Lets tests drive the real MailerModule transport - the real Handlebars
 * rendering, the real header construction and the real envelope - without
 * mocking the mailer or touching an external SMTP host.
 */
export class SmtpSink {
  private server?: Server;
  private readonly sockets = new Set<Socket>();
  readonly messages: CapturedMessage[] = [];

  async listen(): Promise<number> {
    this.server = createServer((socket) => this.handleConnection(socket));

    await new Promise<void>((resolve) =>
      this.server.listen(0, '127.0.0.1', resolve),
    );

    return (this.server.address() as AddressInfo).port;
  }

  async close(): Promise<void> {
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();

    if (this.server) {
      await new Promise<void>((resolve) => this.server.close(() => resolve()));
      this.server = undefined;
    }
  }

  reset(): void {
    this.messages.length = 0;
  }

  private handleConnection(socket: Socket): void {
    this.sockets.add(socket);
    socket.on('close', () => this.sockets.delete(socket));
    socket.on('error', () => this.sockets.delete(socket));

    let buffer = '';
    let inData = false;
    let dataLines: string[] = [];
    let mailFrom = '';
    let rcptTo: string[] = [];

    const write = (line: string) => socket.write(`${line}\r\n`);

    write('220 127.0.0.1 ESMTP test sink');

    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');

      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 2);

        if (inData) {
          if (line === '.') {
            inData = false;
            this.messages.push({
              mailFrom,
              rcptTo: [...rcptTo],
              raw: dataLines.join('\r\n'),
            });
            dataLines = [];
            mailFrom = '';
            rcptTo = [];
            write('250 OK: queued');
          } else {
            // Undo dot-stuffing so the captured body matches what was sent.
            dataLines.push(line.startsWith('..') ? line.slice(1) : line);
          }
          continue;
        }

        const command = line.split(' ')[0].toUpperCase();

        switch (command) {
          case 'EHLO':
          case 'HELO':
            // Deliberately advertises neither STARTTLS nor AUTH, so the client
            // stays on the plain path and no credentials are needed.
            write('250-127.0.0.1 greets you');
            write('250 8BITMIME');
            break;
          case 'MAIL':
            mailFrom = extractAddress(line);
            write('250 OK');
            break;
          case 'RCPT':
            rcptTo.push(extractAddress(line));
            write('250 OK');
            break;
          case 'DATA':
            inData = true;
            write('354 End data with <CR><LF>.<CR><LF>');
            break;
          case 'RSET':
            mailFrom = '';
            rcptTo = [];
            dataLines = [];
            write('250 OK');
            break;
          case 'QUIT':
            write('221 Bye');
            socket.end();
            break;
          default:
            write('250 OK');
        }
      }
    });
  }
}

const extractAddress = (line: string): string => {
  const match = line.match(/<([^>]*)>/);
  return match ? match[1] : '';
};

/**
 * Decode a quoted-printable body so assertions can match the rendered text.
 */
export const decodeQuotedPrintable = (raw: string): string =>
  raw
    .replace(/=\r\n/g, '')
    .replace(/=([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );

/** Pull a single header value out of a raw message, unfolding continuations. */
export const readHeader = (raw: string, name: string): string => {
  const headerBlock = raw.split('\r\n\r\n')[0];
  const unfolded = headerBlock.replace(/\r\n[ \t]+/g, ' ');
  const match = unfolded
    .split('\r\n')
    .find((line) => line.toLowerCase().startsWith(`${name.toLowerCase()}:`));

  return match ? match.slice(name.length + 1).trim() : '';
};
