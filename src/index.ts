import ImapClient from './helpers/ImapClient';
// import WebScraper from './helpers/WebScraper';
// import { writeFile } from 'fs/promises';

const imapClient = new ImapClient();
imapClient.scanInbox()
    .then(() => console.log('Inbox scan complete.'))
    .catch(error => console.error('Failed to scan inbox:', error));


// const url = 'https://example.com/groceries'; // Replace with the actual URL

// async function main() {
//   const scraper = new WebScraper();
//   const products = await scraper.scrapeGroceriesSite(url);
//   console.log(products);

//   // Write to JSON file
//   await writeFile('products.json', JSON.stringify(products, null, 2), 'utf8');
// }

// main().catch(console.error);
