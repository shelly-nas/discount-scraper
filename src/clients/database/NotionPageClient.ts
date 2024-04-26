import { Client } from "@notionhq/client";
import { BlockObjectRequest } from "@notionhq/client/build/src/api-endpoints";
import { logger } from "../../utils/Logger";

class NotionPageClient {
  private maxBlocks = 100;
  private notion: Client;
  private pageId: string;

  constructor(integrationToken: string, pageId: string) {
    this.notion = new Client({ auth: integrationToken });
    this.pageId = pageId;
  }

  public async flushPage(
    replacementBlocks: BlockObjectRequest[]
  ): Promise<void> {
    try {
      // Retrieve all the current blocks on the page
      const currentBlocks = await this.getPageBlocks();

      // Iterate over the blocks and delete them one by one
      for (const block of currentBlocks) {
        await this.deleteBlock(block.id);
      }

      logger.info(`Flushed contents of page with ID '${this.pageId}'.`);

      // Append new blocks
      if (replacementBlocks.length > 0) {
        await this.setPageBlocks(replacementBlocks);
      }
    } catch (error) {
      logger.error("Error flushing Notion page:", error);
    }
  }

  private async getPageBlocks() {
    try {
      let allBlocks = [];
      let hasMore = true;
      let startCursor: string | null = null;

      while (hasMore) {
        const response = await this.notion.blocks.children.list({
          block_id: this.pageId,
          page_size: this.maxBlocks,
          start_cursor: startCursor !== null ? startCursor : undefined,
        });

        allBlocks.push(...response.results); // Add new blocks to the array

        hasMore = response.has_more; // Update 'hasMore' depending on the response
        startCursor = response.next_cursor; // Set the 'startCursor' for the next iteration

        logger.debug(
          `Found ${allBlocks.length} Notion blocks, adding to batch.`
        );
      }

      logger.info(
        `Retrieved ${allBlocks.length} Notion blocks for page '${this.pageId}'.`
      );
      return allBlocks;
    } catch (error) {
      logger.error("Error listing Notion page blocks:", error);
      process.exit(1);
    }
  }

  private async setPageBlocks(blocks: BlockObjectRequest[]): Promise<any> {
    try {
      for (let i = 0; i < blocks.length; i += this.maxBlocks) {
        // Get the current segment of blocks not exceeding the MAX_BLOCKS limit
        const blockSegment = blocks.slice(i, i + this.maxBlocks);

        // Append the current segment of blocks
        const response = await this.notion.blocks.children.append({
          block_id: this.pageId,
          children: blockSegment,
        });

        logger.debug(
          `Add a segment of ${blocks.length} blocks to page '${this.pageId}'.`
        );
        logger.debug("Response:", response);
      }
      logger.info(`Page blocks are a added to page '${this.pageId}'.`);
    } catch (error) {
      logger.error("Error setting blocks:", error);
      process.exit(1);
    }
  }

  private async deleteBlock(blockId: string): Promise<void> {
    const response = await this.notion.blocks.delete({
      block_id: blockId,
    });

    logger.debug(`Deleted block with ID '${blockId}':`, response);
  }
}

export default NotionPageClient;
