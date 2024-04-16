import { Client } from '@notionhq/client';
import { BlockObjectRequest } from '@notionhq/client/build/src/api-endpoints';
import { logger } from './helpers/Logger';

export default class NotionClient {
    private notion: Client;
    private pageId: string;

    constructor(integrationToken: string, pageId: string) {
        this.notion = new Client({ auth: integrationToken });
        this.pageId = pageId;
    }

    public async flushPage(replacementBlocks: BlockObjectRequest[]): Promise<void> {
        try {
            // Retrieve all the current blocks on the page
            const currentBlocks = await this.getPageBlocks();

            // Iterate over the blocks and delete them one by one
            for (const block of currentBlocks) {
                await this.deleteBlock(block.id);
            }

            logger.info(`Flushed contents of the page with ID '${this.pageId}'.`);

            // Append new blocks
            if (replacementBlocks.length > 0) {
                await this.setPageBlocks(replacementBlocks);
            }
        } catch (error) {
            logger.error('Error flushing Notion page:', error);
        }
    }

    private async getPageBlocks() {
        try {
            const response = await this.notion.blocks.children.list({
                block_id: this.pageId,
                page_size: 100, // Optional: Adjust page size as needed (max is 100)
            });
            
            logger.info(`Retrieved Notion blocks for page '${this.pageId}'.`);
            logger.debug('Response:', response)
            
            return response.results; // 'results' contains the blocks retrieved from the Notion page
        } catch (error) {
            logger.error('Error listing Notion page blocks:', error);
            process.exit(1);
        }
    }
    
    private async setPageBlocks(blocks: BlockObjectRequest[]): Promise<any> {
        try {
            const response = await this.notion.blocks.children.append({
                block_id: this.pageId,
                children: blocks
            });

            logger.info('Blocks added.');
            logger.debug('Response:', response)

            return response;
        } catch (error) {
            logger.error('Error setting blocks:', error);
        }
    }

    private async deleteBlock(blockId: string): Promise<void> {
        const response = await this.notion.blocks.delete({
            block_id: blockId,
          });

        logger.debug(`Deleted block with ID '${blockId}':`, response);
    }
}