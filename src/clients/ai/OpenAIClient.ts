import OpenAI from "openai";
import { logger } from "../../utils/Logger";

class OpenAIClient {
  private openAI: OpenAI;
  private completion: any;
  private maxTokens: number = 4096; 

  constructor(apiKey: string) {
    this.openAI = new OpenAI({ apiKey: apiKey });
    logger.info("OpenAI client authenticated.");
  }

  public getCompletionContent(): string{
    return this.completion.choices[0].message.content;
  }

  public async categorizeProducts(discountProducts: string, productCategories: string): Promise<void> {
    const onlyJson = "Only respond with the completed JSON, without a code block wrapper. ";
    const inputJson = `The JSON structure to complete: '${discountProducts}'. `;
    const infoJson = `The ProductCategories JSON structure: '${productCategories}'. `;
    const removeName = "In the response only keep the 'id' and 'category' to minimize token use. ";
    const prompt = "Match the products with a single product category. For each 'productName' fill the 'category' key, with the 'id' key of corresponding ProductCategories. ";
    const customizedPrompt = prompt + inputJson + infoJson + onlyJson + removeName;
    logger.debug("GPT Request:", customizedPrompt)

    await this
      .sendPrompt(customizedPrompt)
      .catch((error) => {
        logger.error("Failed to get response:", error);
        process.exit(1);
      });
  }

  private async sendPrompt(prompt: string): Promise<void> {
    logger.info("Sending prompt to GPT...")
    const completion = await this.openAI.chat.completions.create({
      messages: [
        { role: "system", content: prompt },
      ],
      model: "gpt-4-turbo-preview",
      max_tokens: this.maxTokens,
      temperature: 0,
      // response_format: { 
      //   type: "json_object",
      // },
    });
    logger.info("Categorize product into custom set of product categories.");
    logger.debug("GTP Response:", completion);
    
    this.completion = completion;
  }
}

export default OpenAIClient;
