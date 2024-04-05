import WebClient from './utils/WebClient';
import { logger } from './utils/Logger';
import ArgumentHandler from './utils/ArgumentHandler';
import JsonReader from './utils/JsonReader';
import process from 'process';

function getConfig(): any {
    const argHandler = new ArgumentHandler(process.argv);
    const configPath = argHandler.getArgByFlag('--config');

    const reader = new JsonReader(configPath);
    const jsonData = reader.read();
    
    logger.info('JSON data read from file:', jsonData);
    return jsonData
}

async function main() {
    const jsonData = getConfig();

    const webClient = new WebClient();

    await webClient.init();
    await webClient.navigate(jsonData.url);
    await webClient.handleCookiePopup([jsonData.cookieDecline])
    
    const title = await webClient.getTitle();
    logger.info(`The title of the page is: ${title}`);

    await webClient.close();
}

main();