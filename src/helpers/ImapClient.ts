import * as imapSimple from 'imap-simple';
import { ImapSimpleOptions } from 'imap-simple';
import { config as dotenvConfig } from 'dotenv';

dotenvConfig(); // Load environment variables from .env file

class ImapClient {
    private config: ImapSimpleOptions;
    private searchCriteria: any;
    private fetchOptions: any;

    constructor() {
        this.config = {
            imap: {
                user: process.env.IMAP_USER!,
                password: process.env.IMAP_PASSWORD!,
                host: process.env.IMAP_HOST!,
                port: parseInt(process.env.IMAP_PORT!),
                tls: true,
                authTimeout: 3000
            }
        };
    }

    async scanInbox(): Promise<void> {
        try {
            const connection = await imapSimple.connect(this.config);

            await connection.openBox('INBOX');

            // const searchCriteria = ['UNSEEN'];
            // const fetchOptions = {
            //     bodies: ['HEADER', 'TEXT'],
            //     markSeen: false
            // };

            const results = await connection.search(this.searchCriteria, this.fetchOptions);

            results.forEach(res => {
                const subject = res.parts.filter(part => part.which === 'HEADER')[0].body.subject[0];
                const from = res.parts.filter(part => part.which === 'HEADER')[0].body.from[0];
                console.log(`From: ${from}, Subject: ${subject}`);
            });

            connection.end();
        } catch (error) {
            console.error('Error scanning inbox:', error);
        }
    }
}

export default ImapClient;
